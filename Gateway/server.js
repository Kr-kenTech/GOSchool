// ======================================================
// CONFIGURAÇÕES
// ======================================================

require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

const PORT = process.env.PORT || 3000;

const AUTH_SERVICE_URL =
    process.env.AUTH_SERVICE_URL ||
    'http://localhost:4001';

const RESERVAS_SERVICE_URL =
    process.env.RESERVAS_SERVICE_URL ||
    'http://localhost:4002';


// ======================================================
// MIDDLEWARE
// ======================================================

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);


// ======================================================
// ARQUIVOS ESTÁTICOS
// ======================================================

app.use(
    '/Reservas',
    express.static(
        path.join(
            __dirname,
            '..',
            'Reservas'
        )
    )
);

app.use(
    '/Inicio',
    express.static(
        path.join(
            __dirname,
            '..',
            'Inicio'
        )
    )
);

app.use(
    '/Login',
    express.static(
        path.join(
            __dirname,
            '..',
            'Login'
        )
    )
);


app.use(
    '/relatorios',
    express.static(path.join(__dirname, '..', 'relatorios'))
);

app.use(
    '/configuracoes',
    express.static(path.join(__dirname, '..', 'configurações'), { index: 'config.html' })
);

app.use(
    '/Cardapio',
    express.static(path.join(__dirname, '..', 'Cardapio'), { index: 'cardapio.html' })
);

// ======================================================
// ARQUIVOS ESTÁTICOS PARA OS PERFIS
// ======================================================

app.use(
    '/Aluno',
    express.static(path.join(__dirname, '..', 'Aluno'), { index: 'index.html' })
);

app.use(
    '/Professor',
    express.static(path.join(__dirname, '..', 'Professor'), { index: 'index.html' })
);

app.use(
    '/adm',
    express.static(path.join(__dirname, '..', 'adm'), { index: 'index.html' })
);

// Arquivos estáticos globais
app.use(
    express.static(
        path.join(__dirname, '..'),
        {
            extensions: [
                'png',
                'jpg',
                'css',
                'js'
            ]
        }
    )
);


// ======================================================
// PÁGINA INICIAL
// ======================================================

app.get(
    '/',
    (req, res) => {
        const filePath =
            path.resolve(
                __dirname,
                '..',
                'Inicio',
                'inicio.html'
            );

        fs.readFile(
            filePath,
            'utf8',
            (err, data) => {
                if (err) {
                    return res
                        .status(404)
                        .send(
                            'Erro ao carregar a página inicial.'
                        );
                }
                res.send(data);
            }
        );
    }
);


// ======================================================
// LOGIN
// ======================================================

app.get(
    '/login',
    (req, res) => {
        const filePath =
            path.resolve(
                __dirname,
                '..',
                'Login',
                'login.html'
            );

        fs.readFile(
            filePath,
            'utf8',
            (err, data) => {
                if (err) {
                    return res
                        .status(404)
                        .send(
                            'Erro ao carregar a página de login.'
                        );
                }
                res.send(data);
            }
        );
    }
);


// ======================================================
// LOGIN - API (Comum / Formulário)
// ======================================================

app.post(
    '/api/login',
    async (req, res) => {
        const {
            email,
            password
        } = req.body;

        const dominiosPermitidos = [
            '@educacao.mg.gov.br',
            '@aluno.mg.gov.br'
        ];

        const ehValido =
            dominiosPermitidos.some(
                dominio =>
                    email &&
                    email.endsWith(dominio)
            );

        if (!ehValido) {
            return res.status(403).json({
                sucesso: false,
                erro: 'Acesso restrito. Utilize um e-mail institucional válido (@educacao.mg.gov.br ou @aluno.mg.gov.br).'
            });
        }

        try {
            const response =
                await fetch(
                    `${AUTH_SERVICE_URL}/internal/login`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body:
                            JSON.stringify({
                                email,
                                password
                            })
                    }
                );

            const data = await response.json();

            if (!response.ok || !data.sucesso) {
                return res.status(401).json({
                    sucesso: false,
                    erro: data.erro || 'E-mail ou senha incorretos.'
                });
            }

            return res.json({
                sucesso: true,
                usuario: data.usuario,
                mensagem: 'Login realizado com sucesso!'
            });

        } catch (error) {
            console.error(
                'Erro ao comunicar com Auth Service:',
                error
            );

            return res.status(500).json({
                sucesso: false,
                erro: 'Erro interno de comunicação.'
            });
        }
    }
);


