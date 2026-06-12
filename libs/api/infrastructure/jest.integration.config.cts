module.exports = {
  displayName: 'infrastructure-integration',
  preset: '../../../jest.preset.js',
  testEnvironment: 'node',
  testMatch: ['**/*.integration.spec.ts'],
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../../coverage/libs/api/infrastructure',
  // Suites share the single patrimo_integration database — no parallelism.
  maxWorkers: 1,
};
