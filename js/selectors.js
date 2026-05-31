// Selectors over the Supabase-backed globals (window.team, teammates,
// blockers, activity) populated by db.loadAll(). GitHub-synced issues
// and pull requests stay in localStorage and are exposed here.

function effectiveTeammates() {
  return teammates;
}

function effectiveBlockers() {
  return [...(state.githubIssues || []), ...blockers];
}

function findBlockerById(id) {
  return effectiveBlockers().find(b => b.id === id);
}

function effectivePullRequests() {
  return state.githubPullRequests || [];
}

function findPullRequestById(id) {
  return effectivePullRequests().find(pr => pr.id === id);
}

function effectiveActivity() {
  return activity;
}
