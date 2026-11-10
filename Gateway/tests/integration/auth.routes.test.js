// gateway/tests/integration/auth.routes.test.js
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from '../../src/routes/auth.routes.js';
import { authMiddleware } from '../../src/middleware/auth.middleware.js';

jest.mock('@goschool/shared', () => ({
  default: {
    INTERNAL_SHARED_SECRET: 'test-shared-secret-min-32-chars-long',
    INTERNAL_API_KEY: 'test-internal-api-key',
  },
  jwtMiddleware: jest.fn((req, res, next) => {
    // Simulate authenticated user for testing
    req.user = { sub: 1, email: 'test@test.com', role: 'aluno', nome: 'Test User' };
    next();
  }),
  internalAuthMiddleware: jest.fn((req, res, next) => next()),
}));

jest.mock('../../src/services/auth.service.js', () => ({
  default: {
    login: jest.fn().mockResolvedValue({
      user: { id: 1, nome: 'Test User', email: 'test@test.com', role: 'aluno' },
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      csrfToken: 'mock-csrf-token',
    }),
    register: jest.fn().mockResolvedValue({
      user: { id: 2, nome: 'New User', email: 'new@test.com', role: 'aluno' },
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      csrfToken: 'mock-csrf-token',
    }),
    logout: jest.fn().mockResolvedValue({ success: true }),
    refreshToken: jest.fn().mockResolvedValue({
      accessToken: 'new-access-token',
      csrfToken: 'new-csrf-token',
    }),
    getMe: jest.fn().mockResolvedValue({ id: 1, nome: 'Test User', email: 'test@test.com', role: 'aluno' }),
    changePassword: jest.fn().mockResolvedValue({ success: true }),
    googleAuthUrl: jest.fn().mockResolvedValue({ authUrl: 'https://google.com/auth', state: 'state123' }),
    googleCallback: jest.fn().mockResolvedValue({
      user: { id: 1, nome: 'Test User', email: 'test@test.com', role: 'aluno' },
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      csrfToken: 'mock-csrf-token',
    }),
    demoLogin: jest.fn().mockResolvedValue({
      user: { id: 1, nome: 'Demo User', email: 'demo@test.com', role: 'aluno' },
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      csrfToken: 'mock-csrf-token',
    }),
  },
}));