// ======================================================
// GOOGLE LOGIN - API (Gateway Proxy & Redirecionamento por Tipo)
// ======================================================

app.post(
    '/auth/google/callback',
    async (req, res) => {
        try {
            const response = await fetch(
                `${AUTH_SERVICE_URL}/internal/google-login`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(req.body)
                }
            );

            const data = await response.json();

            if (!response.ok || !data.sucesso) {
                return res.status(response.status).send(`
                    <script>
                        alert("${data.erro || 'Erro ao realizar login com o Google.'}");
                        window.location.href = '/login';
                    </script>
                `);
            }

            const tipoUsuario = data.usuario.tipo;
            const emailUsuario = data.usuario.email;
            const perfilAtivo = data.usuario.ativo; // Campo vindo do auth-service indicando se o perfil está ativo
            const requerConsentimento = data.usuario.requerConsentimento; // Regra LGPD/ECA (RF18)
            
            let destino = '/reservas'; 

            if (tipoUsuario === 'aluno') {
                // Se for aluno e o perfil estiver inativo ou sem o consentimento do responsável (RF18 / CA06)
                if (requerConsentimento === true || perfilAtivo === false) {
                    destino = '/Aluno/consentimento.html'; // Página dedicada para recolher dados do responsável legal
                } else {
                    destino = '/Aluno/';
                }
            } else if (tipoUsuario === 'professor') {
                destino = '/Professor/';
            } else if (tipoUsuario === 'adm') {
                destino = '/adm/';
            }

            // Injeta os dados no localStorage e redireciona para o destino correto
            return res.send(`
                <script>
                    localStorage.setItem('userEmail', "${emailUsuario}");
                    localStorage.setItem('userRole', "${tipoUsuario}");
                    localStorage.setItem('userName', "${data.usuario.nome || 'Aluno'}");
                    window.location.href = "${destino}";
                </script>
            `);

        } catch (error) {
            console.error(
                '[Gateway] Erro ao comunicar com Auth Service para Google login:',
                error
            );

            return res.status(500).send(`
                <script>
                    alert("Erro interno de comunicação com o serviço de autenticação do Google.");
                    window.location.href = '/login';
                </script>
            `);
        }
    }
);

// ======================================================
// CONFIGURAÇÕES - ROTA EXPLICITA
// ======================================================

app.get(
    '/configuracoes',
    (req, res) => {
        const filePath =
            path.resolve(
                __dirname,
                '..',
                'configurações', // Ou 'configuracoes' dependendo de como renomeou a pasta
                'config.html'
            );

        fs.readFile(
            filePath,
            'utf8',
            (err, data) => {
                if (err) {
                    return res
                        .status(404)
                        .send('Erro ao carregar a página de configurações.');
                }
                res.send(data);
            }
        );
    }
);

// ======================================================
// PÁGINA DE RESERVAS (Fallback Geral)
// ======================================================

app.get(
    '/reservas',
    (req, res) => {
        res.setHeader(
            'Cache-Control',
            'no-store, no-cache, must-revalidate, proxy-revalidate'
        );
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        const filePath =
            path.resolve(
                __dirname,
                '..',
                'Reservas',
                'reservas.html'
            );

        fs.readFile(
            filePath,
            'utf8',
            (err, data) => {
                if (err) {
                    return res
                        .status(404)
                        .send(
                            'Erro ao carregar a página de reservas.'
                        );
                }
                res.send(data);
            }
        );
    }
);


// ======================================================
// GET / POST / DELETE DE RESERVAS
// ======================================================

app.get(
    '/api/reservas',
    async (req, res) => {
        try {
            const response =
                await fetch(
                    `${RESERVAS_SERVICE_URL}/internal/reservas?_t=${Date.now()}`,
                    { method: 'GET', cache: 'no-store' }
                );
            const data = await response.json();
            return res.status(response.status).json(data);
        } catch (error) {
            return res.status(500).json({ sucesso: false, erro: 'Erro ao buscar reservas.' });
        }
    }
);

app.post(
    '/api/reservas',
    async (req, res) => {
        try {
            const response =
                await fetch(
                    `${RESERVAS_SERVICE_URL}/internal/reservas`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(req.body)
                    }
                );
            const data = await response.json();
            return res.status(response.status).json(data);
        } catch (error) {
            return res.status(500).json({ sucesso: false, erro: 'Erro ao criar reserva.' });
        }
    }
);

