import { expect, test } from '@playwright/test';

const SEED_PASSWORD = process.env.SEED_PASSWORD;
const OWNER_EMAIL = 'owner1@example.test';

test('TC-F01-12: invalid login shows an error; valid login shows navbar and the role home', async ({
  page,
}) => {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(OWNER_EMAIL);
  await page.locator('input[name="password"]').fill('wrong-password');
  await page.locator('button[type="submit"]').click();

  await expect(page.getByText('Invalid email or password')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);

  await page.locator('input[name="password"]').fill(SEED_PASSWORD);
  await page.locator('button[type="submit"]').click();

  await expect(page).toHaveURL(/\/owner\/surveys/);
  await expect(page.getByTestId('navbar-current-user')).toContainText('Owner One');
  await expect(page.getByTestId('navbar-current-user')).toContainText('owner');
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
});

test('TC-F01-13: anonymous redirect, logout redirect, back button shows no data', async ({
  page,
}) => {
  await page.goto('/owner/surveys');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('input[name="email"]')).toBeVisible();

  await page.locator('input[name="email"]').fill(OWNER_EMAIL);
  await page.locator('input[name="password"]').fill(SEED_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/owner\/surveys/);

  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByTestId('navbar-current-user')).toHaveCount(0);

  await page.goBack();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByTestId('navbar-current-user')).toHaveCount(0);
});
