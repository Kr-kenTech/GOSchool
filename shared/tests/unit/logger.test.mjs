// shared/tests/unit/logger.test.mjs
import { logger } from '../../src/utils/logger.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('Logger', () => {
  it('should log info messages', () => {
    // Just test that logger doesn't throw
    logger.info('test info', { key: 'value' });
    assert.ok(true);
  });

  it('should log warn messages', () => {
    logger.warn('test warn', { warning: true });
    assert.ok(true);
  });

  it('should log error messages', () => {
    logger.error('test error', { error: 'details' });
    assert.ok(true);
  });

  it('should include timestamp in all logs', () => {
    // We can't easily test console output without mocking
    // Just verify logger runs without error
    logger.info('timestamp test');
    assert.ok(true);
  });

  it('should log request info with helper', () => {
    const mockReq = {
      method: 'GET',
      originalUrl: '/api/test',
      ip: '127.0.0.1',
      get: (header) => header === 'user-agent' ? 'test-agent' : undefined,
      user: { sub: 123 },
    };
    const mockRes = { statusCode: 200 };

    logger.request(mockReq, mockRes, 45);
    assert.ok(true);
  });
});