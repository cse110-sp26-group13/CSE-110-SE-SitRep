# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Research notes for Notion, Slack, and personal dashboard / sticky-note patterns ([Research/shaziResearch.md](Research/shaziResearch.md))

## [0.1.1] - 2026-05-14

### Fixed
- Restricted when2meet slot toggles so only the current user can change their own availability; added `aria-disabled` and clearer aria-labels for other teammates' cells.

## [0.1.0] - 2026-05-12

Initial barebones dashboard skeleton.

### Added
- Dashboard shell with left navigation rail and header ([index.html](index.html))
- KPI strip showing team summary metrics
- Daily check-ins panel (yesterday / today / blockers per teammate)
- Blockers panel with severity and status filtering
- When2meet-style availability grid for scheduling
- Mood trend visualization (7-day rolling)
- Recent activity feed
- Mock team dataset for local development ([data.js](data.js))
- Modular CSS architecture, one stylesheet per feature ([css/](css/))
- Modular JS architecture with per-feature modules under [js/features/](js/features/)

[Unreleased]: https://github.com/cse110-sp26-group13/CSE-110-SE-SitRep/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/cse110-sp26-group13/CSE-110-SE-SitRep/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/cse110-sp26-group13/CSE-110-SE-SitRep/releases/tag/v0.1.0
