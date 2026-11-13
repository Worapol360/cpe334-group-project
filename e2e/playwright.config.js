import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { defineConfig } from '@playwright/test';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const serverDir = path.join(rootDir, 'server');
const clientDir = path.join(rootDir, 'client');

dotenv.config({ path: path.join(serverDir, '.env') });

const testUrl = process.env.DATABASE_URL_TEST;
if (!testUrl) {
  throw new Error(
    'DATABASE_URL_TEST is not set. Refusing to run E2E tests without a dedicated test database ' +
      '(see docs/system-sds.md §4.1 and §9).',
  );
}
if (testUrl === process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL_TEST equals DATABASE_URL. Refusing to run E2E tests against the application database.',
  );
}

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.js',
  globalSetup: './global-setup.js',
  timeout: 30000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    channel: 'chrome',
  },
  webServer: [
    {
      command: 'node src/server.js',
      cwd: serverDir,
      port: 8081,
      reuseExistingServer: false,
      timeout: 60000,
      env: {
        ...process.env,
        APP_ENV: 'development',
        PORT: '8081',
        DATABASE_URL: testUrl,
        COOKIE_SECURE: 'false',
      },
    },
    {
      command: 'npm run dev',
      cwd: clientDir,
      port: 5173,
      reuseExistingServer: false,
      timeout: 60000,
      env: { ...process.env },
    },
  ],
});
