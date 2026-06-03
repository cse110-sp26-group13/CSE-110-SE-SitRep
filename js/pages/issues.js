/**
 * Issues page orchestrator ([issues.html](../../issues.html)).
 *
 * Full blockers list + severity/status filters + new-issue modal +
 * GitHub sync modal. Stubs out `renderActivity` because this page
 * doesn't have an activity feed but
 * [blockers.js](../features/blockers.js) calls it after writes.
 */

/** Re-render the issues page from the loaded globals. */
function renderIssues() {
  renderHeader();
  updateGitHubSyncActions();
  renderBlockers();
  renderPullRequests();
  updateIssuesSub();
}

/**
 * Update the page subtitle with the breakdown of issue counts
 * (open / resolved / total). Called whenever the list changes.
 */
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
