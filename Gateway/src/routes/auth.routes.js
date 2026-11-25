// ============================================================
// ROTAS DE AUTENTICAÇÃO — GOSchool Gateway (ESM)
// Endpoints: /api/login, /api/login/demo, /api/logout,
// /api/me, /api/csrf-token, /auth/google/callback
// ============================================================

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import {
  authMiddleware,
  requireRole,
  csrfMiddleware,
  generateJwtToken,
  setJwtCookie,
  setCsrfCookie,
  verifyJwtToken,
} from '../middleware/auth.middleware.js';
import {
  createInternalHeader,
  INTERNAL_API_KEY,
} from '@goschool/shared/src/auth/internal-auth.js';
import config from '@goschool/shared/src/config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const AUTH_SERVICE_URL = config.AUTH_SERVICE_URL;
const DEMO_MODE = config.DEMO_MODE;
const IS_PRODUCTION = config.IS_PRODUCTION;

// ============================================================
// DEMO ACCOUNTS (única fonte de verdade — compartilhada com auth.service)
// ============================================================

const DEMO_ACCOUNTS = {
  'admin@demo.goschool': { id: 1, nome: 'Admin Demo', tipo: 'adm', ativo: true },
  'professor@demo.goschool': { id: 2, nome: 'Professor Demo', tipo: 'professor', ativo: true },
  'aluno@demo.goschool': { id: 3, nome: 'Aluno Demo', tipo: 'aluno', ativo: true },
};

// ============================================================
// PÁGINAS ESTÁTICAS (servidas por arquivo)
// ============================================================

function sendFile(res, filePath) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(404).send('Erro ao carregar a página.');
    }
    res.send(data);
  });
}

router.get('/', (req, res) => {
  sendFile(res, path.resolve(__dirname, '../../../public/Inicio/inicio.html'));
});

router.get('/login', (req, res) => {
  sendFile(res, path.resolve(__dirname, '../../../public/Login/login.html'));
});

router.get('/loading', (req, res) => {
  sendFile(res, path.resolve(__dirname, '../../../public/loading.html'));
});

router.get('/reservas', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  sendFile(res, path.resolve(__dirname, '../../../public/Reservas/index.html'));
});

// ============================================================
// POST /api/login — autenticação local desativada (RF03/RF04)
// O acesso institucional é realizado exclusivamente por Google OAuth.
// ============================================================

router.post('/api/login', (req, res) => {
  return res.status(410).json({
    sucesso: false,
    erro: 'Login por senha local não está disponível. Utilize sua conta Google institucional.',
  });
});

// ============================================================
// POST /api/login/demo — Login demo (apenas DEMO_MODE)
// ============================================================

router.post('/api/login/demo', (req, res) => {
  if (!DEMO_MODE) {
    return res.status(404).json({ sucesso: false, erro: 'Demo mode não está ativado' });
  }

  const { email } = req.body;
  const demoUser = DEMO_ACCOUNTS[email];

  if (!demoUser) {
    return res.status(401).json({
      sucesso: false,
      erro: 'Conta demo inválida. Use: admin@demo.goschool, professor@demo.goschool ou aluno@demo.goschool',
    });
  }

  const user = {
    id: demoUser.id,
    email: email,
    nome: demoUser.nome,
    tipo: demoUser.tipo,
  };
  const token = generateJwtToken(user);
  setJwtCookie(res, token);
  setCsrfCookie(res);

  let destino = '/aluno/';
  if (demoUser.tipo === 'professor') destino = '/professor/';
  else if (demoUser.tipo === 'adm') destino = '/adm/';

  return res.json({
    sucesso: true,
    usuario: {
      email: email,
      nome: demoUser.nome,
      tipo: demoUser.tipo,
    },
    destino,
    mensagem: 'Login demo realizado com sucesso!',
  });
});

// ============================================================
// POST /api/logout — Encerra sessão e limpa cookies
// ============================================================

router.post('/api/logout', (req, res) => {
  res.clearCookie('jwt_token', { path: '/', sameSite: 'lax', secure: IS_PRODUCTION });
  res.clearCookie(config.CSRF_COOKIE_NAME, { path: '/', sameSite: 'lax', secure: IS_PRODUCTION });

  return res.json({
    sucesso: true,
    mensagem: 'Sessão encerrada com sucesso.',
  });
});

// ============================================================
// GET /api/me — Usuário autenticado atual
// ============================================================

router.get('/api/me', authMiddleware, (req, res) => {
  res.json({
    sucesso: true,
    usuario: {
      id: req.user.sub,
      email: req.user.email,
      nome: req.user.nome || req.user.email.split('@')[0],
      tipo: req.user.role,
    },
  });
});

// ============================================================
// GET /api/auth/config — configuração pública necessária ao Google Identity
// ============================================================

router.get('/api/auth/config', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ clientId: config.GOOGLE_CLIENT_ID || '' });
});

// ============================================================
// GET /api/csrf-token — Retorna token CSRF
// ============================================================

router.get('/api/csrf-token', (req, res) => {
  const token = setCsrfCookie(res);
  res.json({ sucesso: true, csrf_token: token });
});

// ============================================================
// POST /auth/google/callback — valida o ID token no Auth Service
// ============================================================

router.post('/auth/google/callback', async (req, res) => {
  const { credential } = req.body || {};
  if (typeof credential !== 'string' || !credential) {
    return res.status(400).json({ sucesso: false, erro: 'Credencial Google ausente.' });
  }

  try {
    const response = await fetch(`${AUTH_SERVICE_URL}/internal/google-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.sucesso) {
      return res.status(response.status || 401).json({
        sucesso: false,
        erro: data.erro || 'Não foi possível autenticar esta conta Google.',
      });
    }

    const usuario = data.usuario;
    if (!usuario || !usuario.email || !['aluno', 'professor', 'adm'].includes(usuario.tipo)) {
      return res.status(403).json({
        sucesso: false,
        erro: 'Esta conta não possui um perfil institucional autorizado.',
      });
    }

    const user = {
      id: usuario.id || usuario.email,
      email: usuario.email,
      nome: usuario.nome || usuario.email.split('@')[0],
      tipo: usuario.tipo,
    };
    setJwtCookie(res, generateJwtToken(user));
    setCsrfCookie(res);

    let destino = '/inicio/';
    if (usuario.tipo === 'aluno') {
      destino = usuario.requerConsentimento || usuario.ativo === false
        ? '/aluno/consentimento.html'
        : '/aluno/';
    } else if (usuario.tipo === 'professor') {
      destino = '/professor/';
    } else if (usuario.tipo === 'adm') {
      destino = '/adm/';
    }

    return res.json({
      sucesso: true,
      usuario: { email: user.email, nome: user.nome, tipo: user.tipo },
      destino,
    });
  } catch (error) {
    console.error('[Gateway] Erro ao autenticar via Google:', error);
    return res.status(503).json({
      sucesso: false,
      erro: 'Serviço de autenticação indisponível. Tente novamente.',
    });
  }
});

export default router;