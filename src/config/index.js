// ======================================================
// CONFIGURAÇÃO CENTRALIZADA — GoSchool
// Carrega .env, valida variáveis e exporta um único objeto
// de configuração usado por todos os serviços.
// ======================================================

require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

// Validação de modo demo em produção
if (process.env.DEMO_MODE === 'true' && isProduction) {
    console.error('[Config] AVISO: DEMO_MODE=true não deve ser usado em produção.');
}

const config = {
    // Ambiente
    NODE_ENV: process.env.NODE_ENV || 'development',
    IS_PRODUCTION: isProduction,
    DEMO_MODE: process.env.DEMO_MODE === 'true',

    // Portas
    GATEWAY_PORT: parseInt(process.env.GATEWAY_PORT, 10) || 3000,
    AUTH_PORT: parseInt(process.env.AUTH_PORT, 10) || 4001,
    RESERVAS_PORT: parseInt(process.env.RESERVAS_PORT, 10) || 4002,

    // Hosts
    GATEWAY_HOST: process.env.GATEWAY_HOST || '0.0.0.0',
    AUTH_HOST: process.env.AUTH_HOST || '127.0.0.1',
    RESERVAS_HOST: process.env.RESERVAS_HOST || '127.0.0.1',

    // URLs dos serviços internos
    AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || 'http://localhost:4001',
    RESERVAS_SERVICE_URL: process.env.RESERVAS_SERVICE_URL || 'http://localhost:4002',

    // MySQL
    MYSQL: {
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'banco_amaral_hub',
    },

    // MongoDB
    MONGO_URL: process.env.MONGO_URL || 'mongodb://localhost:27017',
    MONGO_DB: process.env.MONGO_DB || 'banco_goschool',

    // Segurança
    JWT_SECRET: process.env.JWT_SECRET || 'dev-jwt-secret-key-change-in-production',
    INTERNAL_SHARED_SECRET: process.env.INTERNAL_SHARED_SECRET || 'dev-internal-shared-secret-change-in-production',
    INTERNAL_API_KEY: process.env.INTERNAL_API_KEY || 'dev-internal-api-key-change-in-production',
    CSRF_COOKIE_NAME: process.env.CSRF_COOKIE_NAME || 'csrf_token',

    // Google OAuth
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',

    // Email (Nodemailer)
    EMAIL: {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT, 10) || 587,
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || '',
        from: process.env.EMAIL_FROM || 'GoSchool <noreply@goschool.edu.br>',
    },
};

module.exports = config;
