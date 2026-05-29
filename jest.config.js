/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\.spec\.ts$',
  transform: {
    '^.+\.(t|j)s$': ['ts-jest', {
      tsconfig: '<rootDir>/../tsconfig.test.json',
    }],
  },
  collectCoverageFrom: ['**/*.(t|j)s', '!**/*.spec.ts', '!**/__tests__/**'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@common/(.*)$': '<rootDir>/common/$1',
    '^@modules/(.*)$': '<rootDir>/modules/$1',
    '^@infra/(.*)$':   '<rootDir>/infrastructure/$1',
    '^@config/(.*)$':  '<rootDir>/config/$1',
  },
};
