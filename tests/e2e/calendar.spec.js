import { test, expect } from '@playwright/test';
import { bypassAuth } from './_auth-stub.js';

/**
 * E2E smoke coverage for calendar.html.
 *
 * Sprint 1 scope: page loads, the month grid renders, the navigation
 * controls are present, and the rail still works. Deeper interactions
 * (event creation, project toggle behavior) belong to a later sprint
 * once the calendar feature stabilizes.
 */
test.describe('Calendar page', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page);
    await page.goto('/calendar.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('page loads with the dashboard rail visible', async ({ page }) => {
    await expect(page.locator('.rail')).toBeVisible();
  });

  test('month label and grid are present', async ({ page }) => {
    await expect(page.locator('#cal-month')).toBeVisible();
    await expect(page.locator('#cal-grid')).toBeVisible();
  });

  test('previous / today / next controls are visible', async ({ page }) => {
    await expect(page.locator('#cal-prev')).toBeVisible();
    await expect(page.locator('#cal-today')).toBeVisible();
    await expect(page.locator('#cal-next')).toBeVisible();
  });

  test('new event button is visible', async ({ page }) => {
    await expect(page.locator('#new-event-btn')).toBeVisible();
  });

  test('project / calendar toggle column is present', async ({ page }) => {
    await expect(page.locator('#cal-toggle')).toBeAttached();
    await expect(page.locator('#cal-projects')).toBeAttached();
  });

  test('footer count cell is present', async ({ page }) => {
    await expect(page.locator('#cal-foot-count')).toBeVisible();
  });

  test('clicking next advances the month label', async ({ page }) => {
    const before = await page.locator('#cal-month').textContent();
    await page.locator('#cal-next').click();
    // Give the renderer a beat to update.
    await expect.poll(async () =>
      await page.locator('#cal-month').textContent(),
    ).not.toBe(before);
  });
});
