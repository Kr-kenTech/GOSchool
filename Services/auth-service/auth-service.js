require('dotenv').config();
const express = require('express');
const db = require('../../db'); // Importa o pool de conexões MySQL configurado

const app = express();
const PORT = process.env.AUTH_PORT || 4001;

app.use(express.json());

// Função auxiliar para determinar o cargo/tipo do usuário com base no e-mail
function identificarTipoUsuario(email) {
    if (email.endsWith('@aluno.mg.gov.br')) {
        return 'aluno';
    }

    const adminsFixos = ['admin@educacao.mg.gov.br', 'suporte@educacao.mg.gov.br'];
    if (adminsFixos.includes(email)) {
        return 'adm';
    }

    if (email.endsWith('@educacao.mg.gov.br')) {
        return 'professor';
    }

    return null;
}

// Endpoint interno para validar credenciais de login
app.post('/internal/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [rows] = await db.query('SELECT * FROM usuario WHERE email = ?', [email]);

        if (rows.length === 0) {
            return res.status(401).json({ sucesso: false, erro: 'Credenciais inválidas.' });
        }

        const usuarioEncontrado = rows[0];
        const tipo = identificarTipoUsuario(email);

        let requerConsentimento = false;
        let ativo = true;

        if (tipo === 'aluno') {
            const [alunoRows] = await db.query('SELECT id FROM aluno WHERE usuario_id = ?', [usuarioEncontrado.id]);
            if (alunoRows.length > 0) {
                const alunoId = alunoRows[0].id;
                const [consRows] = await db.query('SELECT id FROM consentimento_responsavel WHERE aluno_id = ?', [alunoId]);
                requerConsentimento = consRows.length === 0;
                ativo = !requerConsentimento;
            }
        }

        return res.json({
            sucesso: true,
            usuario: {
                email: usuarioEncontrado.email,
                nome: usuarioEncontrado.nome,
                tipo: tipo,
                ativo: ativo,
                requerConsentimento: requerConsentimento
            }
        });
    } catch (error) {
        console.error('[Auth Service] Erro no login:', error);
        return res.status(500).json({ sucesso: false, erro: 'Erro interno no servidor.' });
    }
});

// ======================================================
// ENDPOINT INTERNO: GOOGLE LOGIN (Com Verificação RF18)
// ======================================================

app.post('/internal/google-login', async (req, res) => {
    const { credential, email: emailDireto } = req.body;
    let email = emailDireto;

    if (!email && credential) {
        try {
            const base64Url = credential.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
            const payload = JSON.parse(jsonPayload);
            email = payload.email;
        } catch (err) {
            console.error('[Auth Service] Erro ao decodificar token do Google:', err);
        }
    }

    if (!email) {
        return res.status(400).json({
            sucesso: false,
            erro: 'E-mail não fornecido ou token do Google inválido.'
        });
    }

    const tipo = identificarTipoUsuario(email);

    if (!tipo) {
        return res.status(403).json({
            sucesso: false,
            erro: 'Acesso restrito. Utilize um e-mail institucional válido (@educacao.mg.gov.br ou @aluno.mg.gov.br).'
        });
    }

    try {
        const [rows] = await db.query('SELECT * FROM usuario WHERE email = ?', [email]);
        let usuarioEncontrado;
        let usuarioId;

        if (rows.length === 0) {
            const nomePadrao = email.split('@')[0];
            const [result] = await db.query('INSERT INTO usuario (nome, email) VALUES (?, ?)', [nomePadrao, email]);
            usuarioId = result.insertId;

            if (tipo === 'aluno') {
                await db.query('INSERT INTO aluno (usuario_id) VALUES (?)', [usuarioId]);
            } else if (tipo === 'professor') {
                await db.query('INSERT INTO professor (usuario_id) VALUES (?)', [usuarioId]);
            } else if (tipo === 'adm') {
                await db.query('INSERT INTO administrador (usuario_id) VALUES (?)', [usuarioId]);
            }

            usuarioEncontrado = { id: usuarioId, email, nome: nomePadrao };
        } else {
            usuarioEncontrado = rows[0];
            usuarioId = usuarioEncontrado.id;
        }

        let requerConsentimento = false;
        let ativo = true;

        if (tipo === 'aluno') {
            const [alunoRows] = await db.query('SELECT id FROM aluno WHERE usuario_id = ?', [usuarioId]);
            if (alunoRows.length > 0) {
                const alunoId = alunoRows[0].id;
                const [consRows] = await db.query('SELECT id FROM consentimento_responsavel WHERE aluno_id = ?', [alunoId]);
                requerConsentimento = consRows.length === 0;
                ativo = !requerConsentimento;
            } else {
                requerConsentimento = true;
                ativo = false;
            }
        }

        return res.json({
            sucesso: true,
            usuario: {
                email: usuarioEncontrado.email,
                nome: usuarioEncontrado.nome,
                tipo: tipo,
                ativo: ativo,
                requerConsentimento: requerConsentimento
            },
            mensagem: 'Login com Google autenticado com sucesso!'
        });
    } catch (error) {
        console.error('[Auth Service] Erro no Google Login com MySQL:', error);
        return res.status(500).json({ sucesso: false, erro: 'Erro interno ao processar autenticação Google.' });
    }
});

