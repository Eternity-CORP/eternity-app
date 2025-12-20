require('dotenv').config();

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testMatch: ['**/test/**/*.spec.ts', '**/__tests__/**/*.spec.ts'],
  coverageDirectory: './coverage',
  collectCoverageFrom: ['src/**/*.ts'],
  verbose: true
};
