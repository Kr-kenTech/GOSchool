// ======================================================
// ENTRY POINT — GoSchool
// Execução: node server.js
// Inicia o gateway (3000), auth-service (4001) e reservas-service (4002).
// ======================================================

const { bootstrap } = require('./src/bootstrap');

bootstrap().catch((err) => {
    console.error('[Bootstrap] Erro ao iniciar serviços:', err);
    process.exit(1);
});
