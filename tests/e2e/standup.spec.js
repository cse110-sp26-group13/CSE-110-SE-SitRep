import { test, expect } from '@playwright/test';
import { bypassAuth } from './_auth-stub.js';
import { stubGitHub } from './_github-stub.js';

test.describe('Daily standup page', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page);
    await stubGitHub(page);
    await page.goto('/standup.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('mood picker and check-in list are visible', async ({ page }) => {
    await expect(page.locator('#mood-faces')).toBeVisible();
    await expect(page.locator('#checkin-list')).toBeVisible();
  });

  test('clicking a mood face selects it', async ({ page }) => {
    const happy = page.locator('#mood-faces .mood-face[data-mood="8"]');
    await happy.click();
    await expect(happy).toHaveClass(/selected/);
  });

  test('post standup button reveals the form', async ({ page }) => {
    await page.locator('#post-checkin-btn').click();
    await expect(page.locator('#checkin-form')).toBeVisible();
  });

  test('submitting a check-in adds it to the list and persists across reload', async ({ page }) => {
    await page.locator('#post-checkin-btn').click();
    await page.locator('#yesterday-input').fill('Shipped the Linear rework');
    await page.locator('#today-input').fill('Wiring GitHub embeds');
    await page.locator('#checkin-form button[type="submit"]').click();

    await expect(page.locator('#checkin-list')).toContainText('Shipped the Linear rework');
    await expect(page.locator('#checkin-list')).toContainText('Wiring GitHub embeds');

    await page.reload();
    await expect(page.locator('#checkin-list')).toContainText('Shipped the Linear rework');
  });

  test('a #PR reference in a check-in renders as a chip placeholder', async ({ page }) => {
    await page.locator('#post-checkin-btn').click();
    await page.locator('#today-input').fill('Opened #37 for review');
    await page.locator('#checkin-form button[type="submit"]').click();
    await expect(page.locator('#checkin-list .pr-chip[data-pr="37"]')).toBeVisible();
  });

  test('meeting slots and mood sparkline render in the side rail', async ({ page }) => {
    await expect(page.locator('#slots-list')).toBeVisible();
    await expect(page.locator('#sparkline-wrap')).toBeVisible();
  });
});
