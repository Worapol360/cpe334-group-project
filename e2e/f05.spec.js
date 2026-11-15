import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';

const SEED_PASSWORD = process.env.SEED_PASSWORD || 'change-me';
const OWNER_EMAIL = 'owner1@example.test';
const EMPTY_SURVEY_TITLE = 'Quarterly Team Feedback';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const harnessPath = path.join(rootDir, 'server', 'tests', 'harness', 'db.js');

const SINGLE_TEXT = 'Which aspect did you find most valuable?';
const RATING_TEXT = 'How satisfied are you with the course pace? (1=Lowest, 5=Highest)';

// 200-character option labels for TC-F05-22: one with spaces, one without.
const LONG_SPACED_LABEL = 'lorem ipsum dolor sit amet '.repeat(8).slice(0, 199) + 'x';
const LONG_UNSPACED_LABEL = 'continuous'.repeat(20);

// DB fixture mirroring the seeded published survey: 3 responses,
// option votes 2/1/0, ratings 4, 5, 2 (average 3.67).
let fixture;

// Varied-response-count fixtures for TC-F05-20 (0, 1, 3, 7 responses).
let countFixtures;

// Long-option-label fixture for TC-F05-22.
let longFixture;

async function loginAs(page, email) {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(SEED_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/owner\/surveys/);
}

test.beforeAll(async () => {
  const harness = await import(pathToFileURL(harnessPath).href);
  const { prisma } = harness;

  const owner = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } });
  if (!owner) throw new Error('seeded owner not found');

  const respondent3 = await prisma.user.upsert({
    where: { email: 'respondent3@example.test' },
    update: { displayName: 'Respondent Three', role: 'respondent', passwordHash: 'not-a-real-hash' },
    create: {
      email: 'respondent3@example.test',
      displayName: 'Respondent Three',
      role: 'respondent',
      passwordHash: 'not-a-real-hash',
    },
  });

  const survey = await prisma.survey.create({
    data: {
      ownerId: owner.id,
      title: 'F-05 Summary Fixture (E2E)',
      description: 'Aggregate summary fixture mirroring the seeded published survey',
      status: 'published',
      mode: 'identified',
      publishedAt: new Date(),
      questions: {
        create: [
          {
            position: 1,
            text: SINGLE_TEXT,
            type: 'single_choice',
            options: {
              create: [
                { position: 1, label: 'Lectures and Materials' },
                { position: 2, label: 'Hands-on Labs' },
                { position: 3, label: 'Team Collaboration' },
              ],
            },
          },
          { position: 2, text: RATING_TEXT, type: 'rating' },
        ],
      },
    },
    include: {
      questions: {
        orderBy: { position: 'asc' },
        include: { options: { orderBy: { position: 'asc' } } },
      },
    },
  });

  const [qSingle, qRating] = survey.questions;
  const respondents = [
    await prisma.user.findUnique({ where: { email: 'respondent1@example.test' } }),
    await prisma.user.findUnique({ where: { email: 'respondent2@example.test' } }),
    respondent3,
  ];
  const choices = [qSingle.options[0].id, qSingle.options[0].id, qSingle.options[1].id];
  const ratings = [4, 5, 2];

  for (let i = 0; i < respondents.length; i += 1) {
    await prisma.response.create({
      data: {
        surveyId: survey.id,
        respondentId: respondents[i].id,
        answers: {
          create: [
            { questionId: qSingle.id, optionId: choices[i] },
            { questionId: qRating.id, ratingValue: ratings[i] },
          ],
        },
      },
    });
  }

  // Varied-response-count fixtures (TC-F05-20): one published survey per
  // scenario, responses created directly in the test DB for speed.
  const voters = [];
  for (let i = 1; i <= 7; i += 1) {
    voters.push(
      await prisma.user.upsert({
        where: { email: `f05-voter-${i}@example.test` },
        update: {
          displayName: `F05 Voter ${i}`,
          role: 'respondent',
          passwordHash: 'not-a-real-hash',
        },
        create: {
          email: `f05-voter-${i}@example.test`,
          displayName: `F05 Voter ${i}`,
          role: 'respondent',
          passwordHash: 'not-a-real-hash',
        },
      }),
    );
  }

  async function createChoiceSurvey(title, description) {
    return prisma.survey.create({
      data: {
        ownerId: owner.id,
        title,
        description,
        status: 'published',
        mode: 'identified',
        publishedAt: new Date(),
        questions: {
          create: [
            {
              position: 1,
              text: 'Pick a letter',
              type: 'single_choice',
              options: {
                create: [
                  { position: 1, label: 'Option A' },
                  { position: 2, label: 'Option B' },
                  { position: 3, label: 'Option C' },
                ],
              },
            },
          ],
        },
      },
      include: {
        questions: {
          orderBy: { position: 'asc' },
          include: { options: { orderBy: { position: 'asc' } } },
        },
      },
    });
  }

  async function addVotes(survey, votes) {
    const [question] = survey.questions;
    for (let i = 0; i < votes.length; i += 1) {
      await prisma.response.create({
        data: {
          surveyId: survey.id,
          respondentId: voters[i].id,
          answers: {
            create: [{ questionId: question.id, optionId: question.options[votes[i]].id }],
          },
        },
      });
    }
    return { surveyId: survey.id, optionIds: question.options.map((option) => option.id) };
  }

  countFixtures = {};
  const scenarios = [
    { key: 'zero', title: 'F-05 Count Fixture 0', votes: [] },
    { key: 'one', title: 'F-05 Count Fixture 1', votes: [0] },
    { key: 'three', title: 'F-05 Count Fixture 3', votes: [0, 0, 1] },
    { key: 'seven', title: 'F-05 Count Fixture 7', votes: [0, 0, 0, 1, 1, 1, 2] },
  ];
  for (const scenario of scenarios) {
    const survey = await createChoiceSurvey(
      scenario.title,
      `F-05 varied response count fixture (${scenario.votes.length} responses)`,
    );
    countFixtures[scenario.key] = await addVotes(survey, scenario.votes);
  }

  // Long-option-label fixture (TC-F05-22): 200-char labels with and without
  // spaces; one response so counts/percents render.
  const longSurvey = await prisma.survey.create({
    data: {
      ownerId: owner.id,
      title: 'F-05 Long Label Fixture (E2E)',
      description: 'Option labels of 200 characters, with and without spaces',
      status: 'published',
      mode: 'identified',
      publishedAt: new Date(),
      questions: {
        create: [
          {
            position: 1,
            text: 'Pick the long label',
            type: 'single_choice',
            options: {
              create: [
                { position: 1, label: LONG_SPACED_LABEL },
                { position: 2, label: LONG_UNSPACED_LABEL },
              ],
            },
          },
        ],
      },
    },
    include: {
      questions: {
        orderBy: { position: 'asc' },
        include: { options: { orderBy: { position: 'asc' } } },
      },
    },
  });
  await prisma.response.create({
    data: {
      surveyId: longSurvey.id,
      respondentId: voters[0].id,
      answers: {
        create: [
          {
            questionId: longSurvey.questions[0].id,
            optionId: longSurvey.questions[0].options[0].id,
          },
        ],
      },
    },
  });
  longFixture = {
    surveyId: longSurvey.id,
    optionIds: longSurvey.questions[0].options.map((option) => option.id),
  };

  fixture = {
    surveyId: survey.id,
    ratingQuestionId: qRating.id,
    optionIds: qSingle.options.map((option) => option.id),
  };
});

