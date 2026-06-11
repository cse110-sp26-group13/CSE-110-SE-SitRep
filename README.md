# SE SitRep

SE SitRep is a lightweight dashboard for small Agile software teams. It helps answer the everyday team questions: *What is everyone working on? Have we checked in today? Are there blockers? How is the team feeling? When can we all meet? What GitHub work needs attention? How much AI assistance are we using?*

Inspired by tools like [Steady](https://runsteady.com/), Geekbot, Range, Jira dashboards, and ad hoc standup notes, SE SitRep brings daily standups, mood signals, GitHub issues and pull requests, meeting availability, calendar events, activity updates, and AI usage tracking into one low-friction team workspace.

> **Status:** v0.2.0 — authentication, dashboard, standups, GitHub sync, calendar, settings, AI tracking, tests, and CI are active. See [CHANGELOG.md](CHANGELOG.md) for release history.

---

## Live Site

SE SitRep is deployed through GitHub Pages:

https://cse110-sp26-group13.github.io/CSE-110-SE-SitRep/

End users should start with the live site. Developers should use this README for setup and the project wiki for deeper architecture and maintenance notes.

---

## Quick Start

The runtime is plain HTML/CSS/JS. There is no framework, no bundler, and no build step. The npm scripts are used for linting and tests only.

```bash
git clone https://github.com/cse110-sp26-group13/CSE-110-SE-SitRep.git
cd CSE-110-SE-SitRep

npm install

# Serve the static files
npx serve . -l 3000
```

Then open:

```text
http://localhost:3000/splash.html
```

You can also use any static server, such as:

```bash
python3 -m http.server 8000
```

If using Python’s server, open:

```text
http://localhost:8000/splash.html
```

The authenticated dashboard is `index.html`. Visiting it without a session redirects to `splash.html` through the client-side auth gate in `js/auth-guard.js`.

Supabase is preconfigured in `js/config.js` with a publishable/anon key. No local `.env` file is required for the client app. Access control is handled through Supabase Auth and Row Level Security.

---

## Demo Account

A demo account may be available for quick testing:

```text
email:    demo@hi.com
password: Demo1234
```

If the demo account is unavailable, create a new account from `splash.html`, then create or join a circle.

---

## Running Tests and Lint

```bash
npm run lint
npm run test:unit
npm run test:e2e
npm test
```

Testing stack:

- **ESLint** for linting
- **Vitest** with jsdom for unit tests
- **Playwright** for end-to-end tests

The Playwright tests use a stubbed auth/database layer, so they verify UI flows without requiring a live Supabase session.

---

## Features

### Dashboard

The dashboard gives a team-level snapshot of the current circle. It includes KPI cards, standup completion, mood signals, GitHub issue summaries, recent activity, notifications, and links into the main workflows.

Implemented mainly through:

- `index.html`
- `js/pages/dashboard.js`
- `js/features/kpis.js`
- `js/features/mood-trend.js`
- `js/features/activity.js`
- `js/features/notifications.js`

### Daily Standups

Team members can post, edit, and delete their daily standup updates. The standup page tracks what each person worked on, what they are doing next, and whether they need cover or support.

Implemented mainly through:

- `standup.html`
- `js/pages/standup.js`
- `js/features/checkins.js`

### Team Mood

SE SitRep tracks team mood as part of the standup workflow. The dashboard and standup page show mood trends, team wellness signals, and recent mood history.

Implemented mainly through:

- `js/features/checkins.js`
- `js/features/mood-trend.js`

### Meeting Availability

The standup page includes a when2meet-style availability grid. Team members can mark when they are available, and the app shows overlap across the team.

Implemented mainly through:

- `standup.html`
- `js/features/slots.js`
- `css/slots.css`

### GitHub Issues / Git-Glance

The Issues page lets users sync GitHub repositories, view issues, filter by status and severity, create GitHub issues, view issue details, comment, close or reopen issues, and unsync repositories.

Implemented mainly through:

- `issues.html`
- `js/pages/issues.js`
- `js/features/blockers.js`
- `js/features/github/github-client.js`
- `js/features/github/github-issues.js`
- `js/features/github/github-sync.js`

GitHub repository data is stored per active circle in local storage. A GitHub personal access token is optional and is stored only in session storage for the current browser session.

### Pull Requests

The Issues page also supports GitHub pull request viewing and management. Users can inspect synced PRs, filter by status, view details, and use PR-related GitHub actions where enabled.

Implemented mainly through:

- `issues.html`
- `js/features/pull-requests.js`
- `js/features/github/github-pulls.js`

Current note: PR list functionality is active, but the New PR button is currently commented out in `issues.html`. The PR creation code still exists so the feature can be restored later.

### Calendar

The Calendar page supports month, week, and timeline views for team events. It also supports custom groups and team member visibility.

Implemented mainly through:

- `calendar.html`
- `js/pages/calendar.js`

### AI Agents Tracking

The AI Agents page lets teams log AI tool usage, including agent/model, task, token usage, estimated cost, PR/commit link, and whether the output was reviewed. The dashboard also includes AI usage signals.

Implemented mainly through:

- `ai-agents.html`
- `js/pages/ai-agents.js`
- `js/features/ai-agents.js`
- `css/ai-agents.css`

AI token and cost estimates are approximate and based on hard-coded rates that may become stale over time.

### Circles and Settings

Users can create or join circles, switch active circles, update account settings, change display name/password, choose a theme, and adjust notification preferences.

Implemented mainly through:

- `splash.html`
- `settings.html`
- `js/auth.js`
- `js/auth-guard.js`
- `js/pages/settings.js`
- `js/features/circle-switcher.js`

---

## Current Status

| Area | State |
| --- | --- |
| Splash/auth signup and login | Live against Supabase |
| Create/join circle flow | Live |
| Dashboard | Live |
| Daily standups | Live |
| Team mood | Live |
| Meeting availability | Live |
| GitHub issue sync | Live |
| Pull request viewing | Live |
| New PR button | Commented out, code preserved |
| Calendar | Live |
| Settings | Live |
| Notification preferences | Live |
| AI Agents tracking | Live |
| Tests and CI | Live |

---

## Tech Stack

- Vanilla HTML
- Vanilla CSS
- Vanilla JavaScript
- Supabase Auth
- Supabase Postgres with Row Level Security
- GitHub REST API
- Vitest
- Playwright
- ESLint
- GitHub Actions
- GitHub Pages

This project intentionally does not use a frontend framework or bundler because of the CSE 110 project constraints.

---

## Project Structure

```text
.
├── splash.html              # Auth and onboarding
├── index.html               # Dashboard
├── standup.html             # Daily standup, mood, availability
├── issues.html              # GitHub issues and pull requests
├── calendar.html            # Calendar and timeline
├── settings.html            # Account, circles, preferences
├── ai-agents.html           # AI usage tracking
├── css/                     # Base, page, and feature styles
├── js/
│   ├── config.js            # Supabase client config
│   ├── supabaseClient.js    # Supabase bootstrap
│   ├── auth.js              # Auth helpers
│   ├── auth-guard.js        # Client-side route protection
│   ├── db.js                # Supabase data layer
│   ├── state.js             # Client-side local/session state
│   ├── selectors.js         # Derived data helpers
│   ├── utils.js             # Shared utilities
│   ├── nav.js               # Shared navigation behavior
│   ├── theme.js             # Theme behavior
│   ├── features/            # Reusable feature modules
│   │   └── github/          # GitHub API client/sync/issue/PR helpers
│   └── pages/               # Per-page orchestration scripts
├── supabase/                # Schema, migrations, and database docs
├── docs/
│   ├── adr/                 # Architectural Decision Records
│   ├── wireframes/          # Design prototypes and screenshots
│   ├── AI_USAGE.md          # GenAI disclosure log
│   ├── CALENDAR.md          # Calendar feature documentation
│   └── UserStories.md       # User stories
├── tests/                   # Unit and E2E tests
├── .github/workflows/       # CI/CD workflow
├── CHANGELOG.md             # Release history
└── README.md
```

---

## Architecture Overview

SE SitRep is a static multi-page web app. Each major surface has a root-level HTML file and a matching page orchestrator in `js/pages/`.

Shared behavior lives in `js/features/`, while persistence and state helpers live in `js/db.js`, `js/state.js`, and `js/selectors.js`.

The app uses global browser scripts instead of ES modules or a bundler. Script order matters, and cross-file globals are documented in `eslint.config.mjs`.

Core state comes from two places:

1. **Supabase** for authenticated team data such as teams, memberships, profiles, standups, availability, calendar events, activity, and AI sessions.
2. **Local/session storage** for client-side GitHub sync state, active circle selection, preferences, and temporary GitHub tokens.

For deeper implementation notes, see the project wiki.

---

## GitHub Integration

GitHub integration uses the GitHub REST API directly through `fetch()`.

Users can sync repositories by owner/repo name or GitHub URL. Public repos can be synced without a token, but users can provide a personal access token for private repositories or higher rate limits.

GitHub sync state is scoped to the active circle and stored locally. Tokens are stored only in session storage.

---

## Supabase Integration

Supabase is used for:

- Authentication
- Profiles
- Teams/circles
- Memberships
- Standups
- Availability
- Calendar events and groups
- Activity feed events
- AI usage sessions

The client uses a public anon key, and access control is enforced through Supabase Row Level Security policies.

See:

- `supabase/`
- `supabase/schema.md`
- `docs/adr/0003-adopt-supabase-for-persistence.md`

---

## Process and Documentation

This project is the SE SitRep deliverable for CSE 110, Spring 2026, Group 13. The course emphasizes process as well as product, so the repository includes design records, sprint planning, standups, retrospectives, research, wireframes, tests, CI, and AI usage documentation.

Important docs:

- `docs/AI_USAGE.md`
- `docs/UserStories.md`
- `docs/CALENDAR.md`
- `docs/adr/`
- `docs/wireframes/`
- `CHANGELOG.md`

---

## AI Usage Disclosure

This project includes a GenAI disclosure log in:

```text
docs/AI_USAGE.md
```

The AI usage log documents where AI tools assisted with brainstorming, code changes, tests, documentation, debugging, and review. Human team members remained responsible for reviewing, accepting, editing, and integrating AI-assisted work.

---

## Known Limitations

- The New PR button is currently commented out, although PR creation code is preserved.
- AI token/cost estimates are approximate and may become outdated.
- E2E tests use stubbed auth/database behavior rather than a real Supabase session.
- Some schema documentation may lag behind newer migrations.
- GitHub API rate limits may apply, especially without a personal access token.
- The demo account should be confirmed before relying on it for grading or presentations.
- `package.json` version and release tag/version should be checked for consistency before final release.

---

## Next Steps

Future developers may want to:

- Re-enable and fully verify New PR creation.
- Keep Supabase schema docs synchronized with migrations.
- Add clearer end-user documentation.
- Improve GitHub sync resilience and rate-limit handling.
- Move AI model pricing into a more maintainable configuration.
- Expand feature-specific wiki pages.

---

## Status Video 1

https://www.youtube.com/watch?v=428K7RsjKG8

## Status Video 2

https://youtu.be/qFlAKpuZsvc
---

## Team

Group 13 — Aaron Thung, Aidan Rikic, Andrew Lopez, Jeong Min Park, Jeremy Lim, Ophir Maor, Shazi Bidarian, Stephanie Yan, Yang Zou.

---

## License

Coursework — not yet licensed for external use.
