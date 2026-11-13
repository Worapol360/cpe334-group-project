import { describe, expect, it } from 'vitest';
import { validateResponse, validateResponseInput } from '../../src/domain/response.js';

describe('F-04 Response Submission Unit Tests (BR-06 Validation)', () => {
  const sampleSurvey = {
    id: 1,
    title: 'Customer Satisfaction',
    status: 'published',
    questions: [
      {
        id: 101,
        surveyId: 1,
        position: 1,
        text: 'How did you hear about us?',
        type: 'single_choice',
        options: [
          { id: 201, questionId: 101, position: 1, label: 'Search Engine' },
          { id: 202, questionId: 101, position: 2, label: 'Friend' },
          { id: 203, questionId: 101, position: 3, label: 'Social Media' },
        ],
      },
      {
        id: 102,
        surveyId: 1,
        position: 2,
        text: 'Rate your overall satisfaction (1-5)',
        type: 'rating',
        options: [],
      },
    ],
  };

  it('TC-F04-06: answers missing one question -> error naming that question', () => {
    // Only answer question 101, omitting question 102
    const bodyMissingQ102 = {
      answers: [{ questionId: 101, optionId: 201 }],
    };
    const res = validateResponse(sampleSurvey, bodyMissingQ102);
    expect(res.valid).toBe(false);
    expect(res.fields).toBeDefined();
    // Must name question 102 either in field or message
    const q102Error = res.fields.find(
      (f) =>
        f.field.includes('102') ||
        f.message.includes('102') ||
        f.message.toLowerCase().includes('satisfaction') ||
        f.field === 'questions[102]' ||
        f.field === 'answers[102]'
    );
    expect(q102Error).toBeDefined();

    // Empty answers array
    const emptyRes = validateResponse(sampleSurvey, { answers: [] });
    expect(emptyRes.valid).toBe(false);
    expect(emptyRes.fields.length).toBeGreaterThanOrEqual(2);
  });

  it('TC-F04-08: rating values 0, 1, 5, 6, 3.5, "a" -> reject, accept, accept, reject, reject, reject', () => {
    const testCases = [
      { val: 0, expectedValid: false },
      { val: 1, expectedValid: true },
      { val: 5, expectedValid: true },
      { val: 6, expectedValid: false },
      { val: 3.5, expectedValid: false },
      { val: 'a', expectedValid: false },
    ];

    for (const tc of testCases) {
      const body = {
        answers: [
          { questionId: 101, optionId: 201 },
          { questionId: 102, ratingValue: tc.val },
        ],
      };
      const res = validateResponse(sampleSurvey, body);
      expect(res.valid).toBe(tc.expectedValid);
      if (!tc.expectedValid) {
        expect(res.fields).toContainEqual(
          expect.objectContaining({
            field: expect.stringMatching(/102|rating/i),
          })
        );
      }
    }
  });

  it('TC-F04-09: foreign option, foreign question, duplicate answer -> each rejected', () => {
    // 1. Foreign option (option 999 not in question 101)
    const foreignOptionBody = {
      answers: [
        { questionId: 101, optionId: 999 },
        { questionId: 102, ratingValue: 4 },
      ],
    };
    const resForeignOpt = validateResponse(sampleSurvey, foreignOptionBody);
    expect(resForeignOpt.valid).toBe(false);
    expect(resForeignOpt.fields).toBeDefined();

    // 2. Foreign question (question 999 not in this survey)
    const foreignQuestionBody = {
      answers: [
        { questionId: 101, optionId: 201 },
        { questionId: 102, ratingValue: 4 },
        { questionId: 999, ratingValue: 5 },
      ],
    };
    const resForeignQ = validateResponse(sampleSurvey, foreignQuestionBody);
    expect(resForeignQ.valid).toBe(false);

    // 3. Duplicate answer for one question (two answers for question 101)
    const duplicateAnswerBody = {
      answers: [
        { questionId: 101, optionId: 201 },
        { questionId: 101, optionId: 202 },
        { questionId: 102, ratingValue: 4 },
      ],
    };
    const resDup = validateResponse(sampleSurvey, duplicateAnswerBody);
    expect(resDup.valid).toBe(false);

    // 4. Non-integer / boolean / array / string questionId and optionId
    const nonIntegerValues = [true, false, [3], '101', 1.5, {}];
    for (const val of nonIntegerValues) {
      const badQId = validateResponse(sampleSurvey, {
        answers: [
          { questionId: val, optionId: 201 },
          { questionId: 102, ratingValue: 4 },
        ],
      });
      expect(badQId.valid).toBe(false);

      const badOptId = validateResponse(sampleSurvey, {
        answers: [
          { questionId: 101, optionId: val },
          { questionId: 102, ratingValue: 4 },
        ],
      });
      expect(badOptId.valid).toBe(false);
    }
  });
});
