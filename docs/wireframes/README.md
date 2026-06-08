# Wireframes & visual prototypes

This folder collects the visual exploration that preceded the UI rewrites.
**Halftone won** and is what's in production today — see commit
[`7454cd0`](https://github.com/cse110-sp26-group13/CSE-110-SE-SitRep/commit/7454cd0)
("ui rework version 1 - halftone") and the final halftone PR
[#26](https://github.com/cse110-sp26-group13/CSE-110-SE-SitRep/pull/26).
A Linear-style alternative was briefly attempted in
[`a4c35f8`](https://github.com/cse110-sp26-group13/CSE-110-SE-SitRep/commit/a4c35f8)
and then reverted; the standalone prototype that drove that experiment is
parked here as [`mock.html`](mock.html).

> **What these are:** AI-generated visual prototypes produced with Claude
> (claude.ai design / Claude artifacts) during week 7-8 to explore directions
> before committing to a visual language. They are *not* screenshots of working
> code — they're closer to high-fidelity mockups than to traditional wireframes,
> but they served the same purpose: try several looks side-by-side, pick one,
> then build it.
>
> **What they are not:** screenshots of the production app.

## Honest timing note

This folder was committed retroactively on **2026-05-29** as part of the
documentation pass tracked in branch `doc-fixes/shazi`. The prototypes themselves
were generated during weeks 7 and 8, debated and reworked with the team, and the
halftone rewrite landed on **2026-05-22** (commit `7454cd0`). Per the CSE 110
rubric, design artifacts "should precede any non-exploratory work" — these did,
but they were not committed until now. Documenting that honestly rather than
back-dating.

## Design brief (one paragraph)

The v1 dashboard ([0.1.0] in [CHANGELOG.md](../CHANGELOG.md)) shipped with a
plain skeleton: rail + cards, no real visual identity. The team wanted a look
that (a) felt distinct from generic Bootstrap-y dashboards, (b) read as a
*tool for an engineering team* rather than a corporate Jira clone, and
(c) supported both light and dark modes without recoloring every component
individually. We used Claude to spin up several visual directions on top of
the existing layout, picked the **halftone / warm-paper** direction (it gave
us the "tool with a personality" feel we wanted), briefly experimented with a
**Linear-style refinement** in production seen in mock.html, didn't like the trade-off, and
went back to halftone — which is what ships today.

## Visual directions explored

### A. Halftone / warm-paper (the direction that shipped)
Warm beige paper background, hard ink (`#0a0a0a`) borders, red accent, retro
print/risograph feel. Implemented in production by commit
[`7454cd0`](https://github.com/cse110-sp26-group13/CSE-110-SE-SitRep/commit/7454cd0).
Tokens live in [`css/base.css`](../css/base.css) (`--paper`, `--ink`, `--bad`).

- [`image (8).png`](image%20(8).png) — first version of halftone dashboard
- [`image (9).png`](image%20(9).png) — first version of halftone calendar

### B. Linear-style alternative (explored, not adopted)
Cleaner, more refined, closer to Linear's visual language. We built a full
standalone prototype ([`mock.html`](mock.html), 999 lines of self-contained
HTML/CSS) and briefly tried it in production
([`a4c35f8`](https://github.com/cse110-sp26-group13/CSE-110-SE-SitRep/commit/a4c35f8)),
but it lost the "tool with personality" feel that halftone gave us, so we
reverted to halftone in PR
[#26](https://github.com/cse110-sp26-group13/CSE-110-SE-SitRep/pull/26).



## Pre-redesign reference

The [`old-ui/`](old-ui/) subfolder is an extracted snapshot of the production
code as of commit
[`3b9908a`](https://github.com/cse110-sp26-group13/CSE-110-SE-SitRep/commit/3b9908a)
— the last commit *before* the halftone rewrite (`7454cd0`). Kept as a faithful
reference of what the prototypes above were replacing. Open
[`old-ui/index.html`](old-ui/index.html) directly to see the pre-redesign
dashboard. The original claude design folder for the halftone UI also lives here [`halftone/`](halftone/)

## AI usage

These prototypes are 100% AI-generated visual exploration. See
[`docs/AI_USAGE.md`](../docs/AI_USAGE.md) for the disclosure entry covering
tool, prompting approach, and how the outputs informed production decisions.
