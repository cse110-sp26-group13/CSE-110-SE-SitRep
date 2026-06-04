import { test, expect } from '@playwright/test';
import { bypassAuth } from './_auth-stub.js';

test.describe('Issues Tracker', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page);
    await page.goto('/issues.html');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  test('issues list renders', async ({ page }) => {
    await expect(page.locator('#blocker-list')).toBeVisible();
  });

  test('pull requests section renders below issues', async ({ page }) => {
    await expect(page.locator('.deep-content > section').nth(0).locator('#blocker-list')).toBeVisible();
    await expect(page.locator('.deep-content > section').nth(1).locator('#pull-request-list')).toBeVisible();
    await expect(page.locator('#pull-requests-title')).toHaveText('Pull requests');
  });

  test('status and severity filters are visible', async ({ page }) => {
    await expect(page.locator('#status-filters')).toBeVisible();
    await expect(page.locator('#severity-filters')).toBeVisible();
  });

  test('GitHub sync renders pull requests without mixing them into issues', async ({ page }) => {
    await page.route(/https:\/\/api\.github\.com\/repos\/demo\/repo\/issues\?state=all/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            number: 10,
            title: 'Synced issue from GitHub',
            body: 'Issue body',
            labels: [{ name: 'high' }],
            state: 'open',
            user: { login: 'octocat' },
            created_at: '2026-05-01T10:00:00Z',
          },
          {
            id: 2,
            number: 11,
            title: 'PR-shaped issue response',
            state: 'open',
            pull_request: { url: 'https://api.github.com/repos/demo/repo/pulls/11' },
          },
        ]),
      }),
    );

    await page.route(/https:\/\/api\.github\.com\/repos\/demo\/repo\/pulls\?state=all/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 99,
            number: 12,
            title: 'View-only PR list',
            state: 'open',
            user: { login: 'octocat' },
            head: { ref: 'feature/pr-list' },
            base: { ref: 'main' },
            created_at: '2026-05-02T10:00:00Z',
            updated_at: '2026-05-03T10:00:00Z',
            draft: false,
            html_url: 'https://github.com/demo/repo/pull/12',
            mergeable: true,
            mergeable_state: 'clean',
          },
        ]),
      }),
    );

    await page.locator('#sync-gh-btn').click();
    await page.locator('#gh-repos').fill('demo/repo');
    await page.locator('#gh-sync-form button[type="submit"]').click();

    await expect(page.locator('#issue-modal')).toBeHidden();
    await expect(page.locator('#blocker-list')).toContainText('Synced issue from GitHub');
    await expect(page.locator('#blocker-list')).not.toContainText('PR-shaped issue response');
    await expect(page.locator('#pull-request-list')).toContainText('#12 View-only PR list');
    await expect(page.locator('#pull-request-list')).toContainText('feature/pr-list -> main');
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
