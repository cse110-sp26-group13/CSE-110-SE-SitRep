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
  // One page-level render keeps header, repo controls, assignments, PRs, and counts in sync.
  renderHeader();
  updateGitHubSyncActions();
  renderBlockers();
  renderPullRequests();
  updateIssuesSub();
  checkUrlParams();
}

function checkUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (id) {
    // Small delay to ensure blockers are rendered and DOM is ready
    setTimeout(() => {
      openDetailModal(id);
    }, 100);
  }
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
window.renderActivity = function () { /* no-op: no activity feed on issues page */ };

document.addEventListener("DOMContentLoaded", async () => {
  // Load Supabase-backed local data first, then merge in any GitHub state from localStorage.
  await db.loadAll();
  renderIssues();
  bindBlockerControls();
  bindPullRequestControls();
});
