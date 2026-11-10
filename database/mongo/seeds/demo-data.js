// ============================================================
// GOSchool - Dados de Demonstração (Seeds MongoDB)
// Coleções: reservas, desperdicio
// ============================================================

const db = db.getSiblingDB('banco_goschool');

// ------------------------------------------------------------
// LIMPAR DADOS EXISTENTES
// ------------------------------------------------------------
db.reservas.deleteMany({});
db.desperdicio.deleteMany({});

// ------------------------------------------------------------
// RESERVAS DEMO
// ------------------------------------------------------------
const hoje = new Date();
const hojeStr = hoje.toISOString().split('T')[0];

// Adicionar alguns dias
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split('T')[0];
}

const reservasDemo = [
  // Reservas do Professor Demo (professorId: 2)
  {
    categoria: 'almoco',
    data: hojeStr,
    horario: '11:30',
    professor: 'Professor Demo',
    professorId: '2',
    descricao: 'Reserva para turma 3º Ano A',
    criado_em: new Date(),
  },
  {
    categoria: 'almoco',
    data: addDays(hoje, 1),
    horario: '11:30',
    professor: 'Professor Demo',
    professorId: '2',
    descricao: 'Reserva para turma 3º Ano A',
    criado_em: new Date(),
  },
  {
    categoria: 'lanche',
    data: addDays(hoje, 2),
    horario: '15:00',
    professor: 'Professor Demo',
    professorId: '2',
    descricao: 'Lanche da tarde - turma 3º Ano A',
    criado_em: new Date(),
  },
  // Reservas do Admin Demo (professorId: 1)
  {
    categoria: 'cafe_manha',
    data: addDays(hoje, 3),
    horario: '07:00',
    professor: 'Admin Demo',
    professorId: '1',
    descricao: 'Café da manhã - reunião pedagógica',
    criado_em: new Date(),
  },
  {
    categoria: 'jantar',
    data: addDays(hoje, 4),
    horario: '18:30',
    professor: 'Admin Demo',
    professorId: '1',
    descricao: 'Jantar - evento escolar',
    criado_em: new Date(),
  },
];

db.reservas.insertMany(reservasDemo);

// ------------------------------------------------------------
// DESPERDÍCIO DEMO (últimos 7 dias)
// ------------------------------------------------------------
const desperdicioDemo = [];

const refeicoes = ['almoco', 'cafe_manha', 'lanche', 'jantar'];
const ingredientes = [
  'Arroz', 'Feijão', 'Frango', 'Carne', 'Salada', 'Legumes',
  'Pão', 'Leite', 'Fruta', 'Bolo', 'Sopa', 'Macarrão'
];

for (let i = 6; i >= 0; i--) {
  const data = addDays(hoje, -i);
  const numRegistros = Math.floor(Math.random() * 3) + 2; // 2-4 registros por dia

  for (let j = 0; j < numRegistros; j++) {
    const refeicao = refeicoes[Math.floor(Math.random() * refeicoes.length)];
    const ingrediente = ingredientes[Math.floor(Math.random() * ingredientes.length)];
    const kgPreparado = Math.round((Math.random() * 20 + 5) * 10) / 10; // 5-25 kg
    const kgDesperdicado = Math.round((Math.random() * (kgPreparado * 0.3)) * 10) / 10; // 0-30% do preparado

    desperdicioDemo.push({
      data: data,
      refeicao: refeicao,
      ingrediente: ingrediente,
      kgPreparado: kgPreparado,
      kgDesperdiçado: kgDesperdicado,
      createdAt: new Date(data),
    });
  }
}

db.desperdicio.insertMany(desperdicioDemo);

print('Seeds MongoDB inseridos com sucesso.');
print(`Reservas: ${reservasDemo.length} documentos`);
print(`Desperdício: ${desperdicioDemo.length} documentos`);