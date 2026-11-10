// ============================================================
// SERVIÇO DE AUTENTICAÇÃO — GOSchool Auth Service (ESM)
// Porta 4001
// - MySQL lazy via @goschool/shared
// - Autenticação interna compartilhada via @goschool/shared
// - Sem process.exit(1) em falha de banco
// - Exporta `app` (ouve na porta apenas quando executado diretamente)
// ============================================================

import 'dotenv/config';
import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getPool } from '@goschool/shared/src/data/mysql.js';
import {
  createInternalHeader,
  verifyInternalHeader,
  internalAuthMiddleware,
  INTERNAL_SHARED_SECRET,
  INTERNAL_API_KEY,
} from '@goschool/shared/src/auth/internal-auth.js';

const app = express();
const PORT = process.env.AUTH_PORT || 4001;

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const DEMO_MODE = process.env.DEMO_MODE === 'true';
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

// Demo accounts (única fonte de verdade compartilhada via internal-auth)
const DEMO_ACCOUNTS = {
  'admin@demo.goschool': { id: 1, nome: 'Admin Demo', tipo: 'adm', ativo: true },
  'professor@demo.goschool': { id: 2, nome: 'Professor Demo', tipo: 'professor', ativo: true },
  'aluno@demo.goschool': { id: 3, nome: 'Aluno Demo', tipo: 'aluno', ativo: true },
};

// Demo mode validation (sem process.exit)
if (DEMO_MODE && IS_PRODUCTION) {
  console.error('[Auth Service] AVISO: DEMO_MODE=true não deve ser usado em produção.');
}

app.use(express.json());

// Helper to get database pool (lazy)
async function getDb() {
  return await getPool();
}

// ============================================================
// GOOGLE ID TOKEN VERIFICATION (RS256)
// ============================================================

let googleKeysCache = null;
let googleKeysCacheTime = 0;

function base64urlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return Buffer.from(base64, 'base64');
}

async function fetchGooglePublicKeys() {
  const now = Date.now();
  if (googleKeysCache && now - googleKeysCacheTime < 24 * 60 * 60 * 1000) {
    return googleKeysCache;
  }
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/certs');
    const data = await response.json();
    googleKeysCache = data.keys || [];
    googleKeysCacheTime = now;
    return googleKeysCache;
  } catch (error) {
    console.error('[Auth Service] Erro ao buscar chaves públicas do Google:', error);
    return googleKeysCache || [];
  }
}

async function verifyGoogleIdToken(credential, clientId) {
  const parts = credential.split('.');
  if (parts.length !== 3) {
    throw new Error('Formato de token inválido');
  }

  const header = JSON.parse(base64urlDecode(parts[0]).toString('utf8'));
  const payload = JSON.parse(base64urlDecode(parts[1]).toString('utf8'));

  if (header.alg !== 'RS256') {
    throw new Error('Algoritmo de token não suportado');
  }

  if (payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com') {
    throw new Error('Emissor inválido');
  }

  if (payload.aud !== clientId) {
    throw new Error('Destinatário inválido');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('Token expirado');
  }

  const keys = await fetchGooglePublicKeys();
  const key = keys.find(k => k.kid === header.kid);
  if (!key) {
    throw new Error('Chave pública do Google não encontrada');
  }

  const publicKey = crypto.createPublicKey({
    key: { kty: key.kty, kid: key.kid, n: key.n, e: key.e },
    format: 'jwk',
  });

  const data = Buffer.from(`${parts[0]}.${parts[1]}`, 'utf8');
  const signature = base64urlDecode(parts[2]);
  const isValid = crypto.verify('RSA-SHA256', data, publicKey, signature);
  if (!isValid) {
    throw new Error('Assinatura do token do Google inválida');
  }

  return payload;
}

// Generate JWT token
function generateJwtToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    nome: user.nome,
    role: user.tipo,
    iat: Math.floor(Date.now() / 1000),
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

// Função auxiliar para determinar o cargo/tipo do usuário com base no e-mail
function identificarTipoUsuario(email) {
  if (email.endsWith('@aluno.mg.gov.br')) {
    return 'aluno';
  }

  const adminsFixos = ['admin@educacao.mg.gov.br', 'suporte@educacao.mg.gov.br'];
  if (adminsFixos.includes(email)) {
    return 'adm';
  }

  if (email.endsWith('@educacao.mg.gov.br')) {
    return 'professor';
  }

  return null;
}

