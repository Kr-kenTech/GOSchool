// ============================================================
// ROTAS DE EMAIL — GOSchool Gateway (ESM)
// Endpoints: POST /api/enviar-codigo-responsavel, POST /api/verificar-codigo
// Verificação por e-mail para consentimento (LGPD / ECA).
// ============================================================

import express from 'express';
import nodemailer from 'nodemailer';
import {
  authMiddleware,
  csrfMiddleware,
} from '../middleware/auth.middleware.js';
import {
  createInternalHeader,
  INTERNAL_API_KEY,
} from '@goschool/shared/src/auth/internal-auth.js';
import config from '@goschool/shared/src/config/index.js';

const router = express.Router();

const AUTH_SERVICE_URL = config.AUTH_SERVICE_URL;
const EMAIL = config.EMAIL;

// ============================================================
// Transporter de e-mail (Nodemailer)
// ============================================================

const transporter = nodemailer.createTransport({
  host: EMAIL.host,
  port: EMAIL.port,
  secure: EMAIL.port === 465,
  auth: {
    user: EMAIL.user,
    pass: EMAIL.pass,
  },
});

// Base de dados temporária em memória para os códigos de verificação
const codigosVerificacao = new Map();

// ============================================================
// POST /api/enviar-codigo-responsavel — Enviar código de verificação por e-mail
// ============================================================

router.post('/api/enviar-codigo-responsavel', authMiddleware, csrfMiddleware, async (req, res) => {
  try {
    const { emailResponsavel, emailAluno, nomeResponsavel, vinculo } = req.body;

    if (!emailResponsavel || !emailAluno) {
      return res.status(400).json({ sucesso: false, erro: 'E-mails obrigatórios em falta.' });
    }

    const ipCliente = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const regiao =
      ipCliente === '::1' || ipCliente === '127.0.0.1'
        ? 'Minas Gerais, Brasil (Local)'
        : 'Minas Gerais, Brasil';

    const codigo = Math.floor(100000 + Math.random() * 900000).toString();

    codigosVerificacao.set(emailResponsavel, {
      codigo,
      emailAluno,
      nomeResponsavel,
      vinculo,
      regiao,
      expiraEm: Date.now() + 10 * 60 * 1000,
    });

    const mailOptions = {
      from: '"GOSchool Segurança" <noreply@goschool.edu.br>',
      to: emailResponsavel,
      subject: 'Segurança GOSchool - Confirmação de Consentimento Legal',
      html: `
        <div style="font-family: var(--gs-font-sans); color: var(--gs-text-primary); padding: 20px;">
          <h2 style="color: var(--gs-primary);">GOSchool - Notificação de Segurança</h2>
          <p>Olá, <strong>${nomeResponsavel}</strong>,</p>
          <p>Foi solicitada a autorização de consentimento (LGPD / ECA) associada à conta de estudante (<strong>${emailAluno}</strong>) no ecossistema GOSchool.</p>
          <p><strong>Detalhes do pedido:</strong></p>
          <ul>
            <li><strong>Vínculo:</strong> ${vinculo}</li>
            <li><strong>Região do acesso:</strong> ${regiao}</li>
          </ul>
          <p>Para prosseguir com a ativação da conta, utilize o seguinte código de verificação de 6 dígitos:</p>
          <div style="background: var(--gs-primary-subtle); padding: 15px; border-radius: var(--gs-radius); font-size: 24px; font-weight: bold; letter-spacing: 5px; color: var(--gs-primary); text-align: center; width: fit-content; margin: 20px 0;">
            ${codigo}
          </div>
          <p style="font-size: 12px; color: var(--gs-text-muted);">Se não reconhece esta atividade, por favor ignore este e-mail.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return res.json({ sucesso: true, mensagem: 'Código enviado com sucesso para o e-mail do responsável.' });
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    return res.status(500).json({ sucesso: false, erro: 'Erro interno ao enviar o código de verificação.' });
  }
});

// ============================================================
// POST /api/verificar-codigo — Validar código e efetivar consentimento
// ============================================================

router.post('/api/verificar-codigo', authMiddleware, csrfMiddleware, async (req, res) => {
  const { emailResponsavel, codigoDigitado } = req.body;
  const dadosRegisto = codigosVerificacao.get(emailResponsavel);

  if (!dadosRegisto) {
    return res.status(400).json({ sucesso: false, erro: 'Código expirado ou não solicitado.' });
  }

  if (Date.now() > dadosRegisto.expiraEm) {
    codigosVerificacao.delete(emailResponsavel);
    return res.status(400).json({ sucesso: false, erro: 'O código expirou. Solicite um novo.' });
  }

  if (dadosRegisto.codigo !== codigoDigitado) {
    return res.status(400).json({ sucesso: false, erro: 'Código incorreto.' });
  }

  if (req.user.role !== 'adm' && req.user.email !== dadosRegisto.emailAluno) {
    return res.status(403).json({ sucesso: false, erro: 'Acesso negado' });
  }

  try {
    const internalHeader = createInternalHeader(req.user);
    const response = await fetch(`${AUTH_SERVICE_URL}/internal/consentimento`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-User': internalHeader,
        'X-Internal-API-Key': INTERNAL_API_KEY,
      },
      body: JSON.stringify({
        email: dadosRegisto.emailAluno,
        nomeResponsavel: dadosRegisto.nomeResponsavel,
        vinculo: dadosRegisto.vinculo,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.sucesso) {
      return res.status(response.status).json({
        sucesso: false,
        erro: data.erro || 'Erro ao gravar o consentimento no serviço de autenticação.',
      });
    }

    codigosVerificacao.delete(emailResponsavel);
    return res.json({ sucesso: true, mensagem: 'Consentimento registado e conta ativada com sucesso!' });
  } catch (error) {
    console.error('[Gateway] Erro ao comunicar com Auth Service no código:', error);
    return res.status(500).json({ sucesso: false, erro: 'Erro interno ao ativar o perfil.' });
  }
});

export default router;