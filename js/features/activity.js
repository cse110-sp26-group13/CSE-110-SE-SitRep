
/**
 * Activity feed — last 10 events for the current team, rendered into
 * `#activity-list`. Each event row gets an icon glyph keyed off its
 * `kind`; unknown kinds fall back to a middle dot.
 */
const ACTIVITY_ICONS = { checkin: "✓", blocker: "!", cover: "↺", ai: "🤖" };
const ACTIVITY_LIMIT = 10;

/**
 * Re-render the activity feed.
 * Displays the most recent ACTIVITY_LIMIT events and updates
 * #activity-sub with the displayed event count.
 */
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
