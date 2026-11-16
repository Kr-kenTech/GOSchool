// ======================================================
// SERVIÇO DE RESERVAS — Porta 4002
// Extraído de Services/reservas-service/reservas-service.js.
// Adaptações para a nova arquitetura:
//   - MongoDB lazy via src/data/mongo.js
//   - Autenticação interna compartilhada via src/services/internal-auth.js
//   - Sem process.exit(1) em falha de banco
//   - Exporta `app` (ouve na porta apenas quando executado diretamente)
// ======================================================

require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const crypto = require('crypto');
const { getDb, getCollections } = require('../data/mongo');
const {
    createInternalHeader,
    verifyInternalHeader,
    internalAuthMiddleware,
    INTERNAL_SHARED_SECRET,
    INTERNAL_API_KEY,
} = require('../services/internal-auth');

const app = express();
const PORT = process.env.RESERVAS_PORT || 4002;

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = 'banco_goschool';

const DEMO_MODE = process.env.DEMO_MODE === 'true';
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

// Demo mode validation (sem process.exit)
if (DEMO_MODE && IS_PRODUCTION) {
    console.error('[Reservas Service] AVISO: DEMO_MODE=true não deve ser usado em produção.');
}

app.use(express.json());

// ======================================================
// Autenticação interna (compartilhada)
// verifyInternalHeader e internalAuthMiddleware vêm de src/services/internal-auth.js
// ======================================================

// ======================================================
// GET - TODAS AS RESERVAS
// ======================================================
app.get('/internal/reservas', internalAuthMiddleware, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    try {
        const db = await getDb();
        const reservasCollection = db.collection('reservas');
        const reservas = await reservasCollection.find({}).toArray();

        const reservasFormatadas = reservas.map(r => ({
            id: r._id.toString(),
            categoria: r.categoria,
            data: r.data,
            horario: r.horario,
            professor: r.professor,
            professorId: r.professorId,
            descricao: r.descricao,
        }));

        return res.json({
            sucesso: true,
            reservas: reservasFormatadas,
        });
    } catch (erro) {
        console.error('[Reservas Service] Erro no GET:', erro);
        return res.status(503).json({
            sucesso: false,
            erro: 'Banco de dados indisponível.',
        });
    }
});

// ======================================================
// POST - CRIAR RESERVAS
// ======================================================
app.post('/internal/reservas', internalAuthMiddleware, async (req, res) => {
    const { categoria, data, horarios, professor, descricao } = req.body;

    if (!categoria || !data || !Array.isArray(horarios) || horarios.length === 0) {
        return res.status(400).json({
            sucesso: false,
            erro: 'Preencha todos os campos obrigatórios e selecione ao menos um horário.',
        });
    }

    const hojeStr = new Date().toISOString().split('T')[0];
    if (data < hojeStr) {
        return res.status(400).json({
            sucesso: false,
            erro: 'Não é permitido realizar reservas para datas passadas.',
        });
    }

    try {
        const db = await getDb();
        const reservasCollection = db.collection('reservas');

        const duplicados = [];
        const novasReservas = [];

        for (const horario of horarios) {
            const conflito = await reservasCollection.findOne({
                categoria: { $regex: new RegExp(`^${categoria.trim()}$`, 'i') },
                data: String(data).trim(),
                horario: String(horario).trim(),
            });

            if (conflito) {
                duplicados.push(horario);
            } else {
                novasReservas.push({
                    categoria: String(categoria).trim(),
                    data: String(data).trim(),
                    horario: String(horario).trim(),
                    professor: professor ? String(professor).trim() : 'Professor',
                    professorId: req.body.professorId ? String(req.body.professorId).trim() : undefined,
                    descricao: descricao ? String(descricao).trim() : '',
                    criado_em: new Date(),
                });
            }
        }

        if (duplicados.length > 0) {
            return res.status(400).json({
                sucesso: false,
                duplicados,
                erro: `Os seguintes horários já estão reservados para ${categoria}: ${duplicados.join(', ')}.`,
            });
        }

        const resultado = await reservasCollection.insertMany(novasReservas);

        const inseridasComId = Object.keys(resultado.insertedIds).map(index => ({
            id: resultado.insertedIds[index].toString(),
            ...novasReservas[index],
        }));

        console.log(`[Reservas Service] ${novasReservas.length} reserva(s) criada(s) no MongoDB.`);

        return res.json({
            sucesso: true,
            mensagem: 'Reservas realizadas com sucesso!',
            reservas: inseridasComId,
        });
    } catch (erro) {
        console.error('[Reservas Service] Erro ao criar reserva:', erro);
        return res.status(503).json({
            sucesso: false,
            erro: 'Banco de dados indisponível.',
        });
    }
});

