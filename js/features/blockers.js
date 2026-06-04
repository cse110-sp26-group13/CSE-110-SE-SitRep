/**
 * Blockers panel — issue list, create/detail modals, and the GitHub
 * sync dialog. Reads from effectiveBlockers() (Supabase + GH-synced)
 * and writes to Supabase through db.* helpers.
 *
 * GitHub-synced rows have ids prefixed `gh-` and live in localStorage;
 * status/comment edits on those are blocked because there's no
 * persistence target yet.
 */

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2 };
const STATUS_LABEL = { open: "Open", "in-progress": "In progress", resolved: "Resolved" };

/**
 * Format a YYYY-MM-DD date string as a short local date ("May 18").
 * The `T00:00:00` suffix anchors the date to local midnight so it
 * doesn't drift across timezones when rendered.
 *
 * @param {string} dateString
 * @returns {string}
 */
function formatIssueDate(dateString) {
  if (!dateString) return "";
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * True if the issue has a due date in the past and is not yet resolved.
 * Resolved issues are never "overdue" even if their due date passed.
 *
 * @param {{dueDate?: string, status: string}} issue
 * @returns {boolean}
 */
function isIssueOverdue(issue) {
  if (!issue.dueDate || issue.status === "resolved") return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(`${issue.dueDate}T00:00:00`);
  return due < today;
}

/**
 * Whether a blocker's status matches the active filter chip.
 * The "open" filter intentionally folds in "in-progress" so users
 * don't lose track of work they've already started.
 *
 * @param {"open"|"in-progress"|"resolved"} status
 * @param {"all"|"open"|"resolved"} filter
 * @returns {boolean}
 */
function statusMatchesFilter(status, filter) {
  // The Open tab includes both untouched and in-progress assignments.
  if (filter === "all") return true;
  if (filter === "open") return status === "open" || status === "in-progress";
  if (filter === "resolved") return status === "resolved";
  return true;
}

/**
 * Shared filtered view for rendering and for the "shown" count in the header.
 *
 * Sort order: resolved sink to the bottom, then by severity
 * (critical → high → medium).
 */
function filteredActiveBlockers() {
  return effectiveActiveGithubBlockers()
    .filter(b => state.severityFilter === "all" || b.severity === state.severityFilter)
    .filter(b => statusMatchesFilter(b.status, state.statusFilter))
    .sort((a, b) => {
      const aResolved = a.status === "resolved" ? 1 : 0;
      const bResolved = b.status === "resolved" ? 1 : 0;
      if (aResolved !== bResolved) return aResolved - bResolved;
      return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    });
}

/**
 * Render the filtered blocker list into `#blocker-list`, refresh the
 * active state on the severity/status filter chips, and rebind row
 * click handlers to open the detail modal.
 */
function renderBlockers() {
  const all = effectiveActiveGithubBlockers();
  const filtered = filteredActiveBlockers();

  // Re-render the full list each time filters, sync data, or local assignments change.
  const list = document.getElementById("blocker-list");
  if (!filtered.length) {
    const totalOpen = all.filter(b => b.status !== "resolved").length;
    list.innerHTML = `<li class="empty">No issues match this view. ${
      totalOpen === 0 ? "Team's unblocked." : ""
    }</li>`;
  } else {
    // Rows are clickable; the data-open id is used below to open the detail modal.
    list.innerHTML = filtered.map(b => {
      const commentCount = b.comments?.length ?? 0;
      const commentBadge = commentCount
        ? `<span class="blocker-comments" title="${commentCount} comment${commentCount === 1 ? "" : "s"}">💬 ${commentCount}</span>`
        : "";

      const dueBadge = b.dueDate
        ? `<span class="blocker-due ${isIssueOverdue(b) ? "overdue" : ""}">
            ${isIssueOverdue(b) ? "Overdue" : "Due"} ${formatIssueDate(b.dueDate)}
          </span>`
        : "";

      return `
      <li class="blocker-row status-${b.status}" data-open="${escapeHTML(b.id)}">
        <span class="sev-tag sev-${b.severity}">${b.severity}</span>
        <div class="blocker-main">
          <div class="blocker-title">${escapeHTML(b.title)}</div>
          <div class="blocker-meta">
            <span class="status-pill status-${b.status}">${STATUS_LABEL[b.status] || b.status}</span>
            ${b.category ? `<span class="cat-badge cat-${b.category}">${escapeHTML(b.category.toUpperCase())}</span>` : ""}
            <span>${escapeHTML(b.owner)} · ${escapeHTML(b.postedAt)}</span>
            ${dueBadge}
            ${commentBadge}
          </div>
        </div>
      </li>`;
    }).join("");
  }

  document.querySelectorAll("[data-open]").forEach(el =>
    el.addEventListener("click", () => openDetailModal(el.dataset.open)));

  document.querySelectorAll("#severity-filters .chip").forEach(c => {
    c.classList.toggle("active", c.dataset.sev === state.severityFilter);
  });
  document.querySelectorAll("#status-filters .chip").forEach(c => {
    c.classList.toggle("active", c.dataset.status === state.statusFilter);
  });
}

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
  // Session storage feeds follow-up GitHub actions like comment/create/close.
  if (activeRepo) sessionStorage.setItem("sitrep_gh_repo", activeRepo.repoPath);
  else sessionStorage.removeItem("sitrep_gh_repo");
}

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

