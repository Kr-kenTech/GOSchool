// gateway/tests/integration/cardapio.routes.test.mjs
import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';

// Import the actual routes
import cardapioRoutes from '../../src/routes/cardapio.routes.js';

// Mock shared config
mock.module('@goschool/shared/src/config/index.js', {
  default: {
    IS_PRODUCTION: false,
    MYSQL: {
      host: 'localhost',
      port: 3306,
      user: 'test',
      password: 'test',
      database: 'test',
    },
  },
});

// Mock MySQL pool
const mockPool = {
  query: async (sql, params) => {
    // Mock responses based on query
    if (sql.includes('SELECT 1')) {
      return [[{ 1: 1 }]];
    }
    if (sql.includes('FROM cardapio') && sql.includes('ativo = TRUE')) {
      if (sql.includes('ORDER BY')) {
        // Weekly query
        return [[
          { id: 1, nome: 'Arroz com Feijão', descricao: 'Desc', categoria: 'almoco', tipo_refeicao: 'almoco', horario: '12:00', data: null, dia_semana: 'segunda', calorias: 300, proteina: 20, carboidrato: 40, imagem: null, observacoes: null, ativo: 1 },
          { id: 2, nome: 'Frango Grelhado', descricao: 'Desc', categoria: 'almoco', tipo_refeicao: 'almoco', horario: '12:00', data: null, dia_semana: 'terca', calorias: 350, proteina: 30, carboidrato: 10, imagem: null, observacoes: null, ativo: 1 },
        ]];
      } else {
        // Today query
        return [[
          { id: 1, nome: 'Arroz com Feijão', descricao: 'Desc', categoria: 'almoco', tipo_refeicao: 'almoco', horario: '12:00', data: null, dia_semana: 'segunda', calorias: 300, proteina: 20, carboidrato: 40, imagem: null, observacoes: null, ativo: 1 },
        ]];
      }
    }
    if (sql.includes('FROM cardapio_alergicos')) {
      return [[
        { cardapio_id: 1, alergico: 'Glúten' },
        { cardapio_id: 2, alergico: 'Lactose' },
      ]];
    }
    if (sql.includes('FROM usuario_alergias')) {
      return [[]];
    }
    if (sql.includes('INSERT INTO cardapio')) {
      return [{ insertId: 3 }];
    }
    if (sql.includes('INSERT IGNORE INTO cardapio_alergicos')) {
      return [{ affectedRows: 1 }];
    }
    if (sql.includes('UPDATE cardapio')) {
      return [{ affectedRows: 1 }];
    }
    if (sql.includes('DELETE FROM cardapio')) {
      return [{ affectedRows: 1 }];
    }
    if (sql.includes('SELECT DISTINCT alergico FROM cardapio_alergicos')) {
      return [[{ alergico: 'Glúten' }, { alergico: 'Lactose' }]];
    }
    if (sql.includes('SELECT * FROM cardapio WHERE id = ?')) {
      return [[
        { id: 1, nome: 'Arroz com Feijão', descricao: 'Desc', categoria: 'almoco', tipo_refeicao: 'almoco', horario: '12:00', data: null, dia_semana: 'segunda', calorias: 300, proteina: 20, carboidrato: 40, imagem: null, observacoes: null, ativo: 1 },
      ]];
    }
    return [[]];
  },
};

mock.module('@goschool/shared/src/data/mysql.js', {
  getPool: async () => mockPool,
  closePool: async () => {},
  getMySQLHealth: async () => ({ ok: true, service: 'mysql' }),
});

// Mock shared auth
mock.module('@goschool/shared', {
  default: {
    INTERNAL_SHARED_SECRET: 'test-shared-secret-min-32-chars-long',
    INTERNAL_API_KEY: 'test-internal-api-key',
  },
  jwtAuthMiddleware: (req, res, next) => {
    req.user = { sub: 1, email: 'test@test.com', role: 'aluno', nome: 'Test User' };
    next();
  },
  requireRole: (...roles) => (req, res, next) => next(),
  csrfMiddleware: (req, res, next) => next(),
  internalAuthMiddleware: (req, res, next) => next(),
});

