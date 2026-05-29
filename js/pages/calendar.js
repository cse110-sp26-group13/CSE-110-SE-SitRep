// Calendar page orchestrator — wireframe scaffold for Stephanie's feature.
//
// What this gives the feature owner:
//   • A month-view grid that renders correctly for any (year, month).
//   • Sample events in CAL_EVENTS — wire to real data via blockers.js or a
//     new calendarEvents table when ready.
//   • View toggle (All / Personal / Team) wired through filterEvents().
//   • Project filter list driven by CAL_PROJECTS.
//   • Prev/next/today nav.
//
// Things still to build (v2 — handoff to Stephanie):
//   • Multi-day timeline bars that visually span across cells (not just per-day).
//   • Drag-to-create new event.
//   • Click-into-issue cross-page nav.
//   • Recurring events.

// ─── Sample data (replace with real source later) ──────────────────────
const CAL_PROJECTS = [
  { id: "onboarding", name: "Onboarding flow", color: "#39352e",  on: true },
  { id: "auth",       name: "Auth refactor",   color: "#2f6b3a",    on: true },
  { id: "ios",        name: "iOS app",         color: "#b56a14",    on: true },
  { id: "design",     name: "Design system",   color: "#6e6655",   on: false },
];

// Each event: { date: "YYYY-MM-DD", title, kind: team|personal|blocked|risk, project }
const CAL_EVENTS = [
  { date: "2026-05-01", title: "Sprint 4 kickoff",        kind: "team",     project: "onboarding" },
  { date: "2026-05-05", title: "Auth refactor — PR open", kind: "team",     project: "auth" },
  { date: "2026-05-08", title: "Empty-state illos due",   kind: "personal", project: "design" },
  { date: "2026-05-12", title: "Design review",           kind: "team",     project: "onboarding" },
  { date: "2026-05-14", title: "Onboarding flow demo",    kind: "team",     project: "onboarding" },
  { date: "2026-05-15", title: "QA pass",                 kind: "personal", project: "onboarding" },
  { date: "2026-05-18", title: "Sprint 4 mid-sync",       kind: "team",     project: "onboarding" },
  { date: "2026-05-20", title: "Auth tokens — ETA",       kind: "blocked",  project: "auth" },
  { date: "2026-05-21", title: "iOS cert renewal",        kind: "risk",  project: "ios" },
  { date: "2026-05-22", title: "Sprint 4 retro",          kind: "team",     project: "onboarding" },
  { date: "2026-05-25", title: "Sprint 5 kickoff",        kind: "team",     project: "onboarding" },
  { date: "2026-05-26", title: "Stakeholder demo",        kind: "personal", project: "onboarding" },
  { date: "2026-05-28", title: "Mobile cert deadline",    kind: "risk",  project: "ios" },
  // a few from adjacent months so prev/next show something
  { date: "2026-04-28", title: "Sprint 3 retro",          kind: "team",     project: "onboarding" },
  { date: "2026-06-02", title: "Q3 planning",             kind: "team",     project: "onboarding" },
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ─── State ────────────────────────────────────────────────────────────
const CAL_KINDS = ["team", "personal", "risk", "blocked"];

const calState = {
  // Default to today (page loads on current month). Easy to override for demo.
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  view: "all", // all | personal | team | issues
  projects: new Set(getCalendarProjects().filter(p => p.on).map(p => p.id)),
  kinds: new Set(CAL_KINDS),
  issues: new Set(effectiveBlockers().filter(b => b.status?.toLowerCase() !== "resolved").map(b => String(b.id))),
  editingEventId: null,
  editingProjectId: null,
  weekStart: null, // Initialized in bindCalendar or similar
};

// Initialize weekStart
calState.weekStart = getStartOfWeek(new Date());

const EVENT_KIND_LABELS = {
  team: "Team milestone",
  personal: "Personal due",
  risk: "Risk",
  blocked: "Blocked",
};

// ─── Rendering ───────────────────────────────────────────────────────
function buildMonthCells(year, month) {
  // First-of-month + previous-month tail to fill the leading week.
  const first = new Date(year, month, 1);
  const startDow = first.getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const cells = [];
  // Previous-month tail
  for (let i = startDow - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrev - i), muted: true });
  }
  // This month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), muted: false });
  }
  // Next-month head to round to a multiple of 7 (5 or 6 rows)
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), muted: true });
  }
  return cells;
}

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth()    === b.getMonth()
      && a.getDate()     === b.getDate();
}

function filterEvents() {
  if (calState.view === "issues") return [];

  return getCalendarEvents().filter(e => {
    if (calState.view !== "all") {
      // Map view → matching kinds: personal = personal only, team = team/blocked/risk
      if (calState.view === "personal" && e.kind !== "personal") return false;
      if (calState.view === "team" && e.kind === "personal") return false;
    }
    if (e.project && !calState.projects.has(e.project)) return false;
    if (e.kind && !calState.kinds.has(e.kind)) return false;
    return true;
  });
}

