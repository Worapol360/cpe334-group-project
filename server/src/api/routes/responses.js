import { Router } from 'express';
import { prisma } from '../../persistence/prisma.js';
import { findResponseById } from '../../persistence/responses.js';
import { asyncHandler, errorBody } from '../errors.js';
import { loadSession, requireRole } from '../middleware/session.js';

export const responsesRouter = Router();

responsesRouter.use(loadSession);
responsesRouter.use(requireRole('respondent'));

responsesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) {
      res.status(404).json(errorBody('NOT_FOUND', 'Response not found'));
      return;
    }

    const responseId = parseInt(req.params.id, 10);
    const response = await findResponseById(prisma, responseId);

    if (!response) {
      res.status(404).json(errorBody('NOT_FOUND', 'Response not found'));
      return;
    }

    // Role/Ownership check: only the respondent who submitted this response can view it (BR-07)
    if (response.respondentId !== req.user.id) {
      res.status(403).json(errorBody('FORBIDDEN', 'Forbidden'));
      return;
    }

    res.status(200).json({
      response: {
        id: response.id,
        surveyId: response.surveyId,
        surveyTitle: response.survey.title,
        submittedAt: response.submittedAt.toISOString(),
        answers: response.answers.map((a) => ({
          questionId: a.questionId,
          questionText: a.question.text,
          type: a.question.type,
          optionId: a.optionId,
          optionLabel: a.option ? a.option.label : null,
          ratingValue: a.ratingValue,
        })),
      },
    });
  }),
);

