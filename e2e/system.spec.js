/**
 * System-level E2E Browser Tests (Issue #07 – TEST-01)
 *
 * TC-E2E-01 … TC-E2E-04 as specified in tests.md §3.
 * Uses the same Playwright stack as the per-feature E2E tests.
 */
import { expect, test } from '@playwright/test';

const SEED_PASSWORD = process.env.SEED_PASSWORD || 'change-me';
const OWNER_EMAIL = 'owner1@example.test';
const RESPONDENT_EMAIL = 'respondent1@example.test';

/* ------------------------------------------------------------------ */
/*  Helper: login via UI                                              */
/* ------------------------------------------------------------------ */
async function loginAs(page, email) {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(SEED_PASSWORD);
  await page.locator('button[type="submit"]').click();
}

async function logout(page) {
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login/);
}

/* ================================================================== */
/*  TC-E2E-01  Full User Journey                                      */
/* ================================================================== */
test('TC-E2E-01: owner creates + publishes survey; respondent answers + confirmation; owner summary shows 1 response', async ({
  page,
}) => {
  // 1. Owner logs in
  await loginAs(page, OWNER_EMAIL);
  await expect(page).toHaveURL(/\/owner\/surveys/);

  // 2. Owner creates a survey
  await page.getByRole('link', { name: /\+ Create Survey/i }).click();
  await expect(page).toHaveURL(/\/owner\/surveys\/new/);

  // Fill in title and questions
  await page.locator('[data-testid="survey-title-input"]').fill('E2E Journey Survey');
  await page.locator('[data-testid="question-text-0"]').fill('Pick your favorite topic');
  await page.locator('[data-testid="option-input-0-0"]').fill('Frontend');
  await page.locator('[data-testid="option-input-0-1"]').fill('Backend');

  // Submit form (Save as Draft)
  await page.locator('[data-testid="submit-survey-btn"]').click();

  // Should redirect to survey detail
  await expect(page).toHaveURL(/\/owner\/surveys\/\d+/);
  await expect(page.getByText('E2E Journey Survey')).toBeVisible();
  await expect(page.getByText(/^draft$/i)).toBeVisible();

  // 3. Owner publishes
  await page.locator('[data-testid="publish-button"]').click();

  // Confirm publish in dialog
  const confirmDialog = page.locator('[data-testid="publish-confirm-dialog"]');
  await expect(confirmDialog).toBeVisible();
  await page.locator('[data-testid="publish-confirm-button"]').click();

  // Badge becomes published
  await expect(page.getByText(/^published$/i)).toBeVisible();
  await expect(page.locator('[data-testid="publish-button"]')).toBeHidden();

  // 4. Owner logs out
  await logout(page);

  // 5. Respondent logs in
  await loginAs(page, RESPONDENT_EMAIL);
  await expect(page).toHaveURL(/\/surveys/);

  // 6. Respondent sees the published survey and opens it
  await expect(page.getByText('E2E Journey Survey')).toBeVisible();
  await page.getByRole('link', { name: 'E2E Journey Survey' }).click();
  await expect(page).toHaveURL(/\/surveys\/\d+/);

  // 7. Respondent answers the survey
  const submitButton = page.getByRole('button', { name: /Submit Response/i });
  await expect(submitButton).toBeVisible();

  // Select first radio option
  const firstOption = page.locator('input[type="radio"]').first();
  await firstOption.check();

  await submitButton.click();

  // 8. Respondent sees confirmation
  await expect(page).toHaveURL(/\/responses\/\d+/);
  await expect(page.getByText(/Your response was recorded/i)).toBeVisible();
  await expect(page.getByText('E2E Journey Survey')).toBeVisible();

  // 9. Respondent logs out
  await logout(page);

  // 10. Owner logs in and checks summary
  await loginAs(page, OWNER_EMAIL);
  await expect(page).toHaveURL(/\/owner\/surveys/);

  await page.getByRole('link', { name: 'E2E Journey Survey' }).click();
  await expect(page).toHaveURL(/\/owner\/surveys\/\d+/);

  // Navigate to summary
  await page.locator('[data-testid="view-summary-link"]').click();
  await expect(page).toHaveURL(/\/owner\/surveys\/\d+\/summary/);

  // Wait for summary page to load and show 1 response
  const responseCount = page.locator('[data-testid="summary-response-count"]');
  await expect(responseCount).toBeVisible();
  await expect(responseCount).toContainText('1 response');
});

