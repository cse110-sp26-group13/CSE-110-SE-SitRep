import { test, expect } from '@playwright/test';
import { bypassAuth } from './_auth-stub.js';
import { stubGitHub } from './_github-stub.js';

test.describe('Command palette', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page);
    await stubGitHub(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('clicking the trigger opens the palette', async ({ page }) => {
    await page.locator('#cmd-trigger').click();
    await expect(page.locator('.palette-backdrop.open')).toBeVisible();
    await expect(page.locator('#palette-input')).toBeFocused();
  });

  test('⌘K / Ctrl-K toggles the palette', async ({ page }) => {
    await page.keyboard.press('ControlOrMeta+k');
    await expect(page.locator('.palette-backdrop.open')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.palette-backdrop.open')).toHaveCount(0);
  });

  test('jump-to commands are listed and filterable', async ({ page }) => {
    await page.locator('#cmd-trigger').click();
    // Default list shows the jump-to group
    await expect(page.locator('.palette-item', { hasText: 'Go to Overview' })).toBeVisible();
    // Filter down
    await page.locator('#palette-input').fill('standup');
    await expect(page.locator('.palette-item', { hasText: 'Go to Standup' })).toBeVisible();
    await expect(page.locator('.palette-item', { hasText: 'Go to Overview' })).toHaveCount(0);
  });

  test('Enter on a filtered jump command navigates', async ({ page }) => {
    await page.locator('#cmd-trigger').click();
    await page.locator('#palette-input').fill('standup');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/standup(\.html)?$/);
  });

  test('issues are indexed in the palette', async ({ page }) => {
    await page.locator('#cmd-trigger').click();
    await expect(page.locator('.palette-group-label', { hasText: 'Issues' })).toBeVisible();
  });
});
