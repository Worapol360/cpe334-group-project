/**
 * Survey domain validation according to BR-05 (Specification F-02).
 *
 * Rules:
 *  - title: required after trimming, <= 200 characters.
 *  - description: optional, <= 2000 characters.
 *  - questions: 1 to 20 questions.
 *  - question.text: required after trimming, <= 500 characters.
 *  - question.type: in {'single_choice', 'rating'}.
 *  - question.type === 'single_choice': 2 to 10 options, each non-empty string <= 200 chars.
 *  - question.type === 'rating': no options permitted (scale fixed 1-5).
 *  - client values for ownerId, status, mode are ignored.
 */

const TITLE_MAX = 200;
const DESC_MAX = 2000;
const QUESTIONS_MIN = 1;
const QUESTIONS_MAX = 20;
const QUESTION_TEXT_MAX = 500;
const ALLOWED_QUESTION_TYPES = ['single_choice', 'rating'];
const OPTIONS_MIN = 2;
const OPTIONS_MAX = 10;
const OPTION_LABEL_MAX = 200;

export function validateSurveyInput(body) {
  const source = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const fields = [];

  // 1. Title validation
  let sanitizedTitle = undefined;
  if (source.title === undefined || source.title === null || typeof source.title !== 'string') {
    fields.push({ field: 'title', message: 'Title is required' });
  } else {
    const trimmedTitle = source.title.trim();
    if (trimmedTitle.length === 0) {
      fields.push({ field: 'title', message: 'Title is required' });
    } else if (trimmedTitle.length > TITLE_MAX) {
      fields.push({
        field: 'title',
        message: `Title must be at most ${TITLE_MAX} characters`,
      });
    } else {
      sanitizedTitle = trimmedTitle;
    }
  }

  // 2. Description validation (optional)
  let sanitizedDescription = null;
  if (source.description !== undefined && source.description !== null) {
    if (typeof source.description !== 'string') {
      fields.push({ field: 'description', message: 'Description must be a string' });
    } else {
      const trimmedDesc = source.description.trim();
      if (trimmedDesc.length > DESC_MAX) {
        fields.push({
          field: 'description',
          message: `Description must be at most ${DESC_MAX} characters`,
        });
      } else {
        sanitizedDescription = trimmedDesc.length > 0 ? trimmedDesc : null;
      }
    }
  }

  // 3. Questions array validation
  const rawQuestions = source.questions;
  const sanitizedQuestions = [];

  if (!Array.isArray(rawQuestions)) {
    fields.push({ field: 'questions', message: 'Questions must be an array' });
  } else if (rawQuestions.length < QUESTIONS_MIN) {
    fields.push({
      field: 'questions',
      message: `Survey must have at least ${QUESTIONS_MIN} question`,
    });
  } else if (rawQuestions.length > QUESTIONS_MAX) {
    fields.push({
      field: 'questions',
      message: `Survey can have at most ${QUESTIONS_MAX} questions`,
    });
  } else {
    rawQuestions.forEach((q, qIndex) => {
      const qPrefix = `questions[${qIndex}]`;
      if (!q || typeof q !== 'object' || Array.isArray(q)) {
        fields.push({ field: qPrefix, message: 'Question must be an object' });
        return;
      }

      // Question text
      let sanitizedQText = undefined;
      if (q.text === undefined || q.text === null || typeof q.text !== 'string') {
        fields.push({ field: `${qPrefix}.text`, message: 'Question text is required' });
      } else {
        const trimmedQText = q.text.trim();
        if (trimmedQText.length === 0) {
          fields.push({ field: `${qPrefix}.text`, message: 'Question text is required' });
        } else if (trimmedQText.length > QUESTION_TEXT_MAX) {
          fields.push({
            field: `${qPrefix}.text`,
            message: `Question text must be at most ${QUESTION_TEXT_MAX} characters`,
          });
        } else {
          sanitizedQText = trimmedQText;
        }
      }

      // Question type
      if (!ALLOWED_QUESTION_TYPES.includes(q.type)) {
        fields.push({
          field: `${qPrefix}.type`,
          message: `Question type must be one of: ${ALLOWED_QUESTION_TYPES.join(', ')}`,
        });
      }

      // Single-choice options validation
      let sanitizedOptions = undefined;
      if (q.type === 'single_choice') {
        if (!Array.isArray(q.options)) {
          fields.push({
            field: `${qPrefix}.options`,
            message: 'Options must be an array for single_choice questions',
          });
        } else if (q.options.length < OPTIONS_MIN || q.options.length > OPTIONS_MAX) {
          fields.push({
            field: `${qPrefix}.options`,
            message: `Single choice question must have between ${OPTIONS_MIN} and ${OPTIONS_MAX} options`,
          });
        } else {
          sanitizedOptions = [];
          q.options.forEach((opt, optIndex) => {
            const optPrefix = `${qPrefix}.options[${optIndex}]`;
            const labelStr = typeof opt === 'string' ? opt : opt?.label;
            if (typeof labelStr !== 'string' || labelStr.trim().length === 0) {
              fields.push({ field: optPrefix, message: 'Option label is required' });
            } else if (labelStr.trim().length > OPTION_LABEL_MAX) {
              fields.push({
                field: optPrefix,
                message: `Option label must be at most ${OPTION_LABEL_MAX} characters`,
              });
            } else {
              sanitizedOptions.push({
                position: optIndex + 1,
                label: labelStr.trim(),
              });
            }
          });
        }
      } else if (q.type === 'rating') {
        if (q.options && Array.isArray(q.options) && q.options.length > 0) {
          fields.push({
            field: `${qPrefix}.options`,
            message: 'Rating questions cannot have options',
          });
        }
      }

      if (fields.length === 0) {
        sanitizedQuestions.push({
          position: qIndex + 1,
          text: sanitizedQText,
          type: q.type,
          options: sanitizedOptions || [],
        });
      }
    });
  }

  const valid = fields.length === 0;

  return {
    valid,
    fields,
    title: sanitizedTitle,
    description: sanitizedDescription,
    questions: valid ? sanitizedQuestions : undefined,
  };
}
