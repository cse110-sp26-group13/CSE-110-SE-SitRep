# AI Usage Disclosure

Per the CSE 110 Sp 26 project requirements: *"GenAI may be used, and if used, must be exposed and discussed."*

This document captures **what was AI-generated, what was reviewed, and what decisions stayed with humans**. Anyone on the team who uses GenAI on this project should append an entry below.

## Project policy

- **GenAI is allowed** for drafting, exploration, refactoring, research summaries, and acting on linter / advisor output.
- **A human reviews AI output before it lands on `main`.** PRs that include AI-drafted code are reviewed the same as any other PR — the AI is treated as a junior contributor, not an authority.
- **Architectural decisions are captured as ADRs** ([docs/adr/](adr/)) regardless of whether the human or the AI did the drafting.
- **Destructive or shared-state actions** (DB migrations, force pushes, dependency adoption, sending messages to outside services) require an explicit human authorization per session — AI does not perform them autonomously.
- **API keys and secrets** are not pasted into AI prompts. The Supabase publishable / anon key is intentionally public; the `service_role` key has never been shared with any AI tool.

## Entries

Newest first. Date format: `YYYY-MM-DD`.

---

### 2026-06-06 — Ophir

**Tooling:** OpenAI Codex via the Codex CLI with direct repository access. File changes were made locally in the existing project workspace and reviewed against the current Issues page implementation and recent Git history.

**AI-assisted output that landed in the repo:**

- [`issues.html`](../issues.html) — commented out the Pull requests card, PR status filters, New PR button, PR list container, and PR-specific script imports for `github-pulls.js` and `pull-requests.js`. The code was preserved in HTML comments so it can be restored later.
- [`js/pages/issues.js`](../js/pages/issues.js) — commented out the `renderPullRequests()` and `bindPullRequestControls()` calls so PR rendering and handlers no longer run on the Issues page.
- [`js/features/blockers.js`](../js/features/blockers.js) — changed the GitHub sync modal back to issue-only behavior, including button text, fetch logic, warning handling, and activity log text. The previous PR fetch, count, and activity-log code was kept as comments next to the issue sync path.
- [`tests/e2e/issues.spec.js`](../tests/e2e/issues.spec.js) — updated the Issues page E2E coverage so it expects issue sync without a PR list, while preserving the old PR-specific tests/assertions in comments.
- This AI usage disclosure entry.

**Decisions I made (not delegated):**

- Kept all PR-related source code in place instead of deleting it, because the task asked for PR functionality to be reversible later.
- Treated PR-related functionality as anything on `issues.html` that displayed, loaded, rendered, bound controls for, fetched, counted, or logged Pull Requests/PRs on the Issues page.
- Left shared PR modules and PR unit tests in the repo because the task was scoped to the Issues page, and removing shared PR code could break a future dedicated PR page or restoration path.
- Kept normal GitHub issue functionality active, including issue sync, issue creation, GitHub issue comments, issue closing, repo selection, and unsync behavior.

**Where the AI helped most:**

- Tracing PR behavior across the Issues page markup, page orchestrator, GitHub sync flow, and E2E tests.
- Making a minimal reversible change by commenting out PR-specific UI/imports/calls/fetch logic instead of broadly refactoring the issue tracker.
- Adding documentation comments before the touched Issues page functions so the purpose of the issue-only behavior is clear.

**Where human review is still expected:**

- Ophir should review the commented PR blocks to confirm the scope matches the team intent, especially the assumption that PR sync/count/activity text should not run from the Issues page.
- A teammate should confirm whether PR functionality is being deferred entirely or should move to a separate page later.
- The final PR should still receive normal human review before merge, with particular attention to the GitHub sync behavior and the updated E2E expectations.

---

### 2026-05-29 — Shazi

**Tooling:** Claude (Anthropic Opus 4.7) via Claude Code CLI for the documentation pass; Claude (claude.ai design / artifacts) for the visual prototypes earlier in weeks 7–8.

**AI-assisted output that landed in the repo:**

