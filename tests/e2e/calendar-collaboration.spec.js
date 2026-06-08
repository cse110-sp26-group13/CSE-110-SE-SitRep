import { test, expect } from '@playwright/test';
import { bypassAuth } from './_auth-stub.js';

/**
 * E2E tests for Calendar Collaboration features:
 * - Group creation
 * - Event creation with descriptions
 * - Visibility and "Creator" highlight
 */
test.describe('Calendar Collaboration', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page);
    await page.goto('/calendar.html');
    // Clear the E2E stub state from localStorage to ensure a clean run
    await page.evaluate(() => localStorage.removeItem('sitrep-e2e-stub'));
    await page.reload();
  });

  test('can create a custom group and an event within it', async ({ page }) => {
    // 1. Create a new group
    await page.click('#new-group-btn');
    await expect(page.locator('#calendar-group-modal')).toBeVisible();
    
    await page.fill('#calendar-group-name', 'Engineering Sync');
    await page.fill('#calendar-group-color', '#ff0000');
    
    // Select the "Other Teammate" from the list
    // Use a more robust selector and ensure it's visible within the modal
    const otherTeammateRow = page.locator('#calendar-group-modal .people-row', { hasText: 'Other Teammate' });
    await otherTeammateRow.scrollIntoViewIfNeeded();
    await otherTeammateRow.click();
    
    await page.click('#calendar-group-submit');
    await expect(page.locator('#calendar-group-modal')).not.toBeVisible();

    // 2. Verify group appears in legend
    await expect(page.locator('text=Engineering Sync')).toBeVisible();

    // 3. Create an event in that group
    await page.click('#new-event-btn');
    await expect(page.locator('#calendar-event-modal')).toBeVisible();

    await page.fill('#calendar-event-name', 'Architecture Review');
    
    // Select our new group from the visibility dropdown
    await page.selectOption('#calendar-event-group', { label: 'Engineering Sync' });
    
    // Add a description
    const description = 'Deep dive into the new database schema and RLS policies.';
    await page.fill('#calendar-event-description', description);
    
    await page.click('#calendar-event-submit');
    await expect(page.locator('#calendar-event-modal')).not.toBeVisible();

    // 4. Verify event appears on the grid
    const eventBar = page.locator('.cal-bar', { hasText: 'Architecture Review' });
    await expect(eventBar).toBeVisible();

    // 5. Open the event and verify details
    await eventBar.click();
    await expect(page.locator('#calendar-event-modal-title')).toHaveText('Edit event');
    await expect(page.locator('#calendar-event-description')).toHaveValue(description);
    
    // Verify "Creator" tag is present for the Test User
    const testUserRow = page.locator('#calendar-event-team-list .people-row', { hasText: 'Test User' });
    await expect(testUserRow.locator('.creator-tag')).toBeVisible();
    await expect(testUserRow.locator('.creator-tag')).toHaveText('Creator');

    // 6. Verify 3D button interaction (Cancel button)
    const cancelBtn = page.locator('#calendar-event-cancel');
    await cancelBtn.click();
    await expect(page.locator('#calendar-event-modal')).not.toBeVisible();
  });

  test('description field is read-only for non-owners', async ({ page }) => {
    // 1. First, create an event while logged in as 'test-user'
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('sitrep-e2e-stub')) || {};
      s.calendarEvents = [{
        id: 'ev-locked',
        ownerId: 'test-user',
        title: 'Locked Event',
        description: 'Only the boss can edit this.',
        date: '2026-06-07',
        group: 'global'
      }];
      localStorage.setItem('sitrep-e2e-stub', JSON.stringify(s));
    });
    await page.reload();

    // 2. Now simulate 'other-user' BEFORE interacting
    await page.evaluate(() => {
      window.team.currentUserId = 'other-user';
    });

    // 3. Click the event
    await page.click('text=Locked Event');
    
    // 4. Verify fields are disabled
    await expect(page.locator('#calendar-event-name')).toBeDisabled();
    await expect(page.locator('#calendar-event-description')).toBeDisabled();
    await expect(page.locator('#calendar-event-submit')).toBeHidden();
  });
});