/**
 * `<option>` list of every teammate, with the given id pre-selected.
 *
 * @param {string} [selectedId]
 * @returns {string} HTML safe to drop into a `<select>`.
 */
function teammateOptions(selectedId) {
  return teammates.map(t =>
    `<option value="${escapeHTML(t.id)}"${t.id === selectedId ? " selected" : ""}>${escapeHTML(t.name)}</option>`
  ).join("");
}

/**
 * `<option>` list of severities (critical / high / medium) with one
 * pre-selected. Order is the same as SEVERITY_ORDER so the dropdown
 * matches the sort order in the list.
 *
 * @param {"critical"|"high"|"medium"} [selected]
 * @returns {string}
 */
function severityOptions(selected) {
  return ["critical", "high", "medium"].map(s =>
    `<option value="${s}"${s === selected ? " selected" : ""}>${s[0].toUpperCase() + s.slice(1)}</option>`
  ).join("");
}

/**
 * `<option>` list of categories with a disabled placeholder when
 * nothing is selected — forces a deliberate choice on create.
 *
 * @param {"ui"|"swe"|"backend"|""} [selected]
 * @returns {string}
 */
function categoryOptions(selected) {
  const placeholder = `<option value="" disabled${!selected ? " selected" : ""}>Select category</option>`;
  return placeholder + ["ui", "swe", "backend"].map(c =>
    `<option value="${c}"${c === selected ? " selected" : ""}>${c.toUpperCase()}</option>`
  ).join("");
}

/**
 * Show the shared issue modal with the given title and body HTML.
 * The caller is responsible for binding any handlers inside `bodyHTML`
 * after this returns.
 *
 * @param {string} titleText
 * @param {string} bodyHTML
 */
function openModal(titleText, bodyHTML) {
  document.getElementById("issue-modal-title").textContent = titleText;
  document.getElementById("issue-modal-body").innerHTML = bodyHTML;
  document.getElementById("issue-modal").hidden = false;
}

/** Hide the issue modal and clear its body so old handlers don't linger. */
function closeModal() {
  document.getElementById("issue-modal").hidden = true;
  document.getElementById("issue-modal-body").innerHTML = "";
}

/**
 * Open the "New issue" form, validate dates on submit, and persist
 * the new blocker + an activity event. Re-loads from Supabase and
 * re-renders before closing the modal so the new row appears.
 */