function getCalendarProjects() {
  const customProjects = Array.isArray(state.extraCalendarProjects) ? state.extraCalendarProjects : [];
  const deletedSampleIds = new Set(Array.isArray(state.deletedSampleProjectIds) ? state.deletedSampleProjectIds : []);
  const samples = CAL_PROJECTS.filter(p => !deletedSampleIds.has(p.id));
  return [...samples, ...customProjects];
}

function getProjectById(id) {
  return getCalendarProjects().find(project => project.id === id);
}

function projectOptions(selectedId) {
  return getCalendarProjects().map(project =>
    `<option value="${escapeHTML(project.id)}"${project.id === selectedId ? " selected" : ""}>${escapeHTML(project.name)}</option>`
  ).join("");
}

function getCalendarEvents() {
  const customEvents = Array.isArray(state.extraCalendarEvents) ? state.extraCalendarEvents : [];
  const deletedIds = new Set(Array.isArray(state.deletedCalendarEventIds) ? state.deletedCalendarEventIds : []);
  const overrides = state.calendarEventOverrides && typeof state.calendarEventOverrides === "object"
    ? state.calendarEventOverrides
    : {};
  const sampleEvents = CAL_EVENTS.map((event, index) => {
    const id = `sample-${index}`;
    return { ...event, id, source: "sample", ...(overrides[id] || {}) };
  });
  const userEvents = customEvents.map(event => ({ ...event, source: "custom" }));
  return [...sampleEvents, ...userEvents].filter(event => !deletedIds.has(event.id));
}

const contrastCache = new Map();

function getContrastColor(color) {
  if (!color) return "var(--ink)";
  
  const isDark = document.documentElement.dataset.theme === "dark";
  const cacheKey = `${color}-${isDark}`;
  if (contrastCache.has(cacheKey)) return contrastCache.get(cacheKey);

  // 1. Check our hardcoded semantic map
  const semanticMap = {
    "var(--good)":   { light: "var(--paper)", dark: "var(--paper)" },
    "var(--warn)":   { light: "var(--ink)",   dark: "var(--paper)" },
    "var(--bad)":    { light: "var(--paper)", dark: "var(--paper)" },
    "var(--ink)":    { light: "var(--paper)", dark: "var(--paper)" },
    "var(--ink-2)":  { light: "var(--paper)", dark: "var(--paper)" },
    "var(--muted)":  { light: "var(--paper)", dark: "var(--paper)" },
  };

  if (semanticMap[color]) {
    const res = isDark ? semanticMap[color].dark : semanticMap[color].light;
    contrastCache.set(cacheKey, res);
    return res;
  }

  // 2. Resolve unknown colors (like rgb or other vars)
  let r, g, b;
  let resolved = color;

  if (color.startsWith("var(") || (!color.startsWith("#") && !color.startsWith("rgb"))) {
    const temp = document.createElement("div");
    temp.style.color = color;
    temp.style.display = "none";
    document.body.appendChild(temp);
    resolved = window.getComputedStyle(temp).color;
    document.body.removeChild(temp);
  }

  if (resolved.startsWith("#")) {
    const hex = resolved.length === 4 
      ? "#" + resolved[1] + resolved[1] + resolved[2] + resolved[2] + resolved[3] + resolved[3]
      : resolved;
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  } else if (resolved.startsWith("rgb")) {
    const m = resolved.match(/\d+/g);
    if (m && m.length >= 3) {
      r = parseInt(m[0]);
      g = parseInt(m[1]);
      b = parseInt(m[2]);
    }
  }

  if (r !== undefined) {
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    const res = isDark 
      ? (brightness > 128 ? "var(--paper)" : "var(--ink)")
      : (brightness > 128 ? "var(--ink)" : "var(--paper)");
    contrastCache.set(cacheKey, res);
    return res;
  }

  // 3. Last resort: use the theme's primary ink color (always visible against paper)
  const lastResort = "var(--ink)";
  contrastCache.set(cacheKey, lastResort);
  return lastResort;
}

function eventColorStyle(event) {
  const project = getProjectById(event.project);
  const color = project?.color || event.color;
  if (!color) return "";
  const textColor = getContrastColor(color);
  return ` style="--event-color:${color};--event-text:${textColor}"`;
}

function eventBarClasses(event) {
  return ["cal-bar", event.kind, event.project || event.color ? "custom-color" : ""].filter(Boolean).join(" ");
}

function eventTooltip(event) {
  const kind = EVENT_KIND_LABELS[event.kind] || "Event";
  return `${event.title} - ${kind}`;
}

function findCalendarEvent(id) {
  return getCalendarEvents().find(event => event.id === id);
}

function getStartOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day; // 0 = Sunday
  return new Date(date.setDate(diff));
}

