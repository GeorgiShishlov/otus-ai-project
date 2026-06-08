import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  forceExit: true,
  clearMocks: true,
  testEnvironmentOptions: {},
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
  setupFiles: ['<rootDir>/tests/setup.ts'],
};

export default config;
