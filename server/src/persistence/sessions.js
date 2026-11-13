import { createHash, randomBytes } from 'node:crypto';
import { prisma } from './prisma.js';

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId, ttlMinutes) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
  const session = await prisma.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });
  return { token, session };
}

export async function findValidSession(token) {
  if (typeof token !== 'string' || token === '') return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.revokedAt !== null) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;
  return session;
}

export async function revokeSession(sessionId) {
  return prisma.session.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  });
}