test('TC-F05-09: owner opens the summary page of a survey with responses and of a survey without responses', async ({
  page,
}) => {
  await loginAs(page, OWNER_EMAIL);

  await page.goto(`/owner/surveys/${fixture.surveyId}/summary`);

  await expect(page.getByText(SINGLE_TEXT)).toBeVisible();
  await expect(page.getByText(RATING_TEXT)).toBeVisible();
  await expect(page.getByTestId('summary-response-count')).toHaveText('3 responses');

  const [optionId1, , optionId3] = fixture.optionIds;
  await expect(page.getByTestId(`option-count-${optionId1}`)).toHaveText('2');
  await expect(page.getByTestId(`option-percent-${optionId1}`)).toHaveText('66.7%');
  await expect(page.getByTestId(`option-count-${optionId3}`)).toHaveText('0');
  await expect(page.getByTestId(`option-percent-${optionId3}`)).toHaveText('0.0%');

  // empty state on a seeded survey without responses
  await page.goto('/owner/surveys');
  await page.getByRole('link', { name: EMPTY_SURVEY_TITLE }).click();
  await expect(page).toHaveURL(/\/owner\/surveys\/\d+/);
  const emptySurveyId = page.url().match(/\/owner\/surveys\/(\d+)/)[1];

  await page.goto(`/owner/surveys/${emptySurveyId}/summary`);
  await expect(page.getByText('No responses yet')).toBeVisible();
});

