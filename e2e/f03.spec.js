import { expect, test } from '@playwright/test';

const SEED_PASSWORD = process.env.SEED_PASSWORD;
const OWNER_EMAIL = 'owner1@example.test';
const RESPONDENT_EMAIL = 'respondent1@example.test';
const DRAFT_TITLE = 'Quarterly Team Feedback';

test('TC-F03-11: owner publishes via UI with confirmation (badge becomes published); respondent sees it in the survey list', async ({
  page,
}) => {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(OWNER_EMAIL);
  await page.locator('input[name="password"]').fill(SEED_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/owner\/surveys/);

  await page.getByRole('link', { name: DRAFT_TITLE }).click();
  await expect(page).toHaveURL(/\/owner\/surveys\/\d+/);
  await expect(page.getByText(/^draft$/i)).toBeVisible();

  const publishButton = page.getByRole('button', { name: 'Publish' });
  await expect(publishButton).toBeVisible();

  const nativeDialogPromise = page
    .waitForEvent('dialog', { timeout: 3000 })
    .catch(() => null);
  await publishButton.click();
  const nativeDialog = await nativeDialogPromise;

  if (nativeDialog) {
    expect(nativeDialog.message().trim().length).toBeGreaterThan(0);
    await nativeDialog.accept();
  } else {
    const confirmation = page.locator('[role="dialog"], dialog').first();
    await expect(confirmation).toBeVisible();
    await confirmation
      .getByRole('button', { name: /confirm|publish|^ok$|^yes$/i })
      .click();
  }

  await expect(page.getByText(/^published$/i)).toBeVisible();
  await expect(publishButton).toBeHidden();

  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.locator('input[name="email"]').fill(RESPONDENT_EMAIL);
  await page.locator('input[name="password"]').fill(SEED_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/surveys/);

  await expect(page.getByText(DRAFT_TITLE).first()).toBeVisible();
});