function renderCalWeek() {
  const container = document.getElementById("cal-week-grid");
  const label = document.getElementById("week-range-label");
  if (!container || !label) return;

  const today = new Date();
  const start = calState.weekStart;
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  // Update header label
  const startM = MONTH_NAMES[start.getMonth()].slice(0, 3);
  const endM = MONTH_NAMES[end.getMonth()].slice(0, 3);
  const yearText = start.getFullYear() === end.getFullYear() ? start.getFullYear() : `${start.getFullYear()}-${end.getFullYear()}`;
  label.innerHTML = `${startM} ${start.getDate()} – ${endM} ${end.getDate()}<span class="yr">${yearText}</span>`;

  const events = filterEvents();
  const eventsByDay = events.reduce((acc, e) => {
    (acc[e.date] = acc[e.date] || []).push(e);
    return acc;
  }, {});

  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    weekDays.push(d);
  }

  const dayHeader = DAY_NAMES.map(n => `<div class="cal-dayname">${n}</div>`).join("");
  
  const gridHTML = weekDays.map(date => {
    const key = isoDate(date);
    const dayEvents = eventsByDay[key] || [];
    const isToday = isSameDay(date, today);

    const dayKinds = new Set(dayEvents.map(e => e.kind));
    let kindClass = "";
    if (dayKinds.has("blocked")) kindClass = "kind-blocked";
    else if (dayKinds.has("risk")) kindClass = "kind-risk";
    else if (dayKinds.has("team")) kindClass = "kind-team";
    else if (dayKinds.has("personal")) kindClass = "kind-personal";

    let html = `<div class="cal-cell ${isToday ? "today" : ""} ${kindClass}">
      <div class="cal-date">${date.getDate()}</div>`;
    
    dayEvents.forEach(e => {
      html += `<button class="${eventBarClasses(e)}" type="button" data-event-id="${escapeHTML(e.id)}" title="${escapeHTML(eventTooltip(e))}"${eventColorStyle(e)}>${escapeHTML(e.title)}</button>`;
    });

    html += `</div>`;
    return html;
  }).join("");

  container.innerHTML = dayHeader + gridHTML;

  const countEl = document.getElementById("week-foot-count");
  if (countEl) countEl.textContent = `${events.length} events in view`;
}

