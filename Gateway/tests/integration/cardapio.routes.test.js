// gateway/tests/integration/cardapio.routes.test.js
import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import cardapioRoutes from '../../src/routes/cardapio.routes.js';

jest.mock('@goschool/shared', () => ({
  default: {
    INTERNAL_SHARED_SECRET: 'test-shared-secret-min-32-chars-long',
    INTERNAL_API_KEY: 'test-internal-api-key',
  },
  jwtMiddleware: jest.fn((req, res, next) => {
    req.user = { sub: 1, email: 'test@test.com', role: 'aluno', nome: 'Test User' };
    next();
  }),
}));

jest.mock('../../src/services/cardapio.service.js', () => ({
  default: {
    getCardapioSemanal: jest.fn().mockResolvedValue({
      cardapio: [
        { diaSemana: 1, diaNome: 'Segunda-feira', refeicoes: [{ id: 1, nome: 'Arroz com Feijão', tipo: 'almoco' }] },
        { diaSemana: 2, diaNome: 'Terça-feira', refeicoes: [{ id: 2, nome: 'Frango Grelhado', tipo: 'almoco' }] },
      ],
      alergenosUsuario: [],
    }),
    listRefeicoes: jest.fn().mockResolvedValue({
      refeicoes: [
        { id: 1, nome: 'Arroz com Feijão', tipo: 'almoco', diaSemana: 1 },
        { id: 2, nome: 'Frango Grelhado', tipo: 'almoco', diaSemana: 2 },
      ],
      pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
    }),
    createRefeicao: jest.fn().mockResolvedValue({ id: 3, nome: 'Nova Refeição', tipo: 'jantar', diaSemana: 3 }),
    getRefeicaoById: jest.fn().mockResolvedValue({ id: 1, nome: 'Arroz com Feijão', tipo: 'almoco', diaSemana: 1 }),
    updateRefeicao: jest.fn().mockResolvedValue({ id: 1, nome: 'Arroz Atualizado', tipo: 'almoco', diaSemana: 1 }),
    deleteRefeicao: jest.fn().mockResolvedValue({ success: true }),
    listAlergenos: jest.fn().mockResolvedValue({ alergenos: [{ id: 1, nome: 'Glúten' }] }),
    createAlergeno: jest.fn().mockResolvedValue({ id: 2, nome: 'Lactose' }),
    deleteAlergeno: jest.fn().mockResolvedValue({ success: true }),
  },
}));

describe('Cardápio Routes Integration', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/cardapio', cardapioRoutes);
  });

  describe('GET /api/cardapio/semanal', () => {
    it('should return weekly menu', async () => {
      const res = await request(app)
        .get('/api/cardapio/semanal')
        .expect(200);

      expect(res.body.sucesso).toBe(true);
      expect(res.body.data.cardapio).toBeDefined();
      expect(Array.isArray(res.body.data.cardapio)).toBe(true);
      expect(res.body.data.cardapio.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/cardapio/refeicoes', () => {
    it('should return paginated meals list', async () => {
      const res = await request(app)
        .get('/api/cardapio/refeicoes')
        .expect(200);

      expect(res.body.sucesso).toBe(true);
      expect(res.body.data.refeicoes).toBeDefined();
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.page).toBe(1);
    });

    it('should accept page and limit params', async () => {
      const res = await request(app)
        .get('/api/cardapio/refeicoes?page=2&limit=10')
        .expect(200);

      expect(res.body.sucesso).toBe(true);
    });

    it('should filter by diaSemana and tipo', async () => {
      const res = await request(app)
        .get('/api/cardapio/refeicoes?diaSemana=1&tipo=almoco')
        .expect(200);

      expect(res.body.sucesso).toBe(true);
    });
  });

  describe('POST /api/cardapio/refeicoes', () => {
    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/cardapio/refeicoes')
        .send({ nome: 'Teste' })
        .expect(400);

      expect(res.body.sucesso).toBe(false);
    });

    it('should create meal with valid data', async () => {
      const res = await request(app)
        .post('/api/cardapio/refeicoes')
        .send({
          nome: 'Nova Refeição',
          tipo: 'jantar',
          diaSemana: 3,
          descricao: 'Descrição teste',
          alergenosIds: [1],
        })
        .expect(201);

      expect(res.body.sucesso).toBe(true);
      expect(res.body.data.id).toBeDefined();
    });
  });

  describe('GET /api/cardapio/refeicoes/:id', () => {
    it('should return meal by ID', async () => {
      const res = await request(app)
        .get('/api/cardapio/refeicoes/1')
        .expect(200);

      expect(res.body.sucesso).toBe(true);
      expect(res.body.data.id).toBe(1);
    });
  });

  describe('PUT /api/cardapio/refeicoes/:id', () => {
    it('should update meal', async () => {
      const res = await request(app)
        .put('/api/cardapio/refeicoes/1')
        .send({ nome: 'Refeição Atualizada' })
        .expect(200);

      expect(res.body.sucesso).toBe(true);
      expect(res.body.data.nome).toBe('Refeição Atualizada');
    });
  });

  describe('DELETE /api/cardapio/refeicoes/:id', () => {
    it('should delete meal', async () => {
      const res = await request(app)
        .delete('/api/cardapio/refeicoes/1')
        .expect(200);

      expect(res.body.sucesso).toBe(true);
    });
  });

  describe('GET /api/cardapio/alergenos', () => {
    it('should return allergens list', async () => {
      const res = await request(app)
        .get('/api/cardapio/alergenos')
        .expect(200);

      expect(res.body.sucesso).toBe(true);
      expect(res.body.data.alergenos).toBeDefined();
    });
  });

  describe('POST /api/cardapio/alergenos', () => {
    it('should create allergen', async () => {
      const res = await request(app)
        .post('/api/cardapio/alergenos')
        .send({ nome: 'Novo Alérgeno', icone: 'icon', descricao: 'Desc' })
        .expect(201);

      expect(res.body.sucesso).toBe(true);
    });

    it('should return 400 for missing nome', async () => {
      const res = await request(app)
        .post('/api/cardapio/alergenos')
        .send({})
        .expect(400);

      expect(res.body.sucesso).toBe(false);
    });
  });

  describe('DELETE /api/cardapio/alergenos/:id', () => {
    it('should delete allergen', async () => {
      const res = await request(app)
        .delete('/api/cardapio/alergenos/1')
        .expect(200);

      expect(res.body.sucesso).toBe(true);
    });
  });
});