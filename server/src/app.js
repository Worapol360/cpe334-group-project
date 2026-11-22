import { existsSync } from 'node:fs';
import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import { config, serverRootDir } from './config.js';
import { errorBody } from './api/errors.js';
import { authRouter } from './api/routes/auth.js';
import { healthRouter } from './api/routes/health.js';
import { ownerSurveysRouter } from './api/routes/ownerSurveys.js';
import { surveysRouter } from './api/routes/surveys.js';
import { responsesRouter } from './api/routes/responses.js';

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
  if (config.appEnv === 'production') {
    app.set('trust proxy', 1);
  }
  app.use(cors);
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/owner/surveys', ownerSurveysRouter);
  app.use('/api/surveys', surveysRouter);
  app.use('/api/responses', responsesRouter);

  if (config.appEnv === 'production') {
    const clientDistDir = path.resolve(serverRootDir, '..', 'client', 'dist');
    const clientIndex = path.join(clientDistDir, 'index.html');
    if (existsSync(clientIndex)) {
      app.use(express.static(clientDistDir));
      app.use((req, res, next) => {
        const isApi = req.path === '/api' || req.path.startsWith('/api/');
        if (isApi || (req.method !== 'GET' && req.method !== 'HEAD')) {
          next();
          return;
        }
        res.sendFile(clientIndex);
      });
    }
  }

  app.use((req, res) => {
    res.status(404).json(errorBody('NOT_FOUND', 'Not found'));
  });

  app.use((err, req, res, next) => {
    if (config.logLevel !== 'silent') console.error(err);
    res.status(500).json(errorBody('INTERNAL_ERROR', 'Internal server error'));
  });

  return app;
}
