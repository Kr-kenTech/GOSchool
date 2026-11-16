// ============================================================
// ROTAS DE RESERVAS — GOSchool Gateway (ESM)
// Endpoints: GET/POST/DELETE /api/reservas, GET /api/reservas/minhas
// Proxy para o Reservas Service (porta 4002, MongoDB).
// ============================================================

import express from 'express';
import {
  authMiddleware,
  requireRole,
  csrfMiddleware,
} from '../middleware/auth.middleware.js';
import {
  createInternalHeader,
  INTERNAL_API_KEY,
} from '@goschool/shared/src/auth/internal-auth.js';
import config from '@goschool/shared/src/config/index.js';

const router = express.Router();

const RESERVAS_SERVICE_URL = config.RESERVAS_SERVICE_URL;

// ============================================================
// GET /api/reservas — Listar reservas (adm, professor)
// ============================================================

router.get('/api/reservas', authMiddleware, requireRole('adm', 'professor'), async (req, res) => {
  try {
    const internalHeader = createInternalHeader(req.user);
    const response = await fetch(`${RESERVAS_SERVICE_URL}/internal/reservas?_t=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'X-Internal-User': internalHeader,
        'X-Internal-API-Key': INTERNAL_API_KEY,
      },
    });
    const data = await response.json();

    if (!data.sucesso || !data.reservas) {
      return res.status(response.status).json(data);
    }

    // RBAC: professor vê apenas suas próprias reservas; admin vê todas
    let reservas = data.reservas;
    if (req.user.role === 'professor') {
      const professorId = String(req.user.sub || req.user.id);
      reservas = data.reservas.filter((r) =>
        String(r.professorId || r.professor).trim() === professorId ||
        (!r.professorId &&
          String(r.professor).trim().toLowerCase() === String(req.user.nome || req.user.email).trim().toLowerCase())
      );
    }

    return res.json({
      sucesso: true,
      reservas: reservas,
    });
  } catch (error) {
    return res.status(500).json({ sucesso: false, erro: 'Erro ao buscar reservas.' });
  }
});

// ============================================================
// POST /api/reservas — Criar reserva (adm, professor)
// ============================================================

router.post('/api/reservas', authMiddleware, requireRole('adm', 'professor'), csrfMiddleware, async (req, res) => {
  try {
    const internalHeader = createInternalHeader(req.user);
    const response = await fetch(`${RESERVAS_SERVICE_URL}/internal/reservas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-User': internalHeader,
        'X-Internal-API-Key': INTERNAL_API_KEY,
      },
      body: JSON.stringify({ ...req.body, professorId: req.user.sub }),
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ sucesso: false, erro: 'Erro ao criar reserva.' });
  }
});

// ============================================================
// DELETE /api/reservas/:id — Excluir reserva (adm, professor)
// ============================================================

router.delete('/api/reservas/:id', authMiddleware, requireRole('adm', 'professor'), csrfMiddleware, async (req, res) => {
  const id = String(req.params.id).trim();
  try {
    const internalHeader = createInternalHeader(req.user);
    const response = await fetch(`${RESERVAS_SERVICE_URL}/internal/reservas/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'X-Internal-User': internalHeader,
        'X-Internal-API-Key': INTERNAL_API_KEY,
      },
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ sucesso: false, erro: 'Erro ao comunicar com o serviço de reservas.' });
  }
});

// ============================================================
// GET /api/reservas/minhas — Reservas do usuário autenticado (adm, professor)
// ============================================================

router.get('/api/reservas/minhas', authMiddleware, requireRole('adm', 'professor'), async (req, res) => {
  try {
    const internalHeader = createInternalHeader(req.user);
    const response = await fetch(`${RESERVAS_SERVICE_URL}/internal/reservas?_t=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'X-Internal-User': internalHeader,
        'X-Internal-API-Key': INTERNAL_API_KEY,
      },
    });
    const data = await response.json();

    if (!data.sucesso || !data.reservas) {
      return res.status(response.status).json(data);
    }

    const professorId = String(req.user.sub || req.user.id);
    const minhasReservas = data.reservas.filter((r) =>
      String(r.professorId || r.professor).trim() === professorId ||
      (!r.professorId &&
        String(r.professor).trim().toLowerCase() === String(req.user.nome || req.user.email).trim().toLowerCase())
    );

    return res.json({
      sucesso: true,
      reservas: minhasReservas,
    });
  } catch (error) {
    return res.status(500).json({ sucesso: false, erro: 'Erro ao buscar suas reservas.' });
  }
});

export default router;