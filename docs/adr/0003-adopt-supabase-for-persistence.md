---
status: accepted
date: 2026-05-16
deciders: Group 13 (TA-approved)
---

# Adopt Supabase for persistence and authentication

## Context and Problem Statement

The Week 8 sprint plan (and Week 7 onboarding work) needs real user accounts, sessions, and persisted standup / team / blocker data. We currently store everything in-memory in [data.js](../../data.js) and reset on reload.

We need to pick a persistence + auth solution that:
- Works from a static, no-build-step site hosted on GitHub Pages or Cloudflare Pages.
- Doesn't require us to run our own server (course constraint: server-side tech must work on Cloudflare or GitHub Pages only).
- Has a free tier large enough for a 9-person student team.
- Satisfies the PDF rubric, which requires teaching-assistant approval for any new dependency.

## Decision Drivers

* Course constraint: vanilla stack, no UI framework, server-side limited to Cloudflare/GitHub Pages.
* TA approval required for any new dependency.
* Auth must support email/password sign-up + session persistence at minimum.
* Easy onboarding for teammates — no DevOps hurdle to running it locally.
* Reversibility: prefer tools we can migrate off of if needed.

## Considered Options

* **Supabase** (Postgres + Auth + Realtime, hosted)
* **Firebase / Firestore** (Google, NoSQL + Auth, hosted) — explicitly mentioned by the TA as the option other teams have chosen
* **Cloudflare D1 + Workers** (SQLite + custom Workers, allowed by course constraint)
* **localStorage / IndexedDB only** (no backend)
* **Custom REST backend on Cloudflare Workers**

## Decision Outcome

Chosen option: **Supabase**, because:
- TA explicitly approved it.
- Postgres + SQL means our schema knowledge is portable; if we ever need to migrate off, it's a `pg_dump` away, not a NoSQL rewrite.
- Auth is included out-of-the-box (email/password, OAuth providers, session JWTs) so we don't have to roll our own.
- Row-Level Security (RLS) policies give us the visibility/tier model directly in the database, not in client code.
- Loads from CDN via `https://esm.sh/@supabase/supabase-js@2`, fitting our no-build-step constraint.
- Free tier (500 MB database, 50K monthly active users) is well within scope for a 9-person team.

### Consequences

* **Good** — real persistence, real auth, no server we maintain.
* **Good** — schema lives in SQL ([supabase/schema.sql](../../supabase/schema.sql)) — checkable into git, reviewable in PRs.
* **Good** — RLS keeps visibility logic out of the client. Tier-based access becomes a policy, not an `if` statement.
* **Bad** — we now have a runtime dependency on a third-party service. If Supabase has an outage, the app degrades.
* **Bad** — RLS is locked-down by default. Every new table needs explicit `select` / `insert` / `update` policies or queries return empty. Easy footgun for new contributors.
* **Bad** — email confirmation flow is on by default; for dev we'll disable it (documented in [supabase/schema.sql](../../supabase/schema.sql)), which is a tradeoff against spam signups.
* **Neutral** — exposes a public anon key in the client. This is by Supabase design — security is enforced by RLS, not key secrecy. The `service_role` key must never leave the Supabase dashboard.

### Confirmation

Decision is confirmed by:
- Supabase project provisioned (URL: `https://vbimsbasupcbdxzsazif.supabase.co`)
- Config wired into the client via [js/config.js](../../js/config.js)
- Initial schema in [supabase/schema.sql](../../supabase/schema.sql) covering `profiles`, `teams`, `memberships`, plus Life360-style 6-digit `join_code` on teams and a `join_team_by_code` RPC
- User tiers explicitly deferred — schema is tier-agnostic for now; a `tier` column can be added later without migrating existing rows
- TA approval recorded in standup notes (Week 7).

## Pros and Cons of the Options

### Firebase / Firestore

* **Good** — extremely popular, lots of tutorials, very plug-and-play Auth.
* **Good** — generous free tier.
* **Bad** — NoSQL (Firestore) doesn't model our team/membership relationships as cleanly as Postgres.
* **Bad** — vendor lock-in is heavier (proprietary query syntax, harder to migrate off).
* **Bad** — Google's history of sunsetting products (we'd want to be confident Firebase isn't next).
* **Neutral** — TA-acceptable, on par with Supabase from a course-rubric standpoint.

### Cloudflare D1 + Workers

* **Good** — fully aligned with course constraint (server-side on Cloudflare).
* **Good** — SQLite, very portable.
* **Bad** — auth is not included; we'd need to build sign-up / sessions / JWTs ourselves. Significant scope creep for a one-sprint feature.
* **Bad** — fewer ergonomic libraries and tutorials compared to Supabase.

### localStorage / IndexedDB only

* **Good** — zero dependency, zero cost, zero infra.
* **Bad** — no cross-device sync, no shared team state, no real auth. Defeats the point of a team SitRep product.
* **Acceptable** as a v1 fallback for onboarding (per Week 7 acceptance criteria), but not viable as the long-term persistence layer.

### Custom REST backend on Cloudflare Workers

* **Good** — full control, course-compliant.
* **Bad** — auth, sessions, DB schema, REST endpoints, deployment all become our problem. Massive scope for one sprint.
* **Bad** — every endpoint is one we have to design, test, and document.

## More Information

Revisit this decision if:
- Supabase's free tier no longer covers our usage (unlikely at student scale).
- RLS proves too restrictive for a feature we want to ship.
- A teammate's machine can't reliably reach Supabase from campus network.

In any of those cases, the migration path is: export schema via `pg_dump`, port to Cloudflare D1 or another Postgres host, swap the client library. Not free, but tractable.

Related work:
- [supabase/schema.sql](../../supabase/schema.sql) — initial schema with RLS
- [js/config.js](../../js/config.js) — public Supabase URL + anon key
- [SprintPlanning/Week7-SprintPlan.md](../../SprintPlanning/Week7-SprintPlan.md) — onboarding feature scope
