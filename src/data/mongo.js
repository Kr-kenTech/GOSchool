// ======================================================
// CAMADA DE DADOS — MongoDB (lazy, resiliente)
// Conecta apenas na primeira utilização (getDb).
// Não chama process.exit se o MongoDB estiver indisponível.
// ======================================================

const { MongoClient } = require('mongodb');
const config = require('../config');

let client = null;
let db = null;

async function getDb() {
    if (!db) {
        client = new MongoClient(config.MONGO_URL);
        await client.connect();
        db = client.db(config.MONGO_DB);
    }
    return db;
}

async function closeDb() {
    if (client) {
        await client.close();
        client = null;
        db = null;
    }
}

async function getMongoHealth() {
    try {
        const d = await getDb();
        await d.command({ ping: 1 });
        return { ok: true, service: 'mongodb' };
    } catch (err) {
        return { ok: false, service: 'mongodb', erro: err.message };
    }
}

function getCollections() {
    return {
        reservas: db ? db.collection('reservas') : null,
        desperdicio: db ? db.collection('desperdicio') : null,
    };
}

module.exports = {
    getDb,
    closeDb,
    getMongoHealth,
    getCollections,
};
