import { test, expect } from '@playwright/test';
import { bypassAuth } from './_auth-stub.js';

/**
 * E2E coverage for settings.html.
 *
 * The Circles section (#circles) is the most-recently-shipped piece
 * of UI — the team's status video and the May 25 standup both call
 * it out — so it gets explicit coverage here. Account / Security /
 * Appearance sections are sanity-checked at "is the form there"
 * depth; deeper interaction (real password change, sign-out flow)
 * needs the real Supabase layer and is out of scope for Sprint 1.
 */
test.describe('Settings page', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page);
    await page.goto('/settings.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('rail and theme toggle render', async ({ page }) => {
    await expect(page.locator('.rail')).toBeVisible();
    await expect(page.locator('#theme-toggle')).toBeVisible();
  });

  test('account section is present', async ({ page }) => {
    await expect(page.locator('#settings-account-title')).toBeVisible();
    await expect(page.locator('#settings-display-name')).toBeVisible();
    await expect(page.locator('#settings-email')).toBeVisible();
    await expect(page.locator('#settings-signout')).toBeVisible();
  });

  test('Circles section renders with list and both forms', async ({ page }) => {
    await expect(page.locator('#settings-circles-title')).toBeVisible();
    await expect(page.locator('#circles-list')).toBeVisible();
    await expect(page.locator('#circles-join-form')).toBeVisible();
    await expect(page.locator('#circles-create-form')).toBeVisible();
  });

  test('Circles join input accepts a 6-digit numeric code', async ({ page }) => {
    // The Life360-style join code: 6 digits, numeric only.
    // Input has maxlength="6" and pattern="\d{6}" — see settings.html.
    const input = page.locator('#circles-join-code');
    await input.fill('123456');
    await expect(input).toHaveValue('123456');
  });

  test('Circles create input accepts a team name', async ({ page }) => {
    const input = page.locator('#circles-create-name');
    await input.fill('My New Team');
    await expect(input).toHaveValue('My New Team');
  });

  test('password change form is wired up with strength meter', async ({ page }) => {
    await expect(page.locator('#settings-password-form')).toBeVisible();
    await expect(page.locator('#pw-current')).toBeVisible();
    await expect(page.locator('#pw-new')).toBeVisible();
    await expect(page.locator('#pw-confirm')).toBeVisible();
    await expect(page.locator('#pw-submit')).toBeVisible();
    // Strength meter wrapper exists; activation tested in pw-strength unit tests.
    await expect(page.locator('#pw-new-strength')).toBeAttached();
  });

  test('typing a password activates the strength meter UI', async ({ page }) => {
    await page.locator('#pw-new').fill('Abcdef12');
    await expect(page.locator('#pw-new-strength')).toHaveClass(/is-active/);
  });

  test('appearance theme selector is present', async ({ page }) => {
    await expect(page.locator('#settings-theme')).toBeVisible();
  });

  test('notification toggles render', async ({ page }) => {
    await expect(page.locator('#notify-standup')).toBeAttached();
    await expect(page.locator('#notify-mentions')).toBeAttached();
    await expect(page.locator('#notify-digest')).toBeAttached();
  });
});
