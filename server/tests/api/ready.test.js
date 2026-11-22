import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/persistence/prisma.js';

describe('GET /api/ready - database readiness check', () => {
  it('returns 200 { status: "ready", db: "connected" } when DB is reachable', async () => {
    const app = createApp();
    const res = await request(app).get('/api/ready');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ready', db: 'connected' });
  });

  it('returns 503 { status: "not_ready", db: "disconnected" } when DB query fails', async () => {
    const app = createApp();
    const originalQueryRaw = prisma.$queryRaw;
    prisma.$queryRaw = vi.fn().mockRejectedValue(new Error('DB connection failed'));
    try {
      const res = await request(app).get('/api/ready');
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ status: 'not_ready', db: 'disconnected' });
    } finally {
      prisma.$queryRaw = originalQueryRaw;
    }
  });
});

