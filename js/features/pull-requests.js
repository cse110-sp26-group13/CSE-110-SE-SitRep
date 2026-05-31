const PR_STATUS_LABEL = { open: "Open", closed: "Closed", merged: "Merged" };

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
  const pullRequests = effectivePullRequests()
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
    list.innerHTML = `<li class="empty">No pull requests synced yet.</li>`;
    updatePullRequestsSub();
    return;
  }

  list.innerHTML = pullRequests.map(pr => {
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
}

function updatePullRequestsSub() {
  const pullRequests = effectivePullRequests();
  const open = pullRequests.filter(pr => pr.status === "open").length;
  const merged = pullRequests.filter(pr => pr.status === "merged").length;
  const closed = pullRequests.filter(pr => pr.status === "closed").length;
  const sub = document.getElementById("pull-requests-sub");
  if (sub) sub.textContent = `${open} open · ${merged} merged · ${closed} closed · ${pullRequests.length} total`;
}

function bindPullRequestControls() {
  renderPullRequests();
}