- [`wireframes/`](../wireframes/) folder collected and committed retroactively — 17 high-fidelity visual prototypes (PNGs) generated with Claude during weeks 7–8, plus [`wireframes/mock.html`](../wireframes/mock.html), a 999-line standalone Linear-style HTML prototype.
- [`wireframes/README.md`](../wireframes/README.md) — design brief, "what these are / are not" framing, mapping of each prototype to the production direction it informed (or didn't), and an honest timing note acknowledging the retroactive commit.
- [`wireframes/old-ui/`](../wireframes/old-ui/) — extracted snapshot of the pre-redesign UI from commit [`3b9908a`](https://github.com/cse110-sp26-group13/CSE-110-SE-SitRep/commit/3b9908a) (the last commit before the halftone rewrite), kept as a reference of what the prototypes were replacing.
- This entry plus the 2026-05-28 entry below.

**Decisions I made (not delegated):**

- Picked **halftone / warm-paper** as the shipping direction from the prototype set; the Linear-style alternative was tried in [`a4c35f8`](https://github.com/cse110-sp26-group13/CSE-110-SE-SitRep/commit/a4c35f8) then reverted via PR [#26](https://github.com/cse110-sp26-group13/CSE-110-SE-SitRep/pull/26) because it lost the "tool with personality" feel.
- Chose to commit the prototypes with an honest retroactive-timing note rather than back-date them.
- Decided to keep AI_USAGE entries incremental rather than switch to a single end-of-project summary — the rubric language ("incrementally", "as you go along") points incremental.

**Where the AI helped most:**

- Generating multiple visual directions in parallel — would have taken days of Figma work to explore the halftone vs Linear vs CRT options by hand.
- Auditing the branch's documentation gaps against the project PDF and surfacing missing artifacts (ADRs for circle-switcher, JSDoc on settings.js, e2e specs for new surfaces, CHANGELOG entry).

**Where I had to push back / catch issues:**

- The original AI created UI mockups were very buggy and imperfect, it took a lot of debugging, reimplementing and hardcoding to make the chosen UI smooth and efficient. However, that's not to say that the AI assistance did not speed up the process of developing and implementing this new, beautiful UI.

---

### 2026-05-28 — Shazi

**Tooling:** Claude (Anthropic Opus 4.7) via Claude Code CLI with direct repo access. File writes required approval; gh CLI used for issue creation.

**AI-assisted output that landed in the repo (branch `settings-page/shazi`):**

- New Settings page: [`settings.html`](../settings.html), [`css/settings.css`](../css/settings.css), [`js/pages/settings.js`](../js/pages/settings.js) — Account, Security, Appearance, Notifications, Demo data, and Circles sections.
- Change-password flow with Supabase re-auth before `updateUser`.
- Shared password strength meter: [`css/pw-strength.css`](../css/pw-strength.css) + [`js/features/pw-strength.js`](../js/features/pw-strength.js), consumed by both splash sign-up and settings change-password (replaced the inline scoring previously in [`js/features/splash.js`](../js/features/splash.js)).
- Password reveal (eye) toggle on the three change-password fields.
- Rail circle switcher: [`js/features/circle-switcher.js`](../js/features/circle-switcher.js), rail popover styles in [`css/rail.css`](../css/rail.css), `localStorage`-backed active-circle persistence in [`js/db.js`](../js/db.js), and a `sitrep:active-team` event listener in [`js/features/header.js`](../js/features/header.js).
- Circle-switcher mount added to every page rail (index/standup/issues/calendar/settings).
- GitHub issues [#29](https://github.com/cse110-sp26-group13/CSE-110-SE-SitRep/issues/29)–[#34](https://github.com/cse110-sp26-group13/CSE-110-SE-SitRep/issues/34) created retroactively to track the work.

**Decisions I made (not delegated):**

- Chose `localStorage['sitrep-active-team']` + `sitrep:active-team` event as the active-circle scoping model (rather than URL param or server-side session) — pending ADR write-up.
- Required a Supabase re-auth via `signInWithPassword` before `updateUser` because Supabase doesn't enforce old-password verification by default.
- Kept the strength meter as a shared module rather than duplicating the scoring per page — followed the existing "no duplicate CSS" memory rule.

**Where the AI helped most:**

- Scaffolding repetitive markup (three password fields, six issue bodies, the rail markup across five pages).
- Refactoring the strength meter from inline to shared in a single pass — splash.html, splash.js, splash.css, new pw-strength.css/.js, and the settings markup all moved together consistently.

**Where I had to push back / catch issues:**

- A local file hook kept deleting the new untracked `css/pw-strength.css` and `js/features/pw-strength.js` between sessions; the AI didn't notice until I pointed at the missing strength bar in the UI. Fix: recreated the files and (eventually) `git add`-ed them so they couldn't be cleaned up.
- Minor bugs in formatting, styling and UI layers. It took a few prompts to iron out issues with the backend and fronted features, which is expected.

---

### 2026-05-25 to 2026-05-26 — Shazi (halftone UI rewrite + dark mode)

**Tooling:** Claude (Anthropic Opus 4.7) via Claude Code CLI. Worked from the visual prototypes in [`wireframes/`](../wireframes/) (see 2026-05-29 entry) as the design source, with the chosen halftone direction as the target.

**AI-assisted output that landed in the repo:**

- Commit [`7454cd0`](https://github.com/cse110-sp26-group13/CSE-110-SE-SitRep/commit/7454cd0) "ui rework version 1 - halftone" — the visual-system rewrite:
  - [`css/base.css`](../css/base.css) — full rewrite (+454 lines) with the warm-paper / ink token system (`--paper`, `--ink`, `--bad`, etc.), button/card/modal primitives, accessible focus styles.
  - [`css/page.css`](../css/page.css) (new, ~313 lines), [`css/calendar.css`](../css/calendar.css) (new, ~274 lines).
  - Restyle of per-feature CSS to match the new design: `activity.css`, `blockers.css`, `checkins.css`, `header.css`, `kpis.css`, `mood-trend.css`, `rail.css`, `slots.css`, `splash.css`.
  - New pages [`calendar.html`](../calendar.html), [`issues.html`](../issues.html), `standup.html` and per-page JS orchestrators ([`js/pages/calendar.js`](../js/pages/calendar.js), [`js/pages/dashboard.js`](../js/pages/dashboard.js), `js/pages/issues.js`, `js/pages/standup.js`), replacing the legacy single `js/app.js`.
  - [`js/nav.js`](../js/nav.js) for the page-level routing.
  - New E2E specs in `tests/e2e/` for the new pages.
- Commit [`71c3054`](https://github.com/cse110-sp26-group13/CSE-110-SE-SitRep/commit/71c3054) "dark mode" — added [`js/theme.js`](../js/theme.js) and dark-mode tokens via `:root[data-theme="dark"]` in `base.css`.
- Commit [`ea01d27`](https://github.com/cse110-sp26-group13/CSE-110-SE-SitRep/commit/ea01d27) "update to ui" — final cleanups before PR [#26](https://github.com/cse110-sp26-group13/CSE-110-SE-SitRep/pull/26) merge.
- A short-lived Linear-style rebrand was attempted in [`a4c35f8`](https://github.com/cse110-sp26-group13/CSE-110-SE-SitRep/commit/a4c35f8) (also Claude-drafted) and then reverted when we went back to halftone in PR #26 — the standalone Linear prototype lives at [`wireframes/mock.html`](../wireframes/mock.html).

**Decisions I made (not delegated):**

- Picked halftone from the prototype set (see 2026-05-29 entry).
- Chose the per-page split structure (`js/pages/<page>.js` orchestrators, one HTML file per major surface) over keeping the single-page dashboard.
- Approved the rewrite of legacy `js/app.js` into the new per-page orchestrators rather than incremental migration.
- Accepted the dark mode follow-up as a separate commit rather than bundling it into the halftone PR.

**Where the AI helped most:**

- Translating the chosen halftone prototype into a coherent token system in `base.css` so the rest of the CSS could compose against tokens rather than hard-coded colors.
- Doing the per-feature CSS restyle in one consistent pass; file-by-file by hand would have produced visual drift between components.
- Splitting the legacy `js/app.js` into per-page orchestrators while keeping the shared feature modules intact.

**Where I had to push back / catch issues:**

- PR [#26](https://github.com/cse110-sp26-group13/CSE-110-SE-SitRep/pull/26) was the right path for the halftone work — reviewed by a teammate before merge, unlike the v1 PR self-merge documented in the May 12–15 entry below.
- The Linear-style rebrand at [`a4c35f8`](https://github.com/cse110-sp26-group13/CSE-110-SE-SitRep/commit/a4c35f8) landed and then got pulled — "looks more refined" isn't the same as "feels right for this product." Going back to halftone via PR #26 was the right call, decided unanimously by the team.

---

### 2026-05-20 — Aidan

**Tooling:** Claude via Claude Code CLI, with direct repo access via MCP. Operated in plan mode for review/discussion phases; file writes required explicit approval before execution.

**AI-assisted output that landed in the repo:**

- CI/CD pipeline (`.github/workflows/ci.yml`) — four-job structure: lint → unit tests + E2E tests → deploy to GitHub Pages on `main` push.
- Config files: `jest.config.js`, `playwright.config.js`, `eslint.config.mjs`, `package.json` with all dev dependencies.
- Unit test files: `tests/unit/blockers.test.js`, `tests/unit/utils.test.js` — covers `statusMatchesFilter`, `overlapClass`, `SEVERITY_ORDER`, `escapeHTML`, `moodClass`, and `avatar`.
- E2E smoke test file: `tests/e2e/dashboard.spec.js` — 9 tests verifying page load and core panel visibility.
- `Research/AidanRikic_Research.md` — drafted from my own notes and bullet points on ClickUp and Linear; CI/CD section written from my own decisions.

**Decisions I made:**
- Chose to tackle CI/CD in Sprint 1 specifically so that testing can be demonstrated early, not only at the end.
- Chose Jest + Playwright over alternatives (Vitest, Cypress) — Jest for its jsdom support and simplicity, Playwright for its speed in CI and single browser binary install.
- Decided to scope E2E tests to smoke tests only for Sprint 1. Deep interaction tests would break constantly while the dashboard is still changing fast.
- Decided the 177 ESLint warnings were acceptable for now. All `warn`, zero `error`, so lint passes. The warnings are false positives from the vanilla JS global sharing pattern, not real bugs.
- Kept the inline function pattern in unit tests rather than importing from source avoids needing a bundler, acceptable tradeoff for this project size.

**Where the AI helped most:**

- Config file boilerplate getting Jest, Playwright, and ESLint wired up correctly to be mostly mechanical and error prone to do from scratch.
- Auditing the files before they were committed and caught the ESLint config module format issue and the missing `serve` dependency before I ran anything.
- Expanding my ClickUp and Linear bullet points into structured research prose.

**Where I had to push back / catch issues:**

- The AI-generated `avatar` unit test had a wrong expectation for single-word names — expected `"TA"` but the function correctly produces `"T"`. I caught this when running tests locally and fixed it myself.
- Kept the lint warnings as is against the AI's suggestion to fix them which added browser globals to ESLint is the right long term fix, but not worth the noise in Sprint 1 while the codebase is moving fast.

---

### 2026-05-16 — Shazi

**Tooling:** Claude (Anthropic Opus 4.7) via Claude Code CLI. Connected to the project's Supabase instance (`HardCoders`) through the official Supabase MCP server (OAuth-authorized this session). Installed the `supabase/agent-skills` Postgres best-practices skill for the model.

**AI-assisted output that landed in the repo:**

- Repo audit against the PDF rubric — surfaced ~15 missing artifacts (`.gitignore` empty, no CI, no tests, no AI disclosure, single ADR, etc.).
- `.gitignore` content, expanded `README.md`, `CHANGELOG.md` (Keep-a-Changelog format, two backfilled releases).
- Recovery of a stale `git stash` onto a real branch.
- `Research/ShaziBidarian_Research.md` — expanded from my bullet-point notes.
- `SprintPlanning/Week7-SprintPlan.md` and a draft Week 8 plan — expanded from my planning notes. I corrected the sprint dates and committed Week 7 myself; the Week 8 file was a draft I dropped pending the next planning meeting.
- `docs/adr/0003-adopt-supabase-for-persistence.md` in MADR format with five considered alternatives (Supabase, Firebase, Cloudflare D1, localStorage, custom Workers).
- `supabase/schema.sql` — `profiles` / `teams` / `memberships`, RLS policies, the Life360-style 6-digit join-code trigger and `join_team_by_code` RPC.
- Three migrations applied to the live Supabase project: `initial_schema`, `harden_function_security`, `revoke_definer_grants_from_client_roles`. I reviewed each before authorizing the apply.
- `supabase/schema.md` — human-readable companion documenting each table, column, function, and policy.
- `js/config.js` and the script-tag wiring in `index.html`.
- This file.

**Decisions I made (not delegated):**

- Defer the user-tier model entirely — schema is tier-agnostic.
- Use a Life360-style 6-digit numeric join code, permanent, visible to anyone in the team.
- Splash flow on first signup is "Join a team [code] | Create a team [name]" (Option A from the design discussion).
- Bundle Supabase backend setup into the same work block as the splash signup feature.
- Keep `supabase/schema.sql` in the repo as the canonical schema document; keep it in sync with the deployed DB via tracked migrations.
- Approved each Supabase migration before apply; declined to delegate destructive operations.

**Where the AI helped most:**

- Boilerplate that follows a known format (MADR, Keep-a-Changelog, SQL RLS patterns) — drafting these from scratch would have taken hours.
- Surfacing rubric gaps I couldn't easily see because I was inside the work.
- Acting on the Supabase security advisor's output and translating the warnings into concrete SQL fixes.

**Where I had to push back:**

- Initial sprint-plan drafts overcommitted scope; I trimmed Week 8 and flagged Stephanie's double-booking myself.
- Initial schema kept `tier` columns the AI had suggested earlier — I removed them to scope down.
- Initial schema didn't catch the `INSERT teams → SELECT under RLS` gap until I asked for a re-check.
- The AI authored two ADRs (vanilla stack, join codes) that I later removed because neither was a real team decision — the vanilla stack is a course constraint, and the join-code choice was mine in a one-on-one chat, not a team-level call. I replaced them with [ADR-0001](adr/0001-web-app-with-dashboard-architecture.md) and [ADR-0002](adr/0002-mvp-scope-four-features.md), which document actual decisions captured in the May 5 and May 14 standup notes. I also renumbered the surviving ADRs into chronological order so the file numbers match the decision dates.

**Retro notes for me:**

- Most ADR / schema text was AI-drafted then reviewed. Before the quarter ends I want to write at least one ADR start-to-finish so I can prove I know the format unaided.
- Security hardening was advisor-driven (Supabase's linter), not pure AI suggestion. Worth distinguishing in future entries: AI-drafted vs. AI-acting-on-deterministic-tooling.

---

### 2026-05-12 to 2026-05-15 — Shazi *(backfilled)*

Covers AI use on work that predates the May 16 audit / cleanup session.

**Tooling:** Claude (Anthropic), via chat. No MCP / direct repo access during these sessions — AI output was reviewed and copied into the repo manually.

**v1 dashboard skeleton (`e59c3ca`, 2026-05-12, ~1,949 LoC across 24 files):**

- Used Claude to draft the modular CSS structure (one stylesheet per feature: `base`, `layout`, `rail`, `header`, `kpis`, `checkins`, `blockers`, `slots`, `mood-trend`, `activity`) and the matching JS feature modules under `js/features/`.
- AI-drafted the mock dataset in `data.js` — fictional teammate names, mood histories, check-ins, and blockers used as placeholder data while we work toward real persistence.
- AI-drafted an ADR titled "vanilla stack, no framework." *This ADR was later (2026-05-16) removed as inauthentic — the vanilla stack is a course constraint, not a decision the team weighed. See the May 16 entry above for the cleanup.*
- Reviewed and adjusted generated code before committing. The team reviewed the `shazi/barebones` branch at the May 12 standup before merge.

**Slot-toggle accessibility fix (`e301f4f`, 2026-05-14):**

- Used Claude to write the disabled-state / aria-attribute / click-handler-scoping fix on the when2meet grid in `css/slots.css` and `js/features/slots.js`.
- AI also drafted the commit message — that's why it's significantly more verbose than other commits in the history.

**Splash / auth WIP (stashed 2026-05-15, parked on `shazi/splash-wip` branch, since deleted):**

- Used Claude to scaffold `splash.html`, `css/splash.css`, `js/features/splash.js`, and `js/auth.js`.
- The auth flow there used a mock pattern (localStorage), not real Supabase. It has since been superseded by the May 16 backend work and will be rebuilt against the real schema in the next session.

**Common pattern across these sessions:**

- AI generated initial drafts; I (Shazi) reviewed before committing.
- AI had no repository write access — output was pasted in manually.
- The v1 PR (#2, ~1,949 LoC) was self-merged with no other human reviewer. This is a rubric violation I caught later; the Review Crew role in [Week 7 sprint plan](../SprintPlanning/Week7-SprintPlan.md) is the mitigation going forward, and >300-LoC AI-drafted PRs will get a second pair of eyes from now on.
