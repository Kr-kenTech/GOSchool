// ============================================================
// CAMADA DE DADOS — MySQL (lazy, resiliente) — ESM
// Cria o pool apenas na primeira utilização (getPool).
// Não lança exceção no carregamento do módulo nem chama
// process.exit se o banco estiver indisponível.
// ============================================================

import mysql from 'mysql2/promise';
import config from '../config/index.js';

let pool = null;

function getMySQLConfig() {
  return {
    host: config.MYSQL.host,
    port: config.MYSQL.port,
    user: config.MYSQL.user,
    password: config.MYSQL.password,
    database: config.MYSQL.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
}

/**
 * Obtém (ou cria, sob demanda) o pool de conexões MySQL.
 * Lança exceção apenas quando chamado, permitindo que rotas
 * tratem a indisponibilidade do banco com 503.
 */
export async function getPool() {
  if (!pool) {
    pool = mysql.createPool(getMySQLConfig());
    // Testa a conexão imediatamente para falhar rápido se o banco estiver down
    try {
      await pool.query('SELECT 1');
    } catch (err) {
      pool = null;
      throw err;
    }
  }
  return pool;
}

/**
 * Fecha o pool (útil para graceful shutdown / testes).
 */
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Health check rápido do MySQL.
 */
export async function getMySQLHealth() {
  try {
    const p = await getPool();
    await p.query('SELECT 1');
    return { ok: true, service: 'mysql' };
  } catch (err) {
    return { ok: false, service: 'mysql', erro: err.message };
  }
}

export function getMySQLConfigExport() {
  return config.MYSQL;
}