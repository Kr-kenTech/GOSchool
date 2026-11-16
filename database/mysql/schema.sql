-- ============================================================
-- GOSchool - Schema MySQL
-- Banco de dados: banco_goschool
-- Tabelas: usuario, aluno, professor, administrador,
--          cardapio, cardapio_alergicos, usuario_alergias,
--          consentimento_responsavel
-- ============================================================

CREATE DATABASE IF NOT EXISTS `banco_goschool` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `banco_goschool`;

-- ------------------------------------------------------------
-- TABELA: usuario
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `usuario` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nome` VARCHAR(150) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `senha_hash` VARCHAR(255) NULL,
  `ativo` BOOLEAN DEFAULT TRUE,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- TABELA: aluno
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `aluno` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` INT NOT NULL UNIQUE,
  `turma` VARCHAR(50) NULL,
  `matricula` VARCHAR(50) NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- TABELA: professor
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `professor` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` INT NOT NULL UNIQUE,
  `disciplina` VARCHAR(100) NULL,
  `registro` VARCHAR(50) NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- TABELA: administrador
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `administrador` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` INT NOT NULL UNIQUE,
  `nivel` ENUM('super', 'admin') DEFAULT 'admin',
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- TABELA: cardapio
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cardapio` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nome` VARCHAR(150) NOT NULL,
  `descricao` TEXT NULL,
  `categoria` ENUM('cafe_manha', 'almoco', 'lanche', 'jantar') NOT NULL,
  `tipo_refeicao` VARCHAR(50) NULL,
  `horario` TIME NULL,
  `data` DATE NULL,
  `dia_semana` ENUM('segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo') NULL,
  `calorias` DECIMAL(7,2) NULL,
  `proteina` DECIMAL(7,2) NULL,
  `carboidrato` DECIMAL(7,2) NULL,
  `imagem` VARCHAR(500) NULL,
  `observacoes` TEXT NULL,
  `ativo` BOOLEAN DEFAULT TRUE,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- TABELA: cardapio_alergicos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cardapio_alergicos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `cardapio_id` INT NOT NULL,
  `alergico` VARCHAR(100) NOT NULL,
  UNIQUE KEY `uk_cardapio_alergico` (`cardapio_id`, `alergico`),
  FOREIGN KEY (`cardapio_id`) REFERENCES `cardapio`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- TABELA: usuario_alergias
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `usuario_alergias` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` INT NOT NULL,
  `alergia` VARCHAR(100) NOT NULL,
  UNIQUE KEY `uk_usuario_alergia` (`usuario_id`, `alergia`),
  FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- TABELA: consentimento_responsavel
-- LGPD / ECA - Consentimento do responsável para menores de idade
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `consentimento_responsavel` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `aluno_id` INT NOT NULL UNIQUE,
  `nome_responsavel` VARCHAR(150) NOT NULL,
  `vinculo` ENUM('pai', 'mae', 'tutor', 'outro') NOT NULL,
  `data_consentimento` DATE NOT NULL,
  `hash_consentimento` VARCHAR(255) NOT NULL,
  `email_responsavel` VARCHAR(255) NULL,
  `ip_origem` VARCHAR(45) NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`aluno_id`) REFERENCES `aluno`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- ÍNDICES ADICIONAIS
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS `idx_cardapio_categoria` ON `cardapio`(`categoria`);
CREATE INDEX IF NOT EXISTS `idx_cardapio_dia_semana` ON `cardapio`(`dia_semana`);
CREATE INDEX IF NOT EXISTS `idx_cardapio_data` ON `cardapio`(`data`);
CREATE INDEX IF NOT EXISTS `idx_cardapio_ativo` ON `cardapio`(`ativo`);
CREATE INDEX IF NOT EXISTS `idx_usuario_email` ON `usuario`(`email`);
CREATE INDEX IF NOT EXISTS `idx_consentimento_aluno` ON `consentimento_responsavel`(`aluno_id`);