const ACTIVITY_ICONS = { checkin: "✓", blocker: "!", cover: "↺", ai: "🤖" };
const ACTIVITY_LIMIT = 10;

<<<<<<< Updated upstream
=======
/**
 * Re-render the activity feed from effectiveActivity(). Also updates
 * `#activity-sub` with the count of displayed events.
 */
>>>>>>> Stashed changes
function renderActivity() {
  const items = effectiveActivity().slice(0, ACTIVITY_LIMIT);
  const label = items.length === 1 ? "event" : "events";
  document.getElementById("activity-sub").textContent = `Last ${items.length} ${label}`;
  document.getElementById("activity-list").innerHTML = items.length
    ? items.map(a => `
      <li class="activity-row">
        <span class="activity-icon ${a.type}">${ACTIVITY_ICONS[a.type] || "·"}</span>
        <span class="activity-text"><strong>${escapeHTML(a.who)}</strong> ${escapeHTML(a.text)}</span>
        <span class="activity-time">${escapeHTML(a.time)}</span>
      </li>`).join("")
    : `<li class="empty">No activity yet.</li>`;
}
