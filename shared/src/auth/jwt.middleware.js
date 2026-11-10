// ============================================================
// MIDDLEWARE JWT — GOSchool (ESM)
// Extração do gateway para uso compartilhado
// ============================================================

import jwt from 'jsonwebtoken';
import config from '../config/index.js';

const JWT_SECRET = config.JWT_SECRET;

/**
 * Gera JWT token
 */
export function generateJwtToken(user) {
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
 * Verifica JWT token
 */
export function verifyJwtToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Middleware de autenticação — extrai o usuário do cookie JWT
 */
export function jwtAuthMiddleware(req, res, next) {
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
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ sucesso: false, erro: 'Acesso negado: permissão insuficiente' });
    }
    next();
  };
}