/**
 * @fileoverview AI Agents page orchestrator.
 * Bootstraps the AI Agents page: binds all form handlers, runs initial render.
 * Mirrors the pattern used in dashboard.js and standup.js.
 */

document.addEventListener("DOMContentLoaded", () => {
  renderHeader();
  renderAllAI();
  bindAgentModelLink();   // agent select → model select repopulation (log form)
  bindCostPreview();      // live cost estimate on token/model input (log form)
  bindAILogForm();        // log session form submit + open/cancel
  bindSessionDialog();    // session card click → detail/edit overlay
});
