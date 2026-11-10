// ============================================================
// SHARED LIBRARY ENTRY POINT — GOSchool (ESM)
// ============================================================

// Config
import config from './config/index.js';

// Auth
import {
  jwtAuthMiddleware,
  requireRole,
  generateJwtToken,
  verifyJwtToken,
} from './auth/jwt.middleware.js';

import {
  generateCsrfToken,
  setCsrfCookie,
  setJwtCookie,
  validateCsrfToken,
  csrfMiddleware,
} from './auth/csrf.middleware.js';

import {
  createInternalHeader,
  verifyInternalHeader,
  internalAuthMiddleware,
  INTERNAL_SHARED_SECRET,
  INTERNAL_API_KEY,
} from './auth/internal-auth.js';

// Data
import { getMysqlPool, closeMysqlPool, testMysqlConnection } from './data/mysql.js';
import { getMongoClient, closeMongoClient, getMongoDb, testMongoConnection } from './data/mongo.js';

// Utils
import { logger } from './utils/logger.js';
import * as validators from './utils/validators.js';

export {
  config,
  jwtAuthMiddleware,
  requireRole,
  generateJwtToken,
  verifyJwtToken,
  generateCsrfToken,
  setCsrfCookie,
  setJwtCookie,
  validateCsrfToken,
  csrfMiddleware,
  createInternalHeader,
  verifyInternalHeader,
  internalAuthMiddleware,
  INTERNAL_SHARED_SECRET,
  INTERNAL_API_KEY,
  getMysqlPool,
  closeMysqlPool,
  testMysqlConnection,
  getMongoClient,
  closeMongoClient,
  getMongoDb,
  testMongoConnection,
  logger,
  validators,
};

export default config;