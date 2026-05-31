/**
 * Read-only derived views over the globals db.loadAll() populates
 * (window.team, teammates, blockers, activity). GitHub-synced issues
 * stay in localStorage (state.githubIssues) and are merged in here so
 * the rest of the UI doesn't need to know they live in two places.
 *
 * Selectors must stay pure — no mutation, no I/O.
 */

/** @returns {object[]} current team members in their default order. */
function effectiveTeammates() {
  return teammates;
}

/**
 * Supabase blockers + GitHub-synced issues merged into one list. The
 * GitHub ones go first so they appear at the top of the panel before
 * sorting; everything else is keyed by `id` (the GH ones are prefixed
 * `gh-` so they never collide with Postgres uuids).
 *
 * @returns {object[]}
 */
function effectiveBlockers() {
  return [...(state.githubIssues || []), ...blockers];
}

/**
 * Look up a blocker by id across both Supabase and GitHub-synced rows.
 *
 * @param {string} id
 * @returns {object|undefined}
 */
function findBlockerById(id) {
  return effectiveBlockers().find(b => b.id === id);
}

/** @returns {object[]} the activity feed as loaded from Supabase. */
function effectiveActivity() {
  return activity;
}
