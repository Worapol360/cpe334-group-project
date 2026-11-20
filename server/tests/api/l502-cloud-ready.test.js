import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const originalEnv = {
  APP_ENV: process.env.APP_ENV,
  APP_VERSION: process.env.APP_VERSION,
  COOKIE_SECURE: process.env.COOKIE_SECURE,
};

process.env.APP_ENV = 'production';
process.env.APP_VERSION = '1.2.3-l502';
process.env.COOKIE_SECURE = 'true';

const { createApp } = await import('../../src/app.js');
const { config } = await import('../../src/config.js');
const { sessionCookieOptions } = await import('../../src/api/middleware/session.js');

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const distDir = path.join(repoRoot, 'client', 'dist');
const indexPath = path.join(distDir, 'index.html');
const MARKER = 'L5-02-TEST-INDEX';
const hadPreexistingIndex = existsSync(indexPath);

if (!hadPreexistingIndex) {
  mkdirSync(distDir, { recursive: true });
  writeFileSync(
    indexPath,
    `<!doctype html><html><body><div id="root">${MARKER}</div></body></html>`,
  );
}

const app = createApp();

afterAll(() => {
  if (!hadPreexistingIndex) rmSync(distDir, { recursive: true, force: true });
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('L5-02: production serving, trust proxy, version in health', () => {
  it('GET /api/health reports version from APP_VERSION', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', version: '1.2.3-l502' });
    expect(Object.keys(res.body).sort()).toEqual(['status', 'version']);
  });

  it('unknown /api path still returns the JSON error envelope in production', async () => {
    const res = await request(app).get('/api/definitely-not-a-route');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Not found' } });
  });

  it('sets trust proxy to 1 in production', () => {
    expect(app.get('trust proxy')).toBe(1);
  });

  it('serves the built client index.html for non-API routes in production', async () => {
    const root = await request(app).get('/');
    expect(root.status).toBe(200);
    expect(root.headers['content-type']).toMatch(/text\/html/);
    if (!hadPreexistingIndex) expect(root.text).toContain(MARKER);

    const spaRoute = await request(app).get('/some/spa/route');
    expect(spaRoute.status).toBe(200);
    expect(spaRoute.headers['content-type']).toMatch(/text\/html/);
  });

  it('cookie options keep HttpOnly and SameSite=Lax and follow COOKIE_SECURE', () => {
    const options = sessionCookieOptions(60_000);
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe('lax');
    expect(options.path).toBe('/');
    expect(options.secure).toBe(true);
    expect(options.maxAge).toBe(60_000);
  });

  it('development behaviour is unchanged: non-API route returns the JSON 404 envelope', async () => {
    vi.resetModules();
    process.env.APP_ENV = 'development';
    try {
      const { createApp: createDevApp } = await import('../../src/app.js');
      const devApp = createDevApp();
      expect(devApp.get('trust proxy')).toBeFalsy();

      const res = await request(devApp).get('/some/spa/route');
      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Not found' } });

      const health = await request(devApp).get('/api/health');
      expect(health.status).toBe(200);
      expect(health.body).toEqual({ status: 'ok', version: config.appVersion });
    } finally {
      process.env.APP_ENV = 'production';
      vi.resetModules();
    }
  });
});
