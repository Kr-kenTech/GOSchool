// ============================================================
// ROTAS DE CARDÁPIO — GOSchool Gateway (ESM)
// Endpoints: GET/POST/PUT/DELETE /api/cardapio/*,
// GET /api/cardapio/categorias, /hoje, /semana, /api/usuario/alergias
// Usa MySQL lazy via @goschool/shared.
// ============================================================

import express from 'express';
import {
  authMiddleware,
  requireRole,
  csrfMiddleware,
} from '../middleware/auth.middleware.js';
import { getPool } from '@goschool/shared/src/data/mysql.js';
import config from '@goschool/shared/src/config/index.js';

const router = express.Router();

const IS_PRODUCTION = config.IS_PRODUCTION;

// ============================================================
// Helper: formata itens do cardápio com alérgenos
// ============================================================

async function formatCardapioItems(items, pool) {
  if (!items || items.length === 0) return [];

  const itemIds = items.map((item) => item.id);
  const placeholders = itemIds.map(() => '?').join(',');

  const [alergicosRows] = await pool.query(
    `SELECT cardapio_id, alergico FROM cardapio_alergicos WHERE cardapio_id IN (${placeholders})`,
    itemIds
  );

  const alergicosMap = {};
  for (const row of alergicosRows) {
    if (!alergicosMap[row.cardapio_id]) {
      alergicosMap[row.cardapio_id] = [];
    }
    alergicosMap[row.cardapio_id].push(row.alergico);
  }

  return items.map((item) => ({
    id: item.id,
    nome: item.nome,
    descricao: item.descricao,
    categoria: item.categoria,
    tipo_refeicao: item.tipo_refeicao,
    horario: item.horario,
    data: item.data,
    dia_semana: item.dia_semana,
    calorias: item.calorias,
    proteina: item.proteina,
    carboidrato: item.carboidrato,
    imagem: item.imagem,
    observacoes: item.observacoes,
    alergicos: alergicosMap[item.id] || [],
  }));
}

// ============================================================
// GET /api/cardapio/hoje — Cardápio do dia (todos autenticados)
// ============================================================

router.get('/api/cardapio/hoje', authMiddleware, async (req, res) => {
  try {
    const pool = await getPool();
    const hoje = new Date().toISOString().split('T')[0];
    const diaSemana = [
      'domingo',
      'segunda',
      'terca',
      'quarta',
      'quinta',
      'sexta',
      'sabado',
    ][new Date().getDay()];

    const [rows] = await pool.query(
      `SELECT * FROM cardapio
       WHERE ativo = TRUE
       AND (data = ? OR dia_semana = ?)
       ORDER BY
          CASE categoria
              WHEN 'cafe_manha' THEN 1
              WHEN 'almoco' THEN 2
              WHEN 'lanche' THEN 3
              WHEN 'jantar' THEN 4
              ELSE 5
          END`,
      [hoje, diaSemana]
    );

    const cardapioFormatado = await formatCardapioItems(rows, pool);

    if (req.user.role === 'aluno') {
      const [userAlergias] = await pool.query(
        'SELECT alergia FROM usuario_alergias WHERE usuario_id = ?',
        [req.user.sub]
      );
      const userAlergiasSet = new Set(userAlergias.map((a) => a.alergia.toLowerCase()));

      for (const item of cardapioFormatado) {
        item.alertaAlergia = item.alergicos.some((a) =>
          userAlergiasSet.has(a.toLowerCase())
        );
      }
    }

    return res.json({
      sucesso: true,
      cardapio: cardapioFormatado,
      data: hoje,
      dia_semana: diaSemana,
    });
  } catch (error) {
    console.error('[Gateway] Erro ao buscar cardápio do dia:', error);
    return res.status(500).json({ sucesso: false, erro: 'Erro ao buscar cardápio.' });
  }
});

// ============================================================
// GET /api/cardapio/semana — Cardápio semanal (todos autenticados)
// ============================================================

