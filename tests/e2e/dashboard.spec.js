import { test, expect } from '@playwright/test';
import { bypassAuth } from './_auth-stub.js';
import { stubGitHub } from './_github-stub.js';

test.describe('Dashboard (Overview)', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page);
    await stubGitHub(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('page title is correct', async ({ page }) => {
    await expect(page).toHaveTitle(/SitRep/);
  });

  test('sidebar, workspace switcher and command trigger are visible', async ({ page }) => {
    await expect(page.locator('.rail')).toBeVisible();
    await expect(page.locator('#workspace-switcher')).toBeVisible();
    await expect(page.locator('#cmd-trigger')).toBeVisible();
  });

  test('nav counts populate from local data', async ({ page }) => {
    await expect(page.locator('#nav-count-standup')).not.toHaveText('—');
    await expect(page.locator('#nav-count-issues')).not.toHaveText('—');
  });

  test('KPI strip renders at least one tile', async ({ page }) => {
    await expect(page.locator('.kpi').first()).toBeVisible();
  });

  test('standup and issues lists both render on the Overview', async ({ page }) => {
    await expect(page.locator('#checkin-list .checkin-row').first()).toBeVisible();
    await expect(page.locator('#blocker-list .blocker-row').first()).toBeVisible();
  });

  test('activity feed and mood sparkline render', async ({ page }) => {
    await expect(page.locator('#activity-list')).toBeVisible();
    await expect(page.locator('#sparkline-wrap')).toBeVisible();
  });

  test('rail nav to standup page', async ({ page }) => {
    await page.locator('.nav-item[data-route="standup"]').click();
    await expect(page).toHaveURL(/standup(\.html)?$/);
  });

  test('rail nav to issues page', async ({ page }) => {
    await page.locator('.nav-item[data-route="issues"]').click();
    await expect(page).toHaveURL(/issues(\.html)?$/);
  });

  test('rail nav to calendar page', async ({ page }) => {
    await page.locator('.nav-item[data-route="calendar"]').click();
    await expect(page).toHaveURL(/calendar(\.html)?$/);
  });

  test('"Post standup" CTA routes to standup page', async ({ page }) => {
    await page.locator('a.btn-primary[href="standup.html"]').click();
    await expect(page).toHaveURL(/standup(\.html)?$/);
  });
});
