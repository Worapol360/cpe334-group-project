/**
 * Responses persistence layer (F-04)
 *
 * Implements atomic transactional creation of responses with answers,
 * and scoped response queries.
 */

export class DuplicateResponseError extends Error {
  constructor(message = 'Duplicate response') {
    super(message);
    this.name = 'DuplicateResponseError';
    this.code = 'DUPLICATE_RESPONSE';
  }
}

export async function createResponseWithAnswers(prisma, { surveyId, respondentId, answers }) {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Create response record (UNIQUE(survey_id, respondent_id) enforced by DB)
      const response = await tx.response.create({
        data: {
          surveyId,
          respondentId,
        },
      });

      // 2. Insert answer rows atomically
      for (const ans of answers) {
        await tx.answer.create({
          data: {
            responseId: response.id,
            questionId: ans.questionId,
            optionId: ans.optionId !== undefined && ans.optionId !== null ? ans.optionId : null,
            ratingValue: ans.ratingValue !== undefined && ans.ratingValue !== null ? ans.ratingValue : null,
          },
        });
      }

      return response;
    });
  } catch (err) {
    if (err.code === 'P2002') {
      // Unique constraint violation (survey_id, respondent_id)
      throw new DuplicateResponseError('You have already submitted a response to this survey');
    }
    throw err;
  }
}

export async function findResponseById(prisma, id) {
  return prisma.response.findUnique({
    where: { id },
    include: {
      survey: {
        select: {
          id: true,
          title: true,
        },
      },
      answers: {
        orderBy: { questionId: 'asc' },
        include: {
          question: {
            select: {
              id: true,
              text: true,
              type: true,
            },
          },
          option: {
            select: {
              id: true,
              label: true,
            },
          },
        },
      },
    },
  });
}

export async function findResponseBySurveyAndRespondent(prisma, surveyId, respondentId) {
  return prisma.response.findUnique({
    where: {
      surveyId_respondentId: {
        surveyId,
        respondentId,
      },
    },
  });
}