router.get('/api/cardapio/semana', authMiddleware, async (req, res) => {
  try {
    const pool = await getPool();

    const [rows] = await pool.query(
      `SELECT * FROM cardapio
       WHERE ativo = TRUE
       ORDER BY
          CASE dia_semana
              WHEN 'segunda' THEN 1
              WHEN 'terca' THEN 2
              WHEN 'quarta' THEN 3
              WHEN 'quinta' THEN 4
              WHEN 'sexta' THEN 5
              WHEN 'sabado' THEN 6
              WHEN 'domingo' THEN 7
              ELSE 8
          END,
          CASE categoria
              WHEN 'cafe_manha' THEN 1
              WHEN 'almoco' THEN 2
              WHEN 'lanche' THEN 3
              WHEN 'jantar' THEN 4
              ELSE 5
          END`
    );

    const cardapioFormatado = await formatCardapioItems(rows, pool);

    const diasOrdem = [
      'segunda',
      'terca',
      'quarta',
      'quinta',
      'sexta',
      'sabado',
      'domingo',
    ];
    const cardapioSemanal = {};

    for (const dia of diasOrdem) {
      cardapioSemanal[dia] = cardapioFormatado.filter((item) => item.dia_semana === dia);
    }

    if (req.user.role === 'aluno') {
      const [userAlergias] = await pool.query(
        'SELECT alergia FROM usuario_alergias WHERE usuario_id = ?',
        [req.user.sub]
      );
      const userAlergiasSet = new Set(userAlergias.map((a) => a.alergia.toLowerCase()));

      for (const dia of diasOrdem) {
        for (const item of cardapioSemanal[dia]) {
          item.alertaAlergia = item.alergicos.some((a) =>
            userAlergiasSet.has(a.toLowerCase())
          );
        }
      }
    }

    return res.json({
      sucesso: true,
      cardapio: cardapioSemanal,
    });
  } catch (error) {
    console.error('[Gateway] Erro ao buscar cardápio semanal:', error);
    return res.status(500).json({ sucesso: false, erro: 'Erro ao buscar cardápio semanal.' });
  }
});

// ============================================================
// GET /api/cardapio/categorias — Categorias e alérgenos (todos autenticados)
// ============================================================

router.get('/api/cardapio/categorias', authMiddleware, async (req, res) => {
  try {
    const categorias = [
      { value: 'cafe_manha', label: 'Café da Manhã', icon: 'utensils' },
      { value: 'almoco', label: 'Almoço', icon: 'utensils' },
      { value: 'lanche', label: 'Lanche', icon: 'cookie-bite' },
      { value: 'jantar', label: 'Jantar', icon: 'moon' },
    ];

    const pool = await getPool();
    const [alergenicosRows] = await pool.query(
      'SELECT DISTINCT alergico FROM cardapio_alergicos ORDER BY alergico'
    );
    const alergicos = alergenicosRows.map((r) => r.alergico);

    return res.json({
      sucesso: true,
      categorias,
      alergicos,
    });
  } catch (error) {
    console.error('[Gateway] Erro ao buscar categorias:', error);
    return res.status(500).json({ sucesso: false, erro: 'Erro ao buscar categorias.' });
  }
});

// ============================================================
// GET /api/cardapio/:id — Item individual do cardápio (todos autenticados)
// ============================================================

router.get('/api/cardapio/:id', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ sucesso: false, erro: 'ID inválido.' });
    }

    const pool = await getPool();
    const [rows] = await pool.query('SELECT * FROM cardapio WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ sucesso: false, erro: 'Item do cardápio não encontrado.' });
    }

    const itemFormatado = await formatCardapioItems(rows, pool);
    let item = itemFormatado[0];

    if (req.user.role === 'aluno') {
      const [userAlergias] = await pool.query(
        'SELECT alergia FROM usuario_alergias WHERE usuario_id = ?',
        [req.user.sub]
      );
      const userAlergiasSet = new Set(userAlergias.map((a) => a.alergia.toLowerCase()));
      item.alertaAlergia = item.alergicos.some((a) =>
        userAlergiasSet.has(a.toLowerCase())
      );
    }

    return res.json({
      sucesso: true,
      cardapio: item,
    });
  } catch (error) {
    console.error('[Gateway] Erro ao buscar item do cardápio:', error);
    return res.status(500).json({ sucesso: false, erro: 'Erro interno ao buscar item.' });
  }
});

// ============================================================
// POST /api/cardapio — Criar item do cardápio (apenas adm)
// ============================================================

