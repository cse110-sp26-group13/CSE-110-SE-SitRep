const CALENDAR_DAY_MS = 24 * 60 * 60 * 1000;
const CALENDAR_SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

let calendarCursor = startOfMonth(new Date());
let calendarView = "month";
let selectedCalendarIssueId = null;

function parseCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date, count) {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return next;
}

function addMonths(date, count) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysBetween(start, end) {
  return Math.round((end - start) / CALENDAR_DAY_MS);
}

function formatShortDate(date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatMonthLabel(date) {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function normalizeCalendarIssue(issue) {
  const parsedStart = parseCalendarDate(issue.startDate);
  const parsedDue = parseCalendarDate(issue.dueDate);
  if (!parsedStart && !parsedDue) return null;

  let start = parsedStart || parsedDue;
  let due = parsedDue || parsedStart;
  if (start > due) [start, due] = [due, start];

  return {
    ...issue,
    start,
    due,
    startKey: dateKey(start),
    dueKey: dateKey(due),
    durationDays: Math.max(1, daysBetween(start, due) + 1),
  };
}

function calendarIssues() {
  return effectiveBlockers()
    .map(normalizeCalendarIssue)
    .filter(Boolean)
    .sort((a, b) => {
      const dateDiff = a.due - b.due || a.start - b.start;
      if (dateDiff !== 0) return dateDiff;
      return (CALENDAR_SEVERITY_ORDER[a.severity] ?? 9) - (CALENDAR_SEVERITY_ORDER[b.severity] ?? 9);
    });
}

function calendarIssueLabel(item, key) {
  if (item.startKey === item.dueKey) return "Due";
  if (key === item.startKey) return "Start";
  if (key === item.dueKey) return "Due";
  return "";
}

function renderCalendarSummary(items) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = addDays(today, 7);
  const open = items.filter(i => i.status !== "resolved");
  const overdue = open.filter(i => i.due < today).length;
  const dueThisWeek = open.filter(i => i.due >= today && i.due <= weekEnd).length;
  const resolved = items.filter(i => i.status === "resolved").length;

  const stats = [
    { label: "Dated issues", value: items.length, sub: "From issue start and due dates" },
    { label: "Due this week", value: dueThisWeek, sub: "Open work", cls: dueThisWeek ? "warn" : "good" },
    { label: "Overdue", value: overdue, sub: "Open deadlines", cls: overdue ? "alert" : "good" },
    { label: "Resolved", value: resolved, sub: "Still shown on timeline", cls: "good" },
  ];

  document.getElementById("calendar-summary").innerHTML = stats.map(stat => `
    <div class="calendar-stat">
      <div class="calendar-stat-label">${escapeHTML(stat.label)}</div>
      <div class="calendar-stat-value ${stat.cls || ""}">${escapeHTML(stat.value)}</div>
      <div class="calendar-stat-sub">${escapeHTML(stat.sub)}</div>
    </div>
  `).join("");
}

function renderMonthGrid(items) {
  document.getElementById("calendar-month-label").textContent = formatMonthLabel(calendarCursor);

  const monthStart = startOfMonth(calendarCursor);
  const firstGridDay = addDays(monthStart, -monthStart.getDay());
  const todayKey = dateKey(new Date());
  const gridDays = Array.from({ length: 42 }, (_, i) => addDays(firstGridDay, i));

  document.getElementById("calendar-grid").innerHTML = gridDays.map(day => {
    const key = dateKey(day);
    const dayItems = items.filter(item => item.startKey === key || item.dueKey === key);
    const visible = dayItems.slice(0, 3);
    const outside = day.getMonth() !== calendarCursor.getMonth();
    const cls = ["calendar-day", outside ? "outside" : "", key === todayKey ? "today" : ""]
      .filter(Boolean)
      .join(" ");

    return `
      <div class="${cls}" data-date="${key}">
        <div class="calendar-day-head">
          <span>${day.getDate()}</span>
          ${dayItems.length ? `<span class="calendar-day-count">${dayItems.length}</span>` : ""}
        </div>
        <div class="calendar-chip-list">
          ${visible.map(item => renderIssueChip(item, calendarIssueLabel(item, key))).join("")}
          ${dayItems.length > visible.length
            ? `<div class="calendar-more">+${dayItems.length - visible.length} more</div>`
            : ""}
        </div>
      </div>`;
  }).join("");
}

function renderIssueChip(item, label) {
  return `
    <button type="button"
      class="calendar-issue-chip sev-${escapeHTML(item.severity || "low")} ${selectedCalendarIssueId === item.id ? "selected" : ""}"
      data-calendar-issue="${escapeHTML(item.id)}">
      <span class="chip-meta">${escapeHTML(label)} - ${escapeHTML(item.status || "open")}</span>
      ${escapeHTML(item.title)}
    </button>
  `;
}

function timelineBounds(items) {
  if (!items.length) {
    const start = startOfMonth(calendarCursor);
    return { start, end: addDays(addMonths(start, 1), -1) };
  }

  const starts = items.map(item => item.start);
  const dues = items.map(item => item.due);
  const min = new Date(Math.min(...starts));
  const max = new Date(Math.max(...dues));
  return {
    start: addDays(min, -2),
    end: addDays(max, 2),
  };
}

function renderTimeline(items) {
  const bounds = timelineBounds(items);
  const totalDays = Math.max(1, daysBetween(bounds.start, bounds.end) + 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayWithin = today >= bounds.start && today <= bounds.end;
  const todayLeft = todayWithin ? (daysBetween(bounds.start, today) / totalDays) * 100 : null;
  const scaleDates = [0, 0.33, 0.66, 1].map(point => addDays(bounds.start, Math.floor(totalDays * point)));

  document.getElementById("timeline-scale").innerHTML = `
    <span>Issue</span>
    ${scaleDates.map(date => `<span>${escapeHTML(formatShortDate(date))}</span>`).join("")}
  `;

  const visibleItems = items.length ? items : [];
  document.getElementById("project-timeline").innerHTML = visibleItems.length
    ? visibleItems.map(item => {
      const left = Math.max(0, (daysBetween(bounds.start, item.start) / totalDays) * 100);
      const width = Math.max(2, (item.durationDays / totalDays) * 100);
      return `
        <div class="timeline-row" data-calendar-issue="${escapeHTML(item.id)}">
          <div class="timeline-label">
            <div class="timeline-title">${escapeHTML(item.title)}</div>
            <div class="timeline-meta">${escapeHTML(item.owner || "Unassigned")} - ${escapeHTML(item.status || "open")}</div>
          </div>
          <div class="timeline-track">
            ${todayWithin ? `<span class="timeline-today" style="left: ${todayLeft}%"></span>` : ""}
            <button type="button"
              class="timeline-bar sev-${escapeHTML(item.severity || "low")} status-${escapeHTML(item.status || "open")}"
              style="left: ${left}%; width: ${Math.min(100 - left, width)}%"
              aria-label="${escapeHTML(item.title)} from ${escapeHTML(formatShortDate(item.start))} to ${escapeHTML(formatShortDate(item.due))}">
            </button>
          </div>
        </div>`;
    }).join("")
    : `<div class="empty">No dated issues yet.</div>`;
}

function renderLegend(items) {
  const counts = items.reduce((acc, item) => {
    const severity = item.severity || "low";
    acc[severity] = (acc[severity] || 0) + 1;
    return acc;
  }, {});
  const severities = ["critical", "high", "medium", "low"];

  document.getElementById("project-legend").innerHTML = severities.map(severity => `
    <div class="legend-row">
      <span class="legend-main">
        <span class="legend-swatch ${severity}"></span>
        <span>${escapeHTML(severity[0].toUpperCase() + severity.slice(1))}</span>
      </span>
      <span>${counts[severity] || 0}</span>
    </div>
  `).join("");
}

function renderUpcoming(items) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = items
    .filter(item => item.status !== "resolved" && item.due >= today)
    .slice(0, 5);

  document.getElementById("next-up-sub").textContent = `${upcoming.length} open`;
  document.getElementById("calendar-upcoming").innerHTML = upcoming.length
    ? upcoming.map(item => `
      <li class="calendar-upcoming-item" data-calendar-issue="${escapeHTML(item.id)}">
        <div class="upcoming-date">${escapeHTML(formatShortDate(item.due))}</div>
        <div>
          <div class="upcoming-title">${escapeHTML(item.title)}</div>
          <div class="upcoming-meta">${escapeHTML(item.owner || "Unassigned")} - ${escapeHTML(item.severity || "medium")}</div>
        </div>
      </li>
    `).join("")
    : `<li class="empty">No upcoming dated issues.</li>`;
}

function renderIssueDetail(items) {
  const selected = items.find(item => item.id === selectedCalendarIssueId) || items[0];
  selectedCalendarIssueId = selected?.id || null;
  const detail = document.getElementById("calendar-detail");

  if (!selected) {
    detail.innerHTML = `<div class="empty">Select a dated issue.</div>`;
    return;
  }

  detail.innerHTML = `
    <div class="calendar-detail-title">${escapeHTML(selected.title)}</div>
    <div class="calendar-detail-meta">
      ${escapeHTML(formatShortDate(selected.start))} to ${escapeHTML(formatShortDate(selected.due))}
      - ${escapeHTML(selected.owner || "Unassigned")}
      - ${escapeHTML(selected.status || "open")}
    </div>
    <div class="calendar-detail-desc">
      ${selected.description ? escapeHTML(selected.description) : "No description provided."}
    </div>
  `;
}

function renderCalendarView(items) {
  const isMonth = calendarView === "month";
  document.getElementById("calendar-month-view").hidden = !isMonth;
  document.getElementById("project-timeline-view").hidden = isMonth;
  document.querySelectorAll("[data-calendar-view]").forEach(button => {
    const active = button.dataset.calendarView === calendarView;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });

  renderMonthGrid(items);
  renderTimeline(items);
}

function renderCalendarPage() {
  const items = calendarIssues();
  renderCalendarSummary(items);
  renderCalendarView(items);
  renderLegend(items);
  renderUpcoming(items);
  renderIssueDetail(items);
  bindCalendarIssueButtons(items);
}

function bindCalendarIssueButtons(items) {
  document.querySelectorAll("[data-calendar-issue]").forEach(element => {
    element.addEventListener("click", () => {
      selectedCalendarIssueId = element.dataset.calendarIssue;
      renderIssueDetail(items);
      document.querySelectorAll("[data-calendar-issue]").forEach(el => {
        el.classList.toggle("selected", el.dataset.calendarIssue === selectedCalendarIssueId);
      });
    });
  });
}

function bindCalendarControls() {
  document.getElementById("calendar-prev").addEventListener("click", () => {
    calendarCursor = addMonths(calendarCursor, -1);
    renderCalendarPage();
  });

  document.getElementById("calendar-next").addEventListener("click", () => {
    calendarCursor = addMonths(calendarCursor, 1);
    renderCalendarPage();
  });

  document.getElementById("calendar-today").addEventListener("click", () => {
    calendarCursor = startOfMonth(new Date());
    renderCalendarPage();
  });

  document.querySelectorAll("[data-calendar-view]").forEach(button => {
    button.addEventListener("click", () => {
      calendarView = button.dataset.calendarView;
      renderCalendarPage();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderHeader();
  renderCalendarPage();
  bindCalendarControls();
});
