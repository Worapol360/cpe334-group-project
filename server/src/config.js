import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(serverRoot, '.env');
if (existsSync(envFile)) {
  dotenv.config({ path: envFile });
}

function readInt(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value)) throw new Error(`${name} must be an integer, got "${raw}"`);
  return value;
}

function readBool(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return raw === 'true';
}

export const config = {
  appEnv: process.env.APP_ENV || 'development',
  port: readInt('PORT', 8080),
  logLevel: process.env.LOG_LEVEL || 'info',
  appVersion: process.env.APP_VERSION || 'dev',
  corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean),
  sessionTtlMinutes: readInt('SESSION_TTL_MINUTES', 60),
  cookieSecure: readBool('COOKIE_SECURE', false),
  databaseUrl: process.env.DATABASE_URL,
  databaseUrlTest: process.env.DATABASE_URL_TEST,
  seedPassword: process.env.SEED_PASSWORD,
};

export const serverRootDir = serverRoot;
