/**
 * Issues panel for the (GitHub-only) Git-Glance page — the issue list,
 * filters, and the create/detail modals.
 *
 * The list shows the active repo's GitHub-synced issues (see
 * effectiveActiveGithubBlockers in [../selectors.js](../selectors.js)).
 * Creating, resolving/reopening, and commenting all go straight to the
 * GitHub API; there is no Supabase write path on this page.
 *
 * GitHub sync orchestration (the sync/unsync dialogs, repo-path parsing,
 * and the background poller) lives in
 * [./github/github-sync.js](github/github-sync.js).
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
  // The Open tab includes both untouched and in-progress issues.
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
 * Build the `<li>` markup for one issue row. Rows are clickable; the
 * `data-open` id is read back in renderBlockers to open the detail modal.
 *
 * @param {object} b - a blocker/issue from effectiveActiveGithubBlockers().
 * @returns {string}
 */
function blockerRowTemplate(b) {
  const commentCount = b.comments?.length ?? 0;
  const commentBadge = commentCount
    ? html`<span class="blocker-comments" title="${commentCount} comment${commentCount === 1 ? "" : "s"}">💬 ${commentCount}</span>`
    : "";

  const overdue = isIssueOverdue(b);
  const dueBadge = b.dueDate
    ? html`<span class="blocker-due ${overdue ? "overdue" : ""}">${overdue ? "Overdue" : "Due"} ${formatIssueDate(b.dueDate)}</span>`
    : "";

  const categoryBadge = b.category
    ? html`<span class="cat-badge cat-${b.category}">${b.category.toUpperCase()}</span>`
    : "";

  return html`
    <li class="blocker-row status-${b.status}" data-open="${b.id}">
      <span class="sev-tag sev-${b.severity}">${b.severity}</span>
      <div class="blocker-main">
        <div class="blocker-title">${b.title}</div>
        <div class="blocker-meta">
          <span class="status-pill status-${b.status}">${STATUS_LABEL[b.status] || b.status}</span>
          ${categoryBadge}
          <span>${b.owner} · ${b.postedAt}</span>
          ${dueBadge}
          ${commentBadge}
        </div>
      </div>
    </li>`;
}

/**
 * Render the filtered issue list into `#blocker-list`, refresh the active
 * state on the severity/status filter chips, and bind row click handlers
 * to open the detail modal. The list is rebuilt wholesale on every call,
 * so stale row handlers are discarded with their nodes.
 */
