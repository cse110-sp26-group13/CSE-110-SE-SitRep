/**
 * Issues page orchestrator ([issues.html](../../issues.html)).
 *
 * Full blockers list + severity/status filters + new-issue modal +
 * GitHub sync modal + pull request list. Stubs out `renderActivity`
 * because this page doesn't have an activity feed but
 * [blockers.js](../features/blockers.js) calls it after writes.
 */

/**
 * Re-render the issue-only Issues page from loaded globals.
 *
 * Updates the header, GitHub repo controls, issue list, pull
 * request list, and issue count subtitle.
 *
 * @returns {void}
 */
function renderIssues() {
  // One page-level render keeps header, repo controls, issues, and counts in sync.
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
      
      // Clear the ID from the URL so it doesn't pop up again on re-renders
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
    }, 100);
  }
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
 * Load initial page data, render the Issues page, and bind controls.
 *
 * Side effects: loads Supabase-backed data through `db.loadAll()`, renders
 * the issue and pull request lists, and registers DOM event handlers for
 * issue filters, GitHub sync, modal dismissal, issue creation, and pull
 * request controls.
 *
 * @returns {Promise<void>}
 */
document.addEventListener("DOMContentLoaded", async () => {
  // Load Supabase-backed local data first, then merge in any GitHub state from localStorage.
  await db.loadAll();
  renderIssues();
  bindBlockerControls();
  bindPullRequestControls();
});
