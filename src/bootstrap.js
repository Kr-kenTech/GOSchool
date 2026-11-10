// ======================================================
// BOOTSTRAP — Inicia todos os serviços (gateway + auth + reservas)
// Porta 3000 (gateway), 4001 (auth), 4002 (reservas)
// Trata EADDRINUSE com fallback de portas alternadas.
// ======================================================

const gatewayApp = require('./gateway/app');
const authApp = require('./services/auth.service');
const reservasApp = require('./services/reservas.service');
const config = require('./config');

// Portas e fallbacks (porta principal → alternativas)
const SERVICE_CONFIGS = [
    {
        name: 'Gateway',
        app: gatewayApp,
        port: config.GATEWAY_PORT,
        fallbacks: [3001, 3002],
        host: config.GATEWAY_HOST,
    },
    {
        name: 'Auth Service',
        app: authApp,
        port: config.AUTH_PORT,
        fallbacks: [4003, 4004],
        host: config.AUTH_HOST,
    },
    {
        name: 'Reservas Service',
        app: reservasApp,
        port: config.RESERVAS_PORT,
        fallbacks: [4005, 4006],
        host: config.RESERVAS_HOST,
    },
];

const servers = [];

/**
 * Tenta iniciar um serviço em uma porta, com fallback em caso de EADDRINUSE.
 */
async function startService(service) {
    const portsToTry = [service.port, ...service.fallbacks];

    for (const port of portsToTry) {
        try {
            await new Promise((resolve, reject) => {
                const server = service.app.listen(port, service.host, () => {
                    servers.push(server);
                    console.log(
                        `[${service.name}] Rodando na porta ${port} (host: ${service.host})`
                    );
                    resolve();
                });
                server.on('error', (err) => {
                    if (err.code === 'EADDRINUSE') {
                        console.warn(
                            `[${service.name}] Porta ${port} em uso, tentando próxima...`
                        );
                        reject(new Error('EADDRINUSE'));
                    } else {
                        reject(err);
                    }
                });
            });
            return; // Sucesso — saiu do loop
        } catch (err) {
            if (err.message === 'EADDRINUSE') {
                continue; // Tenta próxima porta
            }
            throw err;
        }
    }

    // Todas as portas falharam
    console.error(
        `[${service.name}] Falha ao iniciar: todas as portas ocupadas (${portsToTry.join(', ')}). Libere uma porta e tente novamente.`
    );
    process.exit(1);
}

/**
 * Inicializa todos os serviços.
 */
async function bootstrap() {
    console.log('========================================');
    console.log('  GoSchool — Inicializando serviços');
    console.log('========================================');
    console.log(`NODE_ENV: ${config.NODE_ENV}`);
    console.log(`DEMO_MODE: ${config.DEMO_MODE ? 'ON' : 'OFF'}`);
    console.log('========================================\n');

    await Promise.all(SERVICE_CONFIGS.map((svc) => startService(svc)));

    console.log('\n========================================');
    console.log('  Todos os serviços estão online');
    console.log('========================================');
    console.log(`Gateway:        http://${config.GATEWAY_HOST}:${servers[0] ? servers[0].address().port : config.GATEWAY_PORT}`);
    console.log(`Auth Service:   http://${config.AUTH_HOST}:${servers[1] ? servers[1].address().port : config.AUTH_PORT}`);
    console.log(`Reservas Service: http://${config.RESERVAS_HOST}:${servers[2] ? servers[2].address().port : config.RESERVAS_PORT}`);
    console.log('========================================\n');
}

/**
 * Encerramento graceful (SIGTERM / SIGINT).
 */
function shutdown(signal) {
    console.log(`\n[Bootstrap] Recebido ${signal}, encerrando serviços...`);
    for (const server of servers) {
        server.close(() => {
            console.log('[Bootstrap] Servidor encerrado.');
        });
    }
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Iniciar apenas quando executado diretamente
if (require.main === module) {
    bootstrap().catch((err) => {
        console.error('[Bootstrap] Erro ao iniciar serviços:', err);
        process.exit(1);
    });
}

module.exports = { bootstrap, servers, SERVICE_CONFIGS };
