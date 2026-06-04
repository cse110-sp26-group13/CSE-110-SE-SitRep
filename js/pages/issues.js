// Issues page orchestrator.
// Full blockers list + filters + new-issue + GitHub sync modal + pull requests.

function renderIssues() {
  // One page-level render keeps header, repo controls, assignments, PRs, and counts in sync.
  renderHeader();
  updateGitHubSyncActions();
  renderBlockers();
  renderPullRequests();
  updateIssuesSub();
}

function updateIssuesSub() {
  const all = effectiveActiveGithubBlockers();
  // Show both filtered and total counts so hidden synced items are obvious.
  const shown = filteredActiveBlockers();
  const open = all.filter(b => b.status !== "resolved").length;
  const resolved = all.length - open;
  const sub = document.getElementById("issues-sub");
  if (sub) sub.textContent = `${shown.length} shown · ${open} open · ${resolved} resolved · ${all.length} total`;
}

window.renderAll = renderIssues;
window.renderActivity = function () { /* no-op: no activity feed on issues page */ };

document.addEventListener("DOMContentLoaded", async () => {
  // Load Supabase-backed local data first, then merge in any GitHub state from localStorage.
  await db.loadAll();
  renderIssues();
  bindBlockerControls();
  bindPullRequestControls();
});
