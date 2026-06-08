# SE SitRep

A lightweight dashboard for small Agile software teams to answer the everyday questions: *What is everyone doing? Have we checked in today? Are there blockers? When can we all meet?*

Inspired by tools like [Steady (formerly Status Hero)](https://runsteady.com/), Geekbot, and Range, with a focus on low-friction daily standups, blocker tracking, mood/burnout signals, and team availability.

> **Status:** v0.2.0 — splash/auth flow live, dashboard wired to Supabase. See [CHANGELOG.md](CHANGELOG.md) for release history.

## Quick start

The runtime is plain HTML/CSS/JS — no bundler, no build step. The npm scripts only exist for linting and tests; the site itself runs straight from the files.

```bash
git clone https://github.com/cse110-sp26-group13/CSE-110-SE-SitRep.git
cd CSE-110-SE-SitRep

# Serve the static files (any static server works)
npx serve .                      # or: python3 -m http.server 8000
```

Open `http://localhost:3000/splash.html` (or whatever port your server uses). [index.html](index.html) is the authenticated dashboard — visiting it without a session bounces you to [splash.html](splash.html) via the client-side auth gate ([js/auth-guard.js](js/auth-guard.js)). Sign up with any email + password, then create or join a circle to land on the dashboard.

**Demo account** — skip the signup and use:

```
email:    demo@hi.com
password: Demo1234
```

Already a member of a circle with seeded check-ins, blockers, and activity, so the dashboard lands populated.

Supabase is preconfigured in [js/config.js](js/config.js) (publishable/anon key — RLS enforces access on the backend); no `.env` step is required.

### Running tests and lint

```bash
npm install        # one-time, installs eslint / vitest / playwright
npm run lint
npm run test:unit  # vitest
npm run test:e2e   # playwright
```

## Current status

What's actually wired up vs. what's still in motion as of v0.2.0:

| Area | State |
| --- | --- |
| Splash / auth (signup, login, password strength, create / join circle) | **Live** against Supabase |
| Dashboard shell, rail navigation, theme toggle, circle switcher | **Live** |
| Check-ins, blockers, availability slots, mood trend, KPI strip, activity feed | **Live** — read/write against Supabase per-circle |
| Settings page (display name, password) | **Live** |
| GitHub Issues sync | **Live** — pulls issues from any public repo via the sync modal in [issues.html](issues.html); PAT optional for higher rate limits / private repos. Synced issues live in `sessionStorage`, comments on them are not yet persisted ([js/features/blockers.js:267](js/features/blockers.js#L267)) |
| Notification preferences | **Live** — toggles in [settings.html](settings.html) (standup reminders, mentions, daily digest) feed the dashboard notification center and persist through `localStorage` |
| Standup page, calendar page | **In progress** |

## Features

- **Daily check-ins** — yesterday / today / blockers per teammate
- **Blockers panel** — severity + status filtering, GitHub Issues sync
- **Availability grid** — when2meet-style slot picker, scoped to the current user
- **Mood trend** — 7-day rolling mood visualization
- **KPI strip** — team summary metrics at a glance
- **Activity feed** — recent updates across the team
- **Circles** — create or join with a 6-digit code; switch between circles from the rail

## Tech stack

Vanilla HTML, CSS, and JavaScript — no framework, no build step. This is a course constraint, not a team decision (per the CSE 110 Sp 26 project rubric). Backend persistence lives in Supabase ([docs/adr/0003-adopt-supabase-for-persistence.md](docs/adr/0003-adopt-supabase-for-persistence.md)).

## Project structure

```
.
├── splash.html, index.html, standup.html,    # Per-page HTML at the repo root
│   issues.html, calendar.html, settings.html
├── data.js                 # Seed data used only as a fallback when no circle is loaded
├── css/                    # One stylesheet per feature
├── js/
│   ├── supabaseClient.js   # Supabase bootstrap (window.sbClient)
│   ├── auth.js             # Auth helpers with normalized error mapping
│   ├── auth-guard.js       # Client-side route gate (redirects to splash)
│   ├── db.js               # Persistence layer (Supabase reads/writes)
│   ├── state.js            # In-memory state
│   ├── selectors.js        # Derived state helpers
│   ├── utils.js            # Shared utilities
│   ├── nav.js, theme.js    # Rail navigation, theme toggle
│   ├── features/           # Per-feature modules (checkins, blockers, slots, ...)
│   └── pages/              # Per-page entrypoints
├── supabase/               # Schema, RLS policies, migrations
├── docs/
│   ├── adr/                # Architectural Decision Records (MADR format)
│   ├── wireframes/         # Pre-implementation design notes (incl. MVP/ scope + screenshots)
│   ├── Research/           # Per-teammate research notes on prior art
│   ├── StandupMeetings/    # Captured standup notes
│   ├── SprintPlanning/     # Sprint plans
│   ├── Retrospective/      # Sprint retrospectives
│   ├── UserStories.md      # User stories / personas
│   └── AI_USAGE.md         # GenAI usage disclosure
├── tests/                  # Vitest unit tests + Playwright e2e specs
├── .github/workflows/      # CI: lint, unit tests, e2e, deploy
├── admin/feedback/         # Peer reviews (incoming and outgoing)
└── CHANGELOG.md
```

## Process

This project is the SE SitRep deliverable for **CSE 110 (Spring 2026)**, Group 13. The course emphasizes process over product: sprint planning, standups, retros, ADRs, and tests are all tracked in this repository. See [docs/](docs/) and [docs/StandupMeetings/](docs/StandupMeetings/).

- **Versioning:** [SemVer](https://semver.org/)
- **Commit style:** [Conventional Commits](https://www.conventionalcommits.org/)
- **Architectural decisions:** [MADR](https://adr.github.io/madr/) under [docs/adr/](docs/adr/)

## Status Video 1
https://www.youtube.com/watch?v=428K7RsjKG8

## Team

Group 13 — Aaron Thung, Aidan Rikic, Andrew, Jeong Min Park, Jeremy, Ophir, Shazi Bidarian, Stephanie Yan, Yang Zou.

## License

Coursework — not yet licensed for external use.
