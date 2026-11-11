import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/api/**/*.test.js'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 120000,
  },
});
