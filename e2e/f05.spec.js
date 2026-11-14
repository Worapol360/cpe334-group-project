import { expect, test } from '@playwright/test';

const SEED_PASSWORD = process.env.SEED_PASSWORD || 'change-me';
const OWNER_EMAIL = 'owner1@example.test';
const RESPONDENT_EMAIL = 'respondent2@example.test';
const PUB_SURVEY_TITLE = 'Course CPE334 Feedback';
const EMPTY_SURVEY_TITLE = 'Quarterly Team Feedback';

test('TC-F05-09: owner opens the summary page of a survey with responses and of a survey without responses', async ({
  page,
}) => {
  // 1. Respondent2 (fresh respondent) answers the published survey
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(RESPONDENT_EMAIL);
  await page.locator('input[name="password"]').fill(SEED_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/surveys/);

  await page.getByRole('link', { name: PUB_SURVEY_TITLE }).click();
  await expect(page).toHaveURL(/\/surveys\/\d+/);
  const surveyId = page.url().match(/\/surveys\/(\d+)/)[1];

  const submitButton = page.getByRole('button', { name: /Submit Response/i });
  await expect(submitButton).toBeVisible();
  await page.locator('input[type="radio"]').first().check();
  await page.getByRole('button', { name: '5', exact: true }).click();
  await submitButton.click();
  await expect(page).toHaveURL(/\/responses\/\d+/);

  // 2. Owner1 opens the summary of the survey with responses
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.locator('input[name="email"]').fill(OWNER_EMAIL);
  await page.locator('input[name="password"]').fill(SEED_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/owner\/surveys/);

  await page.goto(`/owner/surveys/${surveyId}/summary`);

  await expect(page.getByTestId('summary-response-count')).toBeVisible();
  await expect(page.getByTestId('summary-response-count')).toContainText(/\d/);
  await expect(page.getByText('Which aspect did you find most valuable?')).toBeVisible();
  await expect(page.getByText('Rate the lab')).toBeVisible();

  const chosenRow = page
    .getByTestId('summary-option-row')
    .filter({ hasText: 'Lectures and Materials' });
  await expect(chosenRow).toBeVisible();
  await expect(chosenRow).toContainText('100');

  await expect(page.getByTestId('summary-rating-average')).toContainText('5');

  // 3. Owner1 opens the summary of a survey without responses (empty state)
  await page.goto('/owner/surveys');
  await page.getByRole('link', { name: EMPTY_SURVEY_TITLE }).click();
  await expect(page).toHaveURL(/\/owner\/surveys\/\d+/);
  const emptySurveyId = page.url().match(/\/owner\/surveys\/(\d+)/)[1];

  await page.goto(`/owner/surveys/${emptySurveyId}/summary`);
  await expect(page.getByText('No responses yet')).toBeVisible();
});
