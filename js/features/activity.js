const ACTIVITY_ICONS = { checkin: "✓", blocker: "!", cover: "↺" };

function renderActivity() {
  const list = document.getElementById("activity-list");
  if (!list) return; // page doesn't show an activity feed (e.g. standup)

  const all = effectiveActivity();
  const items = all.slice(0, 10);

  const sub = document.getElementById("activity-sub");
  if (sub) sub.textContent = `${all.length} events`;

  list.innerHTML = items.length
    ? items.map(a => `
      <li class="activity-row">
        <span class="activity-time">${escapeHTML(a.time)}</span>
        <span class="activity-icon ${a.type}">${ACTIVITY_ICONS[a.type] || "·"}</span>
        <span class="activity-text"><strong>${escapeHTML(a.who)}</strong> ${escapeHTML(a.text)}</span>
      </li>`).join("")
    : `<li class="empty">No activity yet.</li>`;
}
