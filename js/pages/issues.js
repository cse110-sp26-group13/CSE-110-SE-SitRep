/**
 * Issues page orchestrator ([issues.html](../../issues.html)).
 *
 * Full blockers list + severity/status filters + new-issue modal +
 * GitHub issue sync modal. Pull request rendering is intentionally
 * disabled on this page and preserved in comments for future restore.
 * Stubs out `renderActivity` because this page doesn't have an
 * activity feed but [blockers.js](../features/blockers.js) calls it
 * after writes.
 */

/** Re-render the issues page from the loaded globals. */
function renderIssues() {
  // One page-level render keeps header, repo controls, assignments, and counts in sync.
  renderHeader();
  updateGitHubSyncActions();
  renderBlockers();
  // PR rendering is disabled on the Issues page.
  // renderPullRequests();
  updateIssuesSub();
}

/**
 * Update the page subtitle with the breakdown of issue counts
 * (open / resolved / total). Called whenever the list changes.
 */
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
/** No-op activity renderer because issues.html has no activity feed container. */
window.renderActivity = function () { /* no-op: no activity feed on issues page */ };

/**
 * Load initial page data, render the Issues page, and bind issue-only controls.
 * PR controls are preserved below as a commented restore point but are not
 * registered on this page.
 */
document.addEventListener("DOMContentLoaded", async () => {
  // Load Supabase-backed local data first, then merge in any GitHub state from localStorage.
  await db.loadAll();
  renderIssues();
  bindBlockerControls();
  // PR controls are disabled on the Issues page.
  // bindPullRequestControls();
});
