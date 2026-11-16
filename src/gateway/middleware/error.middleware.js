// ======================================================
// MIDDLEWARE DE ERROS — Gateway
// Handler global de erros, 404 e 503 (banco indisponível).
// Extraído de Gateway/server.js e adaptado para a nova arquitetura.
// ======================================================

const config = require('../../config');

const IS_PRODUCTION = config.IS_PRODUCTION;

/**
 * Middleware de tratamento global de erros.
 * Captura erros não tratados nas rotas e retorna resposta JSON padronizada.
 */
function errorHandler(err, req, res, next) {
    console.error(`[Gateway] Erro não tratado: ${err.message}`);
    if (!IS_PRODUCTION) {
        console.error(err.stack);
    }

    // Se o erro indica indisponibilidade de banco de dados
    if (err.code === 'ECONNREFUSED' || err.message && /database|mysql|mongo|conexão|connection/i.test(err.message)) {
        return res.status(503).json({
            sucesso: false,
            erro: 'Banco de dados indisponível.',
        });
    }

    return res.status(500).json({
        sucesso: false,
        erro: 'Erro interno do servidor.',
    });
}

/**
 * Middleware 404 para rotas não encontradas
 */
function notFound(req, res) {
    res.status(404).json({
        sucesso: false,
        erro: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
    });
}

/**
 * Middleware 503 para quando o banco de dados está indisponível
 * (usado por rotas que dependem de banco quando getPool/getDb falha)
 */
function dbUnavailable(req, res) {
    res.status(503).json({
        sucesso: false,
        erro: 'Banco de dados indisponível.',
    });
}

module.exports = {
    errorHandler,
    notFound,
    dbUnavailable,
};
