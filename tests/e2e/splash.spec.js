import { test, expect } from '@playwright/test';

/**
 * E2E coverage for splash.html — the unauthenticated landing page.
 *
 * Notably this spec does NOT call bypassAuth(): splash.html IS the
 * auth surface. We verify the DOM contract (forms, toggle, strength
 * meter wiring, error spans) without ever hitting real Supabase —
 * the form submit handlers run client-side validation first, which
 * we exercise here.
 */
test.describe('Splash page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/splash.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('auth view is the initial landing view', async ({ page }) => {
    await expect(page.locator('#view-auth')).toBeVisible();
    await expect(page.locator('#view-circle')).toBeHidden();
  });

  test('sign-up form is visible by default; sign-in form is hidden', async ({ page }) => {
    await expect(page.locator('#signup-form')).toBeVisible();
    await expect(page.locator('#login-form')).toBeHidden();
  });

  test('sign-up form has the expected fields', async ({ page }) => {
    await expect(page.locator('#signup-first-name')).toBeVisible();
    await expect(page.locator('#signup-last-name')).toBeVisible();
    await expect(page.locator('#signup-email')).toBeVisible();
    await expect(page.locator('#signup-password')).toBeVisible();
  });

  test('password strength meter activates as the user types', async ({ page }) => {
    const meter = page.locator('#signup-strength');
    await page.locator('#signup-password').fill('Abcdef12');
    await expect(meter).toHaveClass(/is-active/);

    const fill = page.locator('#signup-strength-fill');
    const level = await fill.getAttribute('data-level');
    expect(['3', '4']).toContain(level);
  });

  test('strength label updates with strong passwords', async ({ page }) => {
    await page.locator('#signup-password').fill('Abcdef12!');
    const text = await page.locator('#signup-strength-text').textContent();
    expect(text?.toLowerCase()).toMatch(/strong|good/);
  });

  test('error spans for required fields exist in the DOM', async ({ page }) => {
    // These are validation slots the JS toggles on submit — verify
    // the markup contract the auth code expects.
    await expect(page.locator('#signup-first-name-error')).toBeAttached();
    await expect(page.locator('#signup-last-name-error')).toBeAttached();
    await expect(page.locator('#signup-email-error')).toBeAttached();
    await expect(page.locator('#signup-password-error')).toBeAttached();
  });

  test('shared auth message slot exists', async ({ page }) => {
    await expect(page.locator('#auth-message')).toBeAttached();
  });
});
