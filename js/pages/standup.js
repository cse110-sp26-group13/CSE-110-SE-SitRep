// Standup page orchestrator.
// Mood quick + everyone's check-ins (with compose form) + slots + mood trend.
// Aliases renderAll → renderStandup so callbacks inside checkins.js work.

function renderStandup() {
  renderHeader();
  renderCheckIns();
  renderSlots();
  renderMoodTrend();
}

window.renderAll = renderStandup;

document.addEventListener("DOMContentLoaded", async () => {
  await db.loadAll();
  renderStandup();
  bindMoodQuick();
  bindComposeForm();
});
