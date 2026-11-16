// ======================================================
// ROTAS DE DESPERDÍCIO — Gateway (porta 3000)
// Endpoints: GET /api/desperdicio/dashboard, POST /api/desperdicio/registros
// Proxy para o Reservas Service (porta 4002, MongoDB).
// Extraído de Gateway/server.js e adaptado para a nova arquitetura.
// ======================================================

const express = require('express');
const router = express.Router();

const {
    authMiddleware,
    requireRole,
    csrfMiddleware,
} = require('../middleware/auth.middleware');
const {
    createInternalHeader,
    INTERNAL_API_KEY,
} = require('../../services/internal-auth');
const config = require('../../config');

const RESERVAS_SERVICE_URL = config.RESERVAS_SERVICE_URL;

// ======================================================
// GET /api/desperdicio/dashboard — Dashboard de desperdício (apenas adm)
// ======================================================

router.get('/api/desperdicio/dashboard', authMiddleware, requireRole('adm'), async (req, res) => {
    try {
        const periodo = req.query.periodo || 'semana';
        const internalHeader = createInternalHeader(req.user);
        const response = await fetch(
            `${RESERVAS_SERVICE_URL}/internal/desperdicio/dashboard?periodo=${encodeURIComponent(periodo)}`,
            {
                method: 'GET',
                cache: 'no-store',
                headers: {
                    'X-Internal-User': internalHeader,
                    'X-Internal-API-Key': INTERNAL_API_KEY,
                },
            }
        );
        const data = await response.json();
        return res.status(response.status).json(data);
    } catch (error) {
        console.error('[Gateway] Erro ao buscar dashboard de desperdício:', error);
        return res.status(500).json({ sucesso: false, erro: 'Erro interno ao buscar dashboard de desperdício.' });
    }
});

// ======================================================
// POST /api/desperdicio/registros — Gravar registro de desperdício (apenas adm)
// ======================================================

router.post('/api/desperdicio/registros', authMiddleware, requireRole('adm'), csrfMiddleware, async (req, res) => {
    try {
        const internalHeader = createInternalHeader(req.user);
        const response = await fetch(`${RESERVAS_SERVICE_URL}/internal/desperdicio/registros`, {
            method: 'POST',
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
        console.error('[Gateway] Erro ao gravar registro de desperdício:', error);
        return res.status(500).json({ sucesso: false, erro: 'Erro interno ao gravar registro de desperdício.' });
    }
});

module.exports = router;
