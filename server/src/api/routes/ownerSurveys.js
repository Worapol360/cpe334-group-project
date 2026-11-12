import { Router } from 'express';
import { prisma } from '../../persistence/prisma.js';
import {
  createSurveyWithQuestions,
  listSurveysByOwner,
  findSurveyById,
} from '../../persistence/surveys.js';
import { validateSurveyInput } from '../../domain/survey.js';
import { asyncHandler, errorBody } from '../errors.js';
import { loadSession, requireRole } from '../middleware/session.js';

export const ownerSurveysRouter = Router();

ownerSurveysRouter.use(loadSession);
ownerSurveysRouter.use(requireRole('owner'));

ownerSurveysRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const surveys = await listSurveysByOwner(prisma, req.user.id);
    res.status(200).json({ surveys });
  }),
);

ownerSurveysRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const surveyId = parseInt(req.params.id, 10);
    if (isNaN(surveyId)) {
      res.status(404).json(errorBody('NOT_FOUND', 'Survey not found'));
      return;
    }

    const survey = await findSurveyById(prisma, surveyId);
    if (!survey) {
      res.status(404).json(errorBody('NOT_FOUND', 'Survey not found'));
      return;
    }

    if (survey.ownerId !== req.user.id) {
      res.status(403).json(errorBody('FORBIDDEN', 'You do not have permission to access this survey'));
      return;
    }

    res.status(200).json({ survey });
  }),
);

ownerSurveysRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const result = validateSurveyInput(req.body);
    if (!result.valid) {
      res.status(422).json(errorBody('VALIDATION_ERROR', 'Validation failed', result.fields));
      return;
    }

    const survey = await createSurveyWithQuestions(prisma, {
      ownerId: req.user.id,
      title: result.title,
      description: result.description,
      questions: result.questions,
    });

    res.status(201).json({ survey });
  }),
);
