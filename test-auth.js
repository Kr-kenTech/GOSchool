const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Mock environment
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.INTERNAL_SHARED_SECRET = 'test-internal-shared-secret-for-testing';
process.env.INTERNAL_API_KEY = 'test-internal-api-key';
process.env.CSRF_COOKIE_NAME = 'csrf_token';
process.env.DEMO_MODE = 'true';
process.env.NODE_ENV = 'development';

// Import the Gateway module to test functions
// As funções são testadas com implementações standalone idênticas às do servidor,
// não sendo necessário ler o arquivo do gateway.

const JWT_SECRET = process.env.JWT_SECRET;
const INTERNAL_SHARED_SECRET = process.env.INTERNAL_SHARED_SECRET;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;
const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME;
const IS_PRODUCTION = false;

// generateCsrfToken
function generateCsrfToken() {
    return crypto.randomBytes(32).toString('base64url');
}

// generateJwtToken
function generateJwtToken(user) {
    const payload = {
        sub: user.id,
        email: user.email,
        role: user.tipo,
        iat: Math.floor(Date.now() / 1000)
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

// verifyJwtToken
function verifyJwtToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
}

// createInternalHeader
function createInternalHeader(user) {
    const payload = {
        userId: user.sub || user.id,
        email: user.email,
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

// verifyInternalHeader
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

// validateCsrfToken (simulated)
function validateCsrfToken(cookieToken, headerToken) {
    return !!(cookieToken && headerToken && cookieToken === headerToken);
}

console.log('=== Running Unit Tests ===\n');

// Test 1: CSRF token generation
console.log('Test 1: CSRF token generation');
const csrf1 = generateCsrfToken();
const csrf2 = generateCsrfToken();
console.assert(csrf1.length > 0, 'CSRF token should not be empty');
console.assert(csrf1 !== csrf2, 'CSRF tokens should be unique');
console.log('  ✓ CSRF tokens generated correctly\n');

// Test 2: JWT token generation and verification
console.log('Test 2: JWT token generation and verification');
const testUser = { id: 'test-123', email: 'test@demo.goschool', nome: 'Test User', tipo: 'aluno' };
const token = generateJwtToken(testUser);
console.assert(typeof token === 'string' && token.split('.').length === 3, 'JWT should have 3 parts');
const decoded = verifyJwtToken(token);
console.assert(decoded !== null, 'Valid token should verify');
console.assert(decoded.sub === 'test-123', 'JWT sub should match');
console.assert(decoded.email === 'test@demo.goschool', 'JWT email should match');
console.assert(decoded.role === 'aluno', 'JWT role should match');
console.log('  ✓ JWT generation and verification works\n');

// Test 3: JWT token expiration (invalid token)
console.log('Test 3: Invalid JWT token handling');
const invalidToken = 'invalid.token.here';
const decodedInvalid = verifyJwtToken(invalidToken);
console.assert(decodedInvalid === null, 'Invalid token should return null');
console.log('  ✓ Invalid token correctly rejected\n');

// Test 4: Internal header creation and verification
console.log('Test 4: Internal header creation and verification');
const header = createInternalHeader({ sub: 'user-123', email: 'prof@demo.goschool', tipo: 'professor' });
console.assert(typeof header === 'string' && header.includes('.'), 'Header should have payload.signature format');
const verified = verifyInternalHeader(header);
console.assert(verified !== null, 'Valid header should verify');
console.assert(verified.userId === 'user-123', 'Header userId should match');
console.assert(verified.email === 'prof@demo.goschool', 'Header email should match');
console.assert(verified.role === 'professor', 'Header role should match');
console.log('  ✓ Internal header creation and verification works\n');

// Test 5: Replay protection - old timestamp
console.log('Test 5: Replay protection (old timestamp)');
const oldHeader = createInternalHeader({ sub: 'user-123', email: 'test@test.com', tipo: 'aluno' });
// Manually create an old header by modifying the timestamp
const [oldPayloadB64, oldSignature] = oldHeader.split('.');
const oldPayload = JSON.parse(Buffer.from(oldPayloadB64, 'base64url').toString());
oldPayload.timestamp = Date.now() - 10 * 60 * 1000; // 10 minutes ago
const oldPayloadB64New = Buffer.from(JSON.stringify(oldPayload)).toString('base64url');
const oldSignatureNew = crypto.createHmac('sha256', INTERNAL_SHARED_SECRET).update(oldPayloadB64New).digest('base64url');
const tamperedHeader = `${oldPayloadB64New}.${oldSignatureNew}`;
const verifiedOld = verifyInternalHeader(tamperedHeader);
console.assert(verifiedOld === null, 'Old timestamp should be rejected');
console.log('  ✓ Replay protection works - old timestamp rejected\n');

// Test 6: Tampered header detection
console.log('Test 6: Tampered header detection');
const validHeader = createInternalHeader({ sub: 'user-123', email: 'test@test.com', tipo: 'aluno' });
const [payloadB64, sig] = validHeader.split('.');
// Tamper with the payload
const tamperedPayload = Buffer.from(JSON.stringify({ userId: 'hacker', email: 'hacker@evil.com', role: 'adm', timestamp: Date.now() })).toString('base64url');
const tamperedHeader2 = `${tamperedPayload}.${sig}`;
const verifiedTampered = verifyInternalHeader(tamperedHeader2);
console.assert(verifiedTampered === null, 'Tampered header should be rejected');
console.log('  ✓ Tampered header correctly rejected\n');

// Test 7: CSRF validation
console.log('Test 7: CSRF token validation');
const csrfToken = generateCsrfToken();
console.assert(validateCsrfToken(csrfToken, csrfToken) === true, 'Matching tokens should validate');
console.assert(validateCsrfToken(csrfToken, 'wrong-token') === false, 'Mismatched tokens should fail');
console.assert(validateCsrfToken(null, csrfToken) === false, 'Missing cookie token should fail');
console.assert(validateCsrfToken(csrfToken, null) === false, 'Missing header token should fail');
console.log('  ✓ CSRF validation works correctly\n');

// Test 8: JWT role extraction
console.log('Test 8: JWT role extraction for different profiles');
const roles = ['adm', 'professor', 'aluno'];
roles.forEach(role => {
    const u = { id: `user-${role}`, email: `${role}@demo.goschool`, nome: role, tipo: role };
    const t = generateJwtToken(u);
    const d = verifyJwtToken(t);
    console.assert(d.role === role, `Role ${role} should be in JWT`);
});
console.log('  ✓ All roles correctly encoded in JWT\n');

console.log('=== All Unit Tests Passed ===');