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

// DB fixture mirroring the seeded published survey: 3 responses,
// option votes 2/1/0, ratings 4, 5, 2 (average 3.67).
let fixture;

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
  await expect(page.getByTestId('summary-response-count')).toContainText('3 responses');

  const [optionId1, , optionId3] = fixture.optionIds;
  await expect(page.getByTestId(`option-count-${optionId1}`)).toHaveText('2');
  await expect(page.getByTestId(`option-percent-${optionId1}`)).toHaveText('66.7%');
  await expect(page.getByTestId(`option-count-${optionId3}`)).toHaveText('0');
  await expect(page.getByTestId(`option-percent-${optionId3}`)).toHaveText(/^0(\.0)?%$/);

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

  await expect(page.getByTestId('summary-response-count')).toContainText('3 responses');

  const [optionId1, optionId2, optionId3] = fixture.optionIds;
  await expect(page.getByTestId(`option-count-${optionId1}`)).toHaveText('2');
  await expect(page.getByTestId(`option-percent-${optionId1}`)).toHaveText('66.7%');
  await expect(page.getByTestId(`option-count-${optionId2}`)).toHaveText('1');
  await expect(page.getByTestId(`option-percent-${optionId2}`)).toHaveText('33.3%');
  await expect(page.getByTestId(`option-count-${optionId3}`)).toHaveText('0');
  await expect(page.getByTestId(`option-percent-${optionId3}`)).toHaveText(/^0(\.0)?%$/);

  const expectedCounts = ['0', '1', '0', '1', '1'];
  for (let level = 1; level <= 5; level += 1) {
    await expect(page.getByTestId(`rating-count-${fixture.ratingQuestionId}-${level}`)).toHaveText(
      expectedCounts[level - 1],
    );
  }
  await expect(page.getByTestId(`rating-average-${fixture.ratingQuestionId}`)).toContainText('3.67');
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
  await expect(page.getByTestId('summary-response-count')).toContainText('3 responses');
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
  await expect(page.getByTestId('summary-response-count')).toContainText('3 responses');
  expect(calls).toBeGreaterThanOrEqual(2);
});

test('TC-F05-18: below 600 px the summary stacks in a single column without horizontal scrolling', async ({
  page,
}) => {
  await loginAs(page, OWNER_EMAIL);
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(`/owner/surveys/${fixture.surveyId}/summary`);
  await expect(page.getByTestId('summary-response-count')).toContainText('3 responses');

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
