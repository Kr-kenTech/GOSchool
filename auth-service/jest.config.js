export default {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.{js,mjs}', '**/*.test.{js,mjs}'],
  transform: {
    '^.+\\.(js|mjs)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(.*\\.mjs$))',
  ],
  moduleFileExtensions: ['js', 'mjs', 'json'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
  ],
  coverageDirectory: '<rootDir>/../coverage/auth-service',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};