app.delete(
    '/api/reservas/:id',
    async (req, res) => {
        const id = String(req.params.id).trim();
        try {
            const response =
                await fetch(
                    `${RESERVAS_SERVICE_URL}/internal/reservas/${encodeURIComponent(id)}`,
                    { method: 'DELETE' }
                );
            const data = await response.json();
            return res.status(response.status).json(data);
        } catch (error) {
            return res.status(500).json({ sucesso: false, erro: 'Erro ao comunicar com o serviço de reservas.' });
        }
    }
);

// ======================================================
// ROTA DE API PARA BUSCAR DADOS DO USUÁRIO
// ======================================================

app.get(
    '/api/usuario',
    async (req, res) => {
        const email = req.query.email;
        if (!email) {
            return res.status(400).json({ sucesso: false, erro: 'E-mail não fornecido.' });
        }

        try {
            const response = await fetch(
                `${AUTH_SERVICE_URL}/internal/usuario?email=${encodeURIComponent(email)}`,
                { method: 'GET' }
            );
            const data = await response.json();
            return res.status(response.status).json(data);
        } catch (error) {
            console.error('[Gateway] Erro ao buscar dados do usuário:', error);
            return res.status(500).json({ sucesso: false, erro: 'Erro ao buscar dados do usuário.' });
        }
    }
);

// ======================================================
// ROTA DE API PARA ATUALIZAR DADOS DO USUÁRIO
// ======================================================

app.put(
    '/api/usuario',
    async (req, res) => {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ sucesso: false, erro: 'E-mail não fornecido.' });
        }

        try {
            const response = await fetch(
                `${AUTH_SERVICE_URL}/internal/usuario`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(req.body)
                }
            );
            const data = await response.json();
            return res.status(response.status).json(data);
        } catch (error) {
            console.error('[Gateway] Erro ao atualizar dados do usuário:', error);
            return res.status(500).json({ sucesso: false, erro: 'Erro ao atualizar dados do usuário.' });
        }
    }
);

// ======================================================
// ROTA DE API PARA REGISTO DE CONSENTIMENTO (LGPD / ECA - RF18)
// ======================================================

app.post(
    '/api/consentimento',
    async (req, res) => {
        const { emailAluno, nomeResponsavel, vinculo } = req.body;

        if (!emailAluno || !nomeResponsavel || !vinculo) {
            return res.status(400).json({ 
                sucesso: false, 
                erro: 'Preencha todos os campos obrigatórios para o consentimento.' 
            });
        }

        try {
            // Encaminha os dados de consentimento para o Auth Service tratar e ativar o perfil
            const response = await fetch(
                `${AUTH_SERVICE_URL}/internal/consentimento`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: emailAluno,
                        nomeResponsavel,
                        vinculo
                    })
                }
            );

            const data = await response.json();

            if (!response.ok || !data.sucesso) {
                return res.status(response.status).json({
                    sucesso: false,
                    erro: data.erro || 'Erro ao gravar o consentimento no serviço de autenticação.'
                });
            }

            return res.json({
                sucesso: true,
                mensagem: 'Consentimento registrado e perfil ativado com sucesso!'
            });

        } catch (error) {
            console.error('[Gateway] Erro ao processar o consentimento do responsável:', error);
            return res.status(500).json({ 
                sucesso: false, 
                erro: 'Erro interno ao processar o termo de consentimento.' 
            });
        }
    }
);

// ======================================================
// CONFIGURAÇÃO DO NODEMAILER E VERIFICAÇÃO POR E-MAIL
// ======================================================

const nodemailer = require('nodemailer'); // Certifica-te de executar: npm install nodemailer

// Configuração do transporter de e-mail (ajusta para o teu serviço ou SMTP)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'teu-email@amaralhub.com',
        pass: process.env.EMAIL_PASS || 'tua-password-de-app'
    }
});

// Base de dados temporária em memória para os códigos de verificação
const codigosVerificacao = new Map();

