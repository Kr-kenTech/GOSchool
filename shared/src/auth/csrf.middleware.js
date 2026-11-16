// ============================================================
// MIDDLEWARE CSRF — GOSchool (ESM)
// Double-submit cookie pattern
// ============================================================

import crypto from 'crypto';
import config from '../config/index.js';

const CSRF_COOKIE_NAME = config.CSRF_COOKIE_NAME;
const IS_PRODUCTION = config.IS_PRODUCTION;

/**
 * Gera token CSRF (double-submit cookie pattern)
 */
export function generateCsrfToken() {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Define o cookie CSRF na resposta
 */
export function setCsrfCookie(res) {
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
export function validateCsrfToken(req) {
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
  return cookieToken && headerToken && cookieToken === headerToken;
}

/**
 * Define o cookie JWT na resposta
 */
export function setJwtCookie(res, token) {
  res.cookie('jwt_token', token, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60 * 1000,
  });
}

/**
 * Middleware de proteção CSRF para operações de escrita
 */
export function csrfMiddleware(req, res, next) {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    if (!validateCsrfToken(req)) {
      return res.status(403).json({ sucesso: false, erro: 'CSRF token inválido ou ausente' });
    }
  }
  next();
}