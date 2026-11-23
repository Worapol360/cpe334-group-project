import { Router } from 'express';
import { prisma } from '../../persistence/prisma.js';

export const readyRouter = Router();

readyRouter.get('/', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ready', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'not_ready', db: 'disconnected' });
  }
});

