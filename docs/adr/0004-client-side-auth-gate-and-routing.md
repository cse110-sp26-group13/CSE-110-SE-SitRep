---
status: accepted
date: 2026-05-17
deciders: Shazi (with TA-approved Supabase backend per ADR-0003)
---

# Client-side auth gate and splash routing

## Context and Problem Statement

[ADR-0003](0003-adopt-supabase-for-persistence.md) committed us to Supabase for auth + persistence. The dashboard at [index.html](../../index.html) currently renders mock data with no auth gate — anyone visiting can see fake KPIs and the team's standups.

Now that the backend (`profiles`, `teams`, `memberships`, RLS, `join_team_by_code` RPC) is deployed, we need to decide:

1. **Where the new user lands** — login page first, or dashboard first?
2. **How the dashboard enforces auth** — server middleware (we have none), a route in a router (we have none), or a small client-side guard?
3. **How users go from "I have an account" to "I'm in the dashboard"** — a single onboarding screen, or a wizard?

Constraints carried over from earlier decisions:
- Static site, no build step, no framework (course rubric).
- No new dependencies without TA approval.
- Must work on GitHub Pages / Cloudflare Pages.
- **Existing `index.html` and its filename must stay put** — multiple feature branches (issues, calendar, standup, mood trend) are currently in flight against it. Renaming would force-merge-conflict every open branch on the team.

## Decision Drivers

* Course constraint: vanilla HTML/CSS/JS, no router framework.
* Static hosting on GitHub Pages — no server-side redirects available.
* Existing `index.html` is the live integration target for every active feature branch; touching its filename is off the table.
* Time pressure: this is a one-sprint feature; the simplest viable structure wins.
* Reversibility: should be easy to swap in a real router later if the app grows.

## Considered Options

* **A. Keep `index.html` as the dashboard, add `splash.html` as a sibling; small JS guard on the dashboard bounces unauthenticated visitors to splash.**
* **B. Single-page app with hash routing (`#/splash`, `#/dashboard`) inside `index.html`.**
* **C. No splash page — embed the auth form inside the dashboard, hide it once authenticated.**

## Decision Outcome

Chosen option: **A — sibling pages with a client-side guard**, because:

- Zero disruption to the other feature branches: `index.html` stays at the same path, all existing `<script src="js/...">` references keep working, and teammates can keep coding against `index.html` without merge conflicts.
- Maps to one URL per state, which is what the team and a future code reviewer expect.
- The "guard" is ~15 lines of JavaScript that calls `supabase.auth.getSession()` and `window.location.replace('/splash.html')` if unauthenticated.
- Easy to evolve: if we later add a router or extract the splash into its own framework page, the contract (`splash.html` for unauthenticated, `index.html` for authenticated) stays the same.
- Plays cleanly with Supabase's default `persistSession: true` — the session sits in localStorage, so reloads stay authenticated without us writing any storage code.

### Consequences

* **Good** — clear separation of concerns; the dashboard never has to render its own auth UI.
* **Good** — both pages are independently loadable, so a teammate can iterate on the splash CSS without touching the dashboard.
* **Good** — the guard is testable in isolation and trivial to remove if we ever decide the dashboard should have a public read-only view.
* **Good** — none of the active feature branches need to rebase or rename anything to pick this up; they just gain an auth-gated dashboard once the guard lands on `main`.
* **Bad** — two pages means two `<script>` tag lists to keep in sync (specifically the Supabase CDN + `js/config.js` + `js/supabaseClient.js`). Mitigation: document the script-tag ordering in [supabase/schema.md](../../supabase/schema.md).
* **Bad** — the guard runs after page load, so there's a brief flicker where unauthenticated visitors see dashboard chrome before the redirect fires. Mitigation: small enough to ignore in v0.2; if it becomes painful, wrap the body in a `hidden` div and only unhide after the guard passes.
* **Neutral** — the dashboard still renders mock data this PR. Wiring real teammate data is a follow-up; the guard exists to make that future work safe to ship.

### Confirmation

Decision is confirmed by:
- New `splash.html` containing the auth and create-or-join-circle flow.
- New `js/auth-guard.js` loaded at the top of `index.html` (before `data.js`), bouncing unauthenticated or team-less users to `splash.html`.
- A documented "create or join a circle" flow on `splash.html` that uses the new `create_team(p_name)` RPC and the existing `join_team_by_code(p_code)` RPC.
- New unit tests covering the error-mapping helper in [tests/auth.test.html](../../tests/auth.test.html).
- `index.html`'s filename is unchanged, preserving compatibility with every in-flight feature branch.

## Pros and Cons of the Options

### B. Single-page app with hash routing

* **Good** — one URL, conceptually cleaner.
* **Bad** — implementing routing without a framework is non-trivial and goes against the course constraint of "vanilla, no framework" (writing our own router is just a framework we maintain).
* **Bad** — the dashboard's existing modular scripts would have to be refactored to be initializable from a route handler. Out of scope for this sprint.
* **Bad** — same merge-conflict risk for the active feature branches as a rename would cause.

### C. No splash page; embed auth in the dashboard

* **Good** — fewest files.
* **Bad** — the dashboard would need to conditionally render the entire auth/onboarding flow inside itself, which mixes concerns that the rubric (and any future maintainer) would want kept separate.
* **Bad** — the dashboard's mock-data initialization races against the auth flow.
* **Bad** — first impression for a new user is a half-rendered dashboard with a modal over it, instead of a clean welcome page.

## More Information

Revisit this decision if:
- We adopt a router framework with TA approval (e.g., to handle settings, profile, etc.).
- We need to support deep-linking into specific dashboard tabs from outside the app.
- The guard's brief flicker becomes a UX complaint.

Related work:
- [docs/wireframes/splash.md](../wireframes/splash.md) — the wireframe this ADR implements
- [supabase/schema.sql](../../supabase/schema.sql) — auth-related schema and RPCs
- [supabase/schema.md](../../supabase/schema.md) — schema explanation (will be updated with `create_team` RPC)
- [ADR-0003](0003-adopt-supabase-for-persistence.md) — the decision to use Supabase that this builds on
