export default {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.{js,mjs}', '**/*.test.{js,mjs}'],
  transform: {
    '^.+\\.(js|mjs)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@goschool)/)',
  ],
  moduleFileExtensions: ['js', 'mjs', 'json'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/app.js',
  ],
  coverageDirectory: '<rootDir>/../coverage/gateway',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@goschool/shared/(.*)$': '<rootDir>/../shared/src/$1',
  },
  // Transform test files too
  transform: {
    '^.+\\.(js|mjs)$': 'babel-jest',
  },
};