// ============================================================
// ENDPOINT INTERNO: VALIDAR CREDENCIAIS DE LOGIN
// ============================================================
app.post('/internal/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const pool = await getDb();
    const [rows] = await pool.query('SELECT * FROM usuario WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.status(401).json({ sucesso: false, erro: 'Credenciais inválidas.' });
    }

    const usuarioEncontrado = rows[0];
    const tipo = identificarTipoUsuario(email);

    let requerConsentimento = false;
    let ativo = true;

    if (tipo === 'aluno') {
      const [alunoRows] = await pool.query('SELECT id FROM aluno WHERE usuario_id = ?', [usuarioEncontrado.id]);
      if (alunoRows.length > 0) {
        const alunoId = alunoRows[0].id;
        const [consRows] = await pool.query('SELECT id FROM consentimento_responsavel WHERE aluno_id = ?', [alunoId]);
        requerConsentimento = consRows.length === 0;
        ativo = !requerConsentimento;
      }
    }

    return res.json({
      sucesso: true,
      usuario: {
        id: usuarioEncontrado.id,
        email: usuarioEncontrado.email,
        nome: usuarioEncontrado.nome,
        tipo: tipo,
        ativo: ativo,
        requerConsentimento: requerConsentimento,
      },
    });
  } catch (error) {
    console.error('[Auth Service] Erro no login:', error);
    return res.status(503).json({ sucesso: false, erro: 'Banco de dados indisponível.' });
  }
});

// ============================================================
// ENDPOINT INTERNO: DEMO LOGIN
// ============================================================
app.post('/internal/demo-login', (req, res) => {
  if (!DEMO_MODE) {
    return res.status(404).json({ sucesso: false, erro: 'Demo mode não está ativado' });
  }

  const { email } = req.body;
  const demoUser = DEMO_ACCOUNTS[email];

  if (!demoUser) {
    return res.status(401).json({
      sucesso: false,
      erro: 'Conta demo inválida',
    });
  }

  return res.json({
    sucesso: true,
    usuario: {
      id: demoUser.id,
      email: email,
      nome: demoUser.nome,
      tipo: demoUser.tipo,
      ativo: demoUser.ativo,
      requerConsentimento: false,
    },
  });
});

// ============================================================
// ENDPOINT INTERNO: GOOGLE LOGIN
// ============================================================
app.post('/internal/google-login', async (req, res) => {
  const { credential, email: emailDireto } = req.body;
  let email = emailDireto;

  if (!email && credential) {
    try {
      const payload = await verifyGoogleIdToken(credential, process.env.GOOGLE_CLIENT_ID);
      email = payload.email;
    } catch (err) {
      console.error('[Auth Service] Erro ao verificar token do Google:', err.message);
      return res.status(401).json({
        sucesso: false,
        erro: 'Token do Google inválido: ' + err.message,
      });
    }
  }

  if (!email) {
    return res.status(400).json({
      sucesso: false,
      erro: 'E-mail não fornecido ou token do Google inválido.',
    });
  }

  const tipo = identificarTipoUsuario(email);

  if (!tipo) {
    return res.status(403).json({
      sucesso: false,
      erro: 'Acesso restrito. Utilize um e-mail institucional válido (@educacao.mg.gov.br ou @aluno.mg.gov.br).',
    });
  }

  try {
    const pool = await getDb();
    const [rows] = await pool.query('SELECT * FROM usuario WHERE email = ?', [email]);
    let usuarioEncontrado;
    let usuarioId;

    if (rows.length === 0) {
      const nomePadrao = email.split('@')[0];
      const [result] = await pool.query('INSERT INTO usuario (nome, email) VALUES (?, ?)', [nomePadrao, email]);
      usuarioId = result.insertId;

      if (tipo === 'aluno') {
        await pool.query('INSERT INTO aluno (usuario_id) VALUES (?)', [usuarioId]);
      } else if (tipo === 'professor') {
        await pool.query('INSERT INTO professor (usuario_id) VALUES (?)', [usuarioId]);
      } else if (tipo === 'adm') {
        await pool.query('INSERT INTO administrador (usuario_id) VALUES (?)', [usuarioId]);
      }

      usuarioEncontrado = { id: usuarioId, email, nome: nomePadrao };
    } else {
      usuarioEncontrado = rows[0];
      usuarioId = usuarioEncontrado.id;
    }

    let requerConsentimento = false;
    let ativo = true;

    if (tipo === 'aluno') {
      const [alunoRows] = await pool.query('SELECT id FROM aluno WHERE usuario_id = ?', [usuarioId]);
      if (alunoRows.length > 0) {
        const alunoId = alunoRows[0].id;
        const [consRows] = await pool.query('SELECT id FROM consentimento_responsavel WHERE aluno_id = ?', [alunoId]);
        requerConsentimento = consRows.length === 0;
        ativo = !requerConsentimento;
      } else {
        requerConsentimento = true;
        ativo = false;
      }
    }

    return res.json({
      sucesso: true,
      usuario: {
        email: usuarioEncontrado.email,
        nome: usuarioEncontrado.nome,
        tipo: tipo,
        ativo: ativo,
        requerConsentimento: requerConsentimento,
      },
      mensagem: 'Login com Google autenticado com sucesso!',
    });
  } catch (error) {
    console.error('[Auth Service] Erro no Google Login com MySQL:', error);
    return res.status(503).json({ sucesso: false, erro: 'Banco de dados indisponível.' });
  }
});

