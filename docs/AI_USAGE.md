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
