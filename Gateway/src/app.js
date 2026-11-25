// ============================================================
// GATEWAY APP — GOSchool (ESM)
// Entry point: porta 3000, arquivos estáticos e rotas da API.
// ============================================================

import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import cookieParser from 'cookie-parser';

import config from '@goschool/shared/src/config/index.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import routes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const GATEWAY_PORT = config.GATEWAY_PORT;

// ============================================================
// MIDDLEWARE GLOBAL
// ============================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ============================================================
// ARQUIVOS ESTÁTICOS — Gateway/public
// ============================================================

const publicDir = path.resolve(__dirname, '../public');

app.use('/inicio', express.static(path.join(publicDir, 'Inicio')));
app.use('/login', express.static(path.join(publicDir, 'Login')));
app.use('/aluno', express.static(path.join(publicDir, 'Aluno'), { index: 'index.html' }));
app.use('/professor', express.static(path.join(publicDir, 'Professor'), { index: 'index.html' }));
app.use('/adm', express.static(path.join(publicDir, 'Admin'), { index: 'adm.html' }));
app.use('/cardapio', express.static(path.join(publicDir, 'Cardapio'), { index: 'index.html' }));
app.use('/reservas', express.static(path.join(publicDir, 'Reservas'), { index: 'index.html' }));
app.use('/configuracoes', express.static(path.join(publicDir, 'Configuracoes'), { index: 'index.html' }));
app.use('/desperdicio', express.static(path.join(publicDir, 'Desperdicio'), { index: 'index.html' }));

// Arquivos globais: logo, CSS, JavaScript e mídia.
app.use(express.static(publicDir, {
  extensions: ['html', 'png', 'jpg', 'jpeg', 'css', 'js', 'mp4'],
}));

// Raiz do site.
app.get('/', (_req, res) => {
  res.redirect('/inicio');
});

// ============================================================
// ROTAS DA API
// ============================================================

routes(app);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'gateway',
    timestamp: new Date().toISOString(),
    demoMode: config.DEMO_MODE,
  });
});

app.get('/internal/health', (req, res) => {
  const apiKey = req.headers['x-internal-api-key'];

  if (!config.INTERNAL_API_KEY || apiKey !== config.INTERNAL_API_KEY) {
    return res.status(401).json({ status: 'unauthorized' });
  }

  return res.json({
    status: 'ok',
    service: 'gateway',
    timestamp: new Date().toISOString(),
    demoMode: config.DEMO_MODE,
  });
});

// ============================================================
// TRATAMENTO DE ERROS
// ============================================================

app.use(notFound);
app.use(errorHandler);

export default app;

// ============================================================
// INICIAR SERVIDOR APENAS QUANDO EXECUTADO DIRETAMENTE
// Compatível com Windows e Linux.
// ============================================================

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;

if (invokedPath === import.meta.url) {
  app.listen(GATEWAY_PORT, config.GATEWAY_HOST, () => {
    console.log(`[Gateway] Rodando em http://localhost:${GATEWAY_PORT}`);
    console.log(`[Gateway] Auth Service: ${config.AUTH_SERVICE_URL}`);
    console.log(`[Gateway] Reservas Service: ${config.RESERVAS_SERVICE_URL}`);
    console.log(`[Gateway] Demo Mode: ${config.DEMO_MODE ? 'ON' : 'OFF'}`);
    console.log(`[Gateway] NODE_ENV: ${config.NODE_ENV}`);
  });
}
