export default {
  projects: [
    '<rootDir>/gateway/jest.config.js',
    '<rootDir>/auth-service/jest.config.js',
    '<rootDir>/reservas-service/jest.config.js',
    '<rootDir>/shared/jest.config.js',
  ],
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'gateway/src/**/*.js',
    'auth-service/src/**/*.js',
    'reservas-service/src/**/*.js',
    'shared/src/**/*.js',
    '!**/index.js',
  ],
};