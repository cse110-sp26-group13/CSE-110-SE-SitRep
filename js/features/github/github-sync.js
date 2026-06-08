/**
 * GitHub sync orchestration — the glue between the low-level GitHub API
 * layer (github-client / github-issues / github-pulls) and the issues page
 * UI in [../blockers.js](../blockers.js).
 *
 * Responsibilities:
 *   • Parse repo paths users paste (shorthand or full URLs)
 *   • The "Sync with GitHub" / unsync dialogs and repo selector
 *   • Fetch + cache issues/PRs into local state ([../../state.js](../../state.js))
 *   • Background auto-sync poller (see GITHUB_SYNC_INTERVAL_MS below)
 *
 * These are global-scoped functions (no module system) shared with
 * blockers.js; both files are loaded together on issues.html.
 */

// ---------------------------------------------------------------------------
// Repo path parsing
// ---------------------------------------------------------------------------

function normalizeRepoPaths(value) {
  // Users can paste comma-separated, space-separated, shorthand, or full GitHub URLs.
  return [...new Set(value
    .split(/[\s,]+/)
    .map(repo => repo.trim())
    .filter(Boolean)
    .map(parseGitHubRepoPath)
  )];
}

function parseGitHubRepoPath(value) {
  const normalized = value.replace(/\/+$/, "");
  // Accept full GitHub URLs copied from the browser.
  const githubUrl = normalized.match(/^https?:\/\/(?:www\.)?github\.com\/([^/\s]+)\/([^/\s#?]+)(?:[/?#].*)?$/i);
  if (githubUrl) return `${githubUrl[1]}/${githubUrl[2].replace(/\.git$/i, "")}`;

  // Also accept the compact owner/repo form used in GitHub API paths.
  const shorthand = normalized.match(/^([^/\s]+)\/([^/\s#?]+)$/);
  if (shorthand) return `${shorthand[1]}/${shorthand[2].replace(/\.git$/i, "")}`;

  throw new Error(`Use owner/repo or a GitHub repo URL: ${value}`);
}

// ---------------------------------------------------------------------------
// Local GitHub state mutators
// ---------------------------------------------------------------------------

/**
 * Refresh the GitHub repo selector, unsync button, and session storage
 * for the active issue-sync repo.
 *
 * Side effects: mutates `#gh-repo-select`, toggles `#unsync-gh-btn`, and
 * writes or clears `sessionStorage["sitrep_gh_repo"]`.
 *
 * @returns {void}
 */
function updateGitHubSyncActions() {
  const unsyncButton = document.getElementById("unsync-gh-btn");
  const repoSelect = document.getElementById("gh-repo-select");
  const repos = currentGithubRepos();
  const activeRepo = activeGithubRepo();

  if (repoSelect) {
    // Hide the selector until there is at least one synced repo to choose from.
    repoSelect.hidden = repos.length === 0;
    repoSelect.innerHTML = repos.map(repo => `
      <option value="${escapeHTML(repo.repoPath)}"${repo.repoPath === activeRepo?.repoPath ? " selected" : ""}>
        ${escapeHTML(repo.repoPath)}
      </option>
    `).join("");
  }

  if (unsyncButton) unsyncButton.hidden = !activeRepo;
  // Session storage feeds follow-up GitHub issue actions like comment/create/close.
  if (activeRepo) sessionStorage.setItem("sitrep_gh_repo", activeRepo.repoPath);
  else sessionStorage.removeItem("sitrep_gh_repo");
}

function updateActiveGithubIssues(issues) {
  const activeRepo = activeGithubRepo();
  if (!activeRepo) return;
  const repos = currentGithubRepos().map(repo =>
    repo.repoPath === activeRepo.repoPath ? { ...repo, issues } : repo
  );
  setGithubRepos(repos);
}

function appendIssueToActiveGithubRepo(issue) {
  const activeRepo = activeGithubRepo();
  if (!activeRepo) return;
  updateActiveGithubIssues([...(activeRepo.issues || []), issue]);
}

// ---------------------------------------------------------------------------
// Fetch + cache core
// ---------------------------------------------------------------------------

/**
 * Fetch issues + PRs for each repo path and upsert the results into local
 * GitHub sync state. Shared by the manual sync modal and the background
 * poller. Intentionally quiet: it does NOT log activity, reset filters,
 * reload Supabase, or re-render — callers decide how loud to be.
 *
 * On a per-repo failure the previously cached issues/PRs are kept so a
 * transient error doesn't blank out the list; the reason is collected in
 * `warnings`. A repo is dropped only if BOTH fetches fail.
 *
 * @param {string[]} repoPaths
 * @param {string} token  PAT for higher limits / private repos ("" for none)
 * @returns {Promise<{ syncedRepos: object[], warnings: string[] }>}
 */
async function fetchAndStoreGithubRepos(repoPaths, token) {
  const warnings = [];
  const existingRepos = currentGithubRepos();
  // Fetch issues and PRs together so one repo sync updates both sections at once.
  const syncedRepos = (await Promise.all(repoPaths.map(async repoPath => {
    const previousRepo = existingRepos.find(repo => repo.repoPath === repoPath);
    const [issuesResult, pullRequestsResult] = await Promise.allSettled([
      fetchGitHubIssues(repoPath, token),
      fetchGitHubPullRequests(repoPath, token),
    ]);

    if (issuesResult.status === "rejected" && pullRequestsResult.status === "rejected") {
      warnings.push(`${repoPath}: Issues sync failed: ${issuesResult.reason.message} Pull requests sync failed: ${pullRequestsResult.reason.message}`);
      return null;
    }

    if (issuesResult.status === "rejected") {
      warnings.push(`${repoPath}: Issues sync failed: ${issuesResult.reason.message}`);
    }
    if (pullRequestsResult.status === "rejected") {
      warnings.push(`${repoPath}: Pull requests sync failed: ${pullRequestsResult.reason.message}`);
    }

    return {
      repoPath,
      issues: issuesResult.status === "fulfilled" ? issuesResult.value : previousRepo?.issues || [],
      pullRequests: pullRequestsResult.status === "fulfilled" ? pullRequestsResult.value : previousRepo?.pullRequests || [],
    };
  }))).filter(Boolean);

  // upsert replaces prior cached data for a repo instead of appending stale duplicates.
  syncedRepos.forEach(upsertGithubRepo);
  return { syncedRepos, warnings };
}

// ---------------------------------------------------------------------------
// Background GitHub auto-sync
//
// FUTURE DEVS — this is the knob to play with. GITHUB_SYNC_INTERVAL_MS is how
// often, in milliseconds, synced repos quietly re-pull issues + PRs while the
// page is open and visible. We ship 60_000 (60s) because that stays well under
// GitHub's authenticated REST limit (5,000 req/hr; this app spends ~2 requests
// per repo per sync). Tune it:
//   • Lower = fresher data. With a PAT you can safely go down to ~15s.
//   • WITHOUT a token GitHub only allows 60 req/hr (~one sync every 2 min) — go
//     below that and you'll get rate-limited (HTTP 403).
//   • Set to 0 to disable background polling entirely (manual sync still works).
// To get near-real-time without burning the budget, add conditional requests
// (ETag / If-None-Match) — 304 "Not Modified" responses don't count against the
// rate limit. Hook that into ghFetchAllPages() in github-client.js.
// ---------------------------------------------------------------------------

const GITHUB_SYNC_INTERVAL_MS = 60_000;

let githubSyncTimer = null;
let githubSyncInFlight = false;

/**
 * One background sync tick: re-pull every currently-synced repo using the
 * session's saved token and re-render. Quiet by design — no activity log
 * (would spam the feed every interval) and no filter reset (would disrupt
 * what the user is looking at). The in-flight guard prevents overlap if a
 * sync ever runs longer than the interval.
 *
 * @returns {Promise<void>}
 */
async function refreshGithubReposQuietly() {
  if (githubSyncInFlight) return;
  const repoPaths = currentGithubRepos().map(repo => repo.repoPath);
  if (!repoPaths.length) return;

  githubSyncInFlight = true;
  try {
    const token = sessionStorage.getItem("sitrep_gh_token") || "";
    const { syncedRepos } = await fetchAndStoreGithubRepos(repoPaths, token);
    // GitHub data lives in localStorage (already upserted above), so renderAll()
    // alone reflects it — no Supabase reload needed on the quiet path.
    if (syncedRepos.length) renderAll();
  } catch (err) {
    console.error("Background GitHub sync failed:", err);
  } finally {
    githubSyncInFlight = false;
  }
}

/**
 * Start the background auto-sync loop (idempotent — safe to call more than
 * once). Each tick is skipped while the tab is hidden, so a backgrounded tab
 * doesn't waste rate-limit budget, and while the issue modal is open, so a
 * refresh never yanks the view out from under an in-progress edit.
 *
 * @returns {void}
 */
function startGithubAutoSync() {
  if (!GITHUB_SYNC_INTERVAL_MS || githubSyncTimer) return;
  githubSyncTimer = setInterval(() => {
    if (document.hidden) return;
    if (!document.getElementById("issue-modal")?.hidden) return;
    refreshGithubReposQuietly();
  }, GITHUB_SYNC_INTERVAL_MS);
}

// ---------------------------------------------------------------------------
// Sync / unsync dialogs
// ---------------------------------------------------------------------------

/**
 * Show the GitHub sync dialog. On submit, fetch every issue for the
 * given `owner/repo` (optionally with a PAT for higher rate limits or
 * private repos), store them under the active circle's repo set, log an
 * activity event, and re-render. The chosen repo is remembered in
 * sessionStorage so the next sync defaults to it.
 *
 * @see fetchGitHubIssues in [./github-issues.js](github-issues.js)
 * @returns {void}
 */
function openGitHubSyncModal() {
  const savedRepo = activeGithubRepo()?.repoPath || sessionStorage.getItem("sitrep_gh_repo") || "cse110-sp26-group13/CSE-110-SE-SitRep";

  openModal("Sync with GitHub", `
    <form id="gh-sync-form" class="issue-form">
      <div class="field-row">
        <label class="field">
          <span>Repository Paths (owner/repo)</span>
          <textarea id="gh-repos" rows="3" required placeholder="owner/repo&#10;https://github.com/owner/another-repo">${escapeHTML(savedRepo)}</textarea>
        </label>
      </div>
      <div class="field-row">
        <label class="field">
          <span>Personal Access Token (Required for private repos)</span>
          <input type="password" id="gh-token" placeholder="ghp_... or github_pat_..." />
          <small class="field-help">Private repos need repo access plus read access to Issues and Pull requests.</small>
        </label>
      </div>
      <p id="gh-error" class="field-error" hidden></p>
      <div class="form-actions">
        <button type="button" class="btn-secondary" data-modal-cancel>Cancel</button>
        <button type="submit" class="btn-primary" id="gh-sync-btn">Pull Issues + PRs</button>
      </div>
    </form>
  `);
  document.getElementById("issue-modal").querySelector(".modal")?.classList.add("modal--compact");

  document.getElementById("gh-sync-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    let repos;
    const token = document.getElementById("gh-token").value.trim();
    const errorEl = document.getElementById("gh-error");
    const btn = document.getElementById("gh-sync-btn");

    try {
      repos = normalizeRepoPaths(document.getElementById("gh-repos").value);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
      return;
    }

    if (!repos.length) {
      errorEl.textContent = "Add at least one repository path.";
      errorEl.hidden = false;
      return;
    }

    try {
      btn.textContent = "Syncing...";
      btn.disabled = true;
      errorEl.hidden = true;

      const { syncedRepos, warnings } = await fetchAndStoreGithubRepos(repos, token);

      if (!syncedRepos.length) {
        throw new Error(`GitHub sync failed. ${warnings.join(" ")}`);
      }

      sessionStorage.setItem("sitrep_gh_repo", syncedRepos.at(-1).repoPath);
      sessionStorage.setItem("sitrep_gh_token", token);

      const issueCount = syncedRepos.reduce((sum, repo) => sum + repo.issues.length, 0);
      const prCount = syncedRepos.reduce((sum, repo) => sum + repo.pullRequests.length, 0);
      // Activity text records raw synced totals, independent of the current visible filters.
      const openIssues = syncedRepos.reduce((sum, repo) => sum + repo.issues.filter(issue => issue.status !== "resolved").length, 0);
      const resolvedIssues = issueCount - openIssues;
      // Reset filters so a fresh sync does not look empty because of a stale saved filter.
      state.statusFilter = "open";
      state.severityFilter = "all";
      saveState();
      await db.addActivity("checkin", `Synced ${issueCount} issues (${openIssues} open, ${resolvedIssues} resolved) and ${prCount} PRs from ${syncedRepos.length} GitHub repo${syncedRepos.length === 1 ? "" : "s"}`);
      await db.loadAll();
      renderAll();
      // Now that a repo is synced, keep it fresh in the background.
      startGithubAutoSync();

      if (warnings.length) {
        errorEl.textContent = `Partial sync completed. ${warnings.join(" ")}`;
        errorEl.hidden = false;
        btn.textContent = "Pull Issues + PRs";
        btn.disabled = false;
        return;
      }

      closeModal();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
      btn.textContent = "Pull Issues + PRs";
      btn.disabled = false;
    }
  });

  bindModalDismissers();
}

/**
 * Remove the active GitHub repo from local issue sync state, clear
 * session-scoped GitHub credentials, and log the unsync action,
 * reporting both synced issue and pull request counts.
 *
 * Side effects: mutates local GitHub repo state, clears session storage,
 * writes an activity row through `db.addActivity()`, reloads data, and
 * re-renders the page.
 *
 * @returns {Promise<void>}
 */
async function unsyncGitHub() {
  const activeRepo = activeGithubRepo();
  if (!activeRepo) return;
  const syncedIssues = (activeRepo.issues || []).length;
  const syncedPullRequests = (activeRepo.pullRequests || []).length;
  const repoPath = activeRepo.repoPath;

  removeGithubRepo(repoPath);
  sessionStorage.setItem("sitrep_gh_repo", activeGithubRepo()?.repoPath || "");
  if (!activeGithubRepo()) sessionStorage.removeItem("sitrep_gh_repo");
  sessionStorage.removeItem("sitrep_gh_token");

  try {
    await db.addActivity("checkin", `Unsynced ${syncedIssues} GitHub issues and ${syncedPullRequests} PRs from ${repoPath}`);
    await db.loadAll();
  } catch (err) {
    console.error("Failed to log GitHub unsync:", err);
  }

  renderAll();
}