test('TC-F05-15: summary page renders the stable testid contract with exact values', async ({
  page,
}) => {
  await loginAs(page, OWNER_EMAIL);
  await page.goto(`/owner/surveys/${fixture.surveyId}/summary`);

  await expect(page.getByTestId('summary-response-count')).toHaveText('3 responses');

  const [optionId1, optionId2, optionId3] = fixture.optionIds;
  await expect(page.getByTestId(`option-count-${optionId1}`)).toHaveText('2');
  await expect(page.getByTestId(`option-percent-${optionId1}`)).toHaveText('66.7%');
  await expect(page.getByTestId(`option-count-${optionId2}`)).toHaveText('1');
  await expect(page.getByTestId(`option-percent-${optionId2}`)).toHaveText('33.3%');
  await expect(page.getByTestId(`option-count-${optionId3}`)).toHaveText('0');
  await expect(page.getByTestId(`option-percent-${optionId3}`)).toHaveText('0.0%');

  const expectedCounts = ['0', '1', '0', '1', '1'];
  for (let level = 1; level <= 5; level += 1) {
    await expect(page.getByTestId(`rating-count-${fixture.ratingQuestionId}-${level}`)).toHaveText(
      expectedCounts[level - 1],
    );
  }
  await expect(page.getByTestId(`rating-average-${fixture.ratingQuestionId}`)).toHaveText('3.67');
});

test('TC-F05-16: summary shows an Updated at timestamp and Refresh re-fetches the aggregates', async ({
  page,
}) => {
  await loginAs(page, OWNER_EMAIL);
  await page.goto(`/owner/surveys/${fixture.surveyId}/summary`);

  const stamp = page.getByTestId('summary-updated-at');
  await expect(stamp).toBeVisible();
  const first = await stamp.textContent();
  expect(first).toMatch(/\d{4}-\d{2}-\d{2}/);

  await page.getByTestId('summary-refresh').click();

  await expect(stamp).not.toHaveText(first);
  await expect(page.getByTestId('summary-error')).toHaveCount(0);
  await expect(page.getByTestId('summary-response-count')).toHaveText('3 responses');
});

test('TC-F05-17: failed summary fetch shows the error state and Retry re-issues the request', async ({
  page,
}) => {
  await loginAs(page, OWNER_EMAIL);

  let calls = 0;
  await page.route('**/api/owner/surveys/*/summary*', async (route) => {
    calls += 1;
    if (calls === 1) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Injected failure' } }),
      });
      return;
    }
    await route.continue();
  });

  await page.goto(`/owner/surveys/${fixture.surveyId}/summary`);
  await expect(page.getByTestId('summary-error')).toBeVisible();

  await page.getByTestId('summary-retry').click();
  await expect(page.getByTestId('summary-response-count')).toHaveText('3 responses');
  expect(calls).toBeGreaterThanOrEqual(2);
});

test('TC-F05-18: below 600 px the summary stacks in a single column without horizontal scrolling', async ({
  page,
}) => {
  await loginAs(page, OWNER_EMAIL);
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(`/owner/surveys/${fixture.surveyId}/summary`);
  await expect(page.getByTestId('summary-response-count')).toHaveText('3 responses');

  const overflowPx = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflowPx).toBeLessThanOrEqual(0);

  const cards = page.locator('[data-testid^="summary-question-"]');
  const cardBoxes = await cards.evaluateAll((els) =>
    els.map((el) => el.getBoundingClientRect()),
  );
  expect(cardBoxes.length).toBeGreaterThanOrEqual(2);
  for (const box of cardBoxes) {
    expect(Math.abs(box.left - cardBoxes[0].left)).toBeLessThanOrEqual(2);
    expect(box.width).toBeLessThanOrEqual(375);
  }

  const [optionId1] = fixture.optionIds;
  const label = page.getByRole('cell', { name: 'Lectures and Materials', exact: true });
  const count = page.getByTestId(`option-count-${optionId1}`);
  const percent = page.getByTestId(`option-percent-${optionId1}`);
  await expect(label).toBeVisible();
  await expect(count).toBeVisible();
  await expect(percent).toBeVisible();

  const [labelBox, countBox, percentBox] = await Promise.all([
    label.boundingBox(),
    count.boundingBox(),
    percent.boundingBox(),
  ]);
  expect(Math.abs(labelBox.x - countBox.x)).toBeLessThanOrEqual(4);
  expect(Math.abs(countBox.x - percentBox.x)).toBeLessThanOrEqual(4);
  expect(countBox.y).toBeGreaterThan(labelBox.y);
});

