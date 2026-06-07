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

/**
 * Re-render the issue-only Issues page from loaded globals.
 *
 * Updates the header, GitHub repo controls, assignment list, and issue
 * count subtitle. Pull request rendering is intentionally preserved as
 * a commented restoration point and is not called on this page.
 *
 * @returns {void}
 */
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
 *
 * Reads the currently effective issue rows, including GitHub-synced
 * issues, and writes the summary text into `#issues-sub`.
 *
 * @returns {void}
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
/**
 * No-op activity renderer for issues.html.
 *
 * `blockers.js` calls `renderActivity()` after writes on pages that have
 * an activity feed. The Issues page has no feed container, so this stub
 * satisfies the shared callback without mutating the DOM.
 *
 * @returns {void}
 */
window.renderActivity = function () { /* no-op: no activity feed on issues page */ };

/**
 * Load initial page data, render the Issues page, and bind issue-only controls.
 * PR controls are preserved below as a commented restore point but are not
 * registered on this page.
 *
 * Side effects: loads Supabase-backed data through `db.loadAll()`, renders
 * the issue list, and registers DOM event handlers for issue filters,
 * GitHub issue sync, modal dismissal, and issue creation.
 *
 * @returns {Promise<void>}
 */
document.addEventListener("DOMContentLoaded", async () => {
  // Load Supabase-backed local data first, then merge in any GitHub state from localStorage.
  await db.loadAll();
  renderIssues();
  bindBlockerControls();
  // PR controls are disabled on the Issues page.
  // bindPullRequestControls();
});
