-- ============================================================
-- GOSchool - Dados de Demonstração (Seeds MySQL)
-- 3 usuários demo + cardápio semanal + alergias
-- ============================================================

USE `banco_goschool`;

-- ------------------------------------------------------------
-- LIMPAR DADOS EXISTENTES (opcional - descomente se necessário)
-- ------------------------------------------------------------
-- SET FOREIGN_KEY_CHECKS = 0;
-- TRUNCATE TABLE `consentimento_responsavel`;
-- TRUNCATE TABLE `usuario_alergias`;
-- TRUNCATE TABLE `cardapio_alergicos`;
-- TRUNCATE TABLE `cardapio`;
-- TRUNCATE TABLE `administrador`;
-- TRUNCATE TABLE `professor`;
-- TRUNCATE TABLE `aluno`;
-- TRUNCATE TABLE `usuario`;
-- SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------
-- USUÁRIOS DEMO
-- Senha para todos: "Demo@123" (hash bcrypt)
-- Hash gerado com: bcrypt.hashSync('Demo@123', 10)
-- ------------------------------------------------------------
INSERT IGNORE INTO `usuario` (`id`, `nome`, `email`, `senha_hash`, `ativo`) VALUES
(1, 'Admin Demo', 'admin@demo.goschool', '$2b$10$K8K8K8K8K8K8K8K8K8K8K', TRUE),
(2, 'Professor Demo', 'professor@demo.goschool', '$2b$10$K8K8K8K8K8K8K8K8K8K8K', TRUE),
(3, 'Aluno Demo', 'aluno@demo.goschool', '$2b$10$K8K8K8K8K8K8K8K8K8K8K', TRUE);

-- Perfis
INSERT IGNORE INTO `administrador` (`usuario_id`, `nivel`) VALUES (1, 'super');
INSERT IGNORE INTO `professor` (`usuario_id`, `disciplina`, `registro`) VALUES (2, 'Matemática', 'REG12345');
INSERT IGNORE INTO `aluno` (`usuario_id`, `turma`, `matricula`) VALUES (3, '3º Ano A', 'MAT2024001');

-- ------------------------------------------------------------
-- ALERGIAS DO ALUNO DEMO
-- ------------------------------------------------------------
INSERT IGNORE INTO `usuario_alergias` (`usuario_id`, `alergia`) VALUES
(3, 'Glúten'),
(3, 'Lactose'),
(3, 'Amendoim');

-- ------------------------------------------------------------
-- CARDÁPIO SEMANAL DEMO
-- Categorias: cafe_manha, almoco, lanche, jantar
-- Dias: segunda, terca, quarta, quinta, sexta, sabado, domingo
-- ------------------------------------------------------------

-- SEGUNDA-FEIRA
INSERT IGNORE INTO `cardapio` (`id`, `nome`, `descricao`, `categoria`, `tipo_refeicao`, `horario`, `dia_semana`, `calorias`, `proteina`, `carboidrato`, `ativo`) VALUES
(1, 'Pão integral com queijo branco', 'Pão integral caseiro com queijo minas light', 'cafe_manha', 'Café da Manhã', '07:00:00', 'segunda', 280, 12, 35, TRUE),
(2, 'Arroz, feijão, frango grelhado e salada', 'Prato completo com arroz branco, feijão carioca, peito de frango grelhado e salada verde', 'almoco', 'Almoço', '11:30:00', 'segunda', 520, 32, 58, TRUE),
(3, 'Banana com aveia', 'Banana prata amassada com aveia em flocos e mel', 'lanche', 'Lanche da Tarde', '15:00:00', 'segunda', 180, 4, 38, TRUE),
(4, 'Sopa de legumes com frango desfiado', 'Sopa cremosa de cenoura, batata, abobrinha e frango desfiado', 'jantar', 'Jantar', '18:30:00', 'segunda', 310, 22, 28, TRUE);

INSERT IGNORE INTO `cardapio_alergicos` (`cardapio_id`, `alergico`) VALUES
(1, 'Glúten'), (1, 'Lactose'),
(3, 'Glúten');

