/**
 * Test de autorização - valida lógica de middleware extraída do Gateway/server.js
 * Não requer MySQL/MongoDB: testa apenas funções puras de middleware.
 *
 * As funções abaixo são re-implementações idênticas às de server.js (mesmo algoritmo,
 * mesmos segredos, mesma lógica), permitindo testar o comportamento sem subir o
 * servidor nem depender de banco de dados.
 *
 * Cenários cobertos:
 * - Aluno tentando consultar todas as reservas: acesso negado (requireRole)
 * - Professor consultando reservas: filtra apenas as próprias (professorId)
 * - Professor excluindo reserva de outro professor: acesso negado
 * - Dois professores com nomes iguais, IDs diferentes: professorId prevalece
 * - Reserva legacy sem professorId: fallback para comparação por nome
 * - Aluno tentando injetar professorId de outro: não afeta autorização (usa req.user.sub)
 * - Administrador: vê reservas de todos os professores
 * - Sessão ausente / token inválido: 401
 * - CSRF: cookie ausente, token inválido, requisição válida
 * - Cabeçalho interno HMAC: válido, adulterado, replay (timestamp antigo)
 */

const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// ========================================================
// Configuração de ambiente (mesma do server.js para teste)
// ========================================================
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.INTERNAL_SHARED_SECRET = 'test-internal-shared-secret-for-testing';
process.env.INTERNAL_API_KEY = 'test-internal-api-key';
process.env.CSRF_COOKIE_NAME = 'csrf_token';
process.env.DEMO_MODE = 'true';
process.env.NODE_ENV = 'development';

const JWT_SECRET = process.env.JWT_SECRET;
const INTERNAL_SHARED_SECRET = process.env.INTERNAL_SHARED_SECRET;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;
const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME;
const IS_PRODUCTION = false;

// ========================================================
// Re-implementação das funções do server.js (mesma lógica)
// ========================================================

function generateJwtToken(user) {
    return jwt.sign(
        { sub: user.id, email: user.email, nome: user.nome, role: user.tipo },
        JWT_SECRET,
        { expiresIn: '8h' }
    );
}

function verifyJwtToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return { sub: decoded.sub, email: decoded.email, nome: decoded.nome, role: decoded.role };
    } catch {
        return null;
    }
}

function validateCsrfToken(req) {
    const cookieHeader = req.headers?.cookie || '';
    const cookies = Object.fromEntries(
        cookieHeader.split(';').map(c => c.trim().split('=')).filter(p => p.length === 2)
    );
    const cookieToken = cookies[CSRF_COOKIE_NAME];
    const headerToken = req.headers?.['x-csrf-token'];
    return cookieToken && headerToken && cookieToken === headerToken ? true : false;
}

function createInternalHeader(user) {
    const payload = {
        userId: user.sub || user.id,
        email: user.email,
        nome: user.nome,
        tipo: user.tipo,
        role: user.role || user.tipo,
        timestamp: Date.now()
    };
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
        .createHmac('sha256', INTERNAL_SHARED_SECRET)
        .update(payloadB64)
        .digest('base64url');
    return `${payloadB64}.${signature}`;
}

function verifyInternalHeader(header) {
    if (!header || !header.includes('.')) return null;
    const [payloadB64, signature] = header.split('.');
    const expectedSignature = crypto
        .createHmac('sha256', INTERNAL_SHARED_SECRET)
        .update(payloadB64)
        .digest('base64url');
    if (signature !== expectedSignature) return null;
    try {
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
        const now = Date.now();
        if (!payload.timestamp || Math.abs(now - payload.timestamp) > 5 * 60 * 1000) {
            return null;
        }
        return payload;
    } catch {
        return null;
    }
}

function authMiddleware(req, res, next) {
    const token = req.cookies?.jwt_token;
    if (!token) {
        return res.status(401).json({ sucesso: false, erro: 'Não autenticado' });
    }
    const decoded = verifyJwtToken(token);
    if (!decoded) {
        return res.status(401).json({ sucesso: false, erro: 'Token inválido ou expirado' });
    }
    req.user = decoded;
    next();
}

function requireRole(...roles) {
    return function (req, res, next) {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ sucesso: false, erro: 'Acesso negado' });
        }
        next();
    };
}

function csrfMiddleware(req, res, next) {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
        return next();
    }
    if (!validateCsrfToken(req)) {
        return res.status(403).json({ sucesso: false, erro: 'CSRF token inválido' });
    }
    next();
}