// Rota para iniciar o processo e enviar o código por e-mail
app.post('/api/enviar-codigo-responsavel', async (req, res) => {
    try {
        const { emailResponsavel, emailAluno, nomeResponsavel, vinculo } = req.body;
        
        if (!emailResponsavel || !emailAluno) {
            return res.status(400).json({ sucesso: false, erro: 'E-mails obrigatórios em falta.' });
        }

        // Obter a região/IP aproximado do pedido
        const ipCliente = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const regiao = (ipCliente === '::1' || ipCliente === '127.0.0.1') ? 'Minas Gerais, Brasil (Local)' : 'Minas Gerais, Brasil';

        // Gerar código aleatório de 6 dígitos
        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Guardar o código associado ao e-mail com validade de 10 minutos
        codigosVerificacao.set(emailResponsavel, {
            codigo,
            emailAluno,
            nomeResponsavel,
            vinculo,
            regiao,
            expiraEm: Date.now() + 10 * 60 * 1000 
        });

        // Enviar o e-mail
        const mailOptions = {
            from: '"AmaralHub Segurança" <noreply@amaralhub.com>',
            to: emailResponsavel,
            subject: 'Segurança AmaralHub - Confirmação de Consentimento Legal',
            html: `
                <div style="font-family: Arial, sans-serif; color: #111; padding: 20px;">
                    <h2 style="color: #1450a3;">AmaralHub - Notificação de Segurança</h2>
                    <p>Olá, <strong>${nomeResponsavel}</strong>,</p>
                    <p>Foi solicitada a autorização de consentimento (LGPD / ECA) associada à conta de estudante (<strong>${emailAluno}</strong>) no ecossistema AmaralHub.</p>
                    <p><strong>Detalhes do pedido:</strong></p>
                    <ul>
                        <li><strong>Vínculo:</strong> ${vinculo}</li>
                        <li><strong>Região do acesso:</strong> ${regiao}</li>
                    </ul>
                    <p>Para prosseguir com a ativação da conta, utilize o seguinte código de verificação de 6 dígitos:</p>
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1450a3; text-align: center; width: fit-content; margin: 20px 0;">
                        ${codigo}
                    </div>
                    <p style="font-size: 12px; color: #64748b;">Se não reconhece esta atividade, por favor ignore este e-mail.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        return res.json({ sucesso: true, mensagem: 'Código enviado com sucesso para o e-mail do responsável.' });

    } catch (error) {
        console.error('Erro ao enviar e-mail:', error);
        return res.status(500).json({ sucesso: false, erro: 'Erro interno ao enviar o código de verificação.' });
    }
});

// Rota para validar o código de 6 dígitos inserido e efetivar o consentimento no Auth Service
app.post('/api/verificar-codigo', async (req, res) => {
    const { emailResponsavel, codigoDigitado } = req.body;
    const dadosRegisto = codigosVerificacao.get(emailResponsavel);

    if (!dadosRegisto) {
        return res.status(400).json({ sucesso: false, erro: 'Código expirado ou não solicitado.' });
    }

    if (Date.now() > dadosRegisto.expiraEm) {
        codigosVerificacao.delete(emailResponsavel);
        return res.status(400).json({ sucesso: false, erro: 'O código expirou. Solicite um novo.' });
    }

    if (dadosRegisto.codigo !== codigoDigitado) {
        return res.status(400).json({ sucesso: false, erro: 'Código incorreto.' });
    }

    try {
        // Comunica com o Auth Service para registar o consentimento e ativar o perfil permanentemente
        const response = await fetch(
            `${AUTH_SERVICE_URL}/internal/consentimento`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: dadosRegisto.emailAluno,
                    nomeResponsavel: dadosRegisto.nomeResponsavel,
                    vinculo: dadosRegisto.vinculo
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.sucesso) {
            return res.status(response.status).json({
                sucesso: false,
                erro: data.erro || 'Erro ao gravar o consentimento no serviço de autenticação.'
            });
        }

        // Código correto e gravado com sucesso, limpa o registo temporário da memória
        codigosVerificacao.delete(emailResponsavel);
        return res.json({ sucesso: true, mensagem: 'Consentimento registado e conta ativada com sucesso!' });

    } catch (error) {
        console.error('[Gateway] Erro ao comunicar com Auth Service no código:', error);
        return res.status(500).json({ sucesso: false, erro: 'Erro interno ao ativar o perfil.' });
    }
});

// ======================================================
// INICIAR SERVIDOR
// ======================================================

app.listen(
    PORT,
    () => {
        console.log(`[Gateway] Rodando na porta ${PORT}`);
        console.log(`[Gateway] Reservas Service: ${RESERVAS_SERVICE_URL}`);
    }
);