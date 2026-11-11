import express from 'express';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { errorBody } from './api/errors.js';
import { authRouter } from './api/routes/auth.js';
import { healthRouter } from './api/routes/health.js';

function cors(req, res, next) {
  const origin = req.headers.origin;
  if (origin && config.corsAllowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors);
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);

  app.use((req, res) => {
    res.status(404).json(errorBody('NOT_FOUND', 'Not found'));
  });

  app.use((err, req, res, next) => {
    if (config.logLevel !== 'silent') console.error(err);
    res.status(500).json(errorBody('INTERNAL_ERROR', 'Internal server error'));
  });

  return app;
}
