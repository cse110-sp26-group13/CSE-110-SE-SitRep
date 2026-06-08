# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard.spec.js >> Dashboard summary page >> clicking a notification marks that alert read and navigates to the target page
- Location: tests/e2e/dashboard.spec.js:71:3

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected value: "standup:2026-06-08:test-user"
Received array: ["standup:2026-06-07:test-user"]
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - complementary "Primary navigation" [ref=e3]:
    - button "No active circle" [ref=e5] [cursor=pointer]:
      - generic [ref=e6]: +
    - link "Dashboard" [ref=e8] [cursor=pointer]:
      - /url: index.html
      - img [ref=e9]
    - link "Standup" [ref=e14] [cursor=pointer]:
      - /url: standup.html
      - img [ref=e15]
    - link "Issues" [ref=e20] [cursor=pointer]:
      - /url: issues.html
      - img [ref=e21]
    - link "Calendar" [ref=e24] [cursor=pointer]:
      - /url: calendar.html
      - img [ref=e25]
    - link "AI Agents" [ref=e27] [cursor=pointer]:
      - /url: ai-agents.html
      - img [ref=e28]
    - button "Switch to dark mode" [ref=e33] [cursor=pointer]:
      - img [ref=e34]
    - link "Settings" [ref=e36] [cursor=pointer]:
      - /url: settings.html
      - img [ref=e37]
  - main [ref=e40]:
    - generic [ref=e41]:
      - generic [ref=e42]:
        - generic [ref=e45]: Sunday, Jun 7 · Test Team
        - heading "Daily standup." [level=1] [ref=e46]
      - generic [ref=e47]:
        - link "← Dashboard" [ref=e48] [cursor=pointer]:
          - /url: index.html
        - button "+ Post standup" [ref=e49] [cursor=pointer]
    - generic [ref=e51]:
      - region "Mood — last 7 days" [ref=e52]:
        - generic [ref=e53]:
          - generic [ref=e54]:
            - heading "Mood — last 7 days" [level=2] [ref=e55]
            - text: No data
          - button "View Team Mood" [ref=e57] [cursor=pointer]
        - generic [ref=e58]:
          - img [ref=e59]:
            - generic [ref=e60]: "2"
            - generic [ref=e61]: "4"
            - generic [ref=e62]: "6"
            - generic [ref=e63]: "8"
            - generic [ref=e64]: "10"
            - generic [ref=e65]: −6d
            - generic [ref=e66]: −5d
            - generic [ref=e67]: −4d
            - generic [ref=e68]: −3d
            - generic [ref=e69]: −2d
            - generic [ref=e70]: −1d
            - generic [ref=e71]: Today
          - generic [ref=e72]:
            - generic [ref=e73]:
              - generic [ref=e74]: Today
              - generic [ref=e75]: —
            - generic [ref=e76]:
              - generic [ref=e77]: Week avg
              - generic [ref=e78]: —
            - generic [ref=e79]:
              - generic [ref=e80]: vs 6d ago
              - generic [ref=e81]: —
      - generic [ref=e82]:
        - region "Today's Mood" [ref=e84]:
          - heading "Today's Mood" [level=2] [ref=e86]
          - generic [ref=e87]:
            - generic [ref=e90]: Your Mood ·
            - radiogroup "Your Mood ·" [ref=e91]:
              - button "Cooked" [ref=e92] [cursor=pointer]:
                - img [ref=e93]
                - generic [ref=e103]: cooked
              - button "Tired" [ref=e104] [cursor=pointer]:
                - img [ref=e105]
                - generic [ref=e114]: tired
              - button "Surviving" [ref=e115] [cursor=pointer]:
                - img [ref=e116]
                - generic [ref=e128]: surviving
              - button "Chill" [ref=e129] [cursor=pointer]:
                - img [ref=e130]
                - generic [ref=e137]: chill
              - button "Locked in" [ref=e138] [cursor=pointer]:
                - img [ref=e139]
                - generic [ref=e154]: locked in
          - generic [ref=e155]:
            - generic [ref=e156]:
              - generic [ref=e157]:
                - generic [ref=e158]: Team Mood
                - text: 0 of 1
              - button "+ Add yours" [ref=e159] [cursor=pointer]
            - list [ref=e160]
        - region "When can we meet?" [ref=e161]:
          - heading "When can we meet?" [level=2] [ref=e164]
          - generic [ref=e166]:
            - generic [ref=e167]:
              - heading "TEAM AVAILABILITY" [level=3] [ref=e168]
              - button "Edit Mine" [ref=e169] [cursor=pointer]
            - generic [ref=e170]:
              - generic [ref=e171]: 0 / 1
              - generic [ref=e173]: 1 / 1
            - list [ref=e174]:
              - generic [ref=e175]:
                - generic [ref=e177]: Sun
                - generic [ref=e178]: Mon
                - generic [ref=e179]: Tue
                - generic [ref=e180]: Wed
                - generic [ref=e181]: Thu
                - generic [ref=e182]: Fri
                - generic [ref=e183]: Sat
                - generic [ref=e184]: 8 AM
                - generic [ref=e192]: 9 AM
                - generic [ref=e200]: 10 AM
                - generic [ref=e208]: 11 AM
                - generic [ref=e216]: 12 PM
                - generic [ref=e224]: 1 PM
                - generic [ref=e232]: 2 PM
                - generic [ref=e240]: 3 PM
                - generic [ref=e248]: 4 PM
                - generic [ref=e256]: 5 PM
                - generic [ref=e264]: 6 PM
                - generic [ref=e272]: 7 PM
                - generic [ref=e280]: 8 PM
                - generic [ref=e288]: 9 PM
                - generic [ref=e296]: 10 PM
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { bypassAuth } from './_auth-stub.js';
  3   | 
  4   | test.describe('Dashboard summary page', () => {
  5   |   test.beforeEach(async ({ page }) => {
  6   |     await bypassAuth(page);
  7   |     await page.goto('/');
  8   |     await page.evaluate(() => localStorage.clear());
  9   |     await page.reload();
  10  |   });
  11  | 
  12  |   async function seedDashboard(page, data) {
  13  |     await page.evaluate((next) => {
  14  |       localStorage.setItem('sitrep-e2e-stub', JSON.stringify(next));
  15  |     }, data);
  16  |     await page.reload();
  17  |   }
  18  | 
  19  |   test('page title is correct', async ({ page }) => {
  20  |     await expect(page).toHaveTitle(/SitRep/);
  21  |   });
  22  | 
  23  |   test('navigation rail is visible', async ({ page }) => {
  24  |     await expect(page.locator('.rail')).toBeVisible();
  25  |   });
  26  | 
  27  |   test('KPI strip renders at least one tile', async ({ page }) => {
  28  |     await expect(page.locator('.kpi').first()).toBeVisible();
  29  |   });
  30  | 
  31  |   test('standup snapshot card shows count and link', async ({ page }) => {
  32  |     await expect(page.locator('#snap-standup-num')).toBeVisible();
  33  |     await expect(page.locator('a.snapshot-link[href="standup.html"]').first()).toBeVisible();
  34  |   });
  35  | 
  36  |   test('issues snapshot card shows severity row and link', async ({ page }) => {
  37  |     await expect(page.locator('#snap-issues-num')).toBeVisible();
  38  |     await expect(page.locator('#snap-issues-sev')).toBeVisible();
  39  |     await expect(page.locator('a.snapshot-link[href="issues.html"]')).toBeVisible();
  40  |   });
  41  | 
  42  |   test('mood sparkline and activity list render', async ({ page }) => {
  43  |     await expect(page.locator('#sparkline-wrap')).toBeVisible();
  44  |     await expect(page.locator('#activity-list')).toBeVisible();
  45  |   });
  46  | 
  47  |   test('notification center shows unread alerts and can mark them read', async ({ page }) => {
  48  |     await expect(page.locator('#notifications')).toBeVisible();
  49  |     await expect(page.locator('#notification-list .notification-item.unread').first()).toBeVisible();
  50  |     await expect(page.locator('#notifications-badge')).toBeVisible();
  51  | 
  52  |     await page.locator('#notifications-mark-read').click();
  53  | 
  54  |     await expect(page.locator('#notification-list .notification-item.unread')).toHaveCount(0);
  55  |     await expect(page.locator('#notifications-badge')).toBeHidden();
  56  |   });
  57  | 
  58  |   test('notification popover opens, lists alerts, and closes when clicking outside', async ({ page }) => {
  59  |     await expect(page.locator('#notifications-panel')).toBeHidden();
  60  |     await page.locator('#notifications-toggle').click();
  61  | 
  62  |     await expect(page.locator('#notifications-panel')).toBeVisible();
  63  |     await expect(page.locator('#notifications-panel-list')).toContainText("Post today's standup");
  64  |     await expect(page.locator('#notifications-toggle')).toHaveAttribute('aria-expanded', 'true');
  65  | 
  66  |     await page.locator('#snap-standup-title').click();
  67  |     await expect(page.locator('#notifications-panel')).toBeHidden();
  68  |     await expect(page.locator('#notifications-toggle')).toHaveAttribute('aria-expanded', 'false');
  69  |   });
  70  | 
  71  |   test('clicking a notification marks that alert read and navigates to the target page', async ({ page }) => {
  72  |     await expect(page.locator('#notification-list .notification-item.unread')).toHaveCount(2);
  73  | 
  74  |     await page.locator('#notification-list a[href="standup.html"]').click();
  75  | 
  76  |     await expect(page).toHaveURL(/standup(\.html)?$/);
  77  |     const readStore = await page.evaluate(() => JSON.parse(localStorage.getItem('sitrep-notifications-read-v1')));
  78  |     const today = new Date().toISOString().slice(0, 10);
> 79  |     expect(readStore['test-team']).toContain(`standup:${today}:test-user`);
      |                                    ^ Error: expect(received).toContain(expected) // indexOf
  80  |   });
  81  | 
  82  |   test('read notification state persists after reload', async ({ page }) => {
  83  |     await page.locator('#notifications-mark-read').click();
  84  |     await page.reload();
  85  | 
  86  |     await expect(page.locator('#notification-list .notification-item.unread')).toHaveCount(0);
  87  |     await expect(page.locator('#notifications-badge')).toBeHidden();
  88  |     await expect(page.locator('#notifications-sub')).toHaveText('0 unread across 2 alerts');
  89  |   });
  90  | 
  91  |   test('notification preferences suppress matching alert categories', async ({ page }) => {
  92  |     await seedDashboard(page, {
  93  |       blockers: [{
  94  |         id: 'assigned-critical',
  95  |         title: 'Deploy token needs rotation',
  96  |         severity: 'critical',
  97  |         status: 'open',
  98  |         owner: 'Test User',
  99  |         ownerId: 'test-user',
  100 |         comments: [],
  101 |         postedAt: 'just now',
  102 |       }],
  103 |       activity: [{ time: '9:12 AM', type: 'checkin', who: 'Avery', text: 'posted standup' }],
  104 |     });
  105 | 
  106 |     await expect(page.locator('#notification-list .notification-item')).toHaveCount(3);
  107 |     await expect(page.locator('#notification-list')).toContainText('Critical issue assigned');
  108 | 
  109 |     await page.evaluate(() => {
  110 |       localStorage.setItem('sitrep-notify-standup', '0');
  111 |       localStorage.setItem('sitrep-notify-mentions', '0');
  112 |       localStorage.setItem('sitrep-notify-digest', '0');
  113 |     });
  114 |     await page.reload();
  115 | 
  116 |     await expect(page.locator('#notification-list .notification-item')).toHaveCount(0);
  117 |     await expect(page.locator('#notification-list')).toContainText('No notifications right now.');
  118 |     await expect(page.locator('#notifications-badge')).toBeHidden();
  119 |   });
  120 | 
  121 |   test('posting a standup clears the standup reminder but keeps digest notifications', async ({ page }) => {
  122 |     await page.locator('a.btn-primary[href="standup.html"]').click();
  123 |     await page.locator('#post-checkin-btn').click();
  124 |     await page.locator('#yesterday-input').fill('Finished notification card');
  125 |     await page.locator('#today-input').fill('Writing tests');
  126 |     await page.locator('#checkin-form button[type="submit"]').click();
  127 | 
  128 |     await page.goto('/');
  129 |     await expect(page.locator('#notification-list')).not.toContainText("Post today's standup");
  130 |     await expect(page.locator('#notification-list')).toContainText('Daily digest ready');
  131 |     await expect(page.locator('#notifications-sub')).toHaveText('1 unread across 1 alerts');
  132 |   });
  133 | 
  134 |   test('rail nav to standup page', async ({ page }) => {
  135 |     await page.locator('.rail-icon[data-route="standup"]').click();
  136 |     await expect(page).toHaveURL(/standup(\.html)?$/);
  137 |   });
  138 | 
  139 |   test('rail nav to issues page', async ({ page }) => {
  140 |     await page.locator('.rail-icon[data-route="issues"]').click();
  141 |     await expect(page).toHaveURL(/issues(\.html)?$/);
  142 |   });
  143 | 
  144 |   test('rail nav to calendar page', async ({ page }) => {
  145 |     await page.locator('.rail-icon[data-route="calendar"]').click();
  146 |     await expect(page).toHaveURL(/calendar(\.html)?$/);
  147 |   });
  148 | 
  149 |   test('"Post standup" CTA routes to standup page', async ({ page }) => {
  150 |     await page.locator('a.btn-primary[href="standup.html"]').click();
  151 |     await expect(page).toHaveURL(/standup(\.html)?$/);
  152 |   });
  153 | });
  154 | 
```