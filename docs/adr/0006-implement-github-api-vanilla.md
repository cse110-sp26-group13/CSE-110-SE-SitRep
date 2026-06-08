---
status: accepted
date: 2026-06-03
deciders: Group 13 (GitHub sync sprint)
---

# Implement GitHub Issues API Integration via Vanilla JS fetch()

## Context and Problem Statement
We need to implement "v2" of our Issues Tracker to pull live data from GitHub. The course constraints prohibit the use of external SDKs or wrappers without strict TA approval.

## Decision Drivers
* Must adhere to the "Vanilla JavaScript" constraint.
* Needs to securely handle Personal Access Tokens (PAT) without exposing them in public repositories.
* Must map external JSON schemas into our internal dashboard state.

## Considered Options
* Option 1: Request clearance to use the official `@octokit/rest` SDK.
* Option 2: Build a native data-fetching service using the browser's built-in `fetch()` API.

## Decision Outcome
Chosen option: **Option 2**. We will implement a custom, isolated JavaScript service (`github-api.js`) using native `fetch()`. This avoids adding external dependencies, aligns perfectly with the vanilla JS constraints, and keeps the project lightweight. We will store user tokens temporarily in `sessionStorage` to prevent credential leakage.