describe('Auth Routes Integration', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/auth', authRoutes);
  });

  describe('POST /auth/login', () => {
    it('should return 400 for missing email', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ password: 'password123' })
        .expect(400);

      expect(res.body.sucesso).toBe(false);
      expect(res.body.erro.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'test@test.com' })
        .expect(400);

      expect(res.body.sucesso).toBe(false);
    });

    it('should return 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'invalid-email', password: 'password123' })
        .expect(400);

      expect(res.body.sucesso).toBe(false);
    });

    it('should return 200 for valid credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'test@test.com', password: 'password123' })
        .expect(200);

      expect(res.body.sucesso).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.csrfToken).toBeDefined();
      // Check cookies are set
      expect(res.headers['set-cookie']).toBeDefined();
      const cookies = res.headers['set-cookie'];
      expect(cookies.some(c => c.startsWith('access_token='))).toBe(true);
      expect(cookies.some(c => c.startsWith('refresh_token='))).toBe(true);
    });
  });

  describe('POST /auth/register', () => {
    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'test@test.com' })
        .expect(400);

      expect(res.body.sucesso).toBe(false);
    });

    it('should return 201 for valid registration', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          nome: 'New User',
          email: 'new@test.com',
          password: 'SenhaForte123!',
          role: 'aluno',
        })
        .expect(201);

      expect(res.body.sucesso).toBe(true);
      expect(res.body.data.user).toBeDefined();
    });
  });

  describe('POST /auth/logout', () => {
    it('should return 200 and clear cookies', async () => {
      const res = await request(app)
        .post('/auth/logout')
        .set('Cookie', ['access_token=old; HttpOnly', 'refresh_token=old; HttpOnly'])
        .expect(200);

      expect(res.body.sucesso).toBe(true);
      const cookies = res.headers['set-cookie'];
      expect(cookies.some(c => c.startsWith('access_token=;') && c.includes('Max-Age=0'))).toBe(true);
      expect(cookies.some(c => c.startsWith('refresh_token=;') && c.includes('Max-Age=0'))).toBe(true);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should return 401 without refresh token cookie', async () => {
      const res = await request(app)
        .post('/auth/refresh')
        .expect(401);

      expect(res.body.sucesso).toBe(false);
    });

    it('should return 200 with valid refresh token', async () => {
      const res = await request(app)
        .post('/auth/refresh')
        .set('Cookie', ['refresh_token=valid-refresh-token; HttpOnly'])
        .expect(200);

      expect(res.body.sucesso).toBe(true);
      expect(res.body.data.csrfToken).toBeDefined();
    });
  });

  describe('GET /auth/me', () => {
    it('should return 401 without auth', async () => {
      // Create app without jwtMiddleware for this test
      const testApp = express();
      testApp.use(express.json());
      testApp.use(cookieParser());
      // Import routes without middleware mock
      const authRoutesNoMock = (await import('../../src/routes/auth.routes.js')).default;
      testApp.use('/auth', authRoutesNoMock);

      const res = await request(testApp)
        .get('/auth/me')
        .expect(401);

      expect(res.body.sucesso).toBe(false);
    });
  });

  describe('GET /auth/google', () => {
    it('should return Google auth URL', async () => {
      const res = await request(app)
        .get('/auth/google')
        .expect(200);

      expect(res.body.sucesso).toBe(true);
      expect(res.body.data.authUrl).toContain('google.com');
      expect(res.body.data.state).toBeDefined();
    });
  });

  describe('POST /auth/change-password', () => {
    it('should return 400 for missing fields', async () => {
      const res = await request(app)
        .post('/auth/change-password')
        .set('Cookie', ['access_token=token; HttpOnly'])
        .send({ currentPassword: 'old' })
        .expect(400);

      expect(res.body.sucesso).toBe(false);
    });

    it('should return 200 for valid change', async () => {
      const res = await request(app)
        .post('/auth/change-password')
        .set('Cookie', ['access_token=token; HttpOnly'])
        .send({ currentPassword: 'OldPass123!', newPassword: 'NewPass123!' })
        .expect(200);

      expect(res.body.sucesso).toBe(true);
    });
  });

  describe('POST /auth/demo-login', () => {
    const originalDemoMode = process.env.DEMO_MODE;

    beforeAll(() => {
      process.env.DEMO_MODE = 'true';
    });

    afterAll(() => {
      process.env.DEMO_MODE = originalDemoMode;
    });

    it('should return 403 when demo mode disabled', async () => {
      process.env.DEMO_MODE = 'false';
      jest.resetModules();

      const testApp = express();
      testApp.use(express.json());
      testApp.use(cookieParser());
      const authRoutesFresh = (await import('../../src/routes/auth.routes.js')).default;
      testApp.use('/auth', authRoutesFresh);

      const res = await request(testApp)
        .post('/auth/demo-login')
        .send({ role: 'aluno' })
        .expect(403);

      expect(res.body.sucesso).toBe(false);
    });

    it('should return 200 when demo mode enabled', async () => {
      process.env.DEMO_MODE = 'true';
      jest.resetModules();

      const testApp = express();
      testApp.use(express.json());
      testApp.use(cookieParser());
      const authRoutesFresh = (await import('../../src/routes/auth.routes.js')).default;
      testApp.use('/auth', authRoutesFresh);

      const res = await request(testApp)
        .post('/auth/demo-login')
        .send({ role: 'aluno' })
        .expect(200);

      expect(res.body.sucesso).toBe(true);
    });
  });
});