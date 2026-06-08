const ACTIVITY_ICONS = { checkin: "✓", blocker: "!", cover: "↺" };

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
