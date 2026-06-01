// Selectors over the Supabase-backed globals (window.team, teammates,
// blockers, activity) populated by db.loadAll(). GitHub-synced issues
// and pull requests stay in localStorage and are exposed here.

function effectiveTeammates() {
  return teammates;
}

function effectiveBlockers() {
  return [...allGithubIssues(), ...blockers];
}

function effectiveActiveGithubBlockers() {
  return [...activeGithubIssues(), ...blockers];
}

function findBlockerById(id) {
  return effectiveBlockers().find(b => b.id === id);
}

function effectivePullRequests() {
  return activeGithubRepo()?.pullRequests || [];
}

function findPullRequestById(id) {
  return effectivePullRequests().find(pr => pr.id === id);
}

function effectiveActivity() {
  return activity;
}

function activeGithubRepo() {
  const repos = state.githubRepos || [];
  return repos.find(repo => repo.repoPath === state.activeGithubRepo) || repos[0] || null;
}

function activeGithubIssues() {
  return activeGithubRepo()?.issues || [];
}

function allGithubIssues() {
  return (state.githubRepos || []).flatMap(repo => repo.issues || []);
}
