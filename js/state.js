/**
 * Client-only state that doesn't belong in Supabase.
 *
 * Anything per-team and persistent (teammates, blockers, slots, …)
 * lives in Postgres and is loaded via db.loadAll(). This module owns
 * the leftover bits: GitHub-synced issues (kept in localStorage so
 * the sync survives reloads without re-hitting the API) and the
 * Blockers panel's filter chips.
 *
 * Bumped to v3 when the GitHub sync was added — old keys are ignored
 * rather than migrated.
 */

const STORAGE_KEY = "sitrep_state_v3";

/** @returns {{githubIssues: object[], severityFilter: string, statusFilter: string}} */
function defaultState() {
  return {
    githubIssues: [],
    severityFilter: "all",
    statusFilter: "open",
    slotAvailability: {},
    aiSessions: [],
  };
}

/**
 * Hydrate state from localStorage. Unknown keys are merged on top of
 * the defaults so adding a new field doesn't require a migration.
 * Any parse failure (corrupt JSON, quota error) falls back to defaults
 * rather than throwing during page load.
 *
 * @returns {ReturnType<typeof defaultState>}
 */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    return defaultState();
  }
}

/** Write the current `state` global back to localStorage. */
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Replace the cached GitHub issues with a fresh sync result and
 * persist immediately.
 *
 * @param {object[]} issues - normalized issue objects as returned by
 *   fetchGitHubIssues (see [js/features/github-api.js](github-api.js)).
 */
function setGithubIssues(issues) {
  state.githubIssues = issues;
  saveState();
}

let state = loadState();
