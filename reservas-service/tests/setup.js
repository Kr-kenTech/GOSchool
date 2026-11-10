// reservas-service/tests/setup.js
import { jest } from '@jest/globals';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SHARED_SECRET = 'test-internal-shared-secret-min-32-chars';
process.env.INTERNAL_API_KEY = 'test-internal-api-key';
process.env.MYSQL_HOST = 'localhost';
process.env.MYSQL_PORT = '3306';
process.env.MYSQL_DATABASE = 'test_db';
process.env.MYSQL_USER = 'test';
process.env.MYSQL_PASSWORD = 'test';
process.env.MONGO_URL = 'mongodb://localhost:27017';
process.env.MONGO_DB = 'test_db';

global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

afterEach(() => {
  jest.clearAllMocks();
});