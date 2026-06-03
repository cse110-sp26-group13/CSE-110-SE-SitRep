import { test, expect } from '@playwright/test';
import { bypassAuth } from './_auth-stub.js';

test.describe('Daily standup page', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page);
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
    await page.locator('#yesterday-input').fill('Shipped the halftone rework');
    await page.locator('#today-input').fill('Wiring Supabase reads');
    await page.locator('#checkin-form button[type="submit"]').click();

    await expect(page.locator('#checkin-list')).toContainText('Shipped the halftone rework');
    await expect(page.locator('#checkin-list')).toContainText('Wiring Supabase reads');

    await page.reload();
    await expect(page.locator('#checkin-list')).toContainText('Shipped the halftone rework');
  });

  test('meeting slots and mood sparkline render in the side rail', async ({ page }) => {
    await expect(page.locator('#team-overlap')).toBeVisible();
    await expect(page.locator('#sparkline-wrap')).toBeVisible();
  });

  test('availability tiles update while dragging before mouseup', async ({ page }) => {
    await page.locator('#edit-mine-btn').click();

    const firstCell = page.locator('#personal-availability .w2m-calendar-cell[data-slot="Sun-8 AM"]');
    const secondCell = page.locator('#personal-availability .w2m-calendar-cell[data-slot="Mon-8 AM"]');

    await firstCell.dispatchEvent('mousedown', { button: 0 });
    await secondCell.dispatchEvent('mouseenter');

    await expect(firstCell).toHaveClass(/(^|\s)available(\s|$)/);
    await expect(secondCell).toHaveClass(/(^|\s)available(\s|$)/);

    await page.mouse.up();
  });
});
