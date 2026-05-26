import { test, expect } from '@playwright/test';
import { bypassAuth } from './_auth-stub.js';
import { stubGitHub } from './_github-stub.js';

test.describe('Issues Tracker', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page);
    await stubGitHub(page);
    await page.goto('/issues.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('issues list renders', async ({ page }) => {
    await expect(page.locator('#blocker-list')).toBeVisible();
  });

  test('status and severity filters are visible', async ({ page }) => {
    await expect(page.locator('#status-filters')).toBeVisible();
    await expect(page.locator('#severity-filters')).toBeVisible();
  });

  test('user creates a new issue and it appears in the issues list', async ({ page }) => {
    await page.locator('#add-blocker-btn').click();

    await expect(page.locator('#issue-modal')).toBeVisible();
    await expect(page.locator('#issue-modal-title')).toHaveText('New issue');

    await page.locator('#issue-title').fill('E2E Test: Broken login flow');
    await page.locator('#issue-start').fill('2026-06-01');
    await page.locator('#issue-due').fill('2026-06-15');
    await page.locator('#issue-category').selectOption('backend');

    await page.locator('#issue-create-form button[type="submit"]').click();

    await expect(page.locator('#issue-modal')).toBeHidden();
    await expect(page.locator('#blocker-list')).toContainText('E2E Test: Broken login flow');
  });
});
