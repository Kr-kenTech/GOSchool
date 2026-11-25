-- GoSchool - Migration 001
-- RF03: vínculo institucional e-mail -> papel, mantido pela Coordenação.
-- Execute uma vez em bancos já existentes.

CREATE TABLE IF NOT EXISTS `vinculo_email_papel` (
  `email` VARCHAR(255) NOT NULL PRIMARY KEY,
  `papel` ENUM('aluno', 'professor', 'adm') NOT NULL,
  `ativo` BOOLEAN NOT NULL DEFAULT TRUE,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
