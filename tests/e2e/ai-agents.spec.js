import { test, expect } from '@playwright/test';
import { bypassAuth } from './_auth-stub.js';

/**
 * E2E coverage for ai-agents.html.
 *
 * The AI agent tracker is the largest feature (~660 LoC of JS) that
 * shipped with zero test coverage. This spec verifies the surface
 * contract: KPI row, sessions list, and the log-session form
 * (showing, accepting input, cancelling). Real session persistence
 * requires the Supabase layer and is out of scope here — the form
 * UI behavior is what we can validate against the stubbed db.
 */
test.describe('AI agents page', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page);
    await page.goto('/ai-agents.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('rail and theme toggle render', async ({ page }) => {
    await expect(page.locator('.rail')).toBeVisible();
    await expect(page.locator('#theme-toggle')).toBeVisible();
  });

  test('KPI row renders', async ({ page }) => {
    await expect(page.locator('#ai-kpis')).toBeVisible();
  });

  test('sessions list is present', async ({ page }) => {
    await expect(page.locator('#ai-sessions-list')).toBeVisible();
    await expect(page.locator('#ai-sessions-heading')).toBeVisible();
  });

  test('"Log session" button is visible and form is hidden by default', async ({ page }) => {
    await expect(page.locator('#ai-log-btn')).toBeVisible();
    await expect(page.locator('#ai-log-form')).toBeHidden();
  });

  test('clicking "Log session" reveals the log form', async ({ page }) => {
    await page.locator('#ai-log-btn').click();
    await expect(page.locator('#ai-log-form')).toBeVisible();
  });

  test('log form contains expected fields', async ({ page }) => {
    await page.locator('#ai-log-btn').click();
    await expect(page.locator('#ai-agent-select')).toBeVisible();
    await expect(page.locator('#ai-model-select')).toBeVisible();
    await expect(page.locator('#ai-task-input')).toBeVisible();
    await expect(page.locator('#ai-tokens-input')).toBeVisible();
    await expect(page.locator('#ai-pr-input')).toBeVisible();
  });

  test('cost preview renders when tokens are entered', async ({ page }) => {
    await page.locator('#ai-log-btn').click();
    await page.locator('#ai-tokens-input').fill('5000');
    // Cost preview node should exist; its content is rendered by JS.
    await expect(page.locator('#ai-cost-preview')).toBeAttached();
  });

  test('cancel button hides the log form again', async ({ page }) => {
    await page.locator('#ai-log-btn').click();
    await expect(page.locator('#ai-log-form')).toBeVisible();
    await page.locator('#ai-cancel-btn').click();
    await expect(page.locator('#ai-log-form')).toBeHidden();
  });

  test('sprint burn chart container is present', async ({ page }) => {
    await expect(page.locator('#ai-burn-chart')).toBeVisible();
    await expect(page.locator('#ai-burn-heading')).toBeVisible();
  });

  test('session detail overlay exists in DOM (hidden until opened)', async ({ page }) => {
    await expect(page.locator('#ai-session-overlay')).toBeAttached();
  });
});
