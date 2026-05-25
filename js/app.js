function renderAll() {
  renderHeader();
  renderKPIs();
  renderCheckIns();
  renderBlockers();
  renderSlots();
  renderMoodTrend();
  renderActivity();
}

function bindReset() {
  document.getElementById("reset-btn").addEventListener("click", () => {
    if (!confirm("Clear local check-ins, blockers, and cover actions?")) return;
    localStorage.removeItem(STORAGE_KEY);
    state = defaultState();
    renderAll();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  bindMoodQuick();
  bindComposeForm();
  bindBlockerControls();
  bindReset();
});
