// Dashboard (Overview) orchestrator — Linear-style dense summary.
// Renders the real feature lists (read-only) plus KPIs, activity, mood, slots.
// Replaces the halftone snapshot cards with the actual content.

function renderDashboard() {
  renderHeader();
  renderKPIs();
  renderCheckIns();
  renderBlockers();
  renderSlots();
  renderMoodTrend();
  renderActivity();
}

// Feature modules call renderAll() after local mutations (e.g. "I'll cover").
window.renderAll = renderDashboard;

function bindResetDash() {
  const btn = document.getElementById("reset-btn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    if (!confirm("Clear local check-ins, blockers, and cover actions?")) return;
    localStorage.removeItem(STORAGE_KEY);
    state = defaultState();
    renderDashboard();
    if (typeof initGHEmbeds === "function") initGHEmbeds();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderDashboard();
  bindBlockerControls();   // issue rows open the detail modal (null-safe on Overview)
  bindResetDash();
  if (typeof initPalette === "function") initPalette();
  if (typeof initGHEmbeds === "function") initGHEmbeds();
});
