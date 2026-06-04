const PR_STATUS_LABEL = { open: "Open", closed: "Closed", merged: "Merged" };

function prStatusMatchesFilter(status, filter) {
  if (filter === "all") return true;
  if (filter === "open") return status === "open";
  // Resolved means no longer active, so both merged and unmerged closed PRs belong here.
  if (filter === "resolved") return status === "closed" || status === "merged";
  return true;
}

function formatPullRequestDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function pullRequestBranchText(pr) {
  if (!pr.headRef && !pr.baseRef) return "";
  if (!pr.headRef) return pr.baseRef;
  if (!pr.baseRef) return pr.headRef;
  return `${pr.headRef} -> ${pr.baseRef}`;
}

function renderPullRequests() {
  const allPullRequests = effectivePullRequests();
  // Filter first, then sort so each tab keeps a predictable order.
  const pullRequests = allPullRequests
    .filter(pr => prStatusMatchesFilter(pr.status, state.prStatusFilter))
    .slice()
    .sort((a, b) => {
      const aOpen = a.status === "open" ? 0 : 1;
      const bOpen = b.status === "open" ? 0 : 1;
      if (aOpen !== bOpen) return aOpen - bOpen;
      return (b.updatedAt || "").localeCompare(a.updatedAt || "");
    });

  const list = document.getElementById("pull-request-list");
  if (!list) return;

  if (!pullRequests.length) {
    // Distinguish "nothing synced" from "the current filter hides everything".
    const emptyText = allPullRequests.length
      ? "No pull requests match this view."
      : "No pull requests synced yet.";
    list.innerHTML = `<li class="empty">${emptyText}</li>`;
    updatePullRequestsSub();
    updatePullRequestFilterChips();
    return;
  }

  list.innerHTML = pullRequests.map(pr => {
    // Branch text is optional because older or partial API responses may omit refs.
    const branchText = pullRequestBranchText(pr);
    const updated = formatPullRequestDate(pr.updatedAt);
    const draftBadge = pr.draft ? `<span class="pr-draft">Draft</span>` : "";
    const mergeableBadge = pr.mergeableState
      ? `<span class="pr-mergeable">${escapeHTML(pr.mergeableState)}</span>`
      : "";
    const title = `#${pr.ghNumber} ${pr.title}`;

    return `
      <li class="pull-request-row status-${escapeHTML(pr.status)}">
        <a class="pull-request-link" href="${escapeHTML(pr.htmlUrl)}" target="_blank" rel="noopener">
          <div class="pull-request-main">
            <div class="pull-request-title">${escapeHTML(title)}</div>
            <div class="blocker-meta">
              <span class="status-pill status-${escapeHTML(pr.status)}">${PR_STATUS_LABEL[pr.status] || pr.status}</span>
              ${draftBadge}
              ${mergeableBadge}
              ${branchText ? `<span>${escapeHTML(branchText)}</span>` : ""}
              <span>${escapeHTML(pr.author)}${updated ? ` · updated ${escapeHTML(updated)}` : ""}</span>
            </div>
          </div>
        </a>
      </li>`;
  }).join("");

  updatePullRequestsSub();
  updatePullRequestFilterChips();
}

function updatePullRequestsSub() {
  const pullRequests = effectivePullRequests();
  // Counts show total synced PR state, not just the currently selected filter.
  const open = pullRequests.filter(pr => pr.status === "open").length;
  const merged = pullRequests.filter(pr => pr.status === "merged").length;
  const closed = pullRequests.filter(pr => pr.status === "closed").length;
  const sub = document.getElementById("pull-requests-sub");
  if (sub) sub.textContent = `${open} open · ${merged} merged · ${closed} closed · ${pullRequests.length} total`;
}

function updatePullRequestFilterChips() {
  // Keep the segmented control visually aligned with the persisted filter state.
  document.querySelectorAll("#pr-status-filters .chip").forEach(c => {
    c.classList.toggle("active", c.dataset.prStatus === state.prStatusFilter);
  });
}

function bindPullRequestControls() {
  renderPullRequests();
  // Changing tabs only changes the view; synced PR data stays untouched in state.
  document.querySelectorAll("#pr-status-filters .chip").forEach(c => {
    c.addEventListener("click", () => {
      state.prStatusFilter = c.dataset.prStatus;
      saveState();
      renderPullRequests();
    });
  });
}
