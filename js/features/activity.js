
/**
 * Activity feed — last 10 events for the current team, rendered into
 * `#activity-list`. Each event row gets an icon glyph keyed off its
 * `kind`; unknown kinds fall back to a middle dot.
 */
const ACTIVITY_ICONS = { checkin: "✓", blocker: "!", cover: "↺", ai: "🤖" };

/**
 * Re-render the activity feed from effectiveActivity(). Also updates
 * `#activity-sub` with the total event count (across the full feed,
 * not just the 10 shown).
 */
function renderActivity() {
  const items = effectiveActivity().slice(0, 10);
  document.getElementById("activity-sub").textContent = `${effectiveActivity().length} events`;
  document.getElementById("activity-list").innerHTML = items.length
    ? items.map(a => `
      <li class="activity-row">
        <span class="activity-icon ${a.type}">${ACTIVITY_ICONS[a.type] || "·"}</span>
        <span class="activity-text"><strong>${escapeHTML(a.who)}</strong> ${escapeHTML(a.text)}</span>
        <span class="activity-time">${escapeHTML(a.time)}</span>
      </li>`).join("")
    : `<li class="empty">No activity yet.</li>`;
}