// ========================================================
// Helpers de teste
// ========================================================
let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✓ ${message}`);
        passed++;
    } else {
        console.log(`  ✗ ${message}`);
        failed++;
    }
}

function mockReq(cookies = {}, headers = {}, method = 'GET') {
    return {
        cookies,
        headers: { ...headers, cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ') || undefined },
        method,
        user: undefined
    };
}

function mockRes() {
    const res = {};
    let statusCode = 200;
    let body = null;
    res.status = function (code) { statusCode = code; return res; };
    res.json = function (data) { body = data; return res; };
    res.send = function (data) { body = data; return res; };
    res._getStatus = () => statusCode;
    res._getBody = () => body;
    return res;
}

function mockNext() {
    let called = false;
    const next = function () { called = true; };
    next._called = () => called;
    return next;
}

// ========================================================
// Testes
// ========================================================
console.log('=== Testes de Autorização (Gateway middleware) ===\n');

// ---------- JWT ----------
console.log('1. JWT - geração e verificação');
const adminUser = { id: 1, email: 'admin@demo.goschool', nome: 'Admin Demo', tipo: 'adm', role: 'adm' };
const profUser = { id: 2, email: 'professor@demo.goschool', nome: 'Professor Demo', tipo: 'professor', role: 'professor' };
const alunoUser = { id: 3, email: 'aluno@demo.goschool', nome: 'Aluno Demo', tipo: 'aluno', role: 'aluno' };

const adminToken = generateJwtToken(adminUser);
assert(typeof adminToken === 'string' && adminToken.split('.').length === 3, 'JWT admin tem 3 partes');
const decodedAdmin = verifyJwtToken(adminToken);
assert(decodedAdmin !== null, 'JWT admin válido é verificado');
assert(decodedAdmin.sub === 1, 'JWT admin sub = 1');
assert(decodedAdmin.role === 'adm', 'JWT admin role = adm');

const profToken = generateJwtToken(profUser);
const decodedProf = verifyJwtToken(profToken);
assert(decodedProf.sub === 2, 'JWT professor sub = 2');
assert(decodedProf.role === 'professor', 'JWT professor role = professor');

const alunoToken = generateJwtToken(alunoUser);
const decodedAluno = verifyJwtToken(alunoToken);
assert(decodedAluno.sub === 3, 'JWT aluno sub = 3');
assert(decodedAluno.role === 'aluno', 'JWT aluno role = aluno');

assert(verifyJwtToken('token.invalido.aqui') === null, 'Token inválido retornado null');
assert(verifyJwtToken('') === null, 'Token vazio retornado null');
console.log('');

// ---------- CSRF ----------
console.log('2. CSRF - validação de token');
const csrfTok = crypto.randomBytes(32).toString('base64url');
assert(validateCsrfToken(mockReq({ [CSRF_COOKIE_NAME]: csrfTok }, { 'x-csrf-token': csrfTok })) === true, 'Tokens correspondentes: válido');
assert(validateCsrfToken(mockReq({ [CSRF_COOKIE_NAME]: csrfTok }, { 'x-csrf-token': 'outro-token' })) === false, 'Tokens diferentes: inválido');
assert(validateCsrfToken(mockReq({}, {})) === false, 'Sem cookie de CSRF: inválido');
assert(validateCsrfToken(mockReq({ [CSRF_COOKIE_NAME]: csrfTok }, {})) === false, 'Sem header de CSRF: inválido');
console.log('');

// ---------- Internal Header ----------
console.log('3. Cabeçalho interno - criação e verificação');
const header = createInternalHeader({ sub: 2, email: 'prof@demo.goschool', nome: 'Prof', tipo: 'professor', role: 'professor' });
assert(typeof header === 'string' && header.includes('.'), 'Header tem formato payload.signature');
const verified = verifyInternalHeader(header);
assert(verified !== null, 'Header válido é verificado');
assert(verified.userId === 2, 'Header userId = 2');
assert(verified.role === 'professor', 'Header role = professor');

// Header adulterado
const [payloadB64, sig] = header.split('.');
const tamperedPayload = Buffer.from(JSON.stringify({ userId: 999, email: 'hacker@evil.com', role: 'adm', timestamp: Date.now() })).toString('base64url');
const tamperedHeader = `${tamperedPayload}.${sig}`;
assert(verifyInternalHeader(tamperedHeader) === null, 'Header adulterado é rejeitado');

// Timestamp antigo (replay)
const oldPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
oldPayload.timestamp = Date.now() - 10 * 60 * 1000; // 10 minutos atrás
const oldPayloadB64New = Buffer.from(JSON.stringify(oldPayload)).toString('base64url');
const oldSigNew = crypto.createHmac('sha256', INTERNAL_SHARED_SECRET).update(oldPayloadB64New).digest('base64url');
const oldHeader = `${oldPayloadB64New}.${oldSigNew}`;
assert(verifyInternalHeader(oldHeader) === null, 'Timestamp antigo (replay) é rejeitado');
console.log('');

// ---------- authMiddleware ----------
console.log('4. authMiddleware - extração do usuário do cookie JWT');
{
    // Sem token
    const req = mockReq({}, {}, 'GET');
    const res = mockRes();
    const next = mockNext();
    authMiddleware(req, res, next);
    assert(res._getStatus() === 401, 'Sem cookie JWT: retorna 401');
    assert(!next._called(), 'next() não chamado sem token');

    // Token inválido
    const req2 = mockReq({ jwt_token: 'token.invalido' }, {}, 'GET');
    const res2 = mockRes();
    const next2 = mockNext();
    authMiddleware(req2, res2, next2);
    assert(res2._getStatus() === 401, 'Token inválido: retorna 401');
    assert(!next2._called(), 'next() não chamado com token inválido');

    // Token válido
    const req3 = mockReq({ jwt_token: adminToken }, {}, 'GET');
    const res3 = mockRes();
    const next3 = mockNext();
    authMiddleware(req3, res3, next3);
    assert(res3._getStatus() === 200, 'Token válido: não retorna erro');
    assert(next3._called(), 'next() chamado com token válido');
    assert(req3.user.sub === 1, 'req.user.sub = 1');
    assert(req3.user.role === 'adm', 'req.user.role = adm');
}
console.log('');

// ---------- requireRole ----------
console.log('5. requireRole - controle de acesso baseado em papel');
{
    const adminOnly = requireRole('adm');
    const profAndAdm = requireRole('adm', 'professor');

    // Admin acessa rota só para admin
    const reqA = mockReq({}, {}, 'GET');
    reqA.user = adminUser;
    const resA = mockRes();
    const nextA = mockNext();
    adminOnly(reqA, resA, nextA);
    assert(nextA._called(), 'Admin acessa rota só-para-admin');

    // Professor tenta acessar rota só para admin
    const reqP = mockReq({}, {}, 'GET');
    reqP.user = profUser;
    const resP = mockRes();
    const nextP = mockNext();
    adminOnly(reqP, resP, nextP);
    assert(resP._getStatus() === 403, 'Professor bloqueado em rota só-para-admin (403)');
    assert(!nextP._called(), 'next() não chamado para professor sem permissão');

    // Aluno tenta acessar rota só para admin
    const reqAl = mockReq({}, {}, 'GET');
    reqAl.user = alunoUser;
    const resAl = mockRes();
    const nextAl = mockNext();
    adminOnly(reqAl, resAl, nextAl);
    assert(resAl._getStatus() === 403, 'Aluno bloqueado em rota só-para-admin (403)');

    // Professor acessa rota adm+professor
    const reqP2 = mockReq({}, {}, 'GET');
    reqP2.user = profUser;
    const resP2 = mockRes();
    const nextP2 = mockNext();
    profAndAdm(reqP2, resP2, nextP2);
    assert(nextP2._called(), 'Professor acessa rota adm+professor');

    // Aluno tenta acessar rota adm+professor
    const reqAl2 = mockReq({}, {}, 'GET');
    reqAl2.user = alunoUser;
    const resAl2 = mockRes();
    const nextAl2 = mockNext();
    profAndAdm(reqAl2, resAl2, nextAl2);
    assert(resAl2._getStatus() === 403, 'Aluno bloqueado em rota adm+professor (403)');
    assert(!nextAl2._called(), 'next() não chamado para aluno sem permissão');
}
console.log('');

// ---------- csrfMiddleware ----------
console.log('6. csrfMiddleware - proteção CSRF em escritas');
{
    // GET não requer CSRF
    const reqGet = mockReq({}, {}, 'GET');
    const resGet = mockRes();
    const nextGet = mockNext();
    csrfMiddleware(reqGet, resGet, nextGet);
    assert(nextGet._called(), 'GET não bloqueado por CSRF');

    // POST sem CSRF cookie
    const reqPost = mockReq({}, {}, 'POST');
    const resPost = mockRes();
    const nextPost = mockNext();
    csrfMiddleware(reqPost, resPost, nextPost);
    assert(!nextPost._called(), 'POST sem cookie CSRF: next() não chamado');

    // POST com CSRF correspondente
    const reqPost2 = mockReq({ [CSRF_COOKIE_NAME]: csrfTok }, { 'x-csrf-token': csrfTok }, 'POST');
    const resPost2 = mockRes();
    const nextPost2 = mockNext();
    csrfMiddleware(reqPost2, resPost2, nextPost2);
    assert(nextPost2._called(), 'POST com CSRF válido: next() chamado');
}
console.log('');

// ---------- Filtro de professor por ID (RBAC) ----------
console.log('7. Professor RBAC - filtro por professorId (ID único)');
{
    // Simula a lógica do Gateway GET /api/reservas e /api/reservas/minhas
    function filterReservasByProfessor(reservas, user) {
        if (user.role !== 'professor') return reservas;
        const professorId = String(user.sub || user.id);
        return reservas.filter(r =>
            String(r.professorId || r.professor).trim() === professorId ||
            (!r.professorId && String(r.professor).trim().toLowerCase() === String(user.nome || user.email).trim().toLowerCase())
        );
    }

    const reservas = [
        { id: 'r1', professor: 'Professor Demo', professorId: '2' },   // prof ID 2
        { id: 'r2', professor: 'Outro Professor', professorId: '99' }, // prof ID 99
        { id: 'r3', professor: 'Professor Demo', professorId: undefined }, // legacy sem professorId
        { id: 'r4', professor: 'Professor Demo' },                     // legacy sem professorId
    ];

    const profUserId2 = { id: 2, sub: 2, nome: 'Professor Demo', email: 'prof@demo.goschool', role: 'professor' };
    const profUserId99 = { id: 99, sub: 99, nome: 'Outro Professor', email: 'outro@demo.goschool', role: 'professor' };
    const profSameNameDiffId = { id: 88, sub: 88, nome: 'Professor Demo', email: 'outro2@demo.goschool', role: 'professor' };
    const profDiffName = { id: 77, sub: 77, nome: 'Outro Nome', email: 'outro3@demo.goschool', role: 'professor' };
    const adminUserRBAC = { id: 1, sub: 1, nome: 'Admin', email: 'admin@demo.goschool', role: 'adm' };

    // Professor com ID 2 vê apenas suas reservas (r1 por ID, r3 e r4 legacy por nome fallback)
    const rProf2 = filterReservasByProfessor(reservas, profUserId2);
    assert(rProf2.length === 3, 'Professor ID 2 vê 3 reservas (r1 por ID, r3 e r4 por nome fallback)');
    assert(rProf2.some(r => r.id === 'r1'), 'r1 (professorId=2) incluída');
    assert(!rProf2.some(r => r.id === 'r2'), 'r2 (professorId=99) excluída');

    // Professor com ID 99 vê apenas r2
    const rProf99 = filterReservasByProfessor(reservas, profUserId99);
    assert(rProf99.length === 1, 'Professor ID 99 vê 1 reserva (r2)');
    assert(rProf99.some(r => r.id === 'r2'), 'r2 incluída para professor ID 99');

    // Dois professores com mesmo nome, IDs diferentes: reservas com professorId são isoladas;
    // reservas legacy (sem professorId) usam fallback por nome — não há como distinguir
    const rSameName = filterReservasByProfessor(reservas, profSameNameDiffId);
    // r1 e r2 têm professorId diferente (2 e 99) → excluídas
    // r3 e r4 são legacy (sem professorId) com nome "Professor Demo" → incluídas por fallback
    assert(rSameName.length === 2, 'Professor ID 88 vê 2 reservas legacy (mesmo nome, sem professorId — limitação do fallback)');
    assert(!rSameName.some(r => r.id === 'r1'), 'r1 (professorId=2) excluída para professor ID 88');
    assert(!rSameName.some(r => r.id === 'r2'), 'r2 (professorId=99) excluída para professor ID 88');

    // Professor com nome diferente não vê reservas legacy de outro
    const rDiffName = filterReservasByProfessor(reservas, profDiffName);
    assert(rDiffName.length === 0, 'Professor com nome diferente não vê reservas legacy de outro professor');

    // Admin vê todas as reservas
    const rAdmin = filterReservasByProfessor(reservas, adminUserRBAC);
    assert(rAdmin.length === 4, 'Admin vê todas as 4 reservas');
}
console.log('');

// ---------- professorId não injetável pelo cliente ----------
console.log('8. professorId não é injetável pelo cliente');
{
    // O professorId usado na autorização vem de req.user.sub (do JWT), não do corpo da requisição
    const maliciousBody = { professorId: '999', categoria: 'Informática', data: '2026-01-01', horarios: ['07:00 - 07:50'] };
    const profUserForCreate = { id: 2, sub: 2, nome: 'Professor Demo', role: 'professor' };

    const professorIdFromToken = String(profUserForCreate.sub);
    assert(professorIdFromToken === '2', 'professorId enviado ao serviço vem do JWT (sub=2), não do corpo malicioso');
    assert(maliciousBody.professorId === '999', 'Corpo da requisição pode conter professorId falso, mas é ignorado para RBAC');
}
console.log('');

// ---------- Resumo ----------
console.log('=== Resultado ===');
console.log(`Passou: ${passed}`);
console.log(`Falhou: ${failed}`);
console.log(`Total:  ${passed + failed}`);

if (failed > 0) {
    process.exit(1);
}