// ============================================================
// ENDPOINT INTERNO: REGISTRO DE CONSENTIMENTO (LGPD / ECA - RF18)
// ============================================================
app.post('/internal/consentimento', internalAuthMiddleware, async (req, res) => {
  const { email, nomeResponsavel, vinculo } = req.body;

  if (!email || !nomeResponsavel || !vinculo) {
    return res.status(400).json({ sucesso: false, erro: 'Dados incompletos para o consentimento.' });
  }

  try {
    const pool = await getDb();
    const [rows] = await pool.query('SELECT id FROM usuario WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(404).json({ sucesso: false, erro: 'Utilizador não encontrado.' });
    }

    const usuarioId = rows[0].id;
    const [alunoRows] = await pool.query('SELECT id FROM aluno WHERE usuario_id = ?', [usuarioId]);

    if (alunoRows.length === 0) {
      return res.status(404).json({ sucesso: false, erro: 'Registo de aluno não encontrado para este utilizador.' });
    }

    const alunoId = alunoRows[0].id;
    const dataConsentimentoStr = new Date().toISOString().split('T')[0];
    const hashConsentimentoPadrao = 'PENDENTE_SETOR_SEGURANCA';

    await pool.query(
      `INSERT INTO consentimento_responsavel (aluno_id, nome_responsavel, vinculo, data_consentimento, hash_consentimento)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE nome_responsavel = VALUES(nome_responsavel), vinculo = VALUES(vinculo)`,
      [alunoId, nomeResponsavel, vinculo, dataConsentimentoStr, hashConsentimentoPadrao]
    );

    return res.json({
      sucesso: true,
      mensagem: 'Consentimento registado com sucesso.',
    });
  } catch (error) {
    console.error('[Auth Service] Erro ao salvar consentimento:', error);
    return res.status(503).json({ sucesso: false, erro: 'Banco de dados indisponível.' });
  }
});

// Endpoint interno para buscar os dados completos do usuário
app.get('/internal/usuario', internalAuthMiddleware, async (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).json({ sucesso: false, erro: 'E-mail não fornecido.' });
  }

  try {
    const pool = await getDb();
    const [rows] = await pool.query('SELECT * FROM usuario WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.status(404).json({ sucesso: false, erro: 'Usuário não encontrado.' });
    }

    const usuarioEncontrado = rows[0];
    const tipo = identificarTipoUsuario(email);

    const [alergiasRows] = await pool.query(
      'SELECT alergia FROM usuario_alergias WHERE usuario_id = ?',
      [usuarioEncontrado.id]
    );
    const alergias = alergiasRows.map(r => r.alergia);

    return res.json({
      sucesso: true,
      usuario: {
        id: usuarioEncontrado.id,
        nome: usuarioEncontrado.nome || email.split('@')[0],
        email: usuarioEncontrado.email,
        tipo: tipo,
        alergias: alergias,
        restricoes: '',
      },
    });
  } catch (error) {
    console.error('[Auth Service] Erro ao buscar dados do usuário:', error);
    return res.status(503).json({ sucesso: false, erro: 'Banco de dados indisponível.' });
  }
});

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    demoMode: DEMO_MODE,
  });
});

app.get('/internal/health', (req, res) => {
  const apiKey = req.headers['x-internal-api-key'];
  if (apiKey !== INTERNAL_API_KEY) {
    return res.status(401).json({ status: 'unauthorized' });
  }
  res.json({
    status: 'ok',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    demoMode: DEMO_MODE,
  });
});

// ============================================================
// INICIAR SERVIÇO (apenas quando executado diretamente)
// ============================================================
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    console.log(`[Auth Service] Rodando na porta ${PORT} com conexão ao MySQL.`);
    console.log(`[Auth Service] Demo Mode: ${DEMO_MODE ? 'ON' : 'OFF'}`);
    console.log(`[Auth Service] NODE_ENV: ${NODE_ENV}`);
  });
}

export default app;