function renderCalGrid() {
  const today = new Date();
  const grid = document.getElementById("cal-grid");
  const cells = buildMonthCells(calState.year, calState.month);
  
  const events = filterEvents();
  const allIssues = calState.view === "issues" 
    ? effectiveBlockers().filter(b => calState.issues.has(String(b.id)) && b.status?.toLowerCase() !== "resolved")
    : [];

  const eventsByDay = events.reduce((acc, e) => {
    (acc[e.date] = acc[e.date] || []).push(e);
    return acc;
  }, {});

  const dayHeader = DAY_NAMES.map(n => `<div class="cal-dayname">${n}</div>`).join("");
  
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  let currentRow = 2; // Row 1 is DAY_NAMES
  let gridHTML = dayHeader;

  weeks.forEach(weekCells => {
    const weekStart = weekCells[0].date;
    const weekEnd = weekCells[6].date;

    // Filter issues active in THIS week
    const weekIssues = allIssues.filter(issue => {
      const s = new Date(`${issue.startDate || issue.dueDate}T00:00:00`);
      const e = new Date(`${issue.dueDate || issue.startDate}T00:00:00`);
      return s <= weekEnd && e >= weekStart;
    });

    // Calculate slots JUST for this week
    const usedSlotsByDay = {}; // dateKey -> [issueId, null, issueId]
    const sortedWeekIssues = [...weekIssues].sort((a, b) => {
      const aStart = a.startDate || a.dueDate || "0000-00-00";
      const bStart = b.startDate || b.dueDate || "0000-00-00";
      if (aStart !== bStart) return aStart.localeCompare(bStart);
      const aDur = (new Date(a.dueDate) - new Date(a.startDate)) || 0;
      const bDur = (new Date(b.dueDate) - new Date(b.startDate)) || 0;
      return bDur - aDur;
    });

    sortedWeekIssues.forEach(issue => {
      let slot = 0;
      const startStr = issue.startDate || issue.dueDate;
      const endStr = issue.dueDate || issue.startDate;
      const itemStart = new Date(`${startStr}T00:00:00`);
      const itemEnd = new Date(`${endStr}T00:00:00`);
      
      const actualStart = itemStart < weekStart ? weekStart : itemStart;
      const actualEnd = itemEnd > weekEnd ? weekEnd : itemEnd;

      let foundSlot = false;
      while (!foundSlot) {
        foundSlot = true;
        for (let d = new Date(actualStart); d <= actualEnd; d.setDate(d.getDate() + 1)) {
          const key = isoDate(d);
          if (usedSlotsByDay[key]?.[slot]) {
            foundSlot = false;
            break;
          }
        }
        if (!foundSlot) slot++;
      }
      
      for (let d = new Date(actualStart); d <= actualEnd; d.setDate(d.getDate() + 1)) {
        const key = isoDate(d);
        if (!usedSlotsByDay[key]) usedSlotsByDay[key] = [];
        usedSlotsByDay[key][slot] = String(issue.id);
      }
    });

    let weekMaxSlot = -1;
    weekCells.forEach(cell => {
      const key = isoDate(cell.date);
      const daySlots = usedSlotsByDay[key] || [];
      const cellMax = Math.max(-1, ...daySlots.map((id, index) => id ? index : -1));
      if (cellMax > weekMaxSlot) weekMaxSlot = cellMax;
    });

    const numSlots = weekMaxSlot + 1;
    const weekSpan = 1 + numSlots;

    // 1. Background Cells & Day Headers
    weekCells.forEach((cell, colIndex) => {
      const key = isoDate(cell.date);
      const dayEvents = eventsByDay[key] || [];
      const isToday = isSameDay(cell.date, today);

      const dayKinds = new Set(dayEvents.map(e => e.kind));
      let kindClass = "";
      if (dayKinds.has("blocked")) kindClass = "kind-blocked";
      else if (dayKinds.has("risk")) kindClass = "kind-risk";
      else if (dayKinds.has("team")) kindClass = "kind-team";
      else if (dayKinds.has("personal")) kindClass = "kind-personal";

      // The background cell (borders, today shadow, kind borders)
      gridHTML += `<div class="cal-cell ${cell.muted ? "muted" : ""} ${isToday ? "today" : ""} ${kindClass}" 
                        style="grid-column: ${colIndex + 1}; grid-row: ${currentRow} / span ${weekSpan}"></div>`;

      // The header content (date + small events) - strictly in the first row of the week
      gridHTML += `<div class="cal-cell-header" style="grid-column: ${colIndex + 1}; grid-row: ${currentRow}; z-index: 5;">
        <div class="cal-date">${cell.date.getDate()}</div>
        <div class="cal-day-events">
          ${dayEvents.slice(0, 3).map(e => `
            <button class="${eventBarClasses(e)}" type="button" data-event-id="${escapeHTML(e.id)}" title="${escapeHTML(eventTooltip(e))}"${eventColorStyle(e)}>${escapeHTML(e.title)}</button>
          `).join("")}
        </div>
      </div>`;
    });

    // 2. Multi-day Issue Bars
    const weekIssueIds = new Set(Object.values(usedSlotsByDay).flat().filter(Boolean));
    weekIssueIds.forEach(id => {
      const item = weekIssues.find(b => String(b.id) === id);
      if (!item) return;

      let startCol = -1;
      let endCol = -1;
      let slotIndex = -1;

      for (let c = 0; c < 7; c++) {
        const key = isoDate(weekCells[c].date);
        const slots = usedSlotsByDay[key] || [];
        const s = slots.indexOf(id);
        if (s !== -1) {
          if (startCol === -1) {
            startCol = c;
            slotIndex = s;
          }
          endCol = c;
        }
      }

      if (startCol !== -1) {
        const span = endCol - startCol + 1;
        const itemStartStr = item.startDate || item.dueDate;
        const itemEndStr = item.dueDate || item.startDate;
        const isStart = isoDate(weekCells[startCol].date) === itemStartStr;
        const isEnd = isoDate(weekCells[endCol].date) === itemEndStr;
        
        const classes = ["cal-bar", "issue"];
        if (itemStartStr !== itemEndStr) {
          if (!isStart) classes.push("connect-left");
          if (!isEnd) classes.push("connect-right");
        }

        gridHTML += `<button class="${classes.join(" ")}" type="button" data-issue-id="${escapeHTML(item.id)}" title="${escapeHTML(item.title)}" 
                        style="grid-column: ${startCol + 1} / span ${span}; grid-row: ${currentRow + 1 + slotIndex}; background-color: ${item.color}; z-index: ${10 + slotIndex}">
          ${escapeHTML(item.title)}
        </button>`;
      }
    });

    currentRow += weekSpan;
  });

  grid.innerHTML = gridHTML;

  // Footer count
  const count = calState.view === "issues" ? allIssues.length : events.length;
  document.getElementById("cal-foot-count").textContent =
    `${count} ${calState.view === "issues" ? "issues" : "events"} in view`;
}

function renderCalHeader() {
  document.getElementById("cal-month").innerHTML =
    `${MONTH_NAMES[calState.month]}<span class="yr">${calState.year}</span>`;
}

function renderCalProjects() {
  const container = document.getElementById("cal-projects");
  container.innerHTML = getCalendarProjects().map(p => `
    <div class="cal-project-row">
      <label class="cal-project">
        <input type="checkbox" data-project="${p.id}" ${calState.projects.has(p.id) ? "checked" : ""} />
        <span class="swatch" style="background:${p.color}"></span>
      </label>
      <button class="cal-project-name" data-project-id="${p.id}">${escapeHTML(p.name)}</button>
    </div>
  `).join("");

  container.querySelectorAll("input[type=checkbox]").forEach(cb => {
    cb.addEventListener("change", () => {
      const id = cb.dataset.project;
      if (cb.checked) calState.projects.add(id);
      else calState.projects.delete(id);
      renderCalGrid();
    });
  });

  container.querySelectorAll(".cal-project-name").forEach(btn => {
    btn.addEventListener("click", () => openProjectModal(btn.dataset.projectId));
  });
}

