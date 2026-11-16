// ======================================================
// ROTAS DE USUÁRIO — Gateway (porta 3000)
// Endpoints: GET/PUT /api/usuario, POST /api/consentimento, GET /api/usuario/alergias
// Proxy para o Auth Service (porta 4001, MySQL).
// Extraído de Gateway/server.js e adaptado para a nova arquitetura.
// ======================================================

const express = require('express');
const router = express.Router();

const {
    authMiddleware,
    csrfMiddleware,
} = require('../middleware/auth.middleware');
const {
    createInternalHeader,
    INTERNAL_API_KEY,
} = require('../../services/internal-auth');
const config = require('../../config');

const AUTH_SERVICE_URL = config.AUTH_SERVICE_URL;

// ======================================================
// GET /api/usuario — Buscar dados do usuário
// ======================================================

router.get('/api/usuario', authMiddleware, async (req, res) => {
    const email = req.query.email || req.user.email;
    if (req.user.role !== 'adm' && email !== req.user.email) {
        return res.status(403).json({ sucesso: false, erro: 'Acesso negado: só pode ver seus próprios dados' });
    }

    try {
        const internalHeader = createInternalHeader(req.user);
        const response = await fetch(`${AUTH_SERVICE_URL}/internal/usuario?email=${encodeURIComponent(email)}`, {
            method: 'GET',
            headers: {
                'X-Internal-User': internalHeader,
                'X-Internal-API-Key': INTERNAL_API_KEY,
            },
        });
        const data = await response.json();
        return res.status(response.status).json(data);
    } catch (error) {
        console.error('[Gateway] Erro ao buscar dados do usuário:', error);
        return res.status(500).json({ sucesso: false, erro: 'Erro ao buscar dados do usuário.' });
    }
});

// ======================================================
// PUT /api/usuario — Atualizar dados do usuário
// ======================================================

router.put('/api/usuario', authMiddleware, csrfMiddleware, async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ sucesso: false, erro: 'E-mail não fornecido.' });
    }
    if (req.user.role !== 'adm' && email !== req.user.email) {
        return res.status(403).json({ sucesso: false, erro: 'Acesso negado: só pode atualizar seus próprios dados' });
    }

    try {
        const internalHeader = createInternalHeader(req.user);
        const response = await fetch(`${AUTH_SERVICE_URL}/internal/usuario`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Internal-User': internalHeader,
                'X-Internal-API-Key': INTERNAL_API_KEY,
            },
            body: JSON.stringify(req.body),
        });
        const data = await response.json();
        return res.status(response.status).json(data);
    } catch (error) {
        console.error('[Gateway] Erro ao atualizar dados do usuário:', error);
        return res.status(500).json({ sucesso: false, erro: 'Erro ao atualizar dados do usuário.' });
    }
});

// ======================================================
// POST /api/consentimento — Registro de consentimento (LGPD / ECA - RF18)
// ======================================================

router.post('/api/consentimento', authMiddleware, csrfMiddleware, async (req, res) => {
    const { emailAluno, nomeResponsavel, vinculo } = req.body;

    if (!emailAluno || !nomeResponsavel || !vinculo) {
        return res.status(400).json({
            sucesso: false,
            erro: 'Preencha todos os campos obrigatórios para o consentimento.',
        });
    }
    if (req.user.role !== 'adm' && req.user.email !== emailAluno) {
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
                email: emailAluno,
                nomeResponsavel,
                vinculo,
            }),
        });

        const data = await response.json();

        if (!response.ok || !data.sucesso) {
            return res.status(response.status).json({
                sucesso: false,
                erro: data.erro || 'Erro ao gravar o consentimento no serviço de autenticação.',
            });
        }

        return res.json({
            sucesso: true,
            mensagem: 'Consentimento registrado e perfil ativado com sucesso!',
        });
    } catch (error) {
        console.error('[Gateway] Erro ao processar o consentimento do responsável:', error);
        return res.status(500).json({
            sucesso: false,
            erro: 'Erro interno ao processar o termo de consentimento.',
        });
    }
});

// ======================================================
// GET /api/usuario/alergias — Alergias do usuário autenticado
// ======================================================

router.get('/api/usuario/alergias', authMiddleware, async (req, res) => {
    try {
        const internalHeader = createInternalHeader(req.user);
        const response = await fetch(`${AUTH_SERVICE_URL}/internal/usuario?email=${encodeURIComponent(req.user.email)}`, {
            method: 'GET',
            headers: {
                'X-Internal-User': internalHeader,
                'X-Internal-API-Key': INTERNAL_API_KEY,
            },
        });
        const data = await response.json();
        return res.status(response.status).json(data);
    } catch (error) {
        console.error('[Gateway] Erro ao buscar alergias do usuário:', error);
        return res.status(500).json({ sucesso: false, erro: 'Erro ao buscar alergias.' });
    }
});

module.exports = router;
