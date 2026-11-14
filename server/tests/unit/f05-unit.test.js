import { describe, expect, it } from 'vitest';
import { aggregate } from '../../src/domain/summary.js';

const FIXTURE_SURVEY = {
  id: 1,
  title: 'Aggregate Fixture Survey',
  status: 'published',
  questions: [
    {
      id: 11,
      surveyId: 1,
      position: 1,
      text: 'Pick the best topic',
      type: 'single_choice',
      options: [
        { id: 21, questionId: 11, position: 1, label: 'Git' },
        { id: 22, questionId: 11, position: 2, label: 'Testing' },
        { id: 23, questionId: 11, position: 3, label: 'CI/CD' },
      ],
    },
    {
      id: 12,
      surveyId: 1,
      position: 2,
      text: 'Rate the lab',
      type: 'rating',
      options: [],
    },
  ],
};

const FIXTURE_RESPONSES = [
  {
    id: 501,
    surveyId: 1,
    respondentId: 1,
    answers: [
      { questionId: 11, optionId: 21, ratingValue: null },
      { questionId: 12, optionId: null, ratingValue: 3 },
    ],
  },
  {
    id: 502,
    surveyId: 1,
    respondentId: 2,
    answers: [
      { questionId: 11, optionId: 21, ratingValue: null },
      { questionId: 12, optionId: null, ratingValue: 4 },
    ],
  },
  {
    id: 503,
    surveyId: 1,
    respondentId: 3,
    answers: [
      { questionId: 11, optionId: 22, ratingValue: null },
      { questionId: 12, optionId: null, ratingValue: 5 },
    ],
  },
];

function choiceSurvey(labels) {
  return {
    id: 2,
    title: 'Choice fixture',
    status: 'published',
    questions: [
      {
        id: 21,
        surveyId: 2,
        position: 1,
        text: 'Pick one',
        type: 'single_choice',
        options: labels.map((label, i) => ({
          id: 210 + i,
          questionId: 21,
          position: i + 1,
          label,
        })),
      },
    ],
  };
}

function choiceResponse(id, optionId) {
  return {
    id,
    surveyId: 2,
    respondentId: id,
    answers: [{ questionId: 21, optionId, ratingValue: null }],
  };
}

function ratingSurvey() {
  return {
    id: 3,
    title: 'Rating fixture',
    status: 'published',
    questions: [
      {
        id: 31,
        surveyId: 3,
        position: 1,
        text: 'Rate it',
        type: 'rating',
        options: [],
      },
    ],
  };
}

function ratingResponse(id, ratingValue) {
  return {
    id,
    surveyId: 3,
    respondentId: id,
    answers: [{ questionId: 31, optionId: null, ratingValue }],
  };
}

describe('F-05 Owner Aggregate Summary Unit Tests (pure domain aggregate)', () => {
  it('TC-F05-01: aggregate() over the 3-response fixture -> responseCount 3; Git 2, Testing 1, CI/CD 0; rating distribution 3/4/5 = 1 each', () => {
    const summary = aggregate(FIXTURE_SURVEY, FIXTURE_RESPONSES);

    expect(summary.responseCount).toBe(3);

    const single = summary.questions.find((q) => q.type === 'single_choice');
    expect(single).toBeDefined();
    expect(single.questionId).toBe(11);
    const counts = Object.fromEntries(single.options.map((o) => [o.label, o.count]));
    expect(counts).toEqual({ Git: 2, Testing: 1, 'CI/CD': 0 });

    const rating = summary.questions.find((q) => q.type === 'rating');
    expect(rating).toBeDefined();
    expect(rating.questionId).toBe(12);
    expect(rating.distribution).toEqual({ 1: 0, 2: 0, 3: 1, 4: 1, 5: 1 });
  });

  it('TC-F05-03: percent = count/responseCount*100 rounded to 1 decimal -> 1,1,1 of 3 = 33.3 each; 2,1 of 3 = 66.7 and 33.3', () => {
    // counts 1, 1, 1 of 3
    const evenSurvey = choiceSurvey(['Alpha', 'Beta', 'Gamma']);
    const evenResponses = [
      choiceResponse(1, 210),
      choiceResponse(2, 211),
      choiceResponse(3, 212),
    ];
    const evenSummary = aggregate(evenSurvey, evenResponses);
    expect(evenSummary.responseCount).toBe(3);
    expect(evenSummary.questions[0].options.map((o) => o.percent)).toEqual([
      33.3, 33.3, 33.3,
    ]);

    // counts 2, 1, 0 of 3
    const skewSurvey = choiceSurvey(['X', 'Y', 'Z']);
    const skewResponses = [
      choiceResponse(4, 210),
      choiceResponse(5, 210),
      choiceResponse(6, 211),
    ];
    const skewSummary = aggregate(skewSurvey, skewResponses);
    expect(skewSummary.responseCount).toBe(3);
    expect(skewSummary.questions[0].options.map((o) => o.percent)).toEqual([
      66.7, 33.3, 0,
    ]);
  });

  it('TC-F05-04: rating average rounded to 2 decimals -> [1,2] = 1.50, [3,4,5] = 4.00, [5,5,4] = 4.67', () => {
    const survey = ratingSurvey();

    const first = aggregate(survey, [ratingResponse(1, 1), ratingResponse(2, 2)]);
    expect(first.questions[0].average).toBe(1.5);

    const second = aggregate(survey, [
      ratingResponse(3, 3),
      ratingResponse(4, 4),
      ratingResponse(5, 5),
    ]);
    expect(second.questions[0].average).toBe(4);

    const third = aggregate(survey, [
      ratingResponse(6, 5),
      ratingResponse(7, 5),
      ratingResponse(8, 4),
    ]);
    expect(third.questions[0].average).toBe(4.67);
  });
});