/* ================================================================== */
/*  TC-E2E-02  Duplicate Prevention UI                                */
/* ================================================================== */
test('TC-E2E-02: respondent who already answered sees disabled form or 409 on resubmit', async ({
  page,
}) => {
  // Use seeded published survey "Course CPE334 Feedback"
  const PUB_SURVEY_TITLE = 'Course CPE334 Feedback';

  await loginAs(page, RESPONDENT_EMAIL);
  await expect(page).toHaveURL(/\/surveys/);

  // Check if Course CPE334 Feedback is already answered (e.g. from prior test)
  const surveyItem = page.locator('li').filter({ hasText: PUB_SURVEY_TITLE });
  const alreadyAnsweredBadge = surveyItem.getByTestId('answered-badge');
  const isAlreadyAnswered = await alreadyAnsweredBadge.isVisible().catch(() => false);

  if (!isAlreadyAnswered) {
    // 1. Submit response if not answered yet
    await page.getByRole('link', { name: PUB_SURVEY_TITLE }).click();
    await expect(page).toHaveURL(/\/surveys\/\d+/);

    const firstOption = page.locator('input[type="radio"]').first();
    await firstOption.check();

    const ratingButton = page.getByRole('button', { name: '5', exact: true });
    await ratingButton.click();

    await page.getByRole('button', { name: /Submit Response/i }).click();
    await expect(page).toHaveURL(/\/responses\/\d+/);

    // 2. Go back to survey list and verify answered badge
    await page.goto('/surveys');
    await expect(surveyItem.getByTestId('answered-badge')).toBeVisible();
  }

  // 3. Open the survey again → form should be disabled and show already answered banner
  await page.getByRole('link', { name: PUB_SURVEY_TITLE }).click();
  await expect(page).toHaveURL(/\/surveys\/\d+/);

  await expect(page.getByTestId('already-answered-banner')).toBeVisible();
  await expect(page.getByRole('button', { name: /Already Submitted/i })).toBeDisabled();
});

/* ================================================================== */
/*  TC-E2E-03  Role Restriction                                      */
/* ================================================================== */
test('TC-E2E-03: respondent opening /owner/surveys by URL sees "not allowed" page; API returns 403', async ({
  page,
}) => {
  // Login as respondent
  await loginAs(page, RESPONDENT_EMAIL);
  await expect(page).toHaveURL(/\/surveys/);

  // Navigate to owner route by URL
  await page.goto('/owner/surveys');

  // Should see "Not allowed" page
  await expect(page.getByRole('heading', { name: 'Not allowed' })).toBeVisible();
  await expect(page.getByText('You do not have permission to view this page.')).toBeVisible();

  // Also verify via API: owner endpoint returns 403 for respondent
  const apiStatus = await page.evaluate(async () => {
    const res = await fetch('/api/owner/surveys', { credentials: 'include' });
    return res.status;
  });
  expect(apiStatus).toBe(403);
});

/* ================================================================== */
/*  TC-E2E-04  Login / Logout / Back-Button                           */
/* ================================================================== */
test('TC-E2E-04: invalid login → error; valid login → logged in; logout → login page; back button → no protected data', async ({
  page,
}) => {
  // 1. Invalid login → error shown
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(OWNER_EMAIL);
  await page.locator('input[name="password"]').fill('definitely-wrong-password');
  await page.locator('button[type="submit"]').click();

  await expect(page.getByText('Invalid email or password')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);

  // 2. Valid login → logged in
  await page.locator('input[name="password"]').fill(SEED_PASSWORD);
  await page.locator('button[type="submit"]').click();

  await expect(page).toHaveURL(/\/owner\/surveys/);
  await expect(page.getByTestId('navbar-current-user')).toContainText('Owner One');
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();

  // 3. Logout → login page
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByTestId('navbar-current-user')).toHaveCount(0);

  // 4. Back button → protected data not shown
  await page.goBack();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByTestId('navbar-current-user')).toHaveCount(0);
});
