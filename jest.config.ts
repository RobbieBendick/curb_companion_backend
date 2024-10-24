import type { Config } from 'jest';

const config: Config = {
  verbose: true,
  setupFiles: ['dotenv/config'],
  testTimeout: 30000,
  globalSetup: '<rootDir>/global-setup.ts',
  globalTeardown: '<rootDir>/global-teardown.ts',
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  moduleDirectories: ['node_modules', 'src', 'src/shared'],
};

export default config;
