const PR_STATUS_LABEL = { open: "Open", closed: "Closed", merged: "Merged" };
const PR_DEFAULT_REPO = "cse110-sp26-group13/CSE-110-SE-SitRep";
const PR_MERGE_CONFIRM_TEXT = "MERGE";

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

function currentPullRequestRepo() {
  return sessionStorage.getItem("sitrep_gh_repo") || PR_DEFAULT_REPO;
}

function currentPullRequestToken() {
  return sessionStorage.getItem("sitrep_gh_token") || "";
}

function pullRequestStatusWeight(pr) {
  if (pr.status === "open") return 0;
  if (pr.status === "merged") return 1;
  return 2;
}

async function refreshPullRequestsFromGitHub(repo, token) {
  const pullRequests = await fetchGitHubPullRequests(repo, token);
  setGithubPullRequests(pullRequests);
  return pullRequests;
}

function renderPullRequests() {
  const pullRequests = effectivePullRequests()
    .slice()
    .sort((a, b) => {
      const statusDiff = pullRequestStatusWeight(a) - pullRequestStatusWeight(b);
      if (statusDiff !== 0) return statusDiff;
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
    const githubLink = pr.htmlUrl
      ? `<a class="pull-request-github-link" href="${escapeHTML(pr.htmlUrl)}" target="_blank" rel="noopener">GitHub</a>`
      : "";

    return `
      <li class="pull-request-row status-${escapeHTML(pr.status)}">
        <button class="pull-request-open" type="button" data-pr-id="${escapeHTML(pr.id)}">
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
        </button>
        ${githubLink}
      </li>`;
  }).join("");

  list.querySelectorAll("[data-pr-id]").forEach(el =>
    el.addEventListener("click", () => openPullRequestDetailModal(el.dataset.prId)));

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

function showPullRequestError(errorEl, err) {
  errorEl.textContent = err.message || "GitHub request failed.";
  errorEl.hidden = false;
}

function setPullRequestButtonPending(button, isPending, label) {
  if (!button) return;
  if (isPending) {
    button.dataset.originalText = button.textContent;
    button.textContent = label;
    button.disabled = true;
    return;
  }
  button.textContent = button.dataset.originalText || button.textContent;
  button.disabled = false;
  delete button.dataset.originalText;
}

function openNewPullRequestModal() {
  const repo = currentPullRequestRepo();

  openModal("New pull request", `
    <form id="pr-create-form" class="issue-form">
      <div class="pr-repo-note">Repository <strong>${escapeHTML(repo)}</strong></div>
      <label class="field">
        <span>Title</span>
        <input type="text" id="pr-create-title" required placeholder="Short summary of the change" />
      </label>
      <label class="field">
        <span>Body</span>
        <textarea id="pr-create-body" rows="5" placeholder="Context, testing notes, screenshots..."></textarea>
      </label>
      <div class="field-row">
        <label class="field">
          <span>Head branch</span>
          <input type="text" id="pr-create-head" required placeholder="feature/my-branch" />
        </label>
        <label class="field">
          <span>Base branch</span>
          <input type="text" id="pr-create-base" required value="main" />
        </label>
      </div>
      <label class="checkbox-field">
        <input type="checkbox" id="pr-create-draft" />
        <span>Draft pull request</span>
      </label>
      <p id="pr-create-error" class="field-error" hidden></p>
      <div class="form-actions">
        <button type="button" class="btn-secondary" data-modal-cancel>Cancel</button>
        <button type="submit" class="btn-primary" id="pr-create-submit">Create PR</button>
      </div>
    </form>
  `);

  document.getElementById("pr-create-title").focus();
  document.getElementById("pr-create-form").addEventListener("submit", async e => {
    e.preventDefault();
    const errorEl = document.getElementById("pr-create-error");
    const submit = document.getElementById("pr-create-submit");
    const title = document.getElementById("pr-create-title").value.trim();
    const body = document.getElementById("pr-create-body").value.trim();
    const head = document.getElementById("pr-create-head").value.trim();
    const base = document.getElementById("pr-create-base").value.trim();
    const draft = document.getElementById("pr-create-draft").checked;

    errorEl.hidden = true;
    if (!title || !head || !base) {
      errorEl.textContent = "Title, head branch, and base branch are required.";
      errorEl.hidden = false;
      return;
    }

    try {
      setPullRequestButtonPending(submit, true, "Creating...");
      await createGitHubPullRequest(repo, { title, body, head, base, draft }, currentPullRequestToken());
      await refreshPullRequestsFromGitHub(repo, currentPullRequestToken());
      closeModal();
      renderAll();
    } catch (err) {
      showPullRequestError(errorEl, err);
      setPullRequestButtonPending(submit, false);
    }
  });

  bindModalDismissers();
}

function pullRequestNoticeHTML(message) {
  return message ? `<p class="pr-notice">${escapeHTML(message)}</p>` : "";
}

function openPullRequestDetailModal(id, notice = "") {
  const pr = findPullRequestById(id);
  if (!pr) return;

  const repo = currentPullRequestRepo();
  const updated = formatPullRequestDate(pr.updatedAt);
  const created = formatPullRequestDate(pr.createdAt);
  const body = pr.body
    ? escapeHTML(pr.body).replace(/\n/g, "<br>")
    : `<span class="text-muted">No description provided.</span>`;
  const canMutate = pr.status === "open";

  openModal(`#${pr.ghNumber} ${pr.title}`, `
    <div class="pr-detail">
      ${pullRequestNoticeHTML(notice)}
      <div class="issue-meta-row">
        <span class="status-pill status-${escapeHTML(pr.status)}">${PR_STATUS_LABEL[pr.status] || pr.status}</span>
        ${pr.draft ? `<span class="pr-draft">Draft</span>` : ""}
        <span>Repo <strong>${escapeHTML(repo)}</strong></span>
        <span>Author <strong>${escapeHTML(pr.author)}</strong></span>
      </div>

      <div class="pr-branch-grid">
        <div>
          <span class="pr-field-label">Base</span>
          <strong>${escapeHTML(pr.baseRef || "unknown")}</strong>
        </div>
        <div>
          <span class="pr-field-label">Head</span>
          <strong>${escapeHTML(pr.headRef || "unknown")}</strong>
        </div>
        <div>
          <span class="pr-field-label">Updated</span>
          <strong>${escapeHTML(updated || "unknown")}</strong>
        </div>
        <div>
          <span class="pr-field-label">Opened</span>
          <strong>${escapeHTML(created || "unknown")}</strong>
        </div>
      </div>

      <div class="issue-description">${body}</div>

      ${pr.htmlUrl ? `
        <a class="btn-secondary pr-github-button" href="${escapeHTML(pr.htmlUrl)}" target="_blank" rel="noopener">Open on GitHub</a>
      ` : ""}

      <form id="pr-edit-form" class="issue-form pr-edit-form">
        <label class="field">
          <span>Title</span>
          <input type="text" id="pr-edit-title" value="${escapeHTML(pr.title)}" ${canMutate ? "" : "disabled"} required />
        </label>
        <label class="field">
          <span>Body</span>
          <textarea id="pr-edit-body" rows="5" ${canMutate ? "" : "disabled"}>${escapeHTML(pr.body || "")}</textarea>
        </label>
        <label class="field">
          <span>Base branch</span>
          <input type="text" id="pr-edit-base" value="${escapeHTML(pr.baseRef)}" ${canMutate ? "" : "disabled"} required />
        </label>
        <p id="pr-detail-error" class="field-error" hidden></p>
        <div class="form-actions">
          <button type="button" class="btn-secondary" data-modal-cancel>Close</button>
          ${canMutate ? `<button type="submit" class="btn-primary" id="pr-edit-submit">Save changes</button>` : ""}
        </div>
      </form>

      ${canMutate ? pullRequestDangerActionsHTML(repo, pr) : ""}
    </div>
  `);

  bindPullRequestDetailHandlers(pr);
  bindModalDismissers();
}

function pullRequestDangerActionsHTML(repo, pr) {
  return `
    <div class="pr-danger-zone">
      <div class="button-group">
        <button type="button" class="btn-secondary" id="pr-close-start">Close PR</button>
        <button type="button" class="btn-secondary danger-action" id="pr-merge-start">Merge PR</button>
      </div>

      <div class="pr-confirm" id="pr-close-confirm" hidden>
        <p>Close <strong>${escapeHTML(repo)} #${escapeHTML(pr.ghNumber)}</strong>: ${escapeHTML(pr.title)}</p>
        <div class="form-actions">
          <button type="button" class="btn-secondary" id="pr-close-cancel">Cancel</button>
          <button type="button" class="btn-primary" id="pr-close-confirm-btn">Confirm close</button>
        </div>
      </div>

      <div class="pr-confirm pr-merge-confirm" id="pr-merge-confirm" hidden>
        <dl>
          <div><dt>Repo</dt><dd>${escapeHTML(repo)}</dd></div>
          <div><dt>PR</dt><dd>#${escapeHTML(pr.ghNumber)}</dd></div>
          <div><dt>Title</dt><dd>${escapeHTML(pr.title)}</dd></div>
          <div><dt>Base</dt><dd>${escapeHTML(pr.baseRef || "unknown")}</dd></div>
          <div><dt>Head</dt><dd>${escapeHTML(pr.headRef || "unknown")}</dd></div>
        </dl>
        <label class="field">
          <span>Type ${PR_MERGE_CONFIRM_TEXT} to confirm</span>
          <input type="text" id="pr-merge-confirm-text" autocomplete="off" />
        </label>
        <div class="form-actions">
          <button type="button" class="btn-secondary" id="pr-merge-cancel">Cancel</button>
          <button type="button" class="btn-primary danger-action" id="pr-merge-confirm-btn" disabled>Confirm merge</button>
        </div>
      </div>
    </div>
  `;
}

function bindPullRequestDetailHandlers(pr) {
  const errorEl = document.getElementById("pr-detail-error");
  const repo = currentPullRequestRepo();

  const editForm = document.getElementById("pr-edit-form");
  if (editForm) {
    editForm.addEventListener("submit", async e => {
      e.preventDefault();
      const submit = document.getElementById("pr-edit-submit");
      const title = document.getElementById("pr-edit-title").value.trim();
      const body = document.getElementById("pr-edit-body").value.trim();
      const base = document.getElementById("pr-edit-base").value.trim();

      errorEl.hidden = true;
      if (!title || !base) {
        errorEl.textContent = "Title and base branch are required.";
        errorEl.hidden = false;
        return;
      }

      try {
        setPullRequestButtonPending(submit, true, "Saving...");
        await updateGitHubPullRequest(repo, pr.ghNumber, { title, body, base }, currentPullRequestToken());
        await refreshPullRequestsFromGitHub(repo, currentPullRequestToken());
        renderAll();
        openPullRequestDetailModal(pr.id, "Pull request updated.");
      } catch (err) {
        showPullRequestError(errorEl, err);
        setPullRequestButtonPending(submit, false);
      }
    });
  }

  const closeStart = document.getElementById("pr-close-start");
  const closeConfirm = document.getElementById("pr-close-confirm");
  const closeCancel = document.getElementById("pr-close-cancel");
  const closeConfirmBtn = document.getElementById("pr-close-confirm-btn");

  if (closeStart && closeConfirm) {
    closeStart.addEventListener("click", () => {
      closeConfirm.hidden = false;
      document.getElementById("pr-merge-confirm").hidden = true;
    });
    closeCancel.addEventListener("click", () => {
      closeConfirm.hidden = true;
    });
    closeConfirmBtn.addEventListener("click", async () => {
      try {
        errorEl.hidden = true;
        setPullRequestButtonPending(closeConfirmBtn, true, "Closing...");
        await closeGitHubPullRequest(repo, pr.ghNumber, currentPullRequestToken());
        await refreshPullRequestsFromGitHub(repo, currentPullRequestToken());
        renderAll();
        openPullRequestDetailModal(pr.id, "Pull request closed.");
      } catch (err) {
        showPullRequestError(errorEl, err);
        setPullRequestButtonPending(closeConfirmBtn, false);
      }
    });
  }

  const mergeStart = document.getElementById("pr-merge-start");
  const mergeConfirm = document.getElementById("pr-merge-confirm");
  const mergeCancel = document.getElementById("pr-merge-cancel");
  const mergeText = document.getElementById("pr-merge-confirm-text");
  const mergeConfirmBtn = document.getElementById("pr-merge-confirm-btn");

  if (mergeStart && mergeConfirm) {
    mergeStart.addEventListener("click", () => {
      mergeConfirm.hidden = false;
      document.getElementById("pr-close-confirm").hidden = true;
      mergeText.focus();
    });
    mergeCancel.addEventListener("click", () => {
      mergeConfirm.hidden = true;
      mergeText.value = "";
      mergeConfirmBtn.disabled = true;
    });
    mergeText.addEventListener("input", () => {
      mergeConfirmBtn.disabled = mergeText.value.trim() !== PR_MERGE_CONFIRM_TEXT;
    });
    mergeConfirmBtn.addEventListener("click", async () => {
      if (mergeText.value.trim() !== PR_MERGE_CONFIRM_TEXT) return;
      try {
        errorEl.hidden = true;
        mergeStart.disabled = true;
        setPullRequestButtonPending(mergeConfirmBtn, true, "Merging...");
        await mergeGitHubPullRequest(repo, pr.ghNumber, currentPullRequestToken());
        await refreshPullRequestsFromGitHub(repo, currentPullRequestToken());
        renderAll();
        openPullRequestDetailModal(pr.id, "Pull request merged.");
      } catch (err) {
        mergeStart.disabled = false;
        showPullRequestError(errorEl, err);
        setPullRequestButtonPending(mergeConfirmBtn, false);
      }
    });
  }
}

function bindPullRequestControls() {
  renderPullRequests();

  const newPrButton = document.getElementById("new-pr-btn");
  if (newPrButton) {
    newPrButton.addEventListener("click", openNewPullRequestModal);
  }
}
