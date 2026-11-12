import { describe, expect, it } from 'vitest';
import { validateSurveyInput } from '../../src/domain/survey.js';

describe('F-02 Survey Creation Unit Tests (BR-05 Validation)', () => {
  const validSingleChoice = {
    text: 'What is your favorite color?',
    type: 'single_choice',
    options: ['Red', 'Blue'],
  };

  const validRating = {
    text: 'Rate this course from 1 to 5',
    type: 'rating',
  };

  const baseValidSurvey = {
    title: 'Customer Satisfaction Survey',
    description: 'A brief satisfaction survey',
    questions: [validSingleChoice, validRating],
  };

  it('TC-F02-03: rejects empty or whitespace-only title, accepts 200 chars, rejects 201 chars', () => {
    // Empty title
    const emptyRes = validateSurveyInput({ ...baseValidSurvey, title: '' });
    expect(emptyRes.valid).toBe(false);
    expect(emptyRes.fields).toContainEqual(
      expect.objectContaining({ field: 'title' }),
    );

    // Whitespace title
    const whitespaceRes = validateSurveyInput({ ...baseValidSurvey, title: '   ' });
    expect(whitespaceRes.valid).toBe(false);
    expect(whitespaceRes.fields).toContainEqual(
      expect.objectContaining({ field: 'title' }),
    );

    // Exactly 200 chars title
    const title200 = 'A'.repeat(200);
    const valid200Res = validateSurveyInput({ ...baseValidSurvey, title: title200 });
    expect(valid200Res.valid).toBe(true);
    expect(valid200Res.title).toBe(title200);

    // 201 chars title
    const title201 = 'A'.repeat(201);
    const invalid201Res = validateSurveyInput({ ...baseValidSurvey, title: title201 });
    expect(invalid201Res.valid).toBe(false);
    expect(invalid201Res.fields).toContainEqual(
      expect.objectContaining({ field: 'title' }),
    );
  });

  it('TC-F02-04: rejects zero questions array', () => {
    const zeroQRes = validateSurveyInput({ ...baseValidSurvey, questions: [] });
    expect(zeroQRes.valid).toBe(false);
    expect(zeroQRes.fields).toContainEqual(
      expect.objectContaining({ field: 'questions' }),
    );
  });

  it('TC-F02-05: validates single_choice options boundary (1 reject, 2 accept, 10 accept, 11 reject)', () => {
    // 1 option -> reject
    const q1Opt = {
      text: 'Question with 1 option',
      type: 'single_choice',
      options: ['Option 1'],
    };
    const res1 = validateSurveyInput({ ...baseValidSurvey, questions: [q1Opt] });
    expect(res1.valid).toBe(false);
    expect(res1.fields).toContainEqual(
      expect.objectContaining({ field: 'questions[0].options' }),
    );

    // 2 options -> accept
    const q2Opt = {
      text: 'Question with 2 options',
      type: 'single_choice',
      options: ['Opt 1', 'Opt 2'],
    };
    const res2 = validateSurveyInput({ ...baseValidSurvey, questions: [q2Opt] });
    expect(res2.valid).toBe(true);

    // 10 options -> accept
    const q10Opt = {
      text: 'Question with 10 options',
      type: 'single_choice',
      options: Array.from({ length: 10 }, (_, i) => `Opt ${i + 1}`),
    };
    const res10 = validateSurveyInput({ ...baseValidSurvey, questions: [q10Opt] });
    expect(res10.valid).toBe(true);

    // 11 options -> reject
    const q11Opt = {
      text: 'Question with 11 options',
      type: 'single_choice',
      options: Array.from({ length: 11 }, (_, i) => `Opt ${i + 1}`),
    };
    const res11 = validateSurveyInput({ ...baseValidSurvey, questions: [q11Opt] });
    expect(res11.valid).toBe(false);
    expect(res11.fields).toContainEqual(
      expect.objectContaining({ field: 'questions[0].options' }),
    );
  });

  it('TC-F02-06: validates total question count boundary (20 accept, 21 reject)', () => {
    // 20 questions -> accept
    const q20 = Array.from({ length: 20 }, (_, i) => ({
      text: `Question ${i + 1}`,
      type: 'rating',
    }));
    const res20 = validateSurveyInput({ ...baseValidSurvey, questions: q20 });
    expect(res20.valid).toBe(true);

    // 21 questions -> reject
    const q21 = Array.from({ length: 21 }, (_, i) => ({
      text: `Question ${i + 1}`,
      type: 'rating',
    }));
    const res21 = validateSurveyInput({ ...baseValidSurvey, questions: q21 });
    expect(res21.valid).toBe(false);
    expect(res21.fields).toContainEqual(
      expect.objectContaining({ field: 'questions' }),
    );
  });

  it('TC-F02-07: rejects rating with options and rejects unknown question type', () => {
    // rating with options
    const ratingWithOptions = {
      text: 'Rating with options',
      type: 'rating',
      options: ['1', '2', '3'],
    };
    const resRating = validateSurveyInput({
      ...baseValidSurvey,
      questions: [ratingWithOptions],
    });
    expect(resRating.valid).toBe(false);
    expect(resRating.fields).toContainEqual(
      expect.objectContaining({ field: 'questions[0].options' }),
    );

    // unknown question type e.g. 'text'
    const unknownTypeQ = {
      text: 'Tell us your thoughts',
      type: 'text',
    };
    const resUnknown = validateSurveyInput({
      ...baseValidSurvey,
      questions: [unknownTypeQ],
    });
    expect(resUnknown.valid).toBe(false);
    expect(resUnknown.fields).toContainEqual(
      expect.objectContaining({ field: 'questions[0].type' }),
    );
  });
});