test('TC-F05-19: rating question renders all levels 1..5 with their counts', async ({ page }) => {
  await loginAs(page, OWNER_EMAIL);
  await page.goto(`/owner/surveys/${fixture.surveyId}/summary`);

  const expectedCounts = ['0', '1', '0', '1', '1'];
  for (let level = 1; level <= 5; level += 1) {
    await expect(page.getByTestId(`rating-count-${fixture.ratingQuestionId}-${level}`)).toHaveText(
      expectedCounts[level - 1],
    );
  }

  for (let level = 1; level <= 5; level += 1) {
    await expect(page.getByRole('columnheader', { name: String(level), exact: true })).toBeVisible();
  }
});

// Asserts exact response count, exact per-option counts and percents, and that
// the displayed percents of the question sum to `percentSum` (100.0 when
// responseCount > 0, 0 when there are no responses).
async function expectChoiceAggregates(page, scenarioFixture, expected) {
  await expect(page.getByTestId('summary-response-count')).toHaveText(expected.responseText);

  const displayedPercents = [];
  for (let i = 0; i < scenarioFixture.optionIds.length; i += 1) {
    const optionId = scenarioFixture.optionIds[i];
    await expect(page.getByTestId(`option-count-${optionId}`)).toHaveText(expected.counts[i]);
    const percentEl = page.getByTestId(`option-percent-${optionId}`);
    await expect(percentEl).toHaveText(expected.percents[i]);
    displayedPercents.push(parseFloat((await percentEl.textContent()).replace('%', '')));
  }

  const sum = displayedPercents.reduce((total, value) => total + value, 0);
  expect(Math.round(sum * 10) / 10).toBe(expected.percentSum);
}

test('TC-F05-20a: 0 responses -> response count 0, option counts 0/0/0, percents 0.0%/0.0%/0.0% sum to 0', async ({
  page,
}) => {
  await loginAs(page, OWNER_EMAIL);
  await page.goto(`/owner/surveys/${countFixtures.zero.surveyId}/summary`);

  await expectChoiceAggregates(page, countFixtures.zero, {
    responseText: '0 responses',
    counts: ['0', '0', '0'],
    percents: ['0.0%', '0.0%', '0.0%'],
    percentSum: 0,
  });
});

test('TC-F05-20b: 1 response (A) -> counts 1/0/0, percents 100.0%/0.0%/0.0% sum to 100.0', async ({
  page,
}) => {
  await loginAs(page, OWNER_EMAIL);
  await page.goto(`/owner/surveys/${countFixtures.one.surveyId}/summary`);

  await expectChoiceAggregates(page, countFixtures.one, {
    responseText: '1 response',
    counts: ['1', '0', '0'],
    percents: ['100.0%', '0.0%', '0.0%'],
    percentSum: 100,
  });
});

test('TC-F05-20c: 3 responses (A,A,B) -> counts 2/1/0, percents 66.7%/33.3%/0.0% sum to 100.0', async ({
  page,
}) => {
  await loginAs(page, OWNER_EMAIL);
  await page.goto(`/owner/surveys/${countFixtures.three.surveyId}/summary`);

  await expectChoiceAggregates(page, countFixtures.three, {
    responseText: '3 responses',
    counts: ['2', '1', '0'],
    percents: ['66.7%', '33.3%', '0.0%'],
    percentSum: 100,
  });
});

test('TC-F05-20d: 7 responses (A,A,A,B,B,B,C) -> counts 3/3/1, percents 42.9%/42.8%/14.3% sum to 100.0', async ({
  page,
}) => {
  await loginAs(page, OWNER_EMAIL);
  await page.goto(`/owner/surveys/${countFixtures.seven.surveyId}/summary`);

  await expectChoiceAggregates(page, countFixtures.seven, {
    responseText: '7 responses',
    counts: ['3', '3', '1'],
    percents: ['42.9%', '42.8%', '14.3%'],
    percentSum: 100,
  });
});