// ======================================================
// DELETE - EXCLUIR RESERVA
// ======================================================
app.delete('/internal/reservas/:id', internalAuthMiddleware, async (req, res) => {
    const id = String(req.params.id).trim();
    console.log(`[Reservas Service] DELETE recebido para ID: ${id}`);

    try {
        const db = await getDb();
        const reservasCollection = db.collection('reservas');

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                sucesso: false,
                erro: 'ID de reserva inválido.',
            });
        }

        const reserva = await reservasCollection.findOne({ _id: new ObjectId(id) });
        if (!reserva) {
            console.log(`[Reservas Service] Reserva ${id} não encontrada.`);
            return res.status(404).json({
                sucesso: false,
                erro: 'Reserva não encontrada.',
            });
        }

        // RBAC: professor só exclui a própria reserva; admin exclui qualquer uma
        if (
            req.internalUser.role === 'professor' &&
            String(reserva.professorId || reserva.professor).trim() !== String(req.internalUser.userId).trim()
        ) {
            return res.status(403).json({
                sucesso: false,
                erro: 'Acesso negado: você só pode excluir as suas próprias reservas.',
            });
        }

        const resultado = await reservasCollection.deleteOne({ _id: new ObjectId(id) });

        if (resultado.deletedCount === 0) {
            console.log(`[Reservas Service] Reserva ${id} não encontrada.`);
            return res.status(404).json({
                sucesso: false,
                erro: 'Reserva não encontrada.',
            });
        }

        console.log(`[Reservas Service] Reserva ${id} excluída com sucesso.`);

        return res.json({
            sucesso: true,
            mensagem: 'Reserva removida com sucesso!',
            id: id,
        });
    } catch (erro) {
        console.error('[Reservas Service] Erro ao excluir:', erro);
        return res.status(503).json({
            sucesso: false,
            erro: 'Banco de dados indisponível.',
        });
    }
});

// ======================================================
// DESPERDÍCIO - DASHBOARD E REGISTROS (MongoDB)
// ======================================================

