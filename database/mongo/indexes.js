// ============================================================
// GOSchool - Índices MongoDB
-- Coleções: reservas, desperdicio
// ============================================================

const db = db.getSiblingDB('banco_goschool');

// ------------------------------------------------------------
// COLEÇÃO: reservas
// ------------------------------------------------------------
db.createCollection('reservas');

db.reservas.createIndexes([
  // Índice composto para verificação de conflitos
  { key: { categoria: 1, data: 1, horario: 1 }, unique: true, name: 'idx_reserva_conflito' },
  // Índice para busca por professor
  { key: { professorId: 1 }, name: 'idx_reserva_professor' },
  // Índice para busca por data
  { key: { data: 1 }, name: 'idx_reserva_data' },
  // Índice para ordenação por data de criação
  { key: { criado_em: -1 }, name: 'idx_reserva_criado' },
]);

// ------------------------------------------------------------
// COLEÇÃO: desperdicio
// ------------------------------------------------------------
db.createCollection('desperdicio');

db.desperdicio.createIndexes([
  // Índice composto para consultas de dashboard por período
  { key: { data: 1 }, name: 'idx_desperdicio_data' },
  // Índice para agrupamento por refeição
  { key: { refeicao: 1 }, name: 'idx_desperdicio_refeicao' },
  // Índice para agrupamento por ingrediente
  { key: { ingrediente: 1 }, name: 'idx_desperdicio_ingrediente' },
  // Índice composto para consultas de período + refeição
  { key: { data: 1, refeicao: 1 }, name: 'idx_desperdicio_data_refeicao' },
  // Índice para ordenação por data de criação
  { key: { createdAt: -1 }, name: 'idx_desperdicio_criado' },
]);

print('Índices MongoDB criados com sucesso.');