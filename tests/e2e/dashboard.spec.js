import { test, expect } from '@playwright/test';
import { bypassAuth } from './_auth-stub.js';

test.describe('Dashboard summary page', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  async function seedDashboard(page, data) {
    await page.evaluate((next) => {
      localStorage.setItem('sitrep-e2e-stub', JSON.stringify(next));
    }, data);
    await page.reload();
  }

  test('page title is correct', async ({ page }) => {
    await expect(page).toHaveTitle(/SitRep/);
  });

  test('navigation rail is visible', async ({ page }) => {
    await expect(page.locator('.rail')).toBeVisible();
  });

  test('KPI strip renders at least one tile', async ({ page }) => {
    await expect(page.locator('.kpi').first()).toBeVisible();
  });

  test('KPI tiles link to their relevant pages', async ({ page }) => {
    await expect(page.locator('.kpi[href="standup.html"]').first()).toBeVisible();
    await expect(page.locator('.kpi[href="issues.html"]').first()).toBeVisible();
    await page.locator('.kpi[href="issues.html"]').click();
    await expect(page).toHaveURL(/issues(\.html)?$/);
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

  test('notification popover shows unread alerts and can mark them read', async ({ page }) => {
    await expect(page.locator('#notifications-badge')).toBeVisible();

    await page.locator('#notifications-toggle').click();
    await expect(page.locator('#notifications-panel-list .notification-item.unread').first()).toBeVisible();
    await page.locator('#notifications-panel [data-notification-mark-all]').click();

    await expect(page.locator('#notifications-panel-list .notification-item.unread')).toHaveCount(0);
    await expect(page.locator('#notifications-badge')).toBeHidden();
  });

  test('notification popover opens, lists alerts, and closes when clicking outside', async ({ page }) => {
    await expect(page.locator('#notifications-panel')).toBeHidden();
    await page.locator('#notifications-toggle').click();

    await expect(page.locator('#notifications-panel')).toBeVisible();
    await expect(page.locator('#notifications-panel-list')).toContainText("Post today's standup");
    await expect(page.locator('#notifications-toggle')).toHaveAttribute('aria-expanded', 'true');

    await page.locator('#snap-standup-title').click();
    await expect(page.locator('#notifications-panel')).toBeHidden();
    await expect(page.locator('#notifications-toggle')).toHaveAttribute('aria-expanded', 'false');
  });

  test('clicking a notification marks that alert read and navigates to the target page', async ({ page }) => {
    await page.locator('#notifications-toggle').click();
    await expect(page.locator('#notifications-panel-list .notification-item.unread')).toHaveCount(2);

    await page.locator('#notifications-panel-list a[href="standup.html"]').click();

    await expect(page).toHaveURL(/standup(\.html)?$/);
    const readStore = await page.evaluate(() => JSON.parse(localStorage.getItem('sitrep-notifications-read-v1')));
    const today = await page.evaluate(() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    expect(readStore['test-team']).toContain(`standup:${today}:test-user`);
  });

  test('read notification state persists after reload', async ({ page }) => {
    await page.locator('#notifications-toggle').click();
    await page.locator('#notifications-panel [data-notification-mark-all]').click();
    await page.reload();

    await expect(page.locator('#notifications-badge')).toBeHidden();
    await page.locator('#notifications-toggle').click();
    await expect(page.locator('#notifications-panel-list .notification-item.unread')).toHaveCount(0);
  });

  test('notification preferences suppress matching alert categories', async ({ page }) => {
    await seedDashboard(page, {
      blockers: [{
        id: 'assigned-critical',
        title: 'Deploy token needs rotation',
        severity: 'critical',
        status: 'open',
        owner: 'Test User',
        ownerId: 'test-user',
        comments: [],
        postedAt: 'just now',
      }],
      activity: [{ time: '9:12 AM', type: 'checkin', who: 'Avery', text: 'posted standup' }],
    });

    await page.locator('#notifications-toggle').click();
    await expect(page.locator('#notifications-panel-list .notification-item')).toHaveCount(3);
    await expect(page.locator('#notifications-panel-list')).toContainText('Critical issue assigned');

    await page.evaluate(() => {
      localStorage.setItem('sitrep-notify-standup', '0');
      localStorage.setItem('sitrep-notify-mentions', '0');
      localStorage.setItem('sitrep-notify-digest', '0');
    });
    await page.reload();

    await expect(page.locator('#notifications-badge')).toBeHidden();
    await page.locator('#notifications-toggle').click();
    await expect(page.locator('#notifications-panel-list .notification-item')).toHaveCount(0);
    await expect(page.locator('#notifications-panel-list')).toContainText('Nothing new.');
  });

  test('posting a standup clears the standup reminder but keeps digest notifications', async ({ page }) => {
    await page.locator('a.btn-primary[href="standup.html"]').click();
    await page.locator('#post-checkin-btn').click();
    await page.locator('#yesterday-input').fill('Finished notification card');
    await page.locator('#today-input').fill('Writing tests');
    await page.locator('#checkin-form button[type="submit"]').click();

    await page.goto('/');
    await page.locator('#notifications-toggle').click();
    await expect(page.locator('#notifications-panel-list')).not.toContainText("Post today's standup");
    await expect(page.locator('#notifications-panel-list')).toContainText('Daily digest ready');
    await expect(page.locator('#notifications-badge')).toHaveText('1');
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