function openCreateModal() {
  const me = teammates.find(t => t.id === team.currentUserId);
  openModal("New issue", `
    <form id="issue-create-form" class="issue-form">
      <label class="field">
        <span>Title</span>
        <input type="text" id="issue-title" required placeholder="Short summary of the blocker" />
      </label>
      <label class="field">
        <span>Description</span>
        <textarea id="issue-desc" rows="5" placeholder="Steps to reproduce, context, links..."></textarea>
      </label>
      <div class="field-row">
        <label class="field">
          <span>Severity</span>
          <select id="issue-sev">${severityOptions("high")}</select>
        </label>
        <label class="field">
          <span>Assignee</span>
          <select id="issue-owner">${teammateOptions(me?.id)}</select>
        </label>
      </div>
      <div class="field-row">
        <label class="field">
          <span>Start date</span>
          <input type="date" id="issue-start" />
        </label>
        <label class="field">
          <span>Due date</span>
          <input type="date" id="issue-due" />
        </label>
      </div>
      <p id="date-error" class="field-error" hidden></p>
      <label class="field">
        <span>Category</span>
        <select id="issue-category" required>${categoryOptions("")}</select>
      </label>
      <div class="form-actions">
        <button type="button" class="btn-secondary" data-modal-cancel>Cancel</button>
        <button type="button" class="btn-secondary" id="create-gh-issue-btn">Create GitHub issue</button>
        <button type="submit" class="btn-primary">Create issue</button>
      </div>
    </form>
  `);
  document.getElementById("issue-title").focus();

  document.getElementById("issue-create-form").addEventListener("submit", async e => {
    e.preventDefault();
    const title = document.getElementById("issue-title").value.trim();
    if (!title) return;
    const description = document.getElementById("issue-desc").value.trim();
    const severity = document.getElementById("issue-sev").value;
    const ownerId = document.getElementById("issue-owner").value;
    const startDate = document.getElementById("issue-start").value;
    const dueDate = document.getElementById("issue-due").value;
    const category = document.getElementById("issue-category").value;
    const dateError = document.getElementById("date-error");

    if (startDate && dueDate && startDate > dueDate) {
      dateError.textContent = "Start date must be before due date.";
      dateError.hidden = false;
      return;
    }
    dateError.hidden = true;

    await db.createBlocker({
      title, description, severity, ownerId, startDate, dueDate, category,
    });
    await db.addActivity("blocker", `opened a ${severity} issue — ${title}`);
    await db.loadAll();
    closeModal();
    renderAll();
  });

  document.getElementById("create-gh-issue-btn").addEventListener("click", async () => {
    const title = document.getElementById("issue-title").value.trim();
    const dateError = document.getElementById("date-error");
    if (!title) {
      dateError.textContent = "Title is required.";
      dateError.hidden = false;
      return;
    }
    const description = document.getElementById("issue-desc").value.trim();
    try {
      const ghIssue = await createGitHubIssue(title, description);
      const ownerSelect = document.getElementById("issue-owner");
      const newGhIssue = {
        id: `gh-${ghIssue.id}`,
        repoPath: activeGithubRepo()?.repoPath || sessionStorage.getItem("sitrep_gh_repo") || "",
        ghNumber: ghIssue.number,
        title: ghIssue.title,
        description: ghIssue.body || "",
        severity: document.getElementById("issue-sev").value,
        status: "open",
        owner: ownerSelect.options[ownerSelect.selectedIndex].text,
        postedAt: "GitHub Sync",
        startDate: document.getElementById("issue-start").value,
        dueDate: document.getElementById("issue-due").value,
        category: document.getElementById("issue-category").value,
        comments: [],
        isExternal: true,
      };
      appendIssueToActiveGithubRepo(newGhIssue);
      closeModal();
      renderAll();
    } catch (err) {
      dateError.textContent = err.message;
      dateError.hidden = false;
    }
  });

  bindModalDismissers();
}

/**
 * Open the issue detail modal for a blocker. Lets the user edit
 * status / start / due / category and post comments inline; each
 * change persists to Supabase and re-renders.
 *
 * GitHub-synced issues (id prefixed `gh-`) are read-only here —
 * edits are no-ops and comments show an alert, because there's no
 * place to persist the change (the active circle's cached repos in
 * [state.js](../state.js) are rewritten wholesale on next sync).
 *
 * @param {string} id - blocker id from effectiveBlockers().
 */
