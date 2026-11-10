// ======================================================
// GATEWAY APP — Express (porta 3000)
// Extraído de Gateway/server.js e adaptado para a nova arquitetura.
// Exporta `app` (ouve na porta apenas via src/bootstrap.js).
// ======================================================

require('dotenv').config();

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

const config = require('../config');
const {
    errorHandler,
    notFound,
    dbUnavailable,
} = require('./middleware/error.middleware');

const app = express();
const GATEWAY_PORT = config.GATEWAY_PORT;
const IS_PRODUCTION = config.IS_PRODUCTION;

// ======================================================
// MIDDLEWARE GLOBAL
// ======================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ======================================================
// ARQUIVOS ESTÁTICOS — Frontend em public/
// Estrutura de subpastas preservada exatamente.
// ======================================================

const publicDir = path.join(__dirname, '../../public');

// Rotas de perfil com índice customizado
app.use('/Reservas', express.static(path.join(publicDir, 'Reservas')));
app.use('/Inicio', express.static(path.join(publicDir, 'Inicio')));
app.use('/Login', express.static(path.join(publicDir, 'Login')));
app.use('/relatorios', express.static(path.join(publicDir, 'Relatórios')));
app.use('/configuracoes', express.static(path.join(publicDir, 'Configuracoes'), { index: 'config.html' }));
app.use('/Cardapio', express.static(path.join(publicDir, 'Cardapio'), { index: 'cardapio.html' }));
app.use('/Desperdicio', express.static(path.join(publicDir, 'Desperdício'), { index: 'dashboard.html' }));
app.use('/Aluno', express.static(path.join(publicDir, 'Aluno'), { index: 'index.html' }));
app.use('/Professor', express.static(path.join(publicDir, 'Professor'), { index: 'index.html' }));
app.use('/adm', express.static(path.join(publicDir, 'Admin'), { index: 'adm.html' }));

// Arquivos estáticos globais (raiz pública: logo, css, js, etc.)
app.use(
    express.static(publicDir, {
        extensions: ['png', 'jpg', 'jpeg', 'css', 'js', 'mp4'],
    })
);

// ======================================================
// ROTAS DA API
// ======================================================

const routes = require('./routes');
routes(app);

// ======================================================
// HEALTH CHECK
// ======================================================

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'gateway',
        timestamp: new Date().toISOString(),
        demoMode: config.DEMO_MODE,
    });
});

app.get('/internal/health', (req, res) => {
    const apiKey = req.headers['x-internal-api-key'];
    if (apiKey !== config.INTERNAL_API_KEY) {
        return res.status(401).json({ status: 'unauthorized' });
    }
    res.json({
        status: 'ok',
        service: 'gateway',
        timestamp: new Date().toISOString(),
        demoMode: config.DEMO_MODE,
    });
});

// ======================================================
// TRATAMENTO DE ERROS
// ======================================================

// 404 para rotas não encontradas
app.use(notFound);

// Handler global de erros (deve ser o último middleware)
app.use(errorHandler);

module.exports = app;

// ======================================================
// INICIAR SERVIDOR (apenas quando executado diretamente)
// ======================================================

if (require.main === module) {
    app.listen(GATEWAY_PORT, () => {
        console.log(`[Gateway] Rodando na porta ${GATEWAY_PORT}`);
        console.log(`[Gateway] Auth Service: ${config.AUTH_SERVICE_URL}`);
        console.log(`[Gateway] Reservas Service: ${config.RESERVAS_SERVICE_URL}`);
        console.log(`[Gateway] Demo Mode: ${config.DEMO_MODE ? 'ON' : 'OFF'}`);
        console.log(`[Gateway] NODE_ENV: ${config.NODE_ENV}`);
    });
}
