/**
 * Standup page orchestrator ([standup.html](../../standup.html)).
 *
 * Mood quick-picker + everyone's check-in cards (with the compose
 * form) + the when2meet availability grid + the mood trend sparkline.
 *
 * Aliases renderAll → renderStandup so callbacks inside
 * [checkins.js](../features/checkins.js) (e.g. `await ...; renderAll()`)
 * trigger this page's full re-render after a write.
 */

/** Re-render every card on the standup page from the loaded globals. */
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
