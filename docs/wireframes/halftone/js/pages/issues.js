// Issues page orchestrator.
// Full blockers list + filters + new-issue + GitHub sync modal.

function renderIssues() {
  renderHeader();
  renderBlockers();
  updateIssuesSub();
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

document.addEventListener("DOMContentLoaded", () => {
  renderIssues();
  bindBlockerControls();
});
