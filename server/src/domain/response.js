/**
 * Response domain validation according to BR-06 (Specification F-04).
 *
 * Rules:
 * - survey must have questions.
 * - body must contain an answers array.
 * - every question of the survey must have exactly one answer (no missing, no duplicate).
 * - no answers for foreign questionIds (questions not in this survey).
 * - for single_choice question:
 *   - optionId must be an integer matching an option belonging to that question.
 *   - ratingValue must be null/undefined.
 * - for rating question:
 *   - ratingValue must be an integer between 1 and 5.
 *   - optionId must be null/undefined.
 */

export function validateResponse(survey, body) {
  const fields = [];
  const source = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const rawAnswers = source.answers;

  const surveyQuestions = Array.isArray(survey?.questions) ? survey.questions : [];
  const questionMap = new Map();
  for (const q of surveyQuestions) {
    questionMap.set(q.id, q);
  }

  if (!Array.isArray(rawAnswers)) {
    fields.push({
      field: 'answers',
      message: 'Answers must be an array',
    });
    return { valid: false, fields };
  }

  // Track answers provided per question
  const answersByQuestionId = new Map();
  const sanitizedAnswers = [];

  for (let i = 0; i < rawAnswers.length; i++) {
    const ans = rawAnswers[i];
    const prefix = `answers[${i}]`;

    if (!ans || typeof ans !== 'object' || Array.isArray(ans)) {
      fields.push({ field: prefix, message: 'Answer must be an object' });
      continue;
    }

    const { questionId, optionId, ratingValue } = ans;

    if (questionId === undefined || questionId === null || typeof questionId !== 'number' || !Number.isInteger(questionId)) {
      fields.push({ field: `${prefix}.questionId`, message: 'Question ID is required and must be an integer' });
      continue;
    }

    const qId = questionId;
    const question = questionMap.get(qId);

    if (!question) {
      fields.push({
        field: `${prefix}.questionId`,
        message: `Question ${qId} does not belong to survey ${survey?.id}`,
      });
      continue;
    }

    if (answersByQuestionId.has(qId)) {
      fields.push({
        field: `${prefix}.questionId`,
        message: `Duplicate answer for question ${qId}: "${question.text}"`,
      });
      continue;
    }

    // Validate by question type
    if (question.type === 'single_choice') {
      if (optionId === undefined || optionId === null) {
        fields.push({
          field: `${prefix}.optionId`,
          message: `Option is required for single_choice question ${qId}: "${question.text}"`,
        });
      } else if (typeof optionId !== 'number' || !Number.isInteger(optionId)) {
        fields.push({
          field: `${prefix}.optionId`,
          message: `Option ID must be an integer for question ${qId}`,
        });
      } else {
        const optId = optionId;
        const validOption = Array.isArray(question.options) && question.options.some((o) => o.id === optId);
        if (!validOption) {
          fields.push({
            field: `${prefix}.optionId`,
            message: `Option ${optId} is not a valid option for question ${qId}: "${question.text}"`,
          });
        }
      }

      if (ratingValue !== undefined && ratingValue !== null) {
        fields.push({
          field: `${prefix}.ratingValue`,
          message: `Rating value must not be provided for single_choice question ${qId}`,
        });
      }

      if (fields.length === 0 || !fields.some((f) => f.field.startsWith(prefix))) {
        answersByQuestionId.set(qId, {
          questionId: qId,
          optionId,
          ratingValue: null,
        });
      }
    } else if (question.type === 'rating') {
      if (ratingValue === undefined || ratingValue === null) {
        fields.push({
          field: `${prefix}.ratingValue`,
          message: `Rating value is required for rating question ${qId}: "${question.text}"`,
        });
      } else if (
        typeof ratingValue !== 'number' ||
        !Number.isInteger(ratingValue) ||
        ratingValue < 1 ||
        ratingValue > 5
      ) {
        fields.push({
          field: `${prefix}.ratingValue`,
          message: `Rating value for question ${qId} must be an integer between 1 and 5`,
        });
      }

      if (optionId !== undefined && optionId !== null) {
        fields.push({
          field: `${prefix}.optionId`,
          message: `Option ID must not be provided for rating question ${qId}`,
        });
      }

      if (fields.length === 0 || !fields.some((f) => f.field.startsWith(prefix))) {
        answersByQuestionId.set(qId, {
          questionId: qId,
          optionId: null,
          ratingValue,
        });
      }
    }
  }

  // Check for missing questions in the survey
  for (const q of surveyQuestions) {
    if (!answersByQuestionId.has(q.id)) {
      fields.push({
        field: `answers[${q.id}]`,
        message: `Missing answer for question ${q.id}: "${q.text}"`,
      });
    }
  }

  const valid = fields.length === 0;

  return {
    valid,
    fields,
    answers: valid ? Array.from(answersByQuestionId.values()) : undefined,
  };
}

export const validateResponseInput = validateResponse;