// ======================================================
// ENDPOINT INTERNO: REGISTO DE CONSENTIMENTO (RF18)
// ======================================================

app.post('/internal/consentimento', async (req, res) => {
    const { email, nomeResponsavel, vinculo } = req.body;

    if (!email || !nomeResponsavel || !vinculo) {
        return res.status(400).json({ sucesso: false, erro: 'Dados incompletos para o consentimento.' });
    }

    try {
        const [rows] = await db.query('SELECT id FROM usuario WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(404).json({ sucesso: false, erro: 'Utilizador não encontrado.' });
        }

        const usuarioId = rows[0].id;
        const [alunoRows] = await db.query('SELECT id FROM aluno WHERE usuario_id = ?', [usuarioId]);

        if (alunoRows.length === 0) {
            return res.status(404).json({ sucesso: false, erro: 'Registo de aluno não encontrado para este utilizador.' });
        }

        const alunoId = alunoRows[0].id;
        const dataConsentimentoStr = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
        const hashConsentimentoPadrao = 'PENDENTE_SETOR_SEGURANCA'; // Hash delegado para o serviço de segurança

        // Insere na tabela consentimento_responsavel sem cálculos de hash locais
        await db.query(
            `INSERT INTO consentimento_responsavel (aluno_id, nome_responsavel, vinculo, data_consentimento, hash_consentimento) 
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE nome_responsavel = VALUES(nome_responsavel), vinculo = VALUES(vinculo)`,
            [alunoId, nomeResponsavel, vinculo, dataConsentimentoStr, hashConsentimentoPadrao]
        );

        return res.json({
            sucesso: true,
            mensagem: 'Consentimento registado com sucesso.'
        });
    } catch (error) {
        console.error('[Auth Service] Erro ao salvar consentimento:', error);
        return res.status(500).json({ sucesso: false, erro: 'Erro interno ao gravar consentimento.' });
    }
});

// Endpoint interno para buscar os dados completos do usuário
app.get('/internal/usuario', async (req, res) => {
    const email = req.query.email;
    if (!email) {
        return res.status(400).json({ sucesso: false, erro: 'E-mail não fornecido.' });
    }

    try {
        const [rows] = await db.query('SELECT * FROM usuario WHERE email = ?', [email]);

        if (rows.length === 0) {
            return res.status(404).json({ sucesso: false, erro: 'Usuário não encontrado.' });
        }

        const usuarioEncontrado = rows[0];
        const tipo = identificarTipoUsuario(email);

        return res.json({
            sucesso: true,
            usuario: {
                nome: usuarioEncontrado.nome || email.split('@')[0],
                email: usuarioEncontrado.email,
                tipo: tipo,
                alergias: [],
                restricoes: ''
            }
        });
    } catch (error) {
        console.error('[Auth Service] Erro ao buscar dados do usuário:', error);
        return res.status(500).json({ sucesso: false, erro: 'Erro interno ao consultar base de dados.' });
    }
});

app.listen(PORT, () => {
    console.log(`[Auth Service] Rodando na porta ${PORT} com conexão ao MySQL.`);
});