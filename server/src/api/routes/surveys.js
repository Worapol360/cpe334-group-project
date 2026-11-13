import { Router } from 'express';
import { prisma } from '../../persistence/prisma.js';
import { listPublishedSurveys, findPublishedSurveyById } from '../../persistence/surveys.js';
import {
  createResponseWithAnswers,
  findResponseBySurveyAndRespondent,
  DuplicateResponseError,
} from '../../persistence/responses.js';
import { validateResponse } from '../../domain/response.js';
import { asyncHandler, errorBody } from '../errors.js';
import { loadSession, requireRole } from '../middleware/session.js';

export const surveysRouter = Router();

surveysRouter.use(loadSession);
surveysRouter.use(requireRole('respondent'));

surveysRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const surveys = await listPublishedSurveys(prisma, req.user?.id);
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

    let myResponseId = null;
    if (req.user?.id) {
      const myResp = await findResponseBySurveyAndRespondent(prisma, survey.id, req.user.id);
      if (myResp) {
        myResponseId = myResp.id;
      }
    }

    res.status(200).json({ survey: { ...survey, myResponseId } });
  }),
);

surveysRouter.post(
  '/:id/responses',
  asyncHandler(async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) {
      res.status(404).json(errorBody('NOT_FOUND', 'Survey not found'));
      return;
    }

    const surveyId = parseInt(req.params.id, 10);

    // 1. Check survey exists
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        questions: {
          orderBy: { position: 'asc' },
          include: {
            options: {
              orderBy: { position: 'asc' },
            },
          },
        },
      },
    });

    if (!survey) {
      res.status(404).json(errorBody('NOT_FOUND', 'Survey not found'));
      return;
    }

    // 2. Check survey status is 'published' (BR-02)
    if (survey.status !== 'published') {
      res.status(409).json(errorBody('SURVEY_NOT_OPEN', 'Survey is not open for responses'));
      return;
    }

    // 3. Duplicate pre-check (BR-01)
    const existing = await findResponseBySurveyAndRespondent(prisma, surveyId, req.user.id);
    if (existing) {
      res.status(409).json(errorBody('DUPLICATE_RESPONSE', 'You have already submitted a response to this survey'));
      return;
    }

    // 4. Validate answers against survey questions (BR-06)
    const validation = validateResponse(survey, req.body);
    if (!validation.valid) {
      res.status(422).json(errorBody('VALIDATION_ERROR', 'Validation failed', validation.fields));
      return;
    }

    // 5. Atomic insert with DB-level unique constraint guard
    try {
      const response = await createResponseWithAnswers(prisma, {
        surveyId,
        respondentId: req.user.id,
        answers: validation.answers,
      });

      res.status(201).json({
        response: {
          id: response.id,
          surveyId: response.surveyId,
          submittedAt: response.submittedAt.toISOString(),
        },
      });
    } catch (err) {
      if (err instanceof DuplicateResponseError || err.code === 'DUPLICATE_RESPONSE') {
        res.status(409).json(errorBody('DUPLICATE_RESPONSE', 'You have already submitted a response to this survey'));
        return;
      }
      throw err;
    }
  }),
);
