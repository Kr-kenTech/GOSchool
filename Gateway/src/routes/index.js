// ============================================================
// ROTEADOR PRINCIPAL — GOSchool Gateway (ESM)
// Monta todos os módulos de rota da aplicação.
// ============================================================

import authRoutes from './auth.routes.js';
import reservasRoutes from './reservas.routes.js';
import usuarioRoutes from './usuario.routes.js';
import cardapioRoutes from './cardapio.routes.js';
import desperdicioRoutes from './desperdicio.routes.js';
import emailRoutes from './email.routes.js';

export default (app) => {
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