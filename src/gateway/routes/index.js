// ======================================================
// ROTEADOR PRINCIPAL — Gateway (porta 3000)
// Monta todos os módulos de rota da aplicação.
// ======================================================

const authRoutes = require('./auth.routes');
const reservasRoutes = require('./reservas.routes');
const usuarioRoutes = require('./usuario.routes');
const cardapioRoutes = require('./cardapio.routes');
const desperdicioRoutes = require('./desperdicio.routes');
const emailRoutes = require('./email.routes');

module.exports = (app) => {
    // Rotas de autenticação (inclui páginas estáticas de login/inicio)
    app.use('/', authRoutes);

    // Rotas de reservas
    app.use('/', reservasRoutes);

    // Rotas de usuário
    app.use('/', usuarioRoutes);

    // Rotas de cardápio
    app.use('/', cardapioRoutes);

    // Rotas de desperdício
    app.use('/', desperdicioRoutes);

    // Rotas de e-mail (consentimento)
    app.use('/', emailRoutes);
};
