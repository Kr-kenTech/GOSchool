// ============================================================
// CAMADA DE DADOS — MongoDB (lazy, resiliente) — ESM
// Conecta apenas na primeira utilização (getDb).
// Não chama process.exit se o MongoDB estiver indisponível.
// ============================================================

import { MongoClient } from 'mongodb';
import config from '../config/index.js';

let client = null;
let db = null;

export async function getDb() {
  if (!db) {
    client = new MongoClient(config.MONGO_URL);
    await client.connect();
    db = client.db(config.MONGO_DB);
  }
  return db;
}

export async function closeDb() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

export async function getMongoHealth() {
  try {
    const d = await getDb();
    await d.command({ ping: 1 });
    return { ok: true, service: 'mongodb' };
  } catch (err) {
    return { ok: false, service: 'mongodb', erro: err.message };
  }
}

export function getCollections() {
  return {
    reservas: db ? db.collection('reservas') : null,
    desperdicio: db ? db.collection('desperdicio') : null,
  };
}