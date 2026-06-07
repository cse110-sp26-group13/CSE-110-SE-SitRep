# Sprint 2 Retrospective

**Project:** SE SitRep  
**Team:** Team 9  
**Sprint Period:** May 19 – May 25, 2026  
**Retrospective Date:** May 25, 2026  
**Attendees:** Aidan, Andrew, Ophir, Shazi, Yang, Jeong, Jeremy

---

## Sprint Summary

Sprint 2 was the primary implementation sprint. The team moved from research and skeleton to working feature builds, with most MVP features reaching a mergeable state by sprint end.

**Sprint Completion Rate: 3 / 4 planned features delivered**

| Feature | Status | Owner(s) |
|---------|--------|----------|
| GitHub Issue Tracker | Completed & Merged | Andrew, Ophir, Jeong |
| Onboarding (Auth + Circle) | Completed & Merged | Shazi |
| Daily Standup | Completed & Merged | Yang |
| Calendar | in-progress | Stephanie, Aaron |
|CI/CD & AI feature | in-progress | Aidan |

---

## What Went Well 

- **Three MVP features shipped** — GitHub Issue Tracker, Onboarding, and Daily Standup were all completed and merged by the end of sprint, representing strong execution across sub-teams.
- **GitHub Issue Tracker reached V2** — The tracker progressed from a local V1 (internal issue creation) to V2 with GitHub API sync within a single sprint, exceeding the initial scope.
- **Auth + Circle system fully functional** — Shazi implemented a complete two-step login, circle creation, and invite-code flow connected to Supabase, ahead of the Week 8 goals.
- **No merge conflicts** — The Issue Tracker merge with Yang's main branch was clean, showing good branch discipline.
- **PR review process established** — Clear review assignments were made: Aidan ← Ophir, Andrew ← Aidan, Shazi ← Andrew, Yang ← reviewed & merged.
- **Demo video planning initiated** — Team aligned on recording the demo before merging features to capture each in isolation.

---

## What Didn't Go Well 

- **V2 GitHub sync is local only** — The GitHub API sync currently works locally but is not yet functional for remote/production use, requiring additional work.
- **When2Meet and Calendar UI not functional** — As of 5/21, these features still needed to be made fully functional, not just scaffolded.
- **Branch restructuring not completed** — The goal of "one branch per feature" was identified on 5/21 but not yet executed, leading to potential confusion.
- **Low attendance on 5/24** — Only Ophir and Aidan attended the May 24 standup, which limited visibility into team-wide progress.
- **Action items from Sprint 1 not fully resolved** — Some Sprint 1 items (AI plan, repo documentation) carried over without resolution.

---

## Action Items

| # | Action Item | Owner | Due |
|---|-------------|-------|-----|
| 1 | Complete Calendar feature + Google Calendar API integration | Stephanie, Aaron | Next sprint priority |
| 2 | Fix GitHub Issue Tracker remote sync (currently local only) | Andrew, Ophir, Jeong | Next sprint |
| 3 | Restructure branches to one-branch-per-feature model | Shazi (lead) + All | Start of Sprint 3 |
| 4 | Each member must review Team 14's repository and fill out Google Doc | All | Per Aidan's Slack message |
| 5 | Refine all completed features (UI polish, edge cases) | All sub-teams | Sprint 3 |
| 6 | Finalize and document AI feature plan for Week 9/10 implementation | Whole team | Sprint 3 Week 1 |
| 7 | Improve circle invite flow — add email invitation option | Shazi | Sprint 3 |
| 8 | Calendar UI: switch to week view with navigation | Stephanie, Aaron | Sprint 3 |

---

## Looking Ahead — Sprint 3 Goals

- Refine all 3 shipped features
- Complete and integrate Calendar
- Begin UI/UX pass (user-friendly design, readability)
- Explore GitHub API further for additional data access
- Implement AI feature (Week 9/10 target)
- Update and finalize technical documentation

