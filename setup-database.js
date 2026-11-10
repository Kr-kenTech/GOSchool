const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
    const pool = mysql.createPool({
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT) || 3306,
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'banco_amaral_hub'
    });

    console.log('[Setup] Creating tables...');

    // 1. usuario table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS \`usuario\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`nome\` VARCHAR(255) NOT NULL,
            \`email\` VARCHAR(255) NOT NULL UNIQUE,
            \`senha\` VARCHAR(255) DEFAULT NULL,
            \`criado_em\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            \`atualizado_em\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('[Setup] Table usuario created');

    // 2. aluno table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS \`aluno\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`usuario_id\` INT NOT NULL UNIQUE,
            \`matricula\` VARCHAR(50) DEFAULT NULL,
            \`turma\` VARCHAR(50) DEFAULT NULL,
            \`criado_em\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuario\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('[Setup] Table aluno created');

    // 3. professor table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS \`professor\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`usuario_id\` INT NOT NULL UNIQUE,
            \`matricula\` VARCHAR(50) DEFAULT NULL,
            \`disciplina\` VARCHAR(100) DEFAULT NULL,
            \`criado_em\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuario\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('[Setup] Table professor created');

    // 4. administrador table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS \`administrador\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`usuario_id\` INT NOT NULL UNIQUE,
            \`nivel_acesso\` ENUM('admin', 'super_admin') DEFAULT 'admin',
            \`criado_em\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuario\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('[Setup] Table administrador created');

    // 5. consentimento_responsavel table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS \`consentimento_responsavel\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`aluno_id\` INT NOT NULL UNIQUE,
            \`nome_responsavel\` VARCHAR(255) NOT NULL,
            \`vinculo\` VARCHAR(50) NOT NULL,
            \`data_consentimento\` DATE NOT NULL,
            \`hash_consentimento\` VARCHAR(255) NOT NULL,
            \`criado_em\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (\`aluno_id\`) REFERENCES \`aluno\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('[Setup] Table consentimento_responsavel created');

    // 6. cardapio table (NEW - for menu items)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS \`cardapio\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`nome\` VARCHAR(255) NOT NULL,
            \`descricao\` TEXT DEFAULT NULL,
            \`categoria\` ENUM('cafe_manha', 'almoco', 'lanche', 'jantar') NOT NULL,
            \`tipo_refeicao\` VARCHAR(50) DEFAULT NULL,
            \`horario\` TIME DEFAULT NULL,
            \`data\` DATE DEFAULT NULL,
            \`dia_semana\` ENUM('segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo') DEFAULT NULL,
            \`calorias\` INT DEFAULT NULL,
            \`proteina\` DECIMAL(5,2) DEFAULT NULL,
            \`carboidrato\` DECIMAL(5,2) DEFAULT NULL,
            \`imagem\` VARCHAR(500) DEFAULT NULL,
            \`observacoes\` TEXT DEFAULT NULL,
            \`ativo\` BOOLEAN DEFAULT TRUE,
            \`criado_em\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            \`atualizado_em\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX \`idx_data_categoria\` (\`data\`, \`categoria\`),
            INDEX \`idx_dia_semana_categoria\` (\`dia_semana\`, \`categoria\`),
            INDEX \`idx_ativo\` (\`ativo\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('[Setup] Table cardapio created');

    // 7. cardapio_alergicos table (NEW - many-to-many for meal allergens)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS \`cardapio_alergicos\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`cardapio_id\` INT NOT NULL,
            \`alergico\` VARCHAR(100) NOT NULL,
            FOREIGN KEY (\`cardapio_id\`) REFERENCES \`cardapio\`(\`id\`) ON DELETE CASCADE,
            UNIQUE KEY \`uk_cardapio_alergico\` (\`cardapio_id\`, \`alergico\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('[Setup] Table cardapio_alergicos created');

    // 8. usuario_alergias table (NEW - user allergens)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS \`usuario_alergias\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`usuario_id\` INT NOT NULL,
            \`alergia\` VARCHAR(100) NOT NULL,
            \`criado_em\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuario\`(\`id\`) ON DELETE CASCADE,
            UNIQUE KEY \`uk_usuario_alergia\` (\`usuario_id\`, \`alergia\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('[Setup] Table usuario_alergias created');

    console.log('[Setup] All tables created successfully!');

    await pool.end();
}

setupDatabase().catch(console.error);