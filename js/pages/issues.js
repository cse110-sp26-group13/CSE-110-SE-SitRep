// Issues page orchestrator.
// Full blockers list + filters + new-issue + GitHub sync modal.

function renderIssues() {
  renderHeader();
  renderBlockers();
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

function updateIssuesSub() {
  const all = effectiveBlockers();
  const open = all.filter(b => b.status !== "resolved").length;
  const resolved = all.length - open;
  const sub = document.getElementById("issues-sub");
  if (sub) sub.textContent = `${open} open · ${resolved} resolved · ${all.length} total`;
}

window.renderAll = renderIssues;
window.renderActivity = function () { /* no-op: no activity feed on issues page */ };

document.addEventListener("DOMContentLoaded", async () => {
  await db.loadAll();
  renderIssues();
  bindBlockerControls();
});