function renderCalLegend() {
  const isIssuesView = calState.view === "issues";
  const projectsSection = document.getElementById("cal-projects-section");
  const legendTitle = document.getElementById("cal-legend-title");

  if (projectsSection) projectsSection.hidden = isIssuesView;
  if (legendTitle) legendTitle.textContent = isIssuesView ? "Issues" : "Legend";

  if (isIssuesView) {
    renderCalIssuesLegend();
    return;
  }

  const container = document.getElementById("cal-legend");
  container.innerHTML = CAL_KINDS.map(kind => `
    <label class="cal-project">
      <input type="checkbox" data-kind="${kind}" ${calState.kinds.has(kind) ? "checked" : ""} />
      <span class="swatch bar-${kind}"></span>
      <span>${EVENT_KIND_LABELS[kind]}</span>
    </label>
  `).join("");

  container.querySelectorAll("input[type=checkbox]").forEach(cb => {
    cb.addEventListener("change", () => {
      const kind = cb.dataset.kind;
      if (cb.checked) calState.kinds.add(kind);
      else calState.kinds.delete(kind);
      renderCalGrid();
    });
  });
}

function renderCalIssuesLegend() {
  const container = document.getElementById("cal-legend");
  const issues = effectiveBlockers().filter(b => b.status?.toLowerCase() !== "resolved");
  
  if (issues.length === 0) {
    container.innerHTML = '<p class="empty-msg">No active issues found.</p>';
    return;
  }

  container.innerHTML = issues.map(b => `
    <div class="cal-project-row">
      <label class="cal-project">
        <input type="checkbox" data-issue="${b.id}" ${calState.issues.has(String(b.id)) ? "checked" : ""} />
        <input type="color" class="swatch-picker" data-issue-color="${b.id}" value="${b.color.length === 9 ? b.color.slice(0, 7) : b.color}" />
      </label>
      <span class="cal-project-name" title="${escapeHTML(b.title)}">${escapeHTML(b.title)}</span>
    </div>
  `).join("");

  container.querySelectorAll("input[type=checkbox]").forEach(cb => {
    cb.addEventListener("change", () => {
      const id = String(cb.dataset.issue);
      if (cb.checked) calState.issues.add(id);
      else calState.issues.delete(id);
      renderCalGrid();
    });
  });

  container.querySelectorAll("input[type=color]").forEach(picker => {
    picker.addEventListener("change", () => {
      const id = picker.dataset.issueColor;
      // Use 22 alpha for the background but keep the picker solid for UI
      const color = picker.value + "22"; 
      updateBlocker(id, { color });
      saveState();
      renderCalGrid();
    });
  });
}

function renderCalendar() {
  renderHeader();
  renderCalHeader();
  renderCalProjects();
  renderCalLegend();
  refreshActiveView();
}

function refreshActiveView() {
  const activeTab = document.querySelector(".cal-tab.active");
  const mode = activeTab ? activeTab.dataset.tab : "month";
  
  if (mode === "month") {
    renderCalGrid();
  } else if (mode === "week") {
    renderCalWeek();
  } else if (mode === "timeline") {
    renderCalTimeline();
  }
}

// ─── Controls ─────────────────────────────────────────────────────────
function bindCalendar() {
  const themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      // theme.js updates the DOM immediately, but we wait a tick to ensure data-theme is set
      setTimeout(renderCalendar, 0);
    });
  }

  // Month Nav
  document.getElementById("cal-prev").addEventListener("click", () => {
    if (calState.month === 0) { calState.month = 11; calState.year--; }
    else calState.month--;
    renderCalHeader();
    refreshActiveView();
  });
  document.getElementById("cal-next").addEventListener("click", () => {
    if (calState.month === 11) { calState.month = 0; calState.year++; }
    else calState.month++;
    renderCalHeader();
    refreshActiveView();
  });
  document.getElementById("cal-today").addEventListener("click", () => {
    const t = new Date();
    calState.year = t.getFullYear();
    calState.month = t.getMonth();
    calState.weekStart = getStartOfWeek(t);
    renderCalHeader();
    refreshActiveView();
  });

  // Week Nav
  document.getElementById("week-prev").addEventListener("click", () => {
    calState.weekStart.setDate(calState.weekStart.getDate() - 7);
    refreshActiveView();
  });
  document.getElementById("week-next").addEventListener("click", () => {
    calState.weekStart.setDate(calState.weekStart.getDate() + 7);
    refreshActiveView();
  });
  document.getElementById("week-today").addEventListener("click", () => {
    calState.weekStart = getStartOfWeek(new Date());
    refreshActiveView();
  });

  document.querySelectorAll(".cal-toggle button").forEach(b => {
    b.addEventListener("click", () => {
      calState.view = b.dataset.view;
      document.querySelectorAll(".cal-toggle button")
        .forEach(x => x.classList.toggle("on", x === b));
      renderCalLegend();
      refreshActiveView();
    });
  });

  document.getElementById("new-event-btn").addEventListener("click", () => {
    openEventModal();
  });
  document.getElementById("new-project-btn").addEventListener("click", () => openProjectModal());

  // Listen to clicks in both grids
  [document.getElementById("cal-grid"), document.getElementById("cal-week-grid")].forEach(grid => {
    if (!grid) return;
    grid.addEventListener("click", e => {
      const eventButton = e.target.closest("[data-event-id]");
      if (eventButton) {
        openEventModal(eventButton.dataset.eventId);
        return;
      }

      const issueButton = e.target.closest("[data-issue-id]");
      if (issueButton) {
        window.location.href = `issues.html?id=${issueButton.dataset.issueId}`;
      }
    });
  });

  // Folder tabs
  document.querySelectorAll(".cal-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      const mode = tab.dataset.tab;
      
      // Update tab UI
      document.querySelectorAll(".cal-tab").forEach(t => {
        t.classList.toggle("active", t === tab);
        t.setAttribute("aria-selected", t === tab);
      });

      // Show/hide sections
      const viewMonth = document.getElementById("view-month");
      const viewWeek = document.getElementById("view-week");
      const viewTimeline = document.getElementById("view-timeline");

      viewMonth.style.display = (mode === "month" ? "flex" : "none");
      viewWeek.style.display = (mode === "week" ? "flex" : "none");
      viewTimeline.style.display = (mode === "timeline" ? "block" : "none");

      refreshActiveView();
    });
  });

  bindEventModal();
  bindProjectModal();
}

