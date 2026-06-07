/**
 * Client-only state that doesn't belong in Supabase.
 *
 * Anything per-team and persistent (teammates, blockers, slots, …)
 * lives in Postgres and is loaded via db.loadAll(). This module owns
 * the leftover bits: GitHub-synced repos (kept in localStorage so the
 * sync survives reloads without re-hitting the API) and the Blockers
 * panel's filter chips.
 *
 * GitHub repos are scoped per circle: each circle (team) has its own
 * synced-repo set and active repo, keyed by the active-team id the
 * circle switcher writes to localStorage. Switching circles reloads
 * the page, so each load reads the active circle's bucket fresh.
 *
 * Bumped to v4 when GitHub repos became per-circle — old keys are
 * ignored rather than migrated.
 */

const STORAGE_KEY = "sitrep_state_v4";

// Mirror of the circle switcher's localStorage key (see
// [circle-switcher.js](features/circle-switcher.js)). Read directly so
// state.js has no load-order dependency on that module.
const ACTIVE_CIRCLE_KEY = "sitrep-active-team";
// Bucket key used when no circle is selected yet (signed out, or pre-hydrate).
const NO_CIRCLE = "__no_circle__";

/**
 * The active circle id the GitHub repos are scoped to, or a sentinel
 * when none is selected. Read straight from localStorage so it's
 * available synchronously at module load.
 *
 * @returns {string}
 */
function currentCircleId() {
  try { return localStorage.getItem(ACTIVE_CIRCLE_KEY) || NO_CIRCLE; }
  catch { return NO_CIRCLE; }
}

/**
 * @returns {{githubReposByCircle: Object, activeRepoByCircle: Object,
 *   severityFilter: string, statusFilter: string}}
 */
function defaultState() {
  return {
    // { [circleId]: [{ repoPath, issues, pullRequests, syncedAt }] }
    githubReposByCircle: {},
    // { [circleId]: "owner/repo" }
    activeRepoByCircle: {},
    // Persist filters so page reloads keep the user's last view.
    severityFilter: "all",
    statusFilter: "open",
    // PRs use their own status filter because GitHub PR states differ from issue states.
    prStatusFilter: "open",
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
 * The synced GitHub repos for the active circle.
 *
 * @returns {object[]} `{ repoPath, issues, pullRequests, syncedAt }[]`
 */
function currentGithubRepos() {
  return (state.githubReposByCircle && state.githubReposByCircle[currentCircleId()]) || [];
}

/**
 * The active repo path within the active circle (the one the issues
 * panel and PR list show), or "" if none is chosen.
 *
 * @returns {string}
 */
function currentActiveRepoPath() {
  return (state.activeRepoByCircle && state.activeRepoByCircle[currentCircleId()]) || "";
}

/** Replace the active circle's synced-repo list and persist. */
function setGithubRepos(repos) {
  if (!state.githubReposByCircle) state.githubReposByCircle = {};
  state.githubReposByCircle[currentCircleId()] = repos;
  saveState();
}

/** Set which repo is active within the active circle and persist. */
function setActiveGithubRepo(repoPath) {
  if (!state.activeRepoByCircle) state.activeRepoByCircle = {};
  state.activeRepoByCircle[currentCircleId()] = repoPath;
  saveState();
}

/**
 * Add or refresh one synced repo in the active circle's set and make
 * it the active repo. Replaces any existing entry with the same path.
 */
function upsertGithubRepo({ repoPath, issues, pullRequests }) {
  const syncedAt = new Date().toISOString();
  const repoData = { repoPath, issues, pullRequests, syncedAt };
  const repos = currentGithubRepos().filter(repo => repo.repoPath !== repoPath);
  setGithubRepos([...repos, repoData]);
  setActiveGithubRepo(repoPath);
}

/**
 * Drop a synced repo from the active circle's set. If it was the
 * active repo, fall back to the first remaining one (or none).
 */
function removeGithubRepo(repoPath) {
  const repos = currentGithubRepos().filter(repo => repo.repoPath !== repoPath);
  setGithubRepos(repos);
  if (currentActiveRepoPath() === repoPath) {
    setActiveGithubRepo(repos[0]?.repoPath || "");
  }
}

let state = loadState();
