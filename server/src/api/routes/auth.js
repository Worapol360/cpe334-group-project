import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { config } from '../../config.js';
import { prisma } from '../../persistence/prisma.js';
import { createSession, revokeSession } from '../../persistence/sessions.js';
import { validateLoginInput } from '../../domain/auth.js';
import { asyncHandler, errorBody } from '../errors.js';
import {
  SESSION_COOKIE,
  loadSession,
  requireAuth,
  requireRole,
  sessionCookieOptions,
} from '../middleware/session.js';

export const authRouter = Router();

authRouter.use(loadSession);

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const result = validateLoginInput(req.body);
    if (!result.valid) {
      res
        .status(422)
        .json(errorBody('VALIDATION_ERROR', 'Validation failed', result.fields));
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: result.email } });
    const passwordOk = user
      ? await bcrypt.compare(result.password, user.passwordHash)
      : false;
    if (!user || !passwordOk) {
      res.status(401).json(errorBody('INVALID_CREDENTIALS', 'Invalid email or password'));
      return;
    }

    const { token } = await createSession(user.id, config.sessionTtlMinutes);
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions(config.sessionTtlMinutes * 60_000));
    res.status(200).json({
      user: { id: user.id, displayName: user.displayName, role: user.role },
    });
  }),
);

authRouter.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    await revokeSession(req.session.id);
    res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
    res.status(204).end();
  }),
);

authRouter.get('/me', requireAuth, (req, res) => {
  res.status(200).json({ user: req.user });
});

if (config.appEnv !== 'production') {
  authRouter.get('/probe', requireAuth, (req, res) => {
    res.status(200).json({ ok: true, user: req.user });
  });

  authRouter.get('/probe/owner', requireRole('owner'), (req, res) => {
    res.status(200).json({ ok: true, user: req.user });
  });
}