function renderBlockers() {
  const all = effectiveActiveGithubBlockers();
  const filtered = filteredActiveBlockers();
  const list = document.getElementById("blocker-list");

  if (!filtered.length) {
    const totalOpen = all.filter(b => b.status !== "resolved").length;
    list.innerHTML = html`<li class="empty">No issues match this view. ${
      totalOpen === 0 ? "Team's unblocked." : ""
    }</li>`;
  } else {
    list.innerHTML = html`${filtered.map(blockerRowTemplate)}`;
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

/**
 * `<option>` list of every teammate, with the given id pre-selected.
 *
 * @param {string} [selectedId]
 * @returns {string} HTML safe to drop into a `<select>`.
 */
function teammateOptions(selectedId) {
  return html`${teammates.map(t =>
    html`<option value="${t.id}"${t.id === selectedId ? " selected" : ""}>${t.name}</option>`
  )}`;
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
  return html`${["critical", "high", "medium"].map(s =>
    html`<option value="${s}"${s === selected ? " selected" : ""}>${s[0].toUpperCase() + s.slice(1)}</option>`
  )}`;
}

/**
 * `<option>` list of categories with a disabled placeholder when
 * nothing is selected — forces a deliberate choice on create.
 *
 * @param {"ui"|"swe"|"backend"|""} [selected]
 * @returns {string}
 */
function categoryOptions(selected) {
  return html`
    <option value="" disabled${!selected ? " selected" : ""}>Select category</option>
    ${["ui", "swe", "backend"].map(c =>
      html`<option value="${c}"${c === selected ? " selected" : ""}>${c.toUpperCase()}</option>`
    )}`;
}

/**
 * Show the shared issue modal with the given title and body HTML.
 * The caller is responsible for binding any handlers inside `bodyHTML`
 * after this returns.
 *
 * @param {string} titleText
 * @param {string|SafeHTML} bodyHTML - a plain string or an `html`-tagged result.
 */
function openModal(titleText, bodyHTML) {
  const modal = document.getElementById("issue-modal");
  modal.querySelector(".modal")?.classList.remove("modal--compact");
  document.getElementById("issue-modal-title").textContent = titleText;
  document.getElementById("issue-modal-body").innerHTML = String(bodyHTML);
  modal.hidden = false;
}

/** Hide the issue modal and clear its body so old handlers don't linger. */
function closeModal() {
  document.getElementById("issue-modal").hidden = true;
  document.getElementById("issue-modal-body").innerHTML = "";
}

/**
 * Markup for the "New GitHub issue" form.
 *
 * @param {string} [selectedAssigneeId] - teammate id to pre-select as assignee.
 * @returns {string}
 */
function createIssueFormTemplate(selectedAssigneeId) {
  return html`
    <form id="issue-create-form" class="issue-form">
      <label class="field">
        <span>Title</span>
        <input type="text" id="issue-title" required placeholder="Short summary of the issue" />
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
          <select id="issue-owner">${teammateOptions(selectedAssigneeId)}</select>
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
        <button type="submit" class="btn-primary">Create GitHub issue</button>
      </div>
    </form>
  `;
}

/**
 * Open the "New issue" form, validate dates on submit, create the
 * issue on the active GitHub repo, and append it to the local synced set
 * before re-rendering. This page is GitHub-only, so there is no Supabase
 * issue-creation path here.
 */
function openCreateModal() {
  const me = teammates.find(t => t.id === team.currentUserId);
  openModal("New issue", createIssueFormTemplate(me?.id));
  document.getElementById("issue-title").focus();

  document.getElementById("issue-create-form").addEventListener("submit", async e => {
    e.preventDefault();
    const title = document.getElementById("issue-title").value.trim();
    const dateError = document.getElementById("date-error");
    if (!title) {
      dateError.textContent = "Title is required.";
      dateError.hidden = false;
      return;
    }
    const description = document.getElementById("issue-desc").value.trim();
    const startDate = document.getElementById("issue-start").value;
    const dueDate = document.getElementById("issue-due").value;

    if (startDate && dueDate && startDate > dueDate) {
      dateError.textContent = "Start date must be before due date.";
      dateError.hidden = false;
      return;
    }
    dateError.hidden = true;

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
        startDate,
        dueDate,
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
 * Markup for the comment list inside the detail modal, or an empty-state
 * row when there are none.
 *
 * @param {Array<{who: string, time: string, text: string}>} comments
 * @returns {string}
 */
function commentListTemplate(comments) {
  if (!comments.length) {
    return html`<li class="empty comment-empty">No comments yet.</li>`;
  }
  return html`${comments.map(c => html`
        <li class="comment">
          <div class="comment-head">
            <span class="comment-who">${c.who}</span>
            <span class="comment-time">${c.time}</span>
          </div>
          <div class="comment-text">${c.text}</div>
        </li>`)}`;
}

/**
 * Markup for the issue detail modal body: severity, the status select,
 * assignee, opened date, description, and the comments section.
 *
 * GitHub issues are open or closed, so the status select offers only those
 * two states (the app labels closed as "resolved").
 *
 * @param {object} b - the issue from findBlockerById().
 * @param {string} commentsHTML - pre-rendered comment list markup.
 * @returns {string}
 */
function issueDetailTemplate(b, commentsHTML) {
  const statusOptions = html`${["open", "resolved"].map(s =>
    html`<option value="${s}"${s === b.status ? " selected" : ""}>${STATUS_LABEL[s]}</option>`
  )}`;

  const opened = b.startDate
    ? html`<span class="issue-posted-meta">Opened ${formatIssueDate(b.startDate)}</span>`
    : "";

  // Escape the description ourselves, then turn newlines into <br> — so it's
  // pre-sanitized HTML and passed through with raw() rather than re-escaped.
  const description = b.description
    ? raw(escapeHTML(b.description).replace(/\n/g, "<br>"))
    : html`<span class="text-muted">No description provided.</span>`;

  return html`
    <div class="issue-detail">
      <div class="issue-meta-row">
        <span class="sev-tag sev-${b.severity}">${b.severity}</span>
        <label class="status-select-wrap">
          <span class="status-select-label">Status</span>
          <select id="issue-status">${statusOptions}</select>
        </label>
        <span class="issue-owner-meta">Assigned to <strong>${b.owner}</strong></span>
        ${opened}
      </div>

      <div class="issue-description">${description}</div>

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
    </div>`;
}

/**
 * Open the issue detail modal for a GitHub-synced issue. Shows severity,
 * status, assignee, description, and comments. The writable controls are
 * the status select (resolves or reopens the issue on GitHub) and the
 * comment form (posts a comment to GitHub).
 *
 * This page is GitHub-only (see effectiveActiveGithubBlockers in
 * [../selectors.js](../selectors.js)), so every row is a `gh-` issue and
 * the modal talks only to the GitHub API — there is no Supabase write path.
 *
 * @param {string} id - `gh-`-prefixed issue id from the rendered list.
 */
async function openDetailModal(id) {
  const b = findBlockerById(id);
  if (!b) return;

  let comments = b.comments ?? [];
  if (b.ghNumber) {
    try {
      comments = await fetchGitHubComments(b.ghNumber, b.repoPath);
    } catch (err) {
      console.error("Failed to fetch GitHub comments:", err);
    }
  }

  openModal(b.title, issueDetailTemplate(b, commentListTemplate(comments)));

  document.getElementById("issue-status").addEventListener("change", async e => {
    const newStatus = e.target.value;
    if (newStatus === b.status) return;
    // "resolved" closes the issue on GitHub; "open" reopens it.
    const ghState = newStatus === "resolved" ? "closed" : "open";
    try {
      await setGitHubIssueState(b.ghNumber, ghState, b.repoPath);
    } catch (err) {
      console.error("Failed to update GitHub issue state:", err);
      return;
    }
    const updated = activeGithubIssues().map(issue =>
      issue.ghNumber === b.ghNumber ? { ...issue, status: newStatus } : issue
    );
    updateActiveGithubIssues(updated);
    renderAll();
    closeModal();
  });

  document.getElementById("comment-form").addEventListener("submit", async e => {
    e.preventDefault();
    const text = document.getElementById("comment-input").value.trim();
    if (!text) return;
    try { await addGitHubComment(b.ghNumber, text, b.repoPath); }
    catch (err) { console.error("Failed to post GitHub comment:", err); }
    await openDetailModal(id);
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
 *
 * Side effects: registers DOM event handlers and re-renders through
 * `renderAll()` after filter changes so page-local issue counts stay
 * in sync without directly depending on `updateIssuesSub()`.
 *
 * @returns {void}
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
      renderAll();
      // Previous direct subtitle refresh; renderAll() now owns this page-level update.
      // updateIssuesSub();
    });
  });
  document.querySelectorAll("#status-filters .chip").forEach(c => {
    c.addEventListener("click", () => {
      state.statusFilter = c.dataset.status;
      saveState();
      renderAll();
      // Previous direct subtitle refresh; renderAll() now owns this page-level update.
      // updateIssuesSub();
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

  // Resume background auto-sync for repos synced in a previous session.
  // GitHub sync orchestration lives in [./github/github-sync.js](github/github-sync.js).
  if (currentGithubRepos().length) startGithubAutoSync();
}
