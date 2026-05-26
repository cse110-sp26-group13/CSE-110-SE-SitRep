import { test, expect } from '@playwright/test';
import { bypassAuth } from './_auth-stub.js';

test.describe('Dashboard summary page', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('page title is correct', async ({ page }) => {
    await expect(page).toHaveTitle(/SitRep/);
  });

  test('navigation rail is visible', async ({ page }) => {
    await expect(page.locator('.rail')).toBeVisible();
  });

  test('KPI strip renders at least one tile', async ({ page }) => {
    await expect(page.locator('.kpi').first()).toBeVisible();
  });

  test('standup snapshot card shows count and link', async ({ page }) => {
    await expect(page.locator('#snap-standup-num')).toBeVisible();
    await expect(page.locator('a.snapshot-link[href="standup.html"]').first()).toBeVisible();
  });

  test('issues snapshot card shows severity row and link', async ({ page }) => {
    await expect(page.locator('#snap-issues-num')).toBeVisible();
    await expect(page.locator('#snap-issues-sev')).toBeVisible();
    await expect(page.locator('a.snapshot-link[href="issues.html"]')).toBeVisible();
  });

  test('mood sparkline and activity list render', async ({ page }) => {
    await expect(page.locator('#sparkline-wrap')).toBeVisible();
    await expect(page.locator('#activity-list')).toBeVisible();
  });

  test('rail nav to standup page', async ({ page }) => {
    await page.locator('.rail-icon[data-route="standup"]').click();
    await expect(page).toHaveURL(/standup(\.html)?$/);
  });

  test('rail nav to issues page', async ({ page }) => {
    await page.locator('.rail-icon[data-route="issues"]').click();
    await expect(page).toHaveURL(/issues(\.html)?$/);
  });

  test('rail nav to calendar page', async ({ page }) => {
    await page.locator('.rail-icon[data-route="calendar"]').click();
    await expect(page).toHaveURL(/calendar(\.html)?$/);
  });

  test('"Post standup" CTA routes to standup page', async ({ page }) => {
    await page.locator('a.btn-primary[href="standup.html"]').click();
    await expect(page).toHaveURL(/standup(\.html)?$/);
  });
});
