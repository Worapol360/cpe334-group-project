import { Router } from 'express';
import { config } from '../../config.js';

export const healthRouter = Router();

healthRouter.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', version: config.appVersion });
});
