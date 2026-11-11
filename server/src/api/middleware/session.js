import { config } from '../../config.js';
import { errorBody } from '../errors.js';
import { checkRole } from '../../domain/roles.js';
import { findValidSession } from '../../persistence/sessions.js';

export const SESSION_COOKIE = 'sid';

export function sessionCookieOptions(maxAgeMs) {
  const options = {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: config.cookieSecure,
  };
  if (maxAgeMs !== undefined) options.maxAge = maxAgeMs;
  return options;
}

export async function loadSession(req, res, next) {
  try {
    const token = req.cookies ? req.cookies[SESSION_COOKIE] : undefined;
    const session = token ? await findValidSession(token) : null;
    if (session) {
      req.session = session;
      req.user = {
        id: session.user.id,
        displayName: session.user.displayName,
        role: session.user.role,
      };
    }
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    res.status(401).json(errorBody('UNAUTHENTICATED', 'Authentication required'));
    return;
  }
  next();
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json(errorBody('UNAUTHENTICATED', 'Authentication required'));
      return;
    }
    if (!checkRole(req.user, role)) {
      res
        .status(403)
        .json(errorBody('FORBIDDEN', 'You do not have permission to perform this action'));
      return;
    }
    next();
  };
}
