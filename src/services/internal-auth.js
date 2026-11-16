// ======================================================
// SERVIÇO COMPARTILHADO — Autenticação interna entre serviços
// HMAC-SHA256 com proteção contra replay (5 minutos).
// Único ponto de verdade para gateway + auth-service + reservas-service.
// ======================================================

const crypto = require('crypto');
const config = require('../config');

const INTERNAL_SHARED_SECRET = config.INTERNAL_SHARED_SECRET;
const INTERNAL_API_KEY = config.INTERNAL_API_KEY;

/**
 * Cria um cabeçalho interno assinado para comunicação serviço-para-serviço.
 * Formato: base64url(payload).base64url(assinatura)
 */
function createInternalHeader(user) {
    const payload = {
        userId: user.sub || user.id,
        email: user.email,
        nome: user.nome || user.email,
        role: user.role || user.tipo,
        timestamp: Date.now(),
    };
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
        .createHmac('sha256', INTERNAL_SHARED_SECRET)
        .update(payloadB64)
        .digest('base64url');
    return `${payloadB64}.${signature}`;
}

/**
 * Verifica um cabeçalho interno assinado. Retorna o payload ou null.
 */
function verifyInternalHeader(header) {
    if (!header || typeof header !== 'string' || !header.includes('.')) {
        return null;
    }
    const [payloadB64, signature] = header.split('.');
    const expectedSignature = crypto
        .createHmac('sha256', INTERNAL_SHARED_SECRET)
        .update(payloadB64)
        .digest('base64url');
    if (signature !== expectedSignature) {
        return null;
    }
    try {
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
        const now = Date.now();
        if (!payload.timestamp || Math.abs(now - payload.timestamp) > 5 * 60 * 1000) {
            return null;
        }
        return payload;
    } catch {
        return null;
    }
}

/**
 * Middleware de autenticação interna. Valida X-Internal-API-Key e X-Internal-User.
 */
function internalAuthMiddleware(req, res, next) {
    const apiKey = req.headers['x-internal-api-key'];
    if (apiKey !== INTERNAL_API_KEY) {
        return res.status(401).json({ sucesso: false, erro: 'Chave de API interna inválida' });
    }

    const internalHeader = req.headers['x-internal-user'];
    const internalUser = verifyInternalHeader(internalHeader);
    if (!internalUser) {
        return res.status(401).json({ sucesso: false, erro: 'Cabeçalho interno inválido' });
    }

    req.internalUser = internalUser;
    next();
}

module.exports = {
    createInternalHeader,
    verifyInternalHeader,
    internalAuthMiddleware,
    INTERNAL_SHARED_SECRET,
    INTERNAL_API_KEY,
};