function renderCalTimeline() {
  const container = document.getElementById("timeline-container");
  const hd = document.getElementById("timeline-hd");
  const issues = effectiveBlockers().filter(b => b.status?.toLowerCase() !== "resolved");
  const teammates = effectiveTeammates();

  // Range: Current month only
  const startDate = new Date(calState.year, calState.month, 1);
  const endDate = new Date(calState.year, calState.month + 1, 0);
  const totalDays = endDate.getDate();

  // Update External Header
  if (hd) {
    hd.innerHTML = `<div class="cal-month">${MONTH_NAMES[calState.month]}<span class="yr">${calState.year}</span></div>`;
  }

  if (issues.length === 0) {
    container.innerHTML = '<div class="timeline-empty">No active projects or issues found.</div>';
    return;
  }

  const daysArr = [];
  for (let d = 0; d < totalDays; d++) {
    const day = new Date(calState.year, calState.month, d + 1);
    daysArr.push(day);
  }

  let html = `
    <div class="timeline-grid">
      <div class="timeline-header">
        <div class="label-col">Milestones</div>
        <div class="days-col">
          ${daysArr.map(d => `<div class="day-tick ${d.getDay() === 0 || d.getDay() === 6 ? "weekend" : ""}" data-day="${d.getDate()}"><span>${d.getDate()}</span></div>`).join("")}
        </div>
      </div>
      <div class="timeline-body">
  `;

  issues.forEach(issue => {
    const sStr = issue.startDate || issue.dueDate;
    const eStr = issue.dueDate || issue.startDate;
    const iStart = new Date(`${sStr}T00:00:00`);
    const iEnd = new Date(`${eStr}T00:00:00`);

    if (iStart > endDate || iEnd < startDate) return;

    const visibleStart = iStart < startDate ? startDate : iStart;
    const visibleEnd = iEnd > endDate ? endDate : iEnd;

    const startIdx = visibleStart.getDate() - 1;
    const duration = Math.round((visibleEnd - visibleStart) / (1000 * 60 * 60 * 24)) + 1;

    const leftPct = (startIdx / totalDays) * 100;
    const widthPct = (duration / totalDays) * 100;

    const owner = teammates.find(t => t.id === issue.ownerId) || { name: issue.owner, id: "unknown" };
    const initials = (owner.name || "??").split(" ").map(n => n[0]).join("").toUpperCase();

    // Formatting date string for bar
    const barDateRange = duration > 1 
      ? `${visibleStart.getDate()}–${visibleEnd.getDate()}` 
      : `${visibleStart.getDate()}`;

    html += `
      <div class="timeline-row">
        <div class="label-col">
          <div class="issue-title" title="${escapeHTML(issue.title)}">${escapeHTML(issue.title)}</div>
        </div>
        <div class="days-col">
          <div class="timeline-bar-wrap" style="left: ${leftPct}%; width: ${widthPct}%">
            <div class="timeline-bar" style="background: ${issue.color || "var(--good-soft)"}; border-color: ${issue.color?.slice(0, 7) || "var(--good)"}">
              <div class="assignee-pill" title="Assigned to ${escapeHTML(owner.name)}">
                <span class="avatar">${initials}</span>
              </div>
              <span class="bar-title">${escapeHTML(issue.title)}</span>
              <span class="bar-dates">${barDateRange}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function getDefaultEventDate() {
  const today = new Date();
  const isViewingCurrentMonth =
    today.getFullYear() === calState.year && today.getMonth() === calState.month;
  return isoDate(isViewingCurrentMonth ? today : new Date(calState.year, calState.month, 1));
}

function openEventModal(eventId = null) {
  const event = eventId ? findCalendarEvent(eventId) : null;
  const modal = document.getElementById("calendar-event-modal");
  const form = document.getElementById("calendar-event-form");
  const title = document.getElementById("calendar-event-modal-title");
  const name = document.getElementById("calendar-event-name");
  const date = document.getElementById("calendar-event-date");
  const project = document.getElementById("calendar-event-project");
  const kind = document.getElementById("calendar-event-kind");
  const error = document.getElementById("calendar-event-error");
  const deleteButton = document.getElementById("calendar-event-delete");
  const submitButton = document.getElementById("calendar-event-submit");
  const projects = getCalendarProjects();
  const selectedProject = event?.project || projects[0]?.id || "";

  form.reset();
  calState.editingEventId = event?.id || null;
  title.textContent = event ? "Edit event" : "New event";
  name.value = event?.title || "";
  date.value = event?.date || getDefaultEventDate();
  project.innerHTML = projectOptions(selectedProject);
  project.value = selectedProject;
  kind.value = event?.kind || "team";
  deleteButton.hidden = !event;
  submitButton.textContent = event ? "Save changes" : "Create event";
  error.hidden = true;
  error.textContent = "";
  modal.hidden = false;
  name.focus();
}

function closeEventModal() {
  document.getElementById("calendar-event-modal").hidden = true;
  calState.editingEventId = null;
}

function bindEventModal() {
  const modal = document.getElementById("calendar-event-modal");
  const form = document.getElementById("calendar-event-form");

  document.getElementById("calendar-event-modal-close").addEventListener("click", closeEventModal);
  document.getElementById("calendar-event-cancel").addEventListener("click", closeEventModal);
  document.getElementById("calendar-event-delete").addEventListener("click", deleteCalendarEvent);
  modal.addEventListener("click", e => {
    if (e.target === modal) closeEventModal();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !modal.hidden) closeEventModal();
  });
  form.addEventListener("submit", createCalendarEvent);
}

function createCalendarEvent(e) {
  e.preventDefault();

  const title = document.getElementById("calendar-event-name").value.trim();
  const date = document.getElementById("calendar-event-date").value;
  const project = document.getElementById("calendar-event-project").value;
  const kind = document.getElementById("calendar-event-kind").value;
  const error = document.getElementById("calendar-event-error");

  if (!title || !date || !project || !getProjectById(project) || !EVENT_KIND_LABELS[kind]) {
    error.textContent = "Please complete every field before creating the event.";
    error.hidden = false;
    return;
  }

  const eventData = { date, title, kind, project };

  if (calState.editingEventId) updateCalendarEvent(calState.editingEventId, eventData);
  else {
    if (!Array.isArray(state.extraCalendarEvents)) state.extraCalendarEvents = [];
    state.extraCalendarEvents.push({
      id: `cal-${Date.now()}`,
      ...eventData,
    });
  }
  saveState();

  const selectedDate = new Date(`${date}T00:00:00`);
  calState.year = selectedDate.getFullYear();
  calState.month = selectedDate.getMonth();
  renderCalHeader();
  renderCalGrid();
  closeEventModal();
}

function updateCalendarEvent(id, eventData) {
  if (!Array.isArray(state.extraCalendarEvents)) state.extraCalendarEvents = [];
  const customIndex = state.extraCalendarEvents.findIndex(event => event.id === id);

  if (customIndex >= 0) {
    state.extraCalendarEvents[customIndex] = {
      ...state.extraCalendarEvents[customIndex],
      ...eventData,
    };
    return;
  }

  if (!state.calendarEventOverrides || typeof state.calendarEventOverrides !== "object") {
    state.calendarEventOverrides = {};
  }
  state.calendarEventOverrides[id] = {
    ...(state.calendarEventOverrides[id] || {}),
    ...eventData,
  };
}

function deleteCalendarEvent() {
  const id = calState.editingEventId;
  if (!id) return;

  if (!Array.isArray(state.extraCalendarEvents)) state.extraCalendarEvents = [];
  const customCount = state.extraCalendarEvents.length;
  state.extraCalendarEvents = state.extraCalendarEvents.filter(event => event.id !== id);

  if (state.extraCalendarEvents.length === customCount) {
    if (!Array.isArray(state.deletedCalendarEventIds)) state.deletedCalendarEventIds = [];
    if (!state.deletedCalendarEventIds.includes(id)) state.deletedCalendarEventIds.push(id);
    if (state.calendarEventOverrides) delete state.calendarEventOverrides[id];
  }

  saveState();
  renderCalGrid();
  closeEventModal();
}

function openProjectModal(projectId = null) {
  const project = projectId ? getProjectById(projectId) : null;
  const modal = document.getElementById("calendar-project-modal");
  const form = document.getElementById("calendar-project-form");
  const title = document.getElementById("calendar-project-modal-title");
  const nameInput = document.getElementById("calendar-project-name");
  const colorInput = document.getElementById("calendar-project-color");
  const error = document.getElementById("calendar-project-error");
  const deleteButton = document.getElementById("calendar-project-delete");
  const submitButton = document.getElementById("calendar-project-submit");
  const eventsSection = document.getElementById("calendar-project-events-section");
  const eventsList = document.getElementById("calendar-project-events-list");

  form.reset();
  calState.editingProjectId = projectId;
  title.textContent = project ? "Edit project" : "New project";
  nameInput.value = project?.name || "";
  
  // Normalize color for <input type="color"> which only accepts #RRGGBB
  let displayColor = project?.color || "#4f8cff";
  if (displayColor.startsWith("var(")) {
    const map = {
      "var(--ink)": "#000000", "var(--ink-2)": "#39352e",
      "var(--good)": "#2f6b3a", "var(--warn)": "#b56a14",
      "var(--bad)": "#b3261e", "var(--muted)": "#6e6655"
    };
    displayColor = map[displayColor] || "#4f8cff";
  }
  if (displayColor.length === 9) displayColor = displayColor.slice(0, 7);
  colorInput.value = displayColor;

  deleteButton.hidden = !project;
  submitButton.textContent = project ? "Save changes" : "Create project";
  error.hidden = true;
  error.textContent = "";

  if (project) {
    eventsSection.hidden = false;
    const projectEvents = getCalendarEvents()
      .filter(e => e.project === projectId)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    if (projectEvents.length > 0) {
      eventsList.innerHTML = projectEvents.map(e => `
        <div class="cal-project-event-item">
          <span class="date">${e.date}</span>
          <span class="title">${escapeHTML(e.title)}</span>
          <span class="kind-tag ${e.kind}">${e.kind}</span>
        </div>
      `).join("");
    } else {
      eventsList.innerHTML = "<p class=\"empty-msg\">No events for this project yet.</p>";
    }
  } else {
    eventsSection.hidden = true;
  }

  modal.hidden = false;
  nameInput.focus();
}

function closeProjectModal() {
  document.getElementById("calendar-project-modal").hidden = true;
  calState.editingProjectId = null;
}

function bindProjectModal() {
  const modal = document.getElementById("calendar-project-modal");
  const form = document.getElementById("calendar-project-form");

  document.getElementById("calendar-project-modal-close").addEventListener("click", closeProjectModal);
  document.getElementById("calendar-project-cancel").addEventListener("click", closeProjectModal);
  document.getElementById("calendar-project-delete").addEventListener("click", deleteCalendarProject);
  modal.addEventListener("click", e => {
    if (e.target === modal) closeProjectModal();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !modal.hidden) closeProjectModal();
  });
  form.addEventListener("submit", handleProjectSubmit);
}

function handleProjectSubmit(e) {
  e.preventDefault();

  const name = document.getElementById("calendar-project-name").value.trim();
  const color = document.getElementById("calendar-project-color").value;
  const error = document.getElementById("calendar-project-error");

  if (!name || !isHexColor(color)) {
    error.textContent = "Please add a project name and color.";
    error.hidden = false;
    return;
  }

  if (calState.editingProjectId) {
    updateCalendarProject(calState.editingProjectId, { name, color });
  } else {
    if (!Array.isArray(state.extraCalendarProjects)) state.extraCalendarProjects = [];
    const id = `project-${Date.now()}`;
    state.extraCalendarProjects.push({ id, name, color, on: true });
    calState.projects.add(id);
  }

  saveState();
  renderCalProjects();
  renderCalGrid();
  closeProjectModal();
}

function updateCalendarProject(id, data) {
  if (!Array.isArray(state.extraCalendarProjects)) state.extraCalendarProjects = [];
  const customIndex = state.extraCalendarProjects.findIndex(p => p.id === id);
  
  if (customIndex >= 0) {
    state.extraCalendarProjects[customIndex] = {
      ...state.extraCalendarProjects[customIndex],
      ...data
    };
  } else {
    const sample = CAL_PROJECTS.find(p => p.id === id);
    if (sample) {
      state.extraCalendarProjects.push({ ...sample, ...data });
      if (!Array.isArray(state.deletedSampleProjectIds)) state.deletedSampleProjectIds = [];
      state.deletedSampleProjectIds.push(id);
    }
  }
}

function deleteCalendarProject() {
  const id = calState.editingProjectId;
  if (!id) return;
  
  if (!confirm("Are you sure you want to delete this project? This will NOT delete associated events, but they will no longer have a project color.")) return;

  if (!Array.isArray(state.extraCalendarProjects)) state.extraCalendarProjects = [];
  state.extraCalendarProjects = state.extraCalendarProjects.filter(p => p.id !== id);
  
  const sample = CAL_PROJECTS.find(p => p.id === id);
  if (sample) {
    if (!Array.isArray(state.deletedSampleProjectIds)) state.deletedSampleProjectIds = [];
    if (!state.deletedSampleProjectIds.includes(id)) state.deletedSampleProjectIds.push(id);
  }

  calState.projects.delete(id);
  saveState();
  renderCalProjects();
  renderCalGrid();
  closeProjectModal();
}

function isHexColor(value) {
  return /^#[0-9a-f]{6}$/i.test(value);
}

document.addEventListener("DOMContentLoaded", () => {
  renderCalendar();
  bindCalendar();
});
