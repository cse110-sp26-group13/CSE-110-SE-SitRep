---
status: accepted
date: 2026-05-27
deciders: Group 13 (agent_tracking sprint)
---

# AI Agent tracking: dedicated page, localStorage-first with Supabase migration path

## Context and Problem Statement

The project prompt explicitly asks: *"How does it change with AI agents in the mix? Do they need tracking too?"*

Modern small agile teams use AI agents (Claude Code, GitHub Copilot, Cursor) as de-facto collaborators. No current standup tool surfaces AI activity alongside human activity. SE SitRep can uniquely answer this by treating AI agents as first-class participants in the team's daily rhythm.

The course also requires GenAI usage to be *exposed and discussed*. Currently our `docs/AI_USAGE.md` captures this per-person, but it lives outside the product and requires manual updates. A first-class AI tracking feature would make disclosure a natural part of daily workflow rather than an after-the-fact documentation task.

## Decision Drivers

- Must fit vanilla HTML/CSS/JS constraint (no framework).
- Must not require new approved dependencies — the feature uses only existing Supabase client and localStorage (already in use).
- Auto-detecting AI usage from commits (Co-Authored-By parsing) is unreliable — developers can turn off co-authoring. Manual logging is the only honest signal.
- Token usage and estimated cost are core data points, not optional, because they make AI effort visible and comparable across sprints.
- The page should be a dedicated route (not embedded in the dashboard) to give AI tracking sufficient visual priority and form space.

## Considered Options

1. **Dedicated AI Agents page** (chosen) — separate page navigable from the rail, with its own KPI row, log-session form, session cards, and sprint burn chart.
2. **Embedded panel on the standup page** — quick to build but cramped; would compete visually with human check-in content.
3. **GitHub commit co-author parsing** — fully automated but silently misses all usage where the developer turns off attribution or pastes output manually. Rejected as the primary mechanism (may be added as a complementary signal later).

## Decision Outcome

**Chosen option: Dedicated AI Agents page (Option 1)**

### Implementation

- New page: `ai-agents.html`
- New feature module: `js/features/ai-agents.js`
  - `estimateCost(tokens, model)` — client-side cost calculation using baked-in `MODEL_RATES` constants
  - `computeSprintBurn(sessions)` — groups by date for the bar chart
  - `aiKPIData()` — exposes summary metrics consumed by `kpis.js` on the main dashboard
  - `renderAllAI()` — top-level re-render (KPIs + session cards + burn chart)
- New CSS module: `css/ai-agents.css`
- New page orchestrator: `js/pages/ai-agents.js`
- State: `state.aiSessions[]` added to `defaultState()` in `state.js` — localStorage-first, same pattern as `extraCheckIns` and `extraActivity`
- KPI strip: `kpis.js` calls `aiKPIData()` when available, appending an "AI sessions today" tile to the main dashboard strip
- Activity feed: AI session submissions push a `type: "ai"` event (🤖 icon) into the existing activity feed
- Supabase migration: `supabase/migrations/20260527_add_ai_activity.sql` defines `ai_activity` table with RLS team-isolation policy matching the pattern in existing tables. Wire-up to replace localStorage calls is a future task once the migration is applied.
- Nav rail updated on all existing pages to include the AI Agents link

### Positive Consequences

- AI agent usage becomes visible at a team level, not just per-developer.
- Token + cost tracking makes AI effort quantifiable and comparable sprint-over-sprint.
- Satisfies the course requirement to expose and discuss GenAI usage — now part of the product itself.
- Follows established patterns: no new architectural patterns introduced, no new dependencies.

### Negative Consequences / Trade-offs

- Data is self-reported — accuracy depends on team discipline. No auto-detection of AI usage.
- Token counts must be manually copied from Claude/Copilot session summaries — a small friction point.
- Cost estimates are approximations (70/30 input/output split assumed; actual ratio varies).
- `MODEL_RATES` constants will become stale as model pricing changes — needs periodic review.