describe('Cardápio Routes Integration', () => {
  let app;

  before(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/', cardapioRoutes);
  });

  describe('GET /api/cardapio/hoje', () => {
    it('should return today\'s menu', async () => {
      const res = await request(app)
        .get('/api/cardapio/hoje')
        .expect(200);

      assert.equal(res.body.sucesso, true);
      assert.ok(res.body.cardapio);
      assert.ok(Array.isArray(res.body.cardapio));
    });
  });

  describe('GET /api/cardapio/semana', () => {
    it('should return weekly menu', async () => {
      const res = await request(app)
        .get('/api/cardapio/semana')
        .expect(200);

      assert.equal(res.body.sucesso, true);
      assert.ok(res.body.cardapio);
      assert.ok(res.body.cardapio.segunda);
      assert.ok(res.body.cardapio.terca);
    });
  });

  describe('GET /api/cardapio/categorias', () => {
    it('should return categories and allergens', async () => {
      const res = await request(app)
        .get('/api/cardapio/categorias')
        .expect(200);

      assert.equal(res.body.sucesso, true);
      assert.ok(res.body.categorias);
      assert.ok(res.body.alergicos);
      assert.ok(Array.isArray(res.body.categorias));
      assert.ok(Array.isArray(res.body.alergicos));
    });
  });

  describe('GET /api/cardapio/:id', () => {
    it('should return menu item by ID', async () => {
      const res = await request(app)
        .get('/api/cardapio/1')
        .expect(200);

      assert.equal(res.body.sucesso, true);
      assert.ok(res.body.cardapio);
      assert.equal(res.body.cardapio.id, 1);
    });

    it('should return 400 for invalid ID', async () => {
      const res = await request(app)
        .get('/api/cardapio/invalid')
        .expect(400);

      assert.equal(res.body.sucesso, false);
    });

    it('should return 404 for non-existent item', async () => {
      // Mock pool to return empty for this test
      mockPool.query = async (sql) => {
        if (sql.includes('SELECT * FROM cardapio WHERE id = ?')) {
          return [[]];
        }
        return [[]];
      };

      const res = await request(app)
        .get('/api/cardapio/999')
        .expect(404);

      assert.equal(res.body.sucesso, false);
    });
  });

  describe('POST /api/cardapio', () => {
    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/cardapio')
        .send({ nome: 'Teste' })
        .expect(400);

      assert.equal(res.body.sucesso, false);
    });

    it('should return 400 for invalid category', async () => {
      const res = await request(app)
        .post('/api/cardapio')
        .send({ nome: 'Teste', categoria: 'invalida' })
        .expect(400);

      assert.equal(res.body.sucesso, false);
    });

    it('should create menu item with valid data', async () => {
      const res = await request(app)
        .post('/api/cardapio')
        .send({
          nome: 'Nova Refeição',
          descricao: 'Descrição teste',
          categoria: 'almoco',
          tipo_refeicao: 'almoco',
          horario: '12:00',
          data: '2024-01-15',
          dia_semana: 'segunda',
          calorias: 300,
          proteina: 20,
          carboidrato: 40,
          imagem: null,
          observacoes: 'Observação',
          alergicos: ['Glúten'],
        })
        .expect(201);

      assert.equal(res.body.sucesso, true);
      assert.ok(res.body.cardapio);
      assert.equal(res.body.cardapio.nome, 'Nova Refeição');
    });
  });

  describe('PUT /api/cardapio/:id', () => {
    it('should update menu item', async () => {
      const res = await request(app)
        .put('/api/cardapio/1')
        .send({ nome: 'Refeição Atualizada' })
        .expect(200);

      assert.equal(res.body.sucesso, true);
      assert.equal(res.body.cardapio.nome, 'Refeição Atualizada');
    });

    it('should return 400 for invalid ID', async () => {
      const res = await request(app)
        .put('/api/cardapio/invalid')
        .send({ nome: 'Teste' })
        .expect(400);

      assert.equal(res.body.sucesso, false);
    });

    it('should return 400 for no fields to update', async () => {
      const res = await request(app)
        .put('/api/cardapio/1')
        .send({})
        .expect(400);

      assert.equal(res.body.sucesso, false);
    });
  });

  describe('DELETE /api/cardapio/:id', () => {
    it('should delete menu item', async () => {
      const res = await request(app)
        .delete('/api/cardapio/1')
        .expect(200);

      assert.equal(res.body.sucesso, true);
      assert.equal(res.body.id, 1);
    });

    it('should return 400 for invalid ID', async () => {
      const res = await request(app)
        .delete('/api/cardapio/invalid')
        .expect(400);

      assert.equal(res.body.sucesso, false);
    });

    it('should return 404 for non-existent item', async () => {
      mockPool.query = async (sql) => {
        if (sql.includes('DELETE FROM cardapio')) {
          return [{ affectedRows: 0 }];
        }
        return [[]];
      };

      const res = await request(app)
        .delete('/api/cardapio/999')
        .expect(404);

      assert.equal(res.body.sucesso, false);
    });
  });
});