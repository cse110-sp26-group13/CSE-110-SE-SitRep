/**
 * Client-only state that doesn't belong in Supabase.
 *
 * Anything per-team and persistent (teammates, blockers, slots,
 * GitHub-synced issues, …) lives in Postgres and is loaded via
 * db.loadAll(). This module owns the leftover bits: the Blockers
 * panel's filter chips.
 *
 * Bumped to v4 when the GitHub sync moved into Supabase — old keys
 * are ignored rather than migrated, and the localStorage `githubIssues`
 * cache from v3 is dropped (the rows now live in `public.blockers`).
 */

const STORAGE_KEY = "sitrep_state_v4";

/** @returns {{severityFilter: string, statusFilter: string}} */
function defaultState() {
  return {
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

let state = loadState();
