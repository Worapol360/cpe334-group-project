import { expect, test } from '@playwright/test';

const SEED_PASSWORD = process.env.SEED_PASSWORD || 'change-me';
const RESPONDENT_EMAIL = 'respondent1@example.test';
const PUB_SURVEY_TITLE = 'Course CPE334 Feedback';

test('TC-F04-16: respondent answers published survey, submits incomplete, sees confirmation, and form is disabled on revisit', async ({
  page,
}) => {
  // 1. Login as respondent1
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(RESPONDENT_EMAIL);
  await page.locator('input[name="password"]').fill(SEED_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/surveys/);

  // 2. Open published survey
  await page.getByRole('link', { name: PUB_SURVEY_TITLE }).click();
  await expect(page).toHaveURL(/\/surveys\/\d+/);

  const submitButton = page.getByRole('button', { name: /Submit Response/i });
  await expect(submitButton).toBeVisible();

  // 3. Try submitting incomplete form -> inline validation errors shown
  await submitButton.click();
  await expect(page.getByText(/Please (answer this question|select an option)/i).first()).toBeVisible();

  // 4. Fill in answers
  // Select first radio option
  const firstOption = page.locator('input[type="radio"]').first();
  await firstOption.check();

  // Select rating 5
  const rating5 = page.getByRole('button', { name: '5', exact: true });
  await rating5.click();

  // 5. Submit response
  await submitButton.click();

  // 6. Redirected to /responses/:id confirmation screen
  await expect(page).toHaveURL(/\/responses\/\d+/);
  await expect(page.getByText(/Your response was recorded/i)).toBeVisible();
  await expect(page.getByText(PUB_SURVEY_TITLE)).toBeVisible();

  // 7. Revisit /surveys -> shows Answered marker
  await page.goto('/surveys');
  await expect(page.getByTestId('answered-badge')).toBeVisible();

  // 8. Revisit /surveys/:id -> form disabled and shows already answered message
  await page.getByRole('link', { name: PUB_SURVEY_TITLE }).click();
  await expect(page).toHaveURL(/\/surveys\/\d+/);
  await expect(page.getByTestId('already-answered-banner')).toBeVisible();
  await expect(page.getByRole('button', { name: /Already Submitted/i })).toBeDisabled();
});

