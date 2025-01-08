module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  moduleFileExtensions: ['js', 'ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  verbose: true
};
