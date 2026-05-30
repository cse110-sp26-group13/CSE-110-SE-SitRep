/**
 * Read-only derived views over the globals db.loadAll() populates
 * (window.team, teammates, blockers, activity). Everything — including
 * GitHub-synced issues — lives in Supabase now, so these selectors
 * stay paper-thin.
 *
 * Selectors must stay pure — no mutation, no I/O.
 */

/** @returns {object[]} current team members in their default order. */
function effectiveTeammates() {
  return teammates;
}

/**
 * Blockers as loaded from Supabase. Native and GitHub-synced rows live
 * in the same table now, distinguished by `externalSource`.
 *
 * @returns {object[]}
 */
function effectiveBlockers() {
  return blockers;
}

/**
 * Look up a blocker by id.
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
