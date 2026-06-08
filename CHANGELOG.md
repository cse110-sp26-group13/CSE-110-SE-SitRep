# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Consistent Color Customization:** Unified the color picking experience for all categories in the calendar legend.
    - Added direct color picking for "Team" and "Personal" categories by clicking their swatches.
    - Added direct color picking for **Custom Groups** by clicking their swatches, bypassing the edit modal for quick adjustments.
    - Anchored color pickers to the legend swatches for better browser positioning and visibility.
- **Refined Legend Interactions:**
    - Clicking the "Personal" label now toggles its visibility in the calendar view.
    - Clicking the "Team" label now toggles the team members list visibility.
    - Clicking a group name label continues to open the group edit modal.

### Changed
- Reordered the calendar legend to show custom groups above system categories (Team/Personal) for better feature prominence. (Note: User later requested to restore original order, which was done).
- Optimized `renderCalLegend` in `js/pages/calendar.js` using event delegation and consolidated trigger logic for better maintainability.
- Persisted custom group color changes directly from the legend swatch interaction.

## [0.2.0] - 2026-05-18

### Added
- Splash page with email/password signup, login, and create-or-join "circle" flow ([splash.html](splash.html), [css/splash.css](css/splash.css), [js/features/splash.js](js/features/splash.js))
- Supabase client bootstrap ([js/supabaseClient.js](js/supabaseClient.js)) and auth helpers with normalized error mapping ([js/auth.js](js/auth.js))
- Client-side auth gate ([js/auth-guard.js](js/auth-guard.js)) bouncing unauthenticated visitors from [index.html](index.html) to splash; documented in [ADR-0004](docs/adr/0004-client-side-auth-gate-and-routing.md)
- Field-level signup validation (first/last name required, email shape, password strength meter with 4 requirement checks)
- Resilient signup error handling: empty `identities` heuristic for "email already registered", graceful "check your inbox" state when email confirmation is on, friendly rate-limit messages
- `create_team(p_name)` Supabase RPC for atomic team + lead-membership insert, resolving the documented `team_member_read` RLS gap ([supabase/schema.sql](supabase/schema.sql), [supabase/schema.md](supabase/schema.md))
- Pre-implementation splash wireframe per the course rubric ([docs/wireframes/splash.md](docs/wireframes/splash.md))
- Unit tests for `mapAuthError` and the 6-digit join-code regex — 22 cases, runnable in Node (CI) and in the browser ([tests/auth.test.js](tests/auth.test.js), [tests/auth.test.html](tests/auth.test.html))
- CI on GitHub Actions: ESLint, Vitest unit tests, and Playwright e2e tests ([.github/workflows/ci.yml](.github/workflows/ci.yml))
- Research notes for Notion, Slack, and personal dashboard / sticky-note patterns ([Research/shaziResearch.md](Research/shaziResearch.md))

### Changed
- [index.html](index.html) loads `js/supabaseClient.js` and `js/auth-guard.js` ahead of the dashboard scripts, gating dashboard access on a valid session + at least one team membership

### Database
- Migration `add_create_team_rpc` applied to the HardCoders Supabase project
- [supabase/schema.md](supabase/schema.md) updated to document the new RPC and drop the previously-documented "INSERT-then-SELECT" workaround

## [0.1.1] - 2026-05-14

### Fixed
- Restricted when2meet slot toggles so only the current user can change their own availability; added `aria-disabled` and clearer aria-labels for other teammates' cells.

## [0.1.0] - 2026-05-12

Initial barebones dashboard skeleton.

### Added
- Dashboard shell with left navigation rail and header ([index.html](index.html))
- KPI strip showing team summary metrics
- Daily check-ins panel (yesterday / today / blockers per teammate)
- Blockers panel with severity and status filtering
- When2meet-style availability grid for scheduling
- Mood trend visualization (7-day rolling)
- Recent activity feed
- Mock team dataset for local development ([data.js](data.js))
- Modular CSS architecture, one stylesheet per feature ([css/](css/))
- Modular JS architecture with per-feature modules under [js/features/](js/features/)

[Unreleased]: https://github.com/cse110-sp26-group13/CSE-110-SE-SitRep/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/cse110-sp26-group13/CSE-110-SE-SitRep/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/cse110-sp26-group13/CSE-110-SE-SitRep/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/cse110-sp26-group13/CSE-110-SE-SitRep/releases/tag/v0.1.0
