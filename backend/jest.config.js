module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  globalSetup: '<rootDir>/src/__tests__/globalSetup.js',
  globalTeardown: '<rootDir>/src/__tests__/teardown.ts',
  setupFiles: ['<rootDir>/src/__tests__/setTestEnv.ts'],
  testTimeout: 15000,
  forceExit: true,
}