// GET /internal/desperdicio/dashboard - KPIs, gráficos, alertas, ingredientes, resumo
app.get('/internal/desperdicio/dashboard', internalAuthMiddleware, async (req, res) => {
    const periodo = req.query.periodo || 'semana';
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let dataInicio;
    switch (periodo) {
        case 'hoje':
            dataInicio = new Date(hoje);
            break;
        case 'semana':
            dataInicio = new Date(hoje);
            dataInicio.setDate(hoje.getDate() - 6);
            break;
        case 'mes':
            dataInicio = new Date(hoje);
            dataInicio.setMonth(hoje.getMonth() - 1);
            break;
        case 'ano':
            dataInicio = new Date(hoje);
            dataInicio.setFullYear(hoje.getFullYear() - 1);
            break;
        default:
            dataInicio = new Date(hoje);
            dataInicio.setDate(hoje.getDate() - 6);
    }

    try {
        const db = await getDb();
        const desperdicioCollection = db.collection('desperdicio');

        const registros = await desperdicioCollection.find({
            data: { $gte: dataInicio.toISOString().split('T')[0], $lte: hoje.toISOString().split('T')[0] },
        }).toArray();

        if (!registros || registros.length === 0) {
            const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            const labels = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(hoje);
                d.setDate(hoje.getDate() - i);
                labels.push(dias[d.getDay()]);
            }

            return res.json({
                sucesso: true,
                demo: false,
                periodo,
                kpis: {
                    totalDesperdicio: 0,
                    refeicoesServidas: 0,
                    taxaDesperdicio: 0,
                    economiaEstimada: 0,
                },
                graficos: {
                    evolucao: { labels, data: [0, 0, 0, 0, 0, 0, 0] },
                    distribuicao: { labels: ['Almoço', 'Café da Manhã', 'Lanche', 'Jantar'], data: [0, 0, 0, 0] },
                },
                alertas: [{ mensagem: 'Sem dados de desperdício no período selecionado.', nivel: 'ok' }],
                tabelas: { ingredientes: [] },
                resumo: { maiorDesperdicio: '--', menorDesperdicio: '--' },
                mensagem: 'Nenhum registro de desperdício encontrado no período.',
            });
        }

        const totalDesperdicio = registros.reduce((acc, r) => acc + (r.kgDesperdiçado || 0), 0);
        const totalPreparado = registros.reduce((acc, r) => acc + (r.kgPreparado || 0), 0);
        const taxaDesperdicio = totalPreparado > 0 ? (totalDesperdicio / totalPreparado) * 100 : 0;
        const refeicoesServidas = registros.length;
        const economiaEstimada = totalDesperdicio * 5;

        const diasOrdem = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const evolucaoMap = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date(hoje);
            d.setDate(hoje.getDate() - i);
            const diaStr = d.toISOString().split('T')[0];
            evolucaoMap[diaStr] = 0;
        }
        for (const r of registros) {
            if (evolucaoMap[r.data] !== undefined) {
                evolucaoMap[r.data] += (r.kgDesperdiçado || 0);
            }
        }
        const evolucaoLabels = Object.keys(evolucaoMap).map(d => {
            const date = new Date(d);
            return diasOrdem[date.getDay()];
        });
        const evolucaoData = Object.values(evolucaoMap);

        const distribuicaoMap = {};
        for (const r of registros) {
            const key = r.refeicao || 'outro';
            distribuicaoMap[key] = (distribuicaoMap[key] || 0) + (r.kgDesperdiçado || 0);
        }
        const refeicaoLabels = ['Almoço', 'Café da Manhã', 'Lanche', 'Jantar'];
        const refeicaoData = refeicaoLabels.map(label => {
            const key = label.toLowerCase().includes('café') ? 'cafe_manha' : label.toLowerCase();
            return distribuicaoMap[key] || 0;
        });

        const alertas = [];
        if (taxaDesperdicio > 10) {
            alertas.push({ mensagem: `Taxa de desperdício acima da meta: ${taxaDesperdicio.toFixed(1)}%`, nivel: 'alerta' });
        } else if (taxaDesperdicio > 5) {
            alertas.push({ mensagem: `Taxa de desperdício acima da meta ideal: ${taxaDesperdicio.toFixed(1)}%`, nivel: 'atencao' });
        } else {
            alertas.push({ mensagem: 'Taxa de desperdício dentro da meta.', nivel: 'ok' });
        }

        const porDia = {};
        for (const r of registros) {
            porDia[r.data] = (porDia[r.data] || 0) + (r.kgDesperdiçado || 0);
        }
        const maiorDia = Object.entries(porDia).sort((a, b) => b[1] - a[1])[0];
        const menorDia = Object.entries(porDia).sort((a, b) => a[1] - b[1])[0];

        const porIngrediente = {};
        for (const r of registros) {
            const ing = r.ingrediente || 'Não informado';
            if (!porIngrediente[ing]) {
                porIngrediente[ing] = { nome: ing, kg: 0 };
            }
            porIngrediente[ing].kg += (r.kgDesperdiçado || 0);
        }
        const ingredientesOrdenados = Object.values(porIngrediente)
            .sort((a, b) => b.kg - a.kg)
            .slice(0, 10);
        const totalIngredienteKg = ingredientesOrdenados.reduce((acc, i) => acc + i.kg, 0);
        const ingredientesFormatados = ingredientesOrdenados.map(i => ({
            nome: i.nome,
            kg: Math.round(i.kg * 10) / 10,
            percentual: totalIngredienteKg > 0 ? Math.round((i.kg / totalIngredienteKg) * 100) : 0,
        }));

        return res.json({
            sucesso: true,
            demo: false,
            periodo,
            kpis: {
                totalDesperdicio: Math.round(totalDesperdicio * 10) / 10,
                refeicoesServidas,
                taxaDesperdicio: Math.round(taxaDesperdicio * 10) / 10,
                economiaEstimada: Math.round(economiaEstimada),
            },
            graficos: {
                evolucao: { labels: evolucaoLabels, data: evolucaoData },
                distribuicao: { labels: refeicaoLabels, data: refeicaoData },
            },
            alertas,
            tabelas: { ingredientes: ingredientesFormatados },
            resumo: {
                maiorDesperdicio: maiorDia ? `${maiorDia[0]} (${Math.round(maiorDia[1] * 10) / 10} kg)` : '--',
                menorDesperdicio: menorDia ? `${menorDia[0]} (${Math.round(menorDia[1] * 10) / 10} kg)` : '--',
            },
        });
    } catch (erro) {
        console.error('[Reservas Service] Erro no dashboard de desperdício:', erro);
        return res.status(503).json({
            sucesso: false,
            erro: 'Banco de dados indisponível.',
        });
    }
});

