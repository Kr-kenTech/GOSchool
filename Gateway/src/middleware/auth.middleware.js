// ============================================================
// MIDDLEWARE DE AUTENTICAÇÃO — GOSchool Gateway (ESM)
// Reexporta do @goschool/shared para uso no gateway
// ============================================================

import {
  jwtAuthMiddleware as sharedAuthMiddleware,
  requireRole as sharedRequireRole,
  generateJwtToken as sharedGenerateJwtToken,
  verifyJwtToken as sharedVerifyJwtToken,
} from '@goschool/shared/src/auth/jwt.middleware.js';

import {
  csrfMiddleware as sharedCsrfMiddleware,
  generateCsrfToken as sharedGenerateCsrfToken,
  setCsrfCookie as sharedSetCsrfCookie,
  setJwtCookie as sharedSetJwtCookie,
  validateCsrfToken as sharedValidateCsrfToken,
} from '@goschool/shared/src/auth/csrf.middleware.js';

import config from '@goschool/shared/src/config/index.js';

const IS_PRODUCTION = config.IS_PRODUCTION;

// Reexport all from shared
export {
  sharedAuthMiddleware as authMiddleware,
  sharedRequireRole as requireRole,
  sharedCsrfMiddleware as csrfMiddleware,
  sharedGenerateJwtToken as generateJwtToken,
  sharedVerifyJwtToken as verifyJwtToken,
  sharedGenerateCsrfToken as generateCsrfToken,
  sharedSetCsrfCookie as setCsrfCookie,
  sharedSetJwtCookie as setJwtCookie,
  sharedValidateCsrfToken as validateCsrfToken,
};

// Gateway-specific: CSRF cookie name from config
export const CSRF_COOKIE_NAME = config.CSRF_COOKIE_NAME;