---
status: accepted
date: 2026-05-07
deciders: shazibid
---

# Use a vanilla HTML / CSS / JavaScript stack with no framework

## Context and Problem Statement

The CSE 110 technical constraints permit "standards-based HTML, CSS without a
framework, vanilla JavaScript without a framework, media assets, JSON, and any
.txt or configuration files." Any dependency requires teaching-assistant
approval with proper justification, and major technical decisions must be
captured as ADRs in MADR format.

We need to choose how to implement the SE SitRep dashboard for the barebones
phase: pick a frontend approach that satisfies the constraint, keeps the
project trivially deployable on GitHub Pages or Cloudflare Pages, and avoids
locking us into tooling we'd later have to justify to the TA.

## Decision Drivers

* The course constraint disallows frameworks by default.
* The artifact must run from a static host (GitHub Pages / Cloudflare Pages).
* The team is small and iterating quickly; build-system overhead is friction.
* Future features (auth, GitHub Issues integration, when2meet poll) may need
  modest dependencies later — we want a low-cost path to add them via TA-
  approved scripts/CDN, not a stack rewrite.

## Considered Options

* **Vanilla HTML + CSS + JavaScript, no build step**
* **Vite + vanilla JS (build tooling only, no UI framework)**
* **React + Vite (UI framework + build)**
* **Next.js (App Router)**

## Decision Outcome

Chosen option: **Vanilla HTML + CSS + JavaScript, no build step**, because it
is the only option that requires zero TA-approved dependencies, deploys
unmodified to GitHub Pages, and matches the spirit of the course constraint.
It also keeps the source readable for graders and avoids hiding logic behind
a transpiler.

### Consequences

* Good — no `node_modules`, no build pipeline, no framework lock-in. Anyone
  can clone the repo and open `index.html` to run the app.
* Good — every line in the repo is something we wrote and can defend in a
  review; nothing is supplied by a framework.
* Good — straightforward to deploy to GitHub Pages by enabling Pages on the
  default branch.
* Bad — we lose component reuse, JSX ergonomics, and routing helpers; we'll
  need discipline to keep `app.js` modular as features grow.
* Bad — no type checking. We'll mitigate by keeping data shapes documented in
  `data.js` and adding JSDoc annotations as the surface grows.
* Bad — no tree-shaking or minification. Acceptable while the bundle is tiny;
  revisit if we ship more than a few hundred KB.

### Confirmation

The decision is confirmed by the repository structure: only `index.html`,
`styles.css`, `app.js`, and `data.js` are required to render the dashboard.
The repo currently contains no `package.json`, no lockfile, and no build
configuration.

## Pros and Cons of the Options

### Vite + vanilla JS

* Good — fast dev server, hot reload.
* Bad — adds a dependency surface and requires TA approval; the build output
  obscures what's actually running.
* Bad — overkill while the project is a single HTML file.

### React + Vite

* Good — component model scales well as features grow.
* Bad — explicit course-constraint violation (UI framework). Would need a
  strong justification to the TA.
* Bad — adds significant transpilation/runtime; harder for graders to audit.

### Next.js (App Router)

* Good — built-in routing, server actions if we add a backend later.
* Bad — same framework concern as React, plus heavier tooling.
* Bad — server features only work on Cloudflare/GitHub Pages with extra
  adapters or by disabling them — undermines the "static" deployment story.

## More Information

Revisit this decision if any of the following become true:
- We need real component reuse across more than ~3 pages.
- Bundle size or DOM update performance becomes a measurable problem.
- The team adopts TypeScript or testing tooling that makes a build step
  worthwhile regardless.

In any of those cases, opening a follow-up ADR (e.g., "Adopt a build step")
is the right path rather than silently introducing tooling.