async function openDetailModal(id) {
  const b = findBlockerById(id);
  if (!b) return;

  const currentStartDate = b.startDate ?? "";
  const currentDueDate = b.dueDate ?? "";
  const currentCategory = b.category ?? "swe";

  // GitHub-synced issues live in localStorage, not Postgres — guard those.
  const isGithubIssue = String(id).startsWith("gh-");

  let displayComments = b.comments ?? [];
  if (isGithubIssue && b.ghNumber) {
    try {
      displayComments = await fetchGitHubComments(b.ghNumber, b.repoPath);
    } catch (err) {
      console.error("Failed to fetch GitHub comments:", err);
    }
  }

  const commentsHTML = displayComments.length
    ? displayComments.map(c => `
        <li class="comment">
          <div class="comment-head">
            <span class="comment-who">${escapeHTML(c.who)}</span>
            <span class="comment-time">${escapeHTML(c.time)}</span>
          </div>
          <div class="comment-text">${escapeHTML(c.text)}</div>
        </li>`).join("")
    : `<li class="empty comment-empty">No comments yet.</li>`;

  openModal(b.title, `
    <div class="issue-detail">
      <div class="issue-meta-row">
        <span class="sev-tag sev-${b.severity}">${b.severity}</span>
        <label class="status-select-wrap">
          <span class="status-select-label">Status</span>
          <select id="issue-status">
            ${["open", "in-progress", "resolved"].map(s =>
              `<option value="${s}"${s === b.status ? " selected" : ""}>${STATUS_LABEL[s]}</option>`
            ).join("")}
          </select>
        </label>
        <span class="issue-owner-meta">Assigned to <strong>${escapeHTML(b.owner)}</strong></span>
        <span class="issue-posted-meta">Opened ${escapeHTML(b.postedAt)}</span>
      </div>

      <div class="field-row issue-dates-row">
        <label class="field">
          <span>Start date</span>
          <input type="date" id="detail-start" value="${escapeHTML(currentStartDate)}" />
        </label>
        <label class="field">
          <span>Due date</span>
          <input type="date" id="detail-due" value="${escapeHTML(currentDueDate)}" />
        </label>
        <label class="field">
          <span>Category</span>
          <select id="detail-category">${categoryOptions(currentCategory)}</select>
        </label>
      </div>

      <div class="issue-description">
        ${b.description
          ? escapeHTML(b.description).replace(/\n/g, "<br>")
          : `<span class="text-muted">No description provided.</span>`}
      </div>

      <div class="comments-section">
        <h4 class="comments-title">Comments</h4>
        <ul class="comment-list">${commentsHTML}</ul>
        <form id="comment-form" class="comment-form">
          <textarea id="comment-input" rows="2" placeholder="Leave a comment..."></textarea>
          <div class="form-actions">
            <button type="button" class="btn-secondary" data-modal-cancel>Close</button>
            <button type="submit" class="btn-primary">Comment</button>
          </div>
        </form>
      </div>
    </div>
  `);

  document.getElementById("issue-status").addEventListener("change", async e => {
    const newStatus = e.target.value;
    if (newStatus === b.status) return;
    if (isGithubIssue) {
      if (newStatus === "resolved") {
        try { await closeGitHubIssue(b.ghNumber, b.repoPath); }
        catch (err) { console.error("Failed to close GitHub issue:", err); }
        const updated = (activeGithubIssues() || []).map(issue =>
          issue.ghNumber === b.ghNumber ? { ...issue, status: "resolved" } : issue
        );
        updateActiveGithubIssues(updated);
        renderAll();
        closeModal();
      }
      return;
    }
    await db.updateBlocker(id, { status: newStatus });
    await db.addActivity("blocker", `set "${b.title}" to ${STATUS_LABEL[newStatus]}`);
    await db.loadAll();
    renderAll();
    openDetailModal(id);
  });

  document.getElementById("detail-start").addEventListener("change", async e => {
    if (isGithubIssue) return;
    await db.updateBlocker(id, { startDate: e.target.value });
    await db.loadAll();
    renderAll();
  });

  document.getElementById("detail-due").addEventListener("change", async e => {
    if (isGithubIssue) return;
    await db.updateBlocker(id, { dueDate: e.target.value });
    await db.loadAll();
    renderAll();
  });

  document.getElementById("detail-category").addEventListener("change", async e => {
    if (isGithubIssue) return;
    await db.updateBlocker(id, { category: e.target.value });
    await db.loadAll();
    renderAll();
  });

  document.getElementById("comment-form").addEventListener("submit", async e => {
    e.preventDefault();
    const input = document.getElementById("comment-input");
    const text = input.value.trim();
    if (!text) return;
    if (isGithubIssue) {
      try { await addGitHubComment(b.ghNumber, text, b.repoPath); }
      catch (err) { console.error("Failed to post GitHub comment:", err); }
      await openDetailModal(id);
      return;
    }
    await db.addBlockerComment(id, text);
    await db.loadAll();
    renderAll();
    openDetailModal(id);
  });

  bindModalDismissers();
}

