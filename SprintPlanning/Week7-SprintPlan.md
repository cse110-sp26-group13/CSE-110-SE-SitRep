# Sprint Planning — Week 7

**Dates:** Thurs May 14, 2026 – Tues May 19, 2026
**Sprint type:** First full build sprint (following the design/prototyping sprint)
**Team:** Group 13

## Sprint Goal

Ship the four MVP features identified in [docs/MVP/Minimum Value Product.md](../docs/MVP/Minimum%20Value%20Product.md) — GitHub-issues tracker, calendar, daily standup, and onboarding — at a v1 quality bar, working off the barebones dashboard skeleton merged in [v0.1.0](../CHANGELOG.md).

## Process Reminders (from planning)

- **Make a new branch per feature** you're working on. Naming pattern: `<name>/<feature>` (e.g. `adam/calendar`, `shazi/onboarding`).
- Per feature: decide as a sub-team whether it's easier to **split into multiple branches** (one per contributor) **or share one feature branch**. Either is fine, just be deliberate.
- **Document EVERYTHING.** A large portion of the grade is on capturing what you've done. Notes can be messy — polish later. Push notes incrementally; don't batch them.
- Anything >300 LoC goes through a PR with **review from another teammate** (not self-merge — see retro item from v0.1.0).
- Use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`, `docs:`.

## Features in Scope

### 1. GitHub Issues Tracker
- **Owners:** Andrew, Jeong, Ophir (3–4)
- **Branch(es):** TBD — sub-team to decide split vs. shared branch
- **Approach:** Two versions, user picks which is utilized.
  - **v1 — in-dashboard tracker** *(already mostly built in [v0.1.0](../CHANGELOG.md))*
    - Existing blockers/check-in panels are the foundation.
    - **Add start date and due date** to each tracked item ([data.js](../data.js) + UI).
    - Surface dates in the list + detail view.
  - **v2 — GitHub Issues API integration**
    - Pull live issue data from a connected GitHub repo.
    - Flow: user signs in → connects their GitHub account → picks repo(s) → issues stream into the dashboard.
    - **Open question:** auth method. OAuth via Cloudflare Worker? Personal Access Tokens? GitHub Apps? Needs an ADR.
- **Acceptance criteria:**
  - v1: can add an issue with start/due dates, see them in the panel, filter as before.
  - v2: at least one real GitHub repo's issues render in the dashboard.

### 2. Calendar
- **Owner:** Stephanie (looking for a +1)
- **Branch:** `stephanie/calendar`
- **Scope:**
  - Track both individual and team project timelines.
  - Aligns with the issues tracker — issue start/due dates plot onto the calendar.
  - **Hard-code issues with start/end dates** in [data.js](../data.js) for now so the calendar has something to render before the tracker API lands.
  - "Request extension" affordance on calendar items (lightweight — just a button + event, no backend yet).
- **Dependency:** issues tracker v1 (for the date fields).
- **Acceptance criteria:**
  - Calendar view renders the next ~2 weeks with hard-coded issue blocks.
  - Clicking an issue block opens the issue detail modal already used by blockers/checkins.

### 3. Daily Standup
- **Owners:** Yang, Stephanie (2)
- **Branch:** `feature/daily-standup` *(already in use — PRs #3, #5, #6 have landed)*
- **Two pieces:**
  - **Team standup** — aggregated view across all teammates.
  - **Personal standup** — each user posts their own progress.
- **Required fields:** yesterday / today / blockers / daily mood.
- **Behavior:** a posted standup appears on every teammate's dashboard activity feed.
- **Acceptance criteria:**
  - User can post a standup from the dashboard.
  - The post shows up on other users' views (in mock-data form for now).
  - Mood entry feeds the existing mood-trend visualization.

### 4. Onboarding
- **Owner:** Shazi (1)
- **Branch:** `shazi/splash-wip` 
- **Scope:**
  - Account creation
  - User login
  - Splash page
- **Status:** scaffolding exists in [splash.html](../splash.html), [css/splash.css](../css/splash.css), [js/features/splash.js](../js/features/splash.js), [js/auth.js](../js/auth.js). Not yet wired into [index.html](../index.html) routing.
- **Acceptance criteria:**
  - Visiting the site lands on the splash page when not signed in.
  - "Sign in" puts you on the dashboard; "sign out" returns you to splash.
  - Current user persists across reloads (localStorage acceptable for v1).
- **Open question:** is this client-only (mock auth) or do we need a real identity provider? Real auth implies a Supabase/Cloudflare dependency — defer to week 8 planning.

### 5. Review Crew *(role, not feature)*
- **Members:** Shazi, Aidan, + others (target 3 minimum, as many as possible)
- **What this means:** people designated to do PR reviews this sprint so PRs don't stall and >300-LoC batches actually get a second pair of eyes (PDF requirement).
- **Action:** anyone willing to join, drop your name in the next standup. Reviewers commit to looking at PRs within 24 hours of being requested.

## Risks / Open Questions

- **Self-merging large PRs.** PR #2 (v1, ~1,949 LoC) was opened and merged by the same person. PDF rubric requires "evaluation by another human." The review-crew item above is the mitigation — make it real this sprint.
- **GitHub API auth strategy for issues-tracker v2** — needs an ADR before implementation starts.
- **Calendar ↔ Issues coupling** — calendar depends on the issues tracker exposing dated items. If issues v1 slips, calendar should still render off hard-coded data.
- **Onboarding auth scope** — pure client-side mock vs. real provider is a fork. Pick one early, don't half-build.
- **Standup cadence** — PDF requires 3×/week; we've been averaging ~2. Re-commit to Mon/Wed/Fri or equivalent.

## Definition of Done (sprint-wide)

- Code is on `main` via a reviewed PR.
- Conventional Commit messages.
- Feature is reachable from the dashboard (not orphan files).
- At least one note in [StandupMeetings/](../StandupMeetings/) referencing the work.
- CHANGELOG `[Unreleased]` updated.

