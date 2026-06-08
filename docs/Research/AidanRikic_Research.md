# Aidan Rikic — Research

## Product Research

### ClickUp

ClickUp is an all in one project management tool aimed at teams that want everything in one place. It's heavily feature rich, which makes it a good reference for patterns even if we don't implement most of them.

**Features worth referencing:**

- **Team Workspaces** — tasks are organized into customizable spaces, folders, and lists. Each workspace can be scoped to a team, a project, or a workflow. For SitRep, this maps to the idea of a team "room" where everything — standups, blockers, issues — lives under one shared context rather than scattered across tools.
- **Multiple view modes** — the same task list can be rendered as a list, Kanban board, calendar, Gantt chart, or timeline. The user picks whichever view matches their mental model. For our sprint, we're starting with a dashboard view, but the calendar feature being built this sprint is a step toward this kind of view-switching.
- **AI Team Center** — ClickUp's AI generates a summary of what happened on a given dashboard: tasks completed, blockers raised, activity trends. This is a direct inspiration for a **Daily Digest** feature — an auto-generated "here's what your team did today" that reduces the need for a manual standup on low-change days. Worth flagging as a post-MVP idea.

---

### Linear

Linear is a project management tool built specifically for software teams. It's known for being extremely fast, keyboard driven, and minimal the opposite of ClickUp's maximalism.

**Features worth referencing:**

- **Issue tracking with team context** — every issue shows who it's assigned to, its current status, and which cycle (sprint) it belongs to. This is the v2 direction for our GitHub Issues tracker: not just surfacing raw GitHub issues, but giving them team level context (who's on it, is it blocked, when is it due).
- **Group status / contribution view** — Linear has a "My Issues" view per person and a team wide view showing what everyone is actively working on and what's been completed. This directly maps to our check-in and activity feed features the goal is the same: at a glance, what is the team's collective status right now?
- **Cycle-based workflow** — Linear uses "cycles" (their word for sprints) with a clear start/end, and automatically surfaces what rolled over from the last cycle. Useful reference for how we might eventually tie our standup data to sprint cadence, rather than just showing a flat activity feed.

---

## CI/CD & Testing

As part of Sprint 1, I set up the project's CI/CD pipeline and initial test suite on the `aidan/ci_cd` branch. Notes on the decisions made:

- **Jest for unit tests, Playwright for E2E** — Jest is the standard for JS unit testing and works well with jsdom for DOM-free logic tests. Playwright was chosen over Cypress for E2E because it's faster in CI, installs a single browser binary (Chromium), and has better support for GitHub Actions out of the box. Both tools are well documented and widely used in industry.
- **Pipeline structure: lint → tests → deploy** — ESLint runs first as a cheap gate. If linting fails, neither test suite runs. Unit and E2E tests run in parallel after lint passes. Deploy only fires on pushes to `main` once both test jobs succeed. This ordering keeps CI fast and prevents broken code from ever reaching GitHub Pages.
- **E2E tests are smoke tests only for Sprint 1** — the Playwright suite checks that the page loads, core panels render, and key buttons are visible. It doesn't test interactions deeply yet. This is intentional: the dashboard is still changing fast, and brittle interaction tests would break every PR. Smoke coverage now, deeper tests as features stabilize.
- **ESLint config format fix** — the original config used ES module `import` syntax in `eslint.config.js`, but `package.json` has no `"type": "module"`, which would cause a `SyntaxError` when ESLint tried to load it. Fixed by renaming to `eslint.config.mjs`, which Node always treats as an ES module regardless of `package.json`. The Jest and Playwright configs remain `.js` with `module.exports` (CommonJS) so they're unaffected.