/**
 * Wire every `[data-modal-cancel]` button inside the currently-open
 * modal to closeModal(). Called once after each openModal() so newly
 * injected cancel buttons are bound.
 */
function bindModalDismissers() {
  document.querySelectorAll("[data-modal-cancel]").forEach(el =>
    el.addEventListener("click", closeModal));
}

/**
 * One-time setup for the blockers panel: filter chips, the GitHub
 * sync button, the "new issue" button, and modal dismissers
 * (close button, backdrop click, Escape key). Called once per page
 * load — handlers persist for the lifetime of the page.
 */
function bindBlockerControls() {
  document.getElementById("sync-gh-btn")?.addEventListener("click", openGitHubSyncModal);
  document.getElementById("unsync-gh-btn")?.addEventListener("click", unsyncGitHub);
  document.getElementById("gh-repo-select")?.addEventListener("change", e => {
    setActiveGithubRepo(e.target.value);
    renderAll();
  });
  document.querySelectorAll("#severity-filters .chip").forEach(c => {
    c.addEventListener("click", () => {
      state.severityFilter = c.dataset.sev;
      saveState();
      renderBlockers();
      updateIssuesSub();
    });
  });
  document.querySelectorAll("#status-filters .chip").forEach(c => {
    c.addEventListener("click", () => {
      state.statusFilter = c.dataset.status;
      saveState();
      renderBlockers();
      updateIssuesSub();
    });
  });
  document.getElementById("add-blocker-btn").addEventListener("click", openCreateModal);

  const modal = document.getElementById("issue-modal");
  document.getElementById("issue-modal-close").addEventListener("click", closeModal);
  modal.addEventListener("click", e => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });
}

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

/**
 * Show the GitHub sync dialog. On submit, fetch every issue for the
 * given `owner/repo` (optionally with a PAT for higher rate limits or
 * private repos), store them under the active circle's repo set, log an
 * activity event, and re-render. The chosen repo is remembered in
 * sessionStorage so the next sync defaults to it.
 *
 * @see fetchGitHubIssues in [./github-api.js](github-api.js)
 */
function openGitHubSyncModal() {
  const savedRepo = activeGithubRepo()?.repoPath || sessionStorage.getItem("sitrep_gh_repo") || "cse110-sp26-group13/CSE-110-SE-SitRep";

  openModal("Sync with GitHub", `
    <form id="gh-sync-form" class="issue-form">
      <div class="field-row">
        <label class="field">
          <span>Repository Paths (owner/repo)</span>
          <textarea id="gh-repos" rows="6" required placeholder="owner/repo&#10;https://github.com/owner/another-repo">${escapeHTML(savedRepo)}</textarea>
        </label>
      </div>
      <div class="field-row">
        <label class="field">
          <span>Personal Access Token (Optional for public repos)</span>
          <input type="password" id="gh-token" placeholder="ghp_xxxxxxxxxxxxxxxxx" />
        </label>
      </div>
      <p id="gh-error" class="field-error" hidden></p>
      <div class="form-actions">
        <button type="button" class="btn-secondary" data-modal-cancel>Cancel</button>
        <button type="submit" class="btn-primary" id="gh-sync-btn">Pull Issues + PRs</button>
      </div>
    </form>
  `);

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

      const warnings = [];
      const existingRepos = currentGithubRepos();
      // Fetch issues and PRs together so one repo sync updates both sections at once.
      const syncedRepos = (await Promise.all(repos.map(async repoPath => {
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

      if (!syncedRepos.length) {
        throw new Error(`GitHub sync failed. ${warnings.join(" ")}`);
      }

      // upsert replaces prior cached data for a repo instead of appending stale duplicates.
      syncedRepos.forEach(upsertGithubRepo);
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