router.post('/api/cardapio', authMiddleware, requireRole('adm'), csrfMiddleware, async (req, res) => {
  try {
    const {
      nome,
      descricao,
      categoria,
      tipo_refeicao,
      horario,
      data,
      dia_semana,
      calorias,
      proteina,
      carboidrato,
      imagem,
      observacoes,
      alergicos,
    } = req.body;

    if (!nome || !categoria) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Nome e categoria são obrigatórios.',
      });
    }

    const categoriasValidas = ['cafe_manha', 'almoco', 'lanche', 'jantar'];
    if (!categoriasValidas.includes(categoria)) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Categoria inválida.',
      });
    }

    const pool = await getPool();

    const [result] = await pool.query(
      `INSERT INTO cardapio (nome, descricao, categoria, tipo_refeicao, horario, data, dia_semana, calorias, proteina, carboidrato, imagem, observacoes, ativo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        nome,
        descricao,
        categoria,
        tipo_refeicao || null,
        horario || null,
        data || null,
        dia_semana || null,
        calorias || null,
        proteina || null,
        carboidrato || null,
        imagem || null,
        observacoes || null,
      ]
    );

    const cardapioId = result.insertId;

    if (alergicos && Array.isArray(alergicos) && alergicos.length > 0) {
      for (const alergico of alergicos) {
        await pool.query(
          'INSERT IGNORE INTO cardapio_alergicos (cardapio_id, alergico) VALUES (?, ?)',
          [cardapioId, alergico]
        );
      }
    }

    const [rows] = await pool.query('SELECT * FROM cardapio WHERE id = ?', [cardapioId]);
    const itemFormatado = await formatCardapioItems(rows, pool);

    return res.status(201).json({
      sucesso: true,
      mensagem: 'Item do cardápio criado com sucesso!',
      cardapio: itemFormatado[0],
    });
  } catch (error) {
    console.error('[Gateway] Erro ao criar item do cardápio:', error);
    return res.status(500).json({ sucesso: false, erro: 'Erro interno ao criar item.' });
  }
});

// ============================================================
// PUT /api/cardapio/:id — Atualizar item do cardápio (apenas adm)
// ============================================================

router.put('/api/cardapio/:id', authMiddleware, requireRole('adm'), csrfMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ sucesso: false, erro: 'ID inválido.' });
    }

    const {
      nome,
      descricao,
      categoria,
      tipo_refeicao,
      horario,
      data,
      dia_semana,
      calorias,
      proteina,
      carboidrato,
      imagem,
      observacoes,
      alergicos,
      ativo,
    } = req.body;

    const pool = await getPool();

    const [existing] = await pool.query('SELECT id FROM cardapio WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ sucesso: false, erro: 'Item do cardápio não encontrado.' });
    }

    if (categoria) {
      const categoriasValidas = ['cafe_manha', 'almoco', 'lanche', 'jantar'];
      if (!categoriasValidas.includes(categoria)) {
        return res.status(400).json({ sucesso: false, erro: 'Categoria inválida.' });
      }
    }

    const updateFields = [];
    const updateValues = [];

    const fieldMap = {
      nome,
      descricao,
      categoria,
      tipo_refeicao,
      horario,
      data,
      dia_semana,
      calorias,
      proteina,
      carboidrato,
      imagem,
      observacoes,
      ativo,
    };

    for (const [field, value] of Object.entries(fieldMap)) {
      if (value !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(value);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ sucesso: false, erro: 'Nenhum campo para atualizar.' });
    }

    updateValues.push(id);
    await pool.query(
      `UPDATE cardapio SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    if (alergicos && Array.isArray(alergicos)) {
      await pool.query('DELETE FROM cardapio_alergicos WHERE cardapio_id = ?', [id]);
      for (const alergico of alergicos) {
        await pool.query(
          'INSERT IGNORE INTO cardapio_alergicos (cardapio_id, alergico) VALUES (?, ?)',
          [id, alergico]
        );
      }
    }

    const [rows] = await pool.query('SELECT * FROM cardapio WHERE id = ?', [id]);
    const itemFormatado = await formatCardapioItems(rows, pool);

    return res.json({
      sucesso: true,
      mensagem: 'Item do cardápio atualizado com sucesso!',
      cardapio: itemFormatado[0],
    });
  } catch (error) {
    console.error('[Gateway] Erro ao atualizar item do cardápio:', error);
    return res.status(500).json({ sucesso: false, erro: 'Erro interno ao atualizar item.' });
  }
});

// ============================================================
// DELETE /api/cardapio/:id — Excluir item do cardápio (apenas adm)
// ============================================================

router.delete('/api/cardapio/:id', authMiddleware, requireRole('adm'), csrfMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ sucesso: false, erro: 'ID inválido.' });
    }

    const pool = await getPool();

    const [result] = await pool.query('DELETE FROM cardapio WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ sucesso: false, erro: 'Item do cardápio não encontrado.' });
    }

    return res.json({
      sucesso: true,
      mensagem: 'Item do cardápio removido com sucesso!',
      id: id,
    });
  } catch (error) {
    console.error('[Gateway] Erro ao excluir item do cardápio:', error);
    return res.status(500).json({ sucesso: false, erro: 'Erro interno ao excluir item.' });
  }
});

export default router;