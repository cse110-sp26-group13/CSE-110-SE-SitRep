import { test, expect } from '@playwright/test'

test.describe('Issues Tracker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Start each test with clean localStorage so data.js fixtures are the only state.
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('user creates a new issue and it appears in the issues list', async ({ page }) => {
    // 1. Click "+ New issue"
    await page.locator('#add-blocker-btn').click()

    // Modal opens
    await expect(page.locator('#issue-modal')).toBeVisible()
    await expect(page.locator('#issue-modal-title')).toHaveText('New issue')

    // 2. Fill in the form fields
    await page.locator('#issue-title').fill('E2E Test: Broken login flow')
    await page.locator('#issue-start').fill('2026-06-01')
    await page.locator('#issue-due').fill('2026-06-15')
    await page.locator('#issue-category').selectOption('backend')

    // 3. Submit
    await page.locator('#issue-create-form button[type="submit"]').click()

    // 4. Modal closes after successful submission
    await expect(page.locator('#issue-modal')).toBeHidden()

    // 5. New issue appears in the issues list
    const list = page.locator('#blocker-list')
    await expect(list).toContainText('E2E Test: Broken login flow')
  })
})
