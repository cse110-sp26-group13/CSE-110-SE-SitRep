const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2 };
const STATUS_LABEL = { open: "Open", "in-progress": "In progress", resolved: "Resolved" };

function formatIssueDate(dateString) {
  if (!dateString) return "";
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function isIssueOverdue(issue) {
  if (!issue.dueDate || issue.status === "resolved") return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(`${issue.dueDate}T00:00:00`);
  return due < today;
}

function statusMatchesFilter(status, filter) {
  if (filter === "all") return true;
  if (filter === "open") return status === "open" || status === "in-progress";
  if (filter === "resolved") return status === "resolved";
  return true;
}

function renderBlockers() {
  const all = effectiveBlockers();
  const filtered = all
    .filter(b => state.severityFilter === "all" || b.severity === state.severityFilter)
    .filter(b => statusMatchesFilter(b.status, state.statusFilter))
    .sort((a, b) => {
      const aResolved = a.status === "resolved" ? 1 : 0;
      const bResolved = b.status === "resolved" ? 1 : 0;
      if (aResolved !== bResolved) return aResolved - bResolved;
      return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    });

  const list = document.getElementById("blocker-list");
  if (!filtered.length) {
    const totalOpen = all.filter(b => b.status !== "resolved").length;
    list.innerHTML = `<li class="empty">No issues match this view. ${
      totalOpen === 0 ? "Team's unblocked." : ""
    }</li>`;
  } else {
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

function teammateOptions(selectedId) {
  return teammates.map(t =>
    `<option value="${escapeHTML(t.id)}"${t.id === selectedId ? " selected" : ""}>${escapeHTML(t.name)}</option>`
  ).join("");
}

function severityOptions(selected) {
  return ["critical", "high", "medium"].map(s =>
    `<option value="${s}"${s === selected ? " selected" : ""}>${s[0].toUpperCase() + s.slice(1)}</option>`
  ).join("");
}

function categoryOptions(selected) {
  const placeholder = `<option value="" disabled${!selected ? " selected" : ""}>Select category</option>`;
  return placeholder + ["ui", "swe", "backend"].map(c =>
    `<option value="${c}"${c === selected ? " selected" : ""}>${c.toUpperCase()}</option>`
  ).join("");
}

function openModal(titleText, bodyHTML) {
  document.getElementById("issue-modal-title").textContent = titleText;
  document.getElementById("issue-modal-body").innerHTML = bodyHTML;
  document.getElementById("issue-modal").hidden = false;
}

function closeModal() {
  document.getElementById("issue-modal").hidden = true;
  document.getElementById("issue-modal-body").innerHTML = "";
}

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
        <button type="submit" class="btn-primary">Create issue</button>
      </div>
    </form>
  `);
  document.getElementById("issue-title").focus();

  document.getElementById("issue-create-form").addEventListener("submit", e => {
    e.preventDefault();
    const title = document.getElementById("issue-title").value.trim();
    if (!title) return;
    const description = document.getElementById("issue-desc").value.trim();
    const severity = document.getElementById("issue-sev").value;
    const ownerId = document.getElementById("issue-owner").value;
    const ownerObj = teammates.find(t => t.id === ownerId);
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

    const newId = `u${Date.now()}`;
    state.extraBlockers.unshift({
      id: newId,
      title,
      description,
      severity,
      status: "open",
      ownerId,
      owner: ownerObj?.name ?? "Unassigned",
      postedAt: nowTime(),
      startDate,
      dueDate,
      category,
      comments: [],
    });

    pushActivity({
      type: "blocker",
      who: teammates.find(t => t.id === team.currentUserId)?.name ?? "You",
      text: `opened a ${severity} issue — ${title}`,
    });

    saveState();
    closeModal();
    renderAll();
  });

  bindModalDismissers();
}

function openDetailModal(id) {
  const b = findBlockerById(id);
  if (!b) return;

  const ov = state.blockerOverrides[id] || {};
  const currentStartDate = ov.startDate ?? b.startDate ?? "";
  const currentDueDate = ov.dueDate ?? b.dueDate ?? "";
  const currentCategory = ov.category ?? b.category ?? "swe";

  const commentsHTML = b.comments.length
    ? b.comments.map(c => `
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

  document.getElementById("issue-status").addEventListener("change", e => {
    const newStatus = e.target.value;
    if (newStatus === b.status) return;
    updateBlocker(id, { status: newStatus });
    pushActivity({
      type: "blocker",
      who: teammates.find(t => t.id === team.currentUserId)?.name ?? "You",
      text: `set "${b.title}" to ${STATUS_LABEL[newStatus]}`,
    });
    saveState();
    renderAll();
    openDetailModal(id);
  });

  document.getElementById("detail-start").addEventListener("change", e => {
    updateBlocker(id, { startDate: e.target.value });
    saveState();
    renderAll();
  });

  document.getElementById("detail-due").addEventListener("change", e => {
    updateBlocker(id, { dueDate: e.target.value });
    saveState();
    renderAll(); 
  });

  document.getElementById("detail-category").addEventListener("change", e => {
    updateBlocker(id, { category: e.target.value });
    saveState();
    renderAll();
  });

  document.getElementById("comment-form").addEventListener("submit", e => {
    e.preventDefault();
    const input = document.getElementById("comment-input");
    const text = input.value.trim();
    if (!text) return;
    const me = teammates.find(t => t.id === team.currentUserId);
    const newComments = [...b.comments, {
      id: `c${Date.now()}`,
      who: me?.name ?? "You",
      text,
      time: nowTime(),
    }];
    updateBlocker(id, { comments: newComments });
    saveState();
    renderAll();
    openDetailModal(id);
  });

  bindModalDismissers();
}

function bindModalDismissers() {
  document.querySelectorAll("[data-modal-cancel]").forEach(el =>
    el.addEventListener("click", closeModal));
}

function bindBlockerControls() {
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'sync-gh-btn') {
      openGitHubSyncModal();
    }
  });
  document.querySelectorAll("#severity-filters .chip").forEach(c => {
    c.addEventListener("click", () => {
      state.severityFilter = c.dataset.sev;
      saveState();
      renderBlockers();
    });
  });
  document.querySelectorAll("#status-filters .chip").forEach(c => {
    c.addEventListener("click", () => {
      state.statusFilter = c.dataset.status;
      saveState();
      renderBlockers();
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

function openGitHubSyncModal() {
  const savedRepo = sessionStorage.getItem("sitrep_gh_repo") || "cse110-sp26-group13/CSE-110-SE-SitRep";
  
  openModal("Sync with GitHub (v2)", `
    <form id="gh-sync-form" class="issue-form">
      <div class="field-row">
        <label class="field">
          <span>Repository Path (owner/repo)</span>
          <input type="text" id="gh-repo" value="${escapeHTML(savedRepo)}" required />
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
        <button type="submit" class="btn-primary" id="gh-sync-btn">Pull Issues</button>
      </div>
    </form>
  `);

  document.getElementById("gh-sync-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const repo = document.getElementById("gh-repo").value.trim();
    const token = document.getElementById("gh-token").value.trim();
    const errorEl = document.getElementById("gh-error");
    const btn = document.getElementById("gh-sync-btn");

    try {
      btn.textContent = "Syncing...";
      btn.disabled = true;
      errorEl.hidden = true;

      const issues = await fetchGitHubIssues(repo, token);
      sessionStorage.setItem("sitrep_gh_repo", repo);
      setGithubIssues(issues);
      
      pushActivity({
        type: "checkin",
        who: "System",
        text: `Synced ${issues.length} issues from GitHub (${repo})`,
      });

      closeModal();
      renderAll();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
      btn.textContent = "Pull Issues";
      btn.disabled = false;
    }
  });

  bindModalDismissers();
}