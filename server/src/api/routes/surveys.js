import { Router } from 'express';
import { prisma } from '../../persistence/prisma.js';
import { listPublishedSurveys, findPublishedSurveyById } from '../../persistence/surveys.js';
import { asyncHandler, errorBody } from '../errors.js';
import { loadSession, requireRole } from '../middleware/session.js';

export const surveysRouter = Router();

surveysRouter.use(loadSession);
surveysRouter.use(requireRole('respondent'));

surveysRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const surveys = await listPublishedSurveys(prisma);
    res.status(200).json({ surveys });
  }),
);

surveysRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) {
      res.status(404).json(errorBody('NOT_FOUND', 'Survey not found'));
      return;
    }

    const surveyId = parseInt(req.params.id, 10);
    const survey = await findPublishedSurveyById(prisma, surveyId);
    if (!survey) {
      res.status(404).json(errorBody('NOT_FOUND', 'Survey not found'));
      return;
    }

    res.status(200).json({ survey });
  }),
);
