// @ts-check
const { test, expect } = require("@playwright/test");

/**
 * E2E smoke tests for SE SitRep dashboard.
 * Sprint 1 scope: verify the page loads and core panels render.
 * More detailed interaction tests will be added as features stabilize.
 */

test.describe("Dashboard smoke tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("page title is correct", async ({ page }) => {
    await expect(page).toHaveTitle(/SE SitRep/);
  });

  test("navigation rail is visible", async ({ page }) => {
    const rail = page.locator(".rail");
    await expect(rail).toBeVisible();
  });

  test("KPI strip renders at least one tile", async ({ page }) => {
    const kpis = page.locator(".kpi");
    await expect(kpis.first()).toBeVisible();
  });

  test("daily standup panel is present", async ({ page }) => {
    const panel = page.locator("#checkin-list");
    await expect(panel).toBeVisible();
  });

  test("blockers panel is present", async ({ page }) => {
    const panel = page.locator("#blocker-list");
    await expect(panel).toBeVisible();
  });

  test("when-can-we-meet grid is present", async ({ page }) => {
    const slots = page.locator("#slots-list");
    await expect(slots).toBeVisible();
  });

  test("post standup button is visible", async ({ page }) => {
    const btn = page.locator("#post-checkin-btn");
    await expect(btn).toBeVisible();
  });

  test("post standup button opens the form", async ({ page }) => {
    await page.locator("#post-checkin-btn").click();
    const form = page.locator("#checkin-form");
    await expect(form).toBeVisible();
  });

  test("new issue button is visible", async ({ page }) => {
    const btn = page.locator("#add-blocker-btn");
    await expect(btn).toBeVisible();
  });
});
