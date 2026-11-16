// shared/tests/unit/internal-auth.test.mjs
import crypto from 'crypto';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// Set env before any imports - must be at top level before dynamic imports
process.env.INTERNAL_SHARED_SECRET = 'test-shared-secret-min-32-chars-long';
process.env.INTERNAL_API_KEY = 'test-internal-api-key';

let createInternalHeader;
let verifyInternalHeader;
let internalAuthMiddleware;

// Dynamic import to ensure env vars are set before config is evaluated
await import('../../src/auth/internal-auth.js').then(mod => {
  createInternalHeader = mod.createInternalHeader;
  verifyInternalHeader = mod.verifyInternalHeader;
  internalAuthMiddleware = mod.internalAuthMiddleware;
});

describe('Internal Auth', () => {
  describe('createInternalHeader', () => {
    it('should create a valid header with user payload', () => {
      const user = {
        sub: 1,
        email: 'test@test.com',
        nome: 'Test User',
        role: 'aluno',
      };

      const header = createInternalHeader(user);

      assert.ok(header);
      assert.equal(typeof header, 'string');
      assert.equal(header.split('.').length, 2);
    });

    it('should include timestamp in payload', () => {
      const user = { sub: 1, email: 'test@test.com' };
      const header = createInternalHeader(user);

      const [payloadB64] = header.split('.');
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

      assert.ok(payload.timestamp);
      assert.equal(typeof payload.timestamp, 'number');
      assert.equal(payload.userId, 1);
      assert.equal(payload.email, 'test@test.com');
    });

    it('should use id when sub is not present', () => {
      const user = { id: 42, email: 'test@test.com' };
      const header = createInternalHeader(user);

      const [payloadB64] = header.split('.');
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

      assert.equal(payload.userId, 42);
    });

    it('should use email as nome when nome not provided', () => {
      const user = { sub: 1, email: 'test@test.com' };
      const header = createInternalHeader(user);

      const [payloadB64] = header.split('.');
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

      assert.equal(payload.nome, 'test@test.com');
    });
  });

  describe('verifyInternalHeader', () => {
    it('should verify a valid header created by createInternalHeader', () => {
      const user = { sub: 1, email: 'test@test.com', nome: 'Test', role: 'professor' };
      const header = createInternalHeader(user);

      const payload = verifyInternalHeader(header);

      assert.ok(payload);
      assert.equal(payload.userId, 1);
      assert.equal(payload.email, 'test@test.com');
      assert.equal(payload.role, 'professor');
    });

    it('should return null for invalid signature', () => {
      const user = { sub: 1, email: 'test@test.com' };
      const header = createInternalHeader(user);

      const [payloadB64] = header.split('.');
      const tamperedHeader = `${payloadB64}.invalidsignature`;

      const payload = verifyInternalHeader(tamperedHeader);
      assert.equal(payload, null);
    });

    it('should return null for expired header (> 5 min)', () => {
      const payload = {
        userId: 1,
        email: 'test@test.com',
        nome: 'Test',
        role: 'aluno',
        timestamp: Date.now() - 6 * 60 * 1000,
      };
      const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const signature = crypto
        .createHmac('sha256', 'test-shared-secret-min-32-chars-long')
        .update(payloadB64)
        .digest('base64url');
      const expiredHeader = `${payloadB64}.${signature}`;

      const result = verifyInternalHeader(expiredHeader);
      assert.equal(result, null);
    });

    it('should return null for future timestamp (> 5 min)', () => {
      const payload = {
        userId: 1,
        email: 'test@test.com',
        nome: 'Test',
        role: 'aluno',
        timestamp: Date.now() + 6 * 60 * 1000,
      };
      const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const signature = crypto
        .createHmac('sha256', 'test-shared-secret-min-32-chars-long')
        .update(payloadB64)
        .digest('base64url');
      const futureHeader = `${payloadB64}.${signature}`;

      const result = verifyInternalHeader(futureHeader);
      assert.equal(result, null);
    });

    it('should return null for malformed header', () => {
      assert.equal(verifyInternalHeader(''), null);
      assert.equal(verifyInternalHeader('no-dot'), null);
      assert.equal(verifyInternalHeader('too.many.dots'), null);
      assert.equal(verifyInternalHeader(null), null);
      assert.equal(verifyInternalHeader(undefined), null);
    });

    it('should return null for invalid base64 payload', () => {
      const invalidHeader = 'invalidbase64!!.signature';
      const result = verifyInternalHeader(invalidHeader);
      assert.equal(result, null);
    });

    it('should return null for invalid JSON in payload', () => {
      const payloadB64 = Buffer.from('not json').toString('base64url');
      const signature = crypto
        .createHmac('sha256', 'test-shared-secret-min-32-chars-long')
        .update(payloadB64)
        .digest('base64url');
      const header = `${payloadB64}.${signature}`;

      const result = verifyInternalHeader(header);
      assert.equal(result, null);
    });
  });

  describe('internalAuthMiddleware', () => {
    it('should call next() with valid API key and internal header', () => {
      const user = { sub: 1, email: 'test@test.com', role: 'adm' };
      const header = createInternalHeader(user);

      const mockReq = {
        headers: {
          'x-internal-api-key': 'test-internal-api-key',
          'x-internal-user': header,
        },
      };
      const mockRes = {
        status: () => ({ json: () => {} }),
        json: () => {},
      };
      let nextCalled = false;
      const mockNext = () => { nextCalled = true; };

      internalAuthMiddleware(mockReq, mockRes, mockNext);

      assert.ok(nextCalled);
      assert.ok(mockReq.internalUser);
      assert.equal(mockReq.internalUser.userId, 1);
    });

    it('should return 401 for missing API key', () => {
      const mockReq = {
        headers: {
          'x-internal-user': 'some.header',
        },
      };
      let statusCode = 0;
      const mockRes = {
        status: (code) => { statusCode = code; return { json: () => {} }; },
        json: () => {},
      };
      let nextCalled = false;
      const mockNext = () => { nextCalled = true; };

      internalAuthMiddleware(mockReq, mockRes, mockNext);

      assert.equal(statusCode, 401);
      assert.ok(!nextCalled);
    });

    it('should return 401 for invalid API key', () => {
      const mockReq = {
        headers: {
          'x-internal-api-key': 'wrong-key',
          'x-internal-user': 'some.header',
        },
      };
      let statusCode = 0;
      const mockRes = {
        status: (code) => { statusCode = code; return { json: () => {} }; },
        json: () => {},
      };
      let nextCalled = false;
      const mockNext = () => { nextCalled = true; };

      internalAuthMiddleware(mockReq, mockRes, mockNext);

      assert.equal(statusCode, 401);
      assert.ok(!nextCalled);
    });

    it('should return 401 for missing internal header', () => {
      const mockReq = {
        headers: {
          'x-internal-api-key': 'test-internal-api-key',
        },
      };
      let statusCode = 0;
      const mockRes = {
        status: (code) => { statusCode = code; return { json: () => {} }; },
        json: () => {},
      };
      let nextCalled = false;
      const mockNext = () => { nextCalled = true; };

      internalAuthMiddleware(mockReq, mockRes, mockNext);

      assert.equal(statusCode, 401);
      assert.ok(!nextCalled);
    });

    it('should return 401 for invalid internal header', () => {
      const mockReq = {
        headers: {
          'x-internal-api-key': 'test-internal-api-key',
          'x-internal-user': 'invalid.header',
        },
      };
      let statusCode = 0;
      const mockRes = {
        status: (code) => { statusCode = code; return { json: () => {} }; },
        json: () => {},
      };
      let nextCalled = false;
      const mockNext = () => { nextCalled = true; };

      internalAuthMiddleware(mockReq, mockRes, mockNext);

      assert.equal(statusCode, 401);
      assert.ok(!nextCalled);
    });

    it('should return 401 for expired internal header', () => {
      const payload = {
        userId: 1,
        email: 'test@test.com',
        nome: 'Test',
        role: 'aluno',
        timestamp: Date.now() - 6 * 60 * 1000,
      };
      const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const signature = crypto
        .createHmac('sha256', 'test-shared-secret-min-32-chars-long')
        .update(payloadB64)
        .digest('base64url');
      const expiredHeader = `${payloadB64}.${signature}`;

      const mockReq = {
        headers: {
          'x-internal-api-key': 'test-internal-api-key',
          'x-internal-user': expiredHeader,
        },
      };
      let statusCode = 0;
      const mockRes = {
        status: (code) => { statusCode = code; return { json: () => {} }; },
        json: () => {},
      };
      let nextCalled = false;
      const mockNext = () => { nextCalled = true; };

      internalAuthMiddleware(mockReq, mockRes, mockNext);

      assert.equal(statusCode, 401);
      assert.ok(!nextCalled);
    });
  });
});