-- TERÇA-FEIRA
INSERT IGNORE INTO `cardapio` (`id`, `nome`, `descricao`, `categoria`, `tipo_refeicao`, `horario`, `dia_semana`, `calorias`, `proteina`, `carboidrato`, `ativo`) VALUES
(5, 'Iogurte natural com granola', 'Iogurte desnatado com granola caseira e frutas vermelhas', 'cafe_manha', 'Café da Manhã', '07:00:00', 'terca', 250, 10, 38, TRUE),
(6, 'Macarrão integral ao molho de tomate', 'Macarrão integral com molho de tomate caseiro, manjericão e queijo parmesão', 'almoco', 'Almoço', '11:30:00', 'terca', 480, 18, 65, TRUE),
(7, 'Maçã com pasta de amendoim', 'Maçã fatiada com pasta de amendoim integral', 'lanche', 'Lanche da Tarde', '15:00:00', 'terca', 220, 6, 22, TRUE),
(8, 'Omelete de espinafre com batata doce', 'Omelete de claras com espinafre refogado e batata doce assada', 'jantar', 'Jantar', '18:30:00', 'terca', 340, 25, 30, TRUE);

INSERT IGNORE INTO `cardapio_alergicos` (`cardapio_id`, `alergico`) VALUES
(5, 'Lactose'), (5, 'Glúten'),
(6, 'Glúten'), (6, 'Lactose'),
(7, 'Amendoim'),
(8, 'Ovos');

-- QUARTA-FEIRA
INSERT IGNORE INTO `cardapio` (`id`, `nome`, `descricao`, `categoria`, `tipo_refeicao`, `horario`, `dia_semana`, `calorias`, `proteina`, `carboidrato`, `ativo`) VALUES
(9, 'Tapioca com queijo coalho', 'Tapioca de goma de mandioca recheada com queijo coalho derretido', 'cafe_manha', 'Café da Manhã', '07:00:00', 'quarta', 290, 14, 32, TRUE),
(10, 'Arroz integral, lentilha, peixe assado e brócolis', 'Arroz integral, lentilha cozida, filé de tilápia assado com ervas e brócolis no vapor', 'almoco', 'Almoço', '11:30:00', 'quarta', 510, 35, 55, TRUE),
(11, 'Vitamina de mamão com linhaça', 'Vitamina de mamão papaya com leite desnatado e linhaça dourada', 'lanche', 'Lanche da Tarde', '15:00:00', 'quarta', 160, 5, 28, TRUE),
(12, 'Crepioca de frango com ricota', 'Crepioca recheada com frango desfiado e ricota temperada', 'jantar', 'Jantar', '18:30:00', 'quarta', 320, 28, 25, TRUE);

INSERT IGNORE INTO `cardapio_alergicos` (`cardapio_id`, `alergico`) VALUES
(9, 'Lactose'),
(10, 'Peixe'),
(12, 'Glúten'), (12, 'Lactose'), (12, 'Ovos');

-- QUINTA-FEIRA
INSERT IGNORE INTO `cardapio` (`id`, `nome`, `descricao`, `categoria`, `tipo_refeicao`, `horario`, `dia_semana`, `calorias`, `proteina`, `carboidrato`, `ativo`) VALUES
(13, 'Pão de queijo integral', 'Pão de queijo feito com polvilho azedo integral e queijo minas', 'cafe_manha', 'Café da Manhã', '07:00:00', 'quinta', 210, 8, 26, TRUE),
(14, 'Arroz, feijão preto, carne moída refogada e couve', 'Arroz branco, feijão preto, carne moída magra refogada com alho e cebola, couve refogada', 'almoco', 'Almoço', '11:30:00', 'quinta', 540, 30, 58, TRUE),
(15, 'Pera com queijo cottage', 'Pera fatiada com queijo cottage light', 'lanche', 'Lanche da Tarde', '15:00:00', 'quinta', 140, 10, 18, TRUE),
(16, 'Sopa de abóbora com gengibre', 'Sopa cremosa de abóbora cabotiá com gengibre fresco e semente de abóbora torrada', 'jantar', 'Jantar', '18:30:00', 'quinta', 200, 6, 32, TRUE);

INSERT IGNORE INTO `cardapio_alergicos` (`cardapio_id`, `alergico`) VALUES
(13, 'Glúten'), (13, 'Lactose'),
(15, 'Lactose');

-- SEXTA-FEIRA
INSERT IGNORE INTO `cardapio` (`id`, `nome`, `descricao`, `categoria`, `tipo_refeicao`, `horario`, `dia_semana`, `calorias`, `proteina`, `carboidrato`, `ativo`) VALUES
(17, 'Panqueca de aveia com mel', 'Panquecas de aveia e banana com mel orgânico', 'cafe_manha', 'Café da Manhã', '07:00:00', 'sexta', 300, 10, 45, TRUE),
(18, 'Arroz, grão-de-bico, frango ao curry e cenoura', 'Arroz basmati, grão-de-bico cozido, cubos de frango ao curry leve e cenoura ralada', 'almoco', 'Almoço', '11:30:00', 'sexta', 530, 33, 60, TRUE),
(19, 'Iogurte com frutas da estação', 'Iogurte natural desnatado com morango, kiwi e uva', 'lanche', 'Lanche da Tarde', '15:00:00', 'sexta', 170, 8, 25, TRUE),
(20, 'Hambúrguer caseiro de grão-de-bico', 'Hambúrguer vegetal de grão-de-bico com aveia, servido com salada coleslaw', 'jantar', 'Jantar', '18:30:00', 'sexta', 380, 15, 48, TRUE);

INSERT IGNORE INTO `cardapio_alergicos` (`cardapio_id`, `alergico`) VALUES
(17, 'Glúten'), (17, 'Ovos'),
(19, 'Lactose'),
(20, 'Glúten');

-- SÁBADO
INSERT IGNORE INTO `cardapio` (`id`, `nome`, `descricao`, `categoria`, `tipo_refeicao`, `horario`, `dia_semana`, `calorias`, `proteina`, `carboidrato`, `ativo`) VALUES
(21, 'Cuscuz paulista', 'Cuscuz de milho com ovos, tomate, ervilha, azeitona e sardinha', 'cafe_manha', 'Café da Manhã', '08:00:00', 'sabado', 350, 18, 40, TRUE),
(22, 'Feijoada light', 'Feijão preto com carnes magras (lombo, paio light), arroz integral, couve e farofa de banana', 'almoco', 'Almoço', '12:00:00', 'sabado', 580, 32, 65, TRUE),
(23, 'Bolo de cenoura integral', 'Bolo de cenoura com farinha integral, adoçado com xilitol, cobertura de cacau 70%', 'lanche', 'Lanche da Tarde', '16:00:00', 'sabado', 220, 5, 35, TRUE),
(24, 'Salada Caesar com frango', 'Alface americana, frango grelhado em cubos, croutons integrais, queijo parmesão, molho light', 'jantar', 'Jantar', '19:00:00', 'sabado', 360, 30, 22, TRUE);

INSERT IGNORE INTO `cardapio_alergicos` (`cardapio_id`, `alergico`) VALUES
(21, 'Glúten'), (21, 'Ovos'), (21, 'Peixe'),
(22, 'Glúten'),
(23, 'Glúten'), (23, 'Ovos'),
(24, 'Glúten'), (24, 'Lactose'), (24, 'Ovos');

-- DOMINGO
INSERT IGNORE INTO `cardapio` (`id`, `nome`, `descricao`, `categoria`, `tipo_refeicao`, `horario`, `dia_semana`, `calorias`, `proteina`, `carboidrato`, `ativo`) VALUES
(25, 'Ovos mexidos com tomate e pão integral', 'Ovos mexidos cremosos com tomate cereja e torradas de pão integral', 'cafe_manha', 'Café da Manhã', '08:00:00', 'domingo', 320, 18, 30, TRUE),
(26, 'Lasanha de berinjela', 'Lasanha de berinjela grelhada com molho de tomate, ricota e espinafre', 'almoco', 'Almoço', '12:00:00', 'domingo', 420, 22, 38, TRUE),
(27, 'Salada de frutas com granola', 'Mix de frutas da estação (mamão, melancia, uva, banana) com granola crocante', 'lanche', 'Lanche da Tarde', '16:00:00', 'domingo', 190, 4, 38, TRUE),
(28, 'Canja de galinha', 'Canja tradicional com arroz, frango desfiado, cenoura, aipo e salsa', 'jantar', 'Jantar', '19:00:00', 'domingo', 280, 20, 30, TRUE);

INSERT IGNORE INTO `cardapio_alergicos` (`cardapio_id`, `alergico`) VALUES
(25, 'Glúten'), (25, 'Ovos'),
(26, 'Lactose'), (26, 'Glúten'),
(27, 'Glúten'),
(28, 'Glúten');

-- ------------------------------------------------------------
-- CONSENTIMENTO DEMO (para aluno@demo.goschool)
-- ------------------------------------------------------------
INSERT IGNORE INTO `consentimento_responsavel` (`aluno_id`, `nome_responsavel`, `vinculo`, `data_consentimento`, `hash_consentimento`, `email_responsavel`) VALUES
(1, 'Maria Silva Santos', 'mae', CURDATE(), 'DEMO_HASH_CONSENTIMENTO_2024', 'maria.santos@email.com');

-- ------------------------------------------------------------
-- FIM DOS SEEDS
-- ------------------------------------------------------------