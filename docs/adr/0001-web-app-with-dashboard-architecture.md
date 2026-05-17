---
status: accepted
date: 2026-05-05
deciders: Group 13 (May 5 standup)
---

# Web app form factor with Dashboard + Daily Digest architecture

## Context

The CSE 110 rubric allows several product forms — traditional web app, PWA, wrapped mobile (CapacitorJS), wrapped desktop (ElectronJS), Chrome / VS Code / Slack extensions, or REST endpoints. The team had to pick one and pair it with a top-level architecture.

The decision happened at the **May 5 standup** ([StandupMeetings/May5-MeetingNotes.md](../../StandupMeetings/May5-MeetingNotes.md)):

> **"What are we building? 1. Web"**
>
> **Architecture: Dashboard** — Layout options, customizable views, leveled views.
>
> **Daily Digest (Stand Up)** — Everything missed.

## Decision

- **Form factor:** web app, deployed as a static site.
- **Top-level architecture:** two views.
  - A **Dashboard** for the live team state — KPIs, check-ins, blockers, availability, mood.
  - A **Daily Digest / Standup** view that surfaces what was missed since the user last looked in.

## Consequences

- No mobile install path. Mobile is "open the URL in a browser" — acceptable for the small-team use case the product targets.
- Static deployment (GitHub Pages or Cloudflare Pages) keeps infrastructure off our plate.
- Dashboard and Daily Digest are separate concerns. State and routing have to accommodate both from the start — the modular feature folders under `js/features/` reflect this split.

## Confirmation

- `index.html` is the dashboard surface.
- The digest concept currently lives in the activity feed (`js/features/activity.js`) and grows as the standup feature work lands ([SprintPlanning/Week7-SprintPlan.md](../../SprintPlanning/Week7-SprintPlan.md)).
- May 5 standup notes are the primary team record.

## What this doesn't cover

Not addressed here: persistence (see [ADR-0003](0003-adopt-supabase-for-persistence.md)), MVP feature scope (see [ADR-0002](0002-mvp-scope-four-features.md)), or specific feature designs (those live in [docs/MVP/Minimum Value Product.md](../MVP/Minimum%20Value%20Product.md)).
