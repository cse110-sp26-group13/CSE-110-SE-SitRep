---
status: accepted
date: 2026-05-14
deciders: Group 13 (May 14 standup)
---

# MVP scope — four features for v1

## Context

After two weeks of brainstorming and competitive research (per-teammate notes in [Research/](../../Research/) covering Notion, Slack, Linear, Range, GeekBot, ClickUp, Discord), the team needed to pick a focused v1 rather than try to build everything at once.

The decision was made at the **May 14 standup** ([StandupMeetings/May14_StandupMeeting.md](../../StandupMeetings/May14_StandupMeeting.md)):

> **Choosing MVP** — We discussed about which feature must be in our project and chose the features for our MVP.
>
> **Features of MVP:** Daily Standup, Onboarding, Calendar, GitHub issues tracker.
>
> These are the features we must have, and we are trying to split the team, so each small team can work on each feature.

Per-feature scope, owners, and v1/v2 splits live in [docs/MVP/Minimum Value Product.md](../MVP/Minimum%20Value%20Product.md), which the team built collaboratively in Notion and exported to the repo.

## Decision

The v1 MVP is exactly these four features:

1. **GitHub issues tracker** — in-dashboard v1 (extends the existing blockers / check-ins surface) with start and due dates; v2 stretch is real GitHub Issues API integration.
2. **Calendar** — individual and team project timelines, plotting issue start/due dates.
3. **Daily standup** — team and personal standups posting to everyone's dashboard, including blockers and daily mood.
4. **Onboarding** — account creation, login, splash page (now backed by Supabase per [ADR-0003](0003-adopt-supabase-for-persistence.md)).

Work is split into sub-teams, one per feature. A separate **Review Crew** role exists so >300-LoC PRs don't self-merge ([SprintPlanning/Week7-SprintPlan.md](../../SprintPlanning/Week7-SprintPlan.md)).

## Consequences

- **Good** — narrow enough to ship in the remaining sprints; broad enough to demonstrate a real product to the prof / TA / cross-team reviewers in Week 9.
- **Good** — natural sub-team structure means everyone has clear ownership.
- **Good** — features compose: issues tracker feeds the calendar, standups + mood feed the dashboard.
- **Bad** — anything not on this list (messaging, user tiers, theming, AI agent tracking) is deferred. Week 8 plan revisits these — see [SprintPlanning/Week7-SprintPlan.md](../../SprintPlanning/Week7-SprintPlan.md).
- **Bad** — GitHub Issues v2 (real API integration) is ambitious for a single sprint; the in-dashboard v1 is the realistic target this sprint.

## Confirmation

- [SprintPlanning/Week7-SprintPlan.md](../../SprintPlanning/Week7-SprintPlan.md) plans implementation against these four features.
- [docs/MVP/Minimum Value Product.md](../MVP/Minimum%20Value%20Product.md) captures the full scope, per-feature owners, and v1/v2 splits.
- May 14 standup notes are the primary team-level record.