// Shared retry-variant checks: human-readable error, then Retry renders the
// data without leaving the page (URL unchanged, no full page reload).
async function expectRetryRecovers(page, { expectedErrorText }) {
  const errorBox = page.getByTestId('summary-error');
  await expect(errorBox).toBeVisible();
  await expect(page.getByTestId('summary-retry')).toBeVisible();

  const errorText = await errorBox.innerText();
  expect(errorText).toContain(expectedErrorText);
  expect(errorText).not.toMatch(/[{}]/); // no JSON body
  expect(errorText).not.toMatch(/\n\s*at\s/); // no stack frames

  await page.evaluate(() => {
    window.__f05NoReloadMarker = 'kept';
  });
  const urlBefore = page.url();

  await page.getByTestId('summary-retry').click();

  await expect(page.getByTestId('summary-response-count')).toHaveText('3 responses');
  await expect(page.getByTestId('summary-error')).toHaveCount(0);
  expect(page.url()).toBe(urlBefore);
  expect(await page.evaluate(() => window.__f05NoReloadMarker)).toBe('kept');
}

test('TC-F05-21a: HTTP 500 on the first summary request -> human-readable error with Retry; Retry renders data without leaving the page', async ({
  page,
}) => {
  await loginAs(page, OWNER_EMAIL);

  let calls = 0;
  await page.route('**/api/owner/surveys/*/summary*', async (route) => {
    calls += 1;
    if (calls === 1) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'INTERNAL_ERROR', message: 'Summary service temporarily unavailable' },
        }),
      });
      return;
    }
    await route.continue();
  });

  await page.goto(`/owner/surveys/${fixture.surveyId}/summary`);

  await expectRetryRecovers(page, {
    expectedErrorText: 'Summary service temporarily unavailable',
  });
  expect(calls).toBeGreaterThanOrEqual(2);
});

test('TC-F05-21b: aborted summary request (network failure) -> human-readable error with Retry; Retry renders data without leaving the page', async ({
  page,
}) => {
  await loginAs(page, OWNER_EMAIL);

  let calls = 0;
  await page.route('**/api/owner/surveys/*/summary*', async (route) => {
    calls += 1;
    if (calls === 1) {
      await route.abort('failed');
      return;
    }
    await route.continue();
  });

  await page.goto(`/owner/surveys/${fixture.surveyId}/summary`);

  await expectRetryRecovers(page, {
    expectedErrorText: 'Failed to load summary. Check your connection and try again.',
  });
  expect(calls).toBeGreaterThanOrEqual(2);
});

test('TC-F05-21c: 403 on the summary request -> "not allowed" message and no Retry control', async ({
  page,
}) => {
  await loginAs(page, OWNER_EMAIL);

  await page.route('**/api/owner/surveys/*/summary*', (route) =>
    route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Forbidden' } }),
    }),
  );

  await page.goto(`/owner/surveys/${fixture.surveyId}/summary`);

  await expect(page.getByText('not allowed')).toBeVisible();
  await expect(page.getByTestId('summary-retry')).toHaveCount(0);
  await expect(page.getByTestId('summary-error')).toHaveCount(0);
});

test('TC-F05-21d: 404 on the summary request -> "not found" message and no Retry control', async ({
  page,
}) => {
  await loginAs(page, OWNER_EMAIL);

  await page.route('**/api/owner/surveys/*/summary*', (route) =>
    route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Survey not found' } }),
    }),
  );

  await page.goto(`/owner/surveys/${fixture.surveyId}/summary`);

  await expect(page.getByText('not found')).toBeVisible();
  await expect(page.getByTestId('summary-retry')).toHaveCount(0);
  await expect(page.getByTestId('summary-error')).toHaveCount(0);
});

test('TC-F05-22: 200-character option labels (with and without spaces) show their full text with no horizontal overflow at 375 px and 1280 px', async ({
  page,
}) => {
  expect(LONG_SPACED_LABEL).toHaveLength(200);
  expect(LONG_UNSPACED_LABEL).toHaveLength(200);
  expect(LONG_SPACED_LABEL).toContain(' ');
  expect(LONG_UNSPACED_LABEL).not.toContain(' ');

  await loginAs(page, OWNER_EMAIL);

  for (const viewport of [
    { width: 375, height: 667 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`/owner/surveys/${longFixture.surveyId}/summary`);
    await expect(page.getByTestId('summary-response-count')).toHaveText('1 response');

    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);

    for (const label of [LONG_SPACED_LABEL, LONG_UNSPACED_LABEL]) {
      const cell = page.locator('td').filter({ hasText: label });
      await expect(cell).toBeVisible();
      await expect(cell).toHaveText(label); // full text present, never truncated
      const box = await cell.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    }

    for (const optionId of longFixture.optionIds) {
      await expect(page.getByTestId(`option-count-${optionId}`)).toBeVisible();
      await expect(page.getByTestId(`option-percent-${optionId}`)).toBeVisible();
    }
  }
});
