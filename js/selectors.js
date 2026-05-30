// Selectors over the Supabase-backed globals (window.team, teammates,
// blockers, activity) populated by db.loadAll(). GitHub-synced issues
// stay in localStorage (state.githubIssues) and are merged in here.

function effectiveTeammates() {
  return teammates;
}

function effectiveBlockers() {
  return [...(state.githubIssues || []), ...blockers];
}

function findBlockerById(id) {
  return effectiveBlockers().find(b => b.id === id);
}

function effectiveActivity() {
  return activity;
}
``