// POST /internal/desperdicio/registros - Registrar novo registro de desperdício
app.post('/internal/desperdicio/registros', internalAuthMiddleware, async (req, res) => {
    const { data, refeicao, ingrediente, kgPreparado, kgDesperdiçado } = req.body;

    if (!data || !refeicao || !ingrediente || kgPreparado === undefined || kgDesperdiçado === undefined) {
        return res.status(400).json({
            sucesso: false,
            erro: 'Preencha todos os campos: data, refeição, ingrediente, kg preparados e kg desperdiçados.',
        });
    }

    try {
        const db = await getDb();
        const desperdicioCollection = db.collection('desperdicio');

        const registro = {
            data: String(data),
            refeicao: String(refeicao).trim(),
            ingrediente: String(ingrediente).trim(),
            kgPreparado: parseFloat(kgPreparado),
            kgDesperdiçado: parseFloat(kgDesperdiçado),
            createdAt: new Date(),
        };

        const resultado = await desperdicioCollection.insertOne(registro);

        return res.status(201).json({
            sucesso: true,
            mensagem: 'Registro de desperdício gravado com sucesso!',
            id: resultado.insertedId.toString(),
            registro,
        });
    } catch (erro) {
        console.error('[Reservas Service] Erro ao gravar desperdício:', erro);
        return res.status(503).json({
            sucesso: false,
            erro: 'Banco de dados indisponível.',
        });
    }
});

// ======================================================
// HEALTH CHECK
// ======================================================
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'reservas-service',
        timestamp: new Date().toISOString(),
        demoMode: DEMO_MODE,
    });
});

app.get('/internal/health', (req, res) => {
    const apiKey = req.headers['x-internal-api-key'];
    if (apiKey !== INTERNAL_API_KEY) {
        return res.status(401).json({ status: 'unauthorized' });
    }
    res.json({
        status: 'ok',
        service: 'reservas-service',
        timestamp: new Date().toISOString(),
        demoMode: DEMO_MODE,
    });
});

// ======================================================
// INICIAR SERVIÇO (apenas quando executado diretamente)
// ======================================================
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`[Reservas Service] Rodando na porta ${PORT} com MongoDB.`);
        console.log(`[Reservas Service] Demo Mode: ${DEMO_MODE ? 'ON' : 'OFF'}`);
        console.log(`[Reservas Service] NODE_ENV: ${NODE_ENV}`);
    });
}

module.exports = app;
