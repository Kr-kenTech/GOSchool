require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.RESERVAS_PORT || 4002;

// Configuração da conexão com o MongoDB (Persistência híbrida - Camada Documental)
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = 'banco_amaral_hub';

let db, reservasCollection;

async function conectarMongoDB() {
    try {
        const client = new MongoClient(MONGO_URL);
        await client.connect();
        db = client.db(DB_NAME);
        reservasCollection = db.collection('reservas');
        console.log('[Reservas Service] Conectado com sucesso ao MongoDB.');
    } catch (erro) {
        console.error('[Reservas Service] Erro ao conectar ao MongoDB:', erro);
        process.exit(1);
    }
}

conectarMongoDB();

app.use(express.json());

// ======================================================
// GET - TODAS AS RESERVAS
// ======================================================

app.get('/internal/reservas', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    try {
        const reservas = await reservasCollection.find({}).toArray();

        // Mapeia o _id do MongoDB para id (compatível com o frontend existente)
        const reservasFormatadas = reservas.map(r => ({
            id: r._id.toString(),
            categoria: r.categoria,
            data: r.data,
            horario: r.horario,
            professor: r.professor,
            descricao: r.descricao
        }));

        return res.json({
            sucesso: true,
            reservas: reservasFormatadas
        });

    } catch (erro) {
        console.error('[Reservas Service] Erro no GET:', erro);
        return res.status(500).json({
            sucesso: false,
            erro: 'Erro ao buscar reservas.'
        });
    }
});

// ======================================================
// POST - CRIAR RESERVAS
// ======================================================

app.post('/internal/reservas', async (req, res) => {
    const { categoria, data, horarios, professor, descricao } = req.body;

    if (!categoria || !data || !Array.isArray(horarios) || horarios.length === 0) {
        return res.status(400).json({
            sucesso: false,
            erro: 'Preencha todos os campos obrigatórios e selecione ao menos um horário.'
        });
    }

    const hojeStr = new Date().toISOString().split('T')[0];
    if (data < hojeStr) {
        return res.status(400).json({
            sucesso: false,
            erro: 'Não é permitido realizar reservas para datas passadas.'
        });
    }

    try {
        const duplicados = [];
        const novasReservas = [];

        // Validação de concorrência e duplicidade por horário
        for (const horario of horarios) {
            const conflito = await reservasCollection.findOne({
                categoria: { $regex: new RegExp(`^${categoria.trim()}$`, 'i') },
                data: String(data).trim(),
                horario: String(horario).trim()
            });

            if (conflito) {
                duplicados.push(horario);
            } else {
                novasReservas.push({
                    categoria: String(categoria).trim(),
                    data: String(data).trim(),
                    horario: String(horario).trim(),
                    professor: professor ? String(professor).trim() : 'Professor',
                    descricao: descricao ? String(descricao).trim() : '',
                    criado_em: new Date()
                });
            }
        }

        if (duplicados.length > 0) {
            return res.status(400).json({
                sucesso: false,
                duplicados,
                erro: `Os seguintes horários já estão reservados para ${categoria}: ${duplicados.join(', ')}.`
            });
        }

        // Insere as novas reservas no MongoDB
        const resultado = await reservasCollection.insertMany(novasReservas);
        
        // Mapeia os IDs gerados pelo MongoDB para retorno
        const inseridasComId = Object.keys(resultado.insertedIds).map(index => ({
            id: resultado.insertedIds[index].toString(),
            ...novasReservas[index]
        }));

        console.log(`[Reservas Service] ${novasReservas.length} reserva(s) criada(s) no MongoDB.`);

        return res.json({
            sucesso: true,
            mensagem: 'Reservas realizadas com sucesso!',
            reservas: inseridasComId
        });

    } catch (erro) {
        console.error('[Reservas Service] Erro ao criar reserva:', erro);
        return res.status(500).json({
            sucesso: false,
            erro: 'Erro interno ao processar a reserva.'
        });
    }
});

// ======================================================
// DELETE - EXCLUIR RESERVA
// ======================================================

app.delete('/internal/reservas/:id', async (req, res) => {
    const id = String(req.params.id).trim();
    console.log(`[Reservas Service] DELETE recebido para ID: ${id}`);

    try {
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                sucesso: false,
                erro: 'ID de reserva inválido.'
            });
        }

        const resultado = await reservasCollection.deleteOne({ _id: new ObjectId(id) });

        if (resultado.deletedCount === 0) {
            console.log(`[Reservas Service] Reserva ${id} não encontrada.`);
            return res.status(404).json({
                sucesso: false,
                erro: 'Reserva não encontrada.'
            });
        }

        console.log(`[Reservas Service] Reserva ${id} excluída com sucesso.`);

        return res.json({
            sucesso: true,
            mensagem: 'Reserva removida com sucesso!',
            id: id
        });

    } catch (erro) {
        console.error('[Reservas Service] Erro ao excluir:', erro);
        return res.status(500).json({
            sucesso: false,
            erro: 'Erro interno ao excluir a reserva.'
        });
    }
});

// ======================================================
// INICIAR SERVIÇO
// ======================================================

app.listen(PORT, () => {
    console.log(`[Reservas Service] Rodando na porta ${PORT} com MongoDB.`);
});