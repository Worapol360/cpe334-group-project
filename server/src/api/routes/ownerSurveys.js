import { Router } from 'express';
import { prisma } from '../../persistence/prisma.js';
import {
  createSurveyWithQuestions,
  listSurveysByOwner,
  findSurveyById,
  publishSurveyIfDraft,
} from '../../persistence/surveys.js';
import { loadSummaryCounts } from '../../persistence/summaries.js';
import { validateSurveyInput } from '../../domain/survey.js';
import { publishSurvey } from '../../domain/publication.js';
import { aggregate } from '../../domain/summary.js';
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
    if (!/^\d+$/.test(req.params.id)) {
      res.status(404).json(errorBody('NOT_FOUND', 'Survey not found'));
      return;
    }

    const surveyId = parseInt(req.params.id, 10);

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

ownerSurveysRouter.get(
  '/:id/summary',
  asyncHandler(async (req, res) => {
    // Freshness contract (F-05): never serve a cached aggregate.
    res.set('Cache-Control', 'no-store');

    if (!/^\d+$/.test(req.params.id)) {
      res.status(404).json(errorBody('NOT_FOUND', 'Survey not found'));
      return;
    }

    const surveyId = parseInt(req.params.id, 10);

    const survey = await findSurveyById(prisma, surveyId);
    if (!survey) {
      res.status(404).json(errorBody('NOT_FOUND', 'Survey not found'));
      return;
    }

    if (survey.ownerId !== req.user.id) {
      res.status(403).json(errorBody('FORBIDDEN', 'You do not have permission to access this survey'));
      return;
    }

    // Grouped counts only; no per-response rows are loaded or returned (BR-07)
    const counts = await loadSummaryCounts(prisma, surveyId);
    const summary = aggregate(survey, counts);

    res.status(200).json({
      summary: { ...summary, generatedAt: new Date().toISOString() },
    });
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

ownerSurveysRouter.post(
  '/:id/publish',
  asyncHandler(async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) {
      res.status(404).json(errorBody('NOT_FOUND', 'Survey not found'));
      return;
    }

    const surveyId = parseInt(req.params.id, 10);

    const survey = await findSurveyById(prisma, surveyId);
    if (!survey) {
      res.status(404).json(errorBody('NOT_FOUND', 'Survey not found'));
      return;
    }

    if (survey.ownerId !== req.user.id) {
      res.status(403).json(errorBody('FORBIDDEN', 'You do not have permission to access this survey'));
      return;
    }

    const result = publishSurvey(survey);
    if (!result.ok) {
      if (result.code === 'INVALID_STATE_TRANSITION') {
        res.status(409).json(errorBody('INVALID_STATE_TRANSITION', result.message));
        return;
      }
      res.status(422).json(errorBody('VALIDATION_ERROR', 'Validation failed', result.fields));
      return;
    }

    const published = await publishSurveyIfDraft(prisma, surveyId, result.publishedAt);
    if (!published) {
      res
        .status(409)
        .json(errorBody('INVALID_STATE_TRANSITION', 'Survey has already been published'));
      return;
    }

    const updated = await findSurveyById(prisma, surveyId);
    res.status(200).json({ survey: updated });
  }),
);

