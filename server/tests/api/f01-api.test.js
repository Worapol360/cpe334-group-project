import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { prisma, resetAndSeed, seedUsers } from '../harness/db.js';
import { createApp } from '../../src/app.js';
import { config } from '../../src/config.js';

const app = createApp();
const SEED_PASSWORD = process.env.SEED_PASSWORD;
const OWNER1 = 'owner1@example.test';
const RESPONDENT1 = 'respondent1@example.test';
const UNKNOWN_EMAIL = 'nobody@example.test';

function cookieFrom(res) {
  const raw = res.headers['set-cookie'];
  return Array.isArray(raw) ? raw[0] : raw;
}

function login(email, password) {
  return request(app).post('/api/auth/login').send({ email, password });
}

function expectNoSecrets(body) {
  const json = JSON.stringify(body);
  expect(json).not.toMatch(/password_hash|passwordHash|token_hash|tokenHash/i);
  expect(json).not.toMatch(/stack|node_modules|\/src\//i);
}

beforeEach(async () => {
  await resetAndSeed();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('TC-F01-01: valid login', () => {
  it('TC-F01-01: seeded owner1 login returns 200, user body, Set-Cookie and a session row', async () => {
    const res = await login(OWNER1, SEED_PASSWORD);
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({
      id: expect.any(Number),
      displayName: expect.any(String),
      role: 'owner',
    });
    const cookie = cookieFrom(res);
    expect(cookie).toBeDefined();
    expect(cookie.toLowerCase()).toContain('httponly');
    expect(cookie.toLowerCase()).toContain('samesite=lax');
    const sessions = await prisma.session.findMany({ where: { userId: res.body.user.id } });
    expect(sessions.length).toBeGreaterThanOrEqual(1);
    expect(sessions[0].tokenHash).not.toContain(' ');
    expect(sessions[0].revokedAt).toBeNull();
    expect(sessions[0].expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe('TC-F01-02: current user', () => {
  it('TC-F01-02: GET me with the login cookie returns the same id and role', async () => {
    const loginRes = await login(OWNER1, SEED_PASSWORD);
    expect(loginRes.status).toBe(200);
    const cookie = cookieFrom(loginRes);
    const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(200);
    expect(me.body.user.id).toBe(loginRes.body.user.id);
    expect(me.body.user.role).toBe(loginRes.body.user.role);
    expect(me.body.user.displayName).toBe(loginRes.body.user.displayName);
  });
});

describe('TC-F01-03: wrong password', () => {
  it('TC-F01-03: wrong password returns 401 INVALID_CREDENTIALS with no cookie', async () => {
    const res = await login(OWNER1, 'definitely-not-the-password');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(res.headers['set-cookie']).toBeUndefined();
  });
});

describe('TC-F01-04: unknown email', () => {
  it('TC-F01-04: unknown email returns a body identical to the wrong-password response', async () => {
    const wrongPassword = await login(OWNER1, 'definitely-not-the-password');
    const unknownEmail = await login(UNKNOWN_EMAIL, 'definitely-not-the-password');
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.body).toEqual(wrongPassword.body);
    expect(unknownEmail.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(unknownEmail.headers['set-cookie']).toBeUndefined();
  });
});

describe('TC-F01-05: login validation', () => {
  const invalidBodies = [
    { label: 'empty body', body: {}, fields: ['email', 'password'] },
    { label: 'missing password', body: { email: OWNER1 }, fields: ['password'] },
    { label: 'missing email', body: { password: 'x' }, fields: ['email'] },
    { label: 'empty email', body: { email: '', password: 'x' }, fields: ['email'] },
    { label: 'empty password', body: { email: OWNER1, password: '' }, fields: ['password'] },
    { label: 'non-string email', body: { email: 123, password: 'x' }, fields: ['email'] },
    { label: 'non-string password', body: { email: OWNER1, password: 123 }, fields: ['password'] },
    { label: 'null email', body: { email: null, password: 'x' }, fields: ['email'] },
    {
      label: 'email too long',
      body: { email: `${'a'.repeat(250)}@example.test`, password: 'x' },
      fields: ['email'],
    },
    {
      label: 'password too long',
      body: { email: OWNER1, password: 'x'.repeat(129) },
      fields: ['password'],
    },
  ];

  for (const { label, body, fields } of invalidBodies) {
    it(`TC-F01-05: ${label} returns 422 VALIDATION_ERROR with field errors and no internals`, async () => {
      const res = await request(app).post('/api/auth/login').send(body);
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(res.body.error.fields)).toBe(true);
      const fieldNames = res.body.error.fields.map((f) => f.field);
      for (const expectedField of fields) {
        expect(fieldNames).toContain(expectedField);
      }
      for (const field of res.body.error.fields) {
        expect(typeof field.message).toBe('string');
        expect(field.message.length).toBeGreaterThan(0);
      }
      const raw = JSON.stringify(res.body);
      expect(raw).not.toMatch(/at\s+\S+\.js|node_modules|stack|Error:/);
      expect(res.headers['set-cookie']).toBeUndefined();
    });
  }
});

describe('TC-F01-06: logout', () => {
  it('TC-F01-06: logout returns 204, the old cookie then gets 401 and revoked_at is set', async () => {
    const loginRes = await login(OWNER1, SEED_PASSWORD);
    expect(loginRes.status).toBe(200);
    const cookie = cookieFrom(loginRes);
    const user = await prisma.user.findUnique({ where: { email: OWNER1 } });
    const sessionBefore = await prisma.session.findFirst({
      where: { userId: user.id },
      orderBy: { id: 'desc' },
    });

    const logout = await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect(logout.status).toBe(204);
    expect(logout.headers['set-cookie']).toBeDefined();

    const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(401);
    expect(me.body.error.code).toBe('UNAUTHENTICATED');

    const sessionAfter = await prisma.session.findUnique({
      where: { id: sessionBefore.id },
    });
    expect(sessionAfter.revokedAt).not.toBeNull();
  });
});

describe('TC-F01-07: missing or garbage session', () => {
  it('TC-F01-07: no cookie and garbage cookie to me and a protected probe route return 401 without data', async () => {
    const noCookieMe = await request(app).get('/api/auth/me');
    expect(noCookieMe.status).toBe(401);
    expect(noCookieMe.body.error.code).toBe('UNAUTHENTICATED');
    expect(noCookieMe.body.user).toBeUndefined();
    expectNoSecrets(noCookieMe.body);

    const garbageMe = await request(app).get('/api/auth/me').set('Cookie', 'sid=garbage-token');
    expect(garbageMe.status).toBe(401);
    expect(garbageMe.body.error.code).toBe('UNAUTHENTICATED');
    expect(garbageMe.body.user).toBeUndefined();

    const noCookieProbe = await request(app).get('/api/auth/probe');
    expect(noCookieProbe.status).toBe(401);
    expect(noCookieProbe.body.error.code).toBe('UNAUTHENTICATED');
    expectNoSecrets(noCookieProbe.body);

    const garbageProbe = await request(app)
      .get('/api/auth/probe')
      .set('Cookie', 'sid=garbage-token');
    expect(garbageProbe.status).toBe(401);
    expect(garbageProbe.body.error.code).toBe('UNAUTHENTICATED');
  });
});

describe('TC-F01-08: expired session', () => {
  it('TC-F01-08: a session whose expires_at is in the past returns 401', async () => {
    const loginRes = await login(OWNER1, SEED_PASSWORD);
    expect(loginRes.status).toBe(200);
    const cookie = cookieFrom(loginRes);
    const user = await prisma.user.findUnique({ where: { email: OWNER1 } });
    const session = await prisma.session.findFirst({
      where: { userId: user.id },
      orderBy: { id: 'desc' },
    });
    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(401);
    expect(me.body.error.code).toBe('UNAUTHENTICATED');
    expectNoSecrets(me.body);
  });
});

describe('TC-F01-09: password storage', () => {
  it('TC-F01-09: stored password_hash differs from plaintext and verifies with bcrypt', async () => {
    const users = await prisma.user.findMany();
    expect(users.length).toBe(4);
    for (const user of users) {
      expect(user.passwordHash).not.toBe(SEED_PASSWORD);
      expect(user.passwordHash.startsWith('$2')).toBe(true);
      expect(bcrypt.compareSync(SEED_PASSWORD, user.passwordHash)).toBe(true);
      expect(bcrypt.compareSync('wrong-password', user.passwordHash)).toBe(false);
    }
  });
});

describe('TC-F01-10: role guard', () => {
  it('TC-F01-10: respondent session gets 403 and owner session gets 200 on an owner-only probe route', async () => {
    const respondentLogin = await login(RESPONDENT1, SEED_PASSWORD);
    expect(respondentLogin.status).toBe(200);
    const respondentProbe = await request(app)
      .get('/api/auth/probe/owner')
      .set('Cookie', cookieFrom(respondentLogin));
    expect(respondentProbe.status).toBe(403);
    expect(respondentProbe.body.error.code).toBe('FORBIDDEN');
    expectNoSecrets(respondentProbe.body);

    const ownerLogin = await login(OWNER1, SEED_PASSWORD);
    expect(ownerLogin.status).toBe(200);
    const ownerProbe = await request(app)
      .get('/api/auth/probe/owner')
      .set('Cookie', cookieFrom(ownerLogin));
    expect(ownerProbe.status).toBe(200);
    expect(ownerProbe.body.user.role).toBe('owner');
  });
});

describe('TC-F01-11: migrate and seed idempotency', () => {
  it('TC-F01-11: seed on an empty DB twice leaves exactly 2 owners and 2 respondents', async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    await seedUsers(prisma);
    await seedUsers(prisma);

    const users = await prisma.user.findMany();
    expect(users.length).toBe(4);
    expect(users.filter((u) => u.role === 'owner').length).toBe(2);
    expect(users.filter((u) => u.role === 'respondent').length).toBe(2);
    const emails = users.map((u) => u.email).sort();
    expect(emails).toEqual([
      'owner1@example.test',
      'owner2@example.test',
      'respondent1@example.test',
      'respondent2@example.test',
    ]);
  });
});

describe('TC-F01-14: no secrets in responses', () => {
  it('TC-F01-14: login and me response JSON contain no password_hash or token hash', async () => {
    const loginRes = await login(OWNER1, SEED_PASSWORD);
    expect(loginRes.status).toBe(200);
    expectNoSecrets(loginRes.body);

    const me = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookieFrom(loginRes));
    expect(me.status).toBe(200);
    expectNoSecrets(me.body);
    expect(Object.keys(me.body.user).sort()).toEqual(['displayName', 'id', 'role']);
  });
});

describe('TC-F01-15: health', () => {
  it('TC-F01-15: GET /api/health without a session returns 200 with status and version', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', version: config.appVersion });
    expectNoSecrets(res.body);
  });
});
