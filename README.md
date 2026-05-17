# SE SitRep

A lightweight dashboard for small Agile software teams to answer the everyday questions: *What is everyone doing? Have we checked in today? Are there blockers? When can we all meet?*

Inspired by tools like [Steady (formerly Status Hero)](https://runsteady.com/), Geekbot, and Range, with a focus on low-friction daily standups, blocker tracking, mood/burnout signals, and team availability.

> **Status:** early prototype (v0.1.1). See [CHANGELOG.md](CHANGELOG.md) for release history.

## Quick start

This is a static site — no build step required.

```bash
git clone https://github.com/cse110-sp26-group13/CSE-110-SE-SitRep.git
cd CSE-110-SE-SitRep
open index.html        # or just double-click index.html
```

For local development with live reload, any static server works (e.g. `python3 -m http.server 8000`).

## Features (current)

- **Daily check-ins** — yesterday / today / blockers per teammate
- **Blockers panel** — severity + status filtering
- **Availability grid** — when2meet-style slot picker, scoped to the current user
- **Mood trend** — 7-day rolling mood visualization
- **KPI strip** — team summary metrics at a glance
- **Activity feed** — recent updates across the team

## Tech stack

Vanilla HTML, CSS, and JavaScript — no framework, no build step. This is a course constraint, not a team decision (per the CSE 110 Sp 26 project rubric). Backend persistence lives in Supabase ([docs/adr/0003-adopt-supabase-for-persistence.md](docs/adr/0003-adopt-supabase-for-persistence.md)).

## Project structure

```
.
├── index.html              # App shell
├── data.js                 # Mock team data
├── css/                    # One stylesheet per feature
├── js/
│   ├── app.js              # Bootstraps the dashboard
│   ├── state.js            # In-memory state
│   ├── selectors.js        # Derived state helpers
│   ├── utils.js            # Shared utilities
│   └── features/           # Per-feature modules (checkins, blockers, slots, ...)
├── docs/
│   ├── adr/                # Architectural Decision Records (MADR format)
│   ├── MVP/                # MVP scope and screenshots
│   └── UserStories.md
├── Research/               # Per-teammate research notes on prior art
├── StandupMeetings/        # Captured standup notes
└── CHANGELOG.md
```

## Process

This project is the SE SitRep deliverable for **CSE 110 (Spring 2026)**, Group 13. The course emphasizes process over product: sprint planning, standups, retros, ADRs, and tests are all tracked in this repository. See [docs/](docs/) and [StandupMeetings/](StandupMeetings/).

- **Versioning:** [SemVer](https://semver.org/)
- **Commit style:** [Conventional Commits](https://www.conventionalcommits.org/)
- **Architectural decisions:** [MADR](https://adr.github.io/madr/) under [docs/adr/](docs/adr/)

## Team

Group 13 — Aaron Thung, Aidan Rikic, Andrew, Jeong Min Park, Jeremy, Ophir, Shazi Bidarian, Stephanie Yan, Yang Zou.

## License

Coursework — not yet licensed for external use.
