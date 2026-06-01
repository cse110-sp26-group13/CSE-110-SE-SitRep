// Issues page orchestrator.
// Full blockers list + filters + new-issue + GitHub sync modal + pull requests.

function renderIssues() {
  renderHeader();
  updateGitHubSyncActions();
  renderBlockers();
  renderPullRequests();
  updateIssuesSub();
}

function updateIssuesSub() {
  const all = effectiveActiveGithubBlockers();
  const open = all.filter(b => b.status !== "resolved").length;
  const resolved = all.length - open;
  const sub = document.getElementById("issues-sub");
  if (sub) sub.textContent = `${open} open · ${resolved} resolved · ${all.length} total`;
}

window.renderAll = renderIssues;
window.renderActivity = function () { /* no-op: no activity feed on issues page */ };

document.addEventListener("DOMContentLoaded", async () => {
  await db.loadAll();
  renderIssues();
  bindBlockerControls();
  bindPullRequestControls();
});
