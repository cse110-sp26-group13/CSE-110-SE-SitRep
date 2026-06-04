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

  test('dashboard summaries reflect seeded standup, blocker, and activity data', async ({ page }) => {
    await seedDashboard(page, {
      mood: 8,
      lastCheckIn: {
        time: 'just now',
        yesterday: 'Finished auth cleanup',
        today: 'Writing dashboard tests',
        blockers: '',
      },
      blockers: [{
        id: 'seed-blocker',
        title: 'Seeded blocker from test',
        description: 'Needs attention',
        severity: 'critical',
        status: 'open',
        owner: 'Test User',
        ownerId: 'test-user',
        postedAt: 'just now',
        comments: [],
      }],
      activity: [{
        type: 'blocker',
        who: 'Test User',
        text: 'opened a critical issue',
        time: 'just now',
      }],
    });

    await expect(page.locator('#kpis')).toContainText('1/1');
    await expect(page.locator('#kpis')).toContainText('8.0/10');
    await expect(page.locator('#snap-standup-num')).toContainText('1 / 1');
    await expect(page.locator('#snap-issues-num')).toContainText('1 open');
    await expect(page.locator('#snap-issues-body')).toContainText('Seeded blocker from test');
    await expect(page.locator('#activity-sub')).toHaveText('1 events');
    await expect(page.locator('#activity-list')).toContainText('opened a critical issue');
  });

  test('dashboard shows unblocked and no-activity empty states', async ({ page }) => {
    await seedDashboard(page, {
      lastCheckIn: {
        time: 'just now',
        yesterday: 'Reviewed PRs',
        today: 'Planning next tasks',
        blockers: '',
      },
      blockers: [],
      activity: [],
    });

    await expect(page.locator('#snap-standup-body')).toContainText("Whole team's in.");
    await expect(page.locator('#snap-issues-body')).toContainText("Team's unblocked.");
    await expect(page.locator('#activity-list')).toContainText('No activity yet.');
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
