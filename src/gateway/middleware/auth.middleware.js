// ======================================================
// MIDDLEWARE DE AUTENTICAÇÃO — Gateway
// authMiddleware, requireRole, csrfMiddleware.
// Extraído de Gateway/server.js e adaptado para a nova arquitetura.
// ======================================================

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../../config');

const JWT_SECRET = config.JWT_SECRET;
const CSRF_COOKIE_NAME = config.CSRF_COOKIE_NAME;
const IS_PRODUCTION = config.IS_PRODUCTION;

/**
 * Gera token CSRF (double-submit cookie pattern)
 */
function generateCsrfToken() {
    return crypto.randomBytes(32).toString('base64url');
}

/**
 * Define o cookie CSRF na resposta
 */
function setCsrfCookie(res) {
    const token = generateCsrfToken();
    res.cookie(CSRF_COOKIE_NAME, token, {
        httpOnly: false,
        secure: IS_PRODUCTION,
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000,
    });
    return token;
}

/**
 * Valida token CSRF do header contra o cookie
 */
function validateCsrfToken(req) {
    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
    return cookieToken && headerToken && cookieToken === headerToken;
}

/**
 * Gera JWT token
 */
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

/**
 * Define o cookie JWT na resposta
 */
function setJwtCookie(res, token) {
    res.cookie('jwt_token', token, {
        httpOnly: true,
        secure: IS_PRODUCTION,
        sameSite: 'lax',
        path: '/',
        maxAge: 8 * 60 * 60 * 1000,
    });
}

/**
 * Verifica JWT token do cookie
 */
function verifyJwtToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
}

/**
 * Middleware de autenticação — extrai o usuário do cookie JWT
 */
function authMiddleware(req, res, next) {
    const token = req.cookies?.jwt_token;
    if (!token) {
        return res.status(401).json({ sucesso: false, erro: 'Não autenticado' });
    }
    const decoded = verifyJwtToken(token);
    if (!decoded) {
        return res.status(401).json({ sucesso: false, erro: 'Token inválido ou expirado' });
    }
    req.user = decoded;
    next();
}

/**
 * Requer papel(es) específico(s)
 */
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ sucesso: false, erro: 'Acesso negado: permissão insuficiente' });
        }
        next();
    };
}

/**
 * Middleware de proteção CSRF para operações de escrita
 */
function csrfMiddleware(req, res, next) {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        if (!validateCsrfToken(req)) {
            return res.status(403).json({ sucesso: false, erro: 'CSRF token inválido ou ausente' });
        }
    }
    next();
}

module.exports = {
    generateCsrfToken,
    setCsrfCookie,
    validateCsrfToken,
    generateJwtToken,
    setJwtCookie,
    verifyJwtToken,
    authMiddleware,
    requireRole,
    csrfMiddleware,
};
