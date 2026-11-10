// ============================================================
// GATEWAY APP — GOSchool (ESM)
// Entry point: porta 3000, arquivos estáticos, proxy de API
// ============================================================

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';

import config from '@goschool/shared/src/config/index.js';
import {
  errorHandler,
  notFound,
  dbUnavailable,
} from './middleware/error.middleware.js';

import routes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const GATEWAY_PORT = config.GATEWAY_PORT;
const IS_PRODUCTION = config.IS_PRODUCTION;

// ============================================================
// MIDDLEWARE GLOBAL
// ============================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ============================================================
// ARQUIVOS ESTÁTICOS — Frontend em public/
// Estrutura de subpastas preservada exatamente.
// URLs padronizadas: lowercase, kebab-case
// ============================================================

const publicDir = path.join(__dirname, '../../public');

// Páginas principais
app.use('/inicio', express.static(path.join(publicDir, 'Inicio')));
app.use('/login', express.static(path.join(publicDir, 'Login')));
app.use('/aluno', express.static(path.join(publicDir, 'Aluno'), { index: 'index.html' }));
app.use('/professor', express.static(path.join(publicDir, 'Professor'), { index: 'index.html' }));
app.use('/adm', express.static(path.join(publicDir, 'Admin'), { index: 'adm.html' }));
app.use('/cardapio', express.static(path.join(publicDir, 'Cardapio'), { index: 'index.html' }));
app.use('/reservas', express.static(path.join(publicDir, 'Reservas'), { index: 'index.html' }));
app.use('/configuracoes', express.static(path.join(publicDir, 'Configuracoes'), { index: 'index.html' }));
app.use('/desperdicio', express.static(path.join(publicDir, 'Desperdicio'), { index: 'index.html' }));

// Arquivos estáticos globais (raiz pública: logo, css, js, etc.)
app.use(
  express.static(publicDir, {
    extensions: ['png', 'jpg', 'jpeg', 'css', 'js', 'mp4'],
  })
);

// Redirecionar raiz para /inicio
app.get('/', (req, res) => {
  res.redirect('/inicio');
});

// ============================================================
// ROTAS DA API
// ============================================================

routes(app);

// ============================================================
// HEALTH CHECK
// ============================================================

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

// ============================================================
// TRATAMENTO DE ERROS
// ============================================================

// 404 para rotas não encontradas
app.use(notFound);

// Handler global de erros (deve ser o último middleware)
app.use(errorHandler);

export default app;

// ============================================================
// INICIAR SERVIDOR (apenas quando executado diretamente)
// ============================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(GATEWAY_PORT, config.GATEWAY_HOST, () => {
    console.log(`[Gateway] Rodando na porta ${GATEWAY_PORT}`);
    console.log(`[Gateway] Auth Service: ${config.AUTH_SERVICE_URL}`);
    console.log(`[Gateway] Reservas Service: ${config.RESERVAS_SERVICE_URL}`);
    console.log(`[Gateway] Demo Mode: ${config.DEMO_MODE ? 'ON' : 'OFF'}`);
    console.log(`[Gateway] NODE_ENV: ${config.NODE_ENV}`);
  });
}