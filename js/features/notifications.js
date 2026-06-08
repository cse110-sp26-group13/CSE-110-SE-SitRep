/**
 * Dashboard notification center.
 *
 * Builds client-side notifications from loaded dashboard data and the
 * Settings page preferences. Read state is scoped per team in localStorage.
 */
const NOTIFICATION_PREF_KEYS = {
  standup: "sitrep-notify-standup",
  mentions: "sitrep-notify-mentions",
  digest: "sitrep-notify-digest",
};
const NOTIFICATION_READ_KEY = "sitrep-notifications-read-v1";
const NOTIFICATION_PREVIEW_LIMIT = 4;

function notificationScope() {
  return (window.team && window.team.id) || "no-team";
}

function notificationPrefEnabled(kind) {
  try {
    const key = NOTIFICATION_PREF_KEYS[kind];
    return !key || localStorage.getItem(key) !== "0";
  } catch (_err) {
    return true;
  }
}

function readNotificationStore() {
  try {
    return JSON.parse(localStorage.getItem(NOTIFICATION_READ_KEY)) || {};
  } catch (_err) {
    return {};
  }
}

function writeNotificationStore(store) {
  try {
    localStorage.setItem(NOTIFICATION_READ_KEY, JSON.stringify(store));
  } catch (_err) {
    /* localStorage can fail in private windows; notifications still render. */
  }
}

function readNotificationIds() {
  const store = readNotificationStore();
  return new Set(store[notificationScope()] || []);
}

function saveNotificationIds(ids) {
  const store = readNotificationStore();
  store[notificationScope()] = Array.from(new Set(ids)).slice(-100);
  writeNotificationStore(store);
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function currentTeammate() {
  return effectiveTeammates().find(t => t.id === team.currentUserId) || null;
}

function openBlockers() {
  return effectiveBlockers().filter(b => b.status !== "resolved");
}

function assignedBlockerNotifications() {
  if (!notificationPrefEnabled("mentions")) return [];
  return openBlockers()
    .filter(b => b.ownerId && b.ownerId === team.currentUserId)
    .slice()
    .sort((a, b) => ({ critical: 0, high: 1, medium: 2 }[a.severity] ?? 3) - ({ critical: 0, high: 1, medium: 2 }[b.severity] ?? 3))
    .slice(0, 5)
    .map(b => ({
      id: `issue:${b.id}:${b.status}:${b.severity}`,
      kind: "mentions",
      level: b.severity === "critical" ? "alert" : "warn",
      title: b.severity === "critical" ? "Critical issue assigned" : "Issue needs your attention",
      body: b.title,
      meta: `${b.severity} issue`,
      href: `issues.html#${encodeURIComponent(b.id)}`,
    }));
}

function standupNotifications() {
  if (!notificationPrefEnabled("standup")) return [];
  const me = currentTeammate();
  if (!me || me.lastCheckIn) return [];
  return [{
    id: `standup:${todayKey()}:${team.currentUserId}`,
    kind: "standup",
    level: "warn",
    title: "Post today's standup",
    body: "Your update is still pending for this circle.",
    meta: "Daily reminder",
    href: "standup.html",
  }];
}

function digestNotifications() {
  if (!notificationPrefEnabled("digest")) return [];
  const members = effectiveTeammates();
  const checkedIn = members.filter(t => t.lastCheckIn).length;
  const blockers = openBlockers();
  const critical = blockers.filter(b => b.severity === "critical").length;
  const updates = effectiveActivity().length;
  return [{
    id: `digest:${todayKey()}:${checkedIn}:${blockers.length}:${updates}`,
    kind: "digest",
    level: critical ? "alert" : blockers.length ? "warn" : "good",
    title: "Daily digest ready",
    body: `${checkedIn}/${members.length} checked in, ${blockers.length} open issues, ${updates} recent updates.`,
    meta: critical ? `${critical} critical` : "Team summary",
    href: "index.html",
  }];
}

function buildNotifications() {
  const items = [
    ...standupNotifications(),
    ...assignedBlockerNotifications(),
    ...digestNotifications(),
  ];
  const order = { alert: 0, warn: 1, good: 2 };
  return items.sort((a, b) => (order[a.level] ?? 3) - (order[b.level] ?? 3));
}

function notificationItemHTML(item, readIds) {
  const stateClass = readIds.has(item.id) ? "read" : "unread";
  return `
    <li class="notification-item ${stateClass}" data-notification-id="${escapeHTML(item.id)}">
      <a class="notification-link" href="${escapeHTML(item.href)}">
        <span class="notification-topline">
          <span class="notification-dot ${escapeHTML(item.level)}"></span>
          <span class="notification-title">${escapeHTML(item.title)}</span>
        </span>
        <span class="notification-body">${escapeHTML(item.body)}</span>
        <span class="notification-meta">${escapeHTML(item.meta)}</span>
      </a>
    </li>`;
}

function renderNotificationList(target, items, readIds, emptyText) {
  if (!target) return;
  target.innerHTML = items.length
    ? items.map(item => notificationItemHTML(item, readIds)).join("")
    : `<li class="empty">${escapeHTML(emptyText)}</li>`;
}

function updateNotificationButtons(unreadCount) {
  const badge = document.getElementById("notifications-badge");
  if (badge) {
    badge.textContent = String(unreadCount);
    badge.hidden = unreadCount === 0;
  }
  document.querySelectorAll("[data-notification-mark-all]").forEach(btn => {
    btn.disabled = unreadCount === 0;
  });
}

function renderNotifications() {
  const items = buildNotifications();
  const readIds = readNotificationIds();
  const unreadCount = items.filter(item => !readIds.has(item.id)).length;
  const label = unreadCount === 1 ? "1 unread" : `${unreadCount} unread`;
  const sub = document.getElementById("notifications-sub");
  if (sub) sub.textContent = items.length ? `${label} across ${items.length} alerts` : "No alerts right now";
  renderNotificationList(
    document.getElementById("notification-list"),
    items,
    readIds,
    "No notifications right now.",
  );
  renderNotificationList(
    document.getElementById("notifications-panel-list"),
    items.slice(0, NOTIFICATION_PREVIEW_LIMIT),
    readIds,
    "Nothing new.",
  );
  updateNotificationButtons(unreadCount);
}

function markNotificationRead(id) {
  const ids = readNotificationIds();
  ids.add(id);
  saveNotificationIds(ids);
  renderNotifications();
}

function markAllNotificationsRead() {
  saveNotificationIds(buildNotifications().map(item => item.id));
  renderNotifications();
}

function bindNotificationListClicks(list) {
  if (!list) return;
  list.addEventListener("click", (e) => {
    const row = e.target.closest("[data-notification-id]");
    if (!row) return;
    markNotificationRead(row.dataset.notificationId);
  });
}

function bindNotifications() {
  const toggle = document.getElementById("notifications-toggle");
  const panel = document.getElementById("notifications-panel");
  if (toggle && panel) {
    toggle.addEventListener("click", () => {
      const next = panel.hidden;
      panel.hidden = !next;
      toggle.setAttribute("aria-expanded", String(next));
    });
    document.addEventListener("click", (e) => {
      if (panel.hidden || e.target.closest("[data-notification-popover]")) return;
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
    });
  }

  document.querySelectorAll("[data-notification-mark-all]").forEach(btn => {
    btn.addEventListener("click", markAllNotificationsRead);
  });
  bindNotificationListClicks(document.getElementById("notification-list"));
  bindNotificationListClicks(document.getElementById("notifications-panel-list"));
}
