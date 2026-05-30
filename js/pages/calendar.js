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
const CAL_KINDS = ["global", "personal"];

const calState = {
  // Default to today (page loads on current month). Easy to override for demo.
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  projects: new Set(getCalendarProjects().filter(p => p.on).map(p => p.id)),
  kinds: new Set(CAL_KINDS),
  editingEventId: null,
  editingProjectId: null,
  weekStart: null, // Initialized in bindCalendar or similar
};

// Initialize weekStart
calState.weekStart = getStartOfWeek(new Date());

const EVENT_KIND_LABELS = {
  global: "Global",
  personal: "Personal",
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
  return getCalendarEvents().filter(e => {
    // Map event group to our UI kinds: default to global if not specified
    const uiKind = e.group === "personal" ? "personal" : "global";
    
    if (!calState.kinds.has(uiKind)) return false;
    return true;
  });
}

function getCalendarProjects() {
  const customProjects = Array.isArray(state.extraCalendarProjects) ? state.extraCalendarProjects : [];
  const deletedSampleIds = new Set(Array.isArray(state.deletedSampleProjectIds) ? state.deletedSampleProjectIds : []);
  const samples = CAL_PROJECTS.filter(p => !deletedSampleIds.has(p.id));
  return [...samples, ...customProjects];
}

function getCalendarEvents() {
  const customEvents = Array.isArray(state.extraCalendarEvents) ? state.extraCalendarEvents : [];
  const deletedIds = new Set(Array.isArray(state.deletedCalendarEventIds) ? state.deletedCalendarEventIds : []);
  const overrides = state.calendarEventOverrides && typeof state.calendarEventOverrides === "object"
    ? state.calendarEventOverrides
    : {};
  const sampleEvents = CAL_EVENTS.map((event, index) => {
    const id = `sample-${index}`;
    // Map old 'kind' to new 'group' for samples
    const group = event.kind === "personal" ? "personal" : "global";
    return { ...event, id, group, source: "sample", ...(overrides[id] || {}) };
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
  const groupColors = state.calendarGroupColors || {};
  const color = groupColors[event.group] || (event.group === "personal" ? "var(--muted)" : "var(--ink)");
  
  const textColor = getContrastColor(color);
  return `--event-color:${color};--event-text:${textColor};`;
}

function eventBarClasses(event) {
  return ["cal-bar", event.group, "custom-color"].filter(Boolean).join(" ");
}

function eventTooltip(event) {
  const group = EVENT_KIND_LABELS[event.group] || "Event";
  return `${event.title} - ${group}`;
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
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    weekDays.push(d);
  }

  const dayHeader = DAY_NAMES.map(n => `<div class="cal-dayname">${n}</div>`).join("");
  
  const gridHTML = weekDays.map(date => {
    const key = isoDate(date);
    // Find events that overlap this day
    const dayEvents = events.filter(e => {
      const s = e.date;
      const end = e.endDate || e.date;
      return key >= s && key <= end;
    });
    const isToday = isSameDay(date, today);

    let html = `<div class="cal-cell ${isToday ? "today" : ""}">
      <div class="cal-date">${date.getDate()}</div>`;
    
    dayEvents.forEach(e => {
      html += `<button class="${eventBarClasses(e)}" type="button" data-event-id="${escapeHTML(e.id)}" title="${escapeHTML(eventTooltip(e))}" style="${eventColorStyle(e)}">${escapeHTML(e.title)}</button>`;
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
    const weekStartStr = isoDate(weekStart);
    const weekEndStr = isoDate(weekEnd);

    // Filter events active in THIS week
    const weekEvents = events.filter(e => {
      const s = e.date;
      const end = e.endDate || e.date;
      return s <= weekEndStr && end >= weekStartStr;
    });

    // Calculate slots day-by-day for this week
    const usedSlotsByDay = {}; // dateKey -> [eventId, null, eventId]
    const dayOverflowCounts = {}; // dateKey -> count

    for (let c = 0; c < 7; c++) {
      const dayDate = weekCells[c].date;
      const key = isoDate(dayDate);
      // Find all events active on this specific day
      const dayEvents = weekEvents.filter(e => key >= e.date && key <= (e.endDate || e.date));
      
      // Standard priority sort (earlier start, then longer duration)
      dayEvents.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        const aEnd = a.endDate || a.date;
        const bEnd = b.endDate || b.date;
        const aDur = (new Date(aEnd) - new Date(a.date)) || 0;
        const bDur = (new Date(bEnd) - new Date(b.date)) || 0;
        return bDur - aDur;
      });

      const daySlots = [];
      const prevKey = c > 0 ? isoDate(weekCells[c - 1].date) : null;
      const prevSlots = prevKey ? (usedSlotsByDay[prevKey] || []) : [];

      // Pass 1: Maintain continuity (prefer same slot as previous day)
      for (let s = 0; s < 3; s++) {
        const prevId = prevSlots[s];
        if (prevId && dayEvents.some(e => String(e.id) === prevId)) {
          daySlots[s] = prevId;
        }
      }

      // Pass 2: Fill remaining visible slots (0, 1, 2)
      let overflowCount = 0;
      dayEvents.forEach(event => {
        const id = String(event.id);
        if (daySlots.includes(id)) return; // Already assigned continuity

        let assigned = false;
        for (let s = 0; s < 3; s++) {
          if (!daySlots[s]) {
            daySlots[s] = id;
            assigned = true;
            break;
          }
        }
        if (!assigned) overflowCount++;
      });

      usedSlotsByDay[key] = daySlots;
      dayOverflowCounts[key] = overflowCount;
    }

    // Determine if any day in this week has overflow
    const hasWeekOverflow = Object.keys(dayOverflowCounts).some(dateKey => {
      return dateKey >= weekStartStr && dateKey <= weekEndStr && dayOverflowCounts[dateKey] > 0;
    });

    const weekSpan = hasWeekOverflow ? 5 : 4;

    // 1. Background Cells & Day Headers
    weekCells.forEach((cell, colIndex) => {
      const key = isoDate(cell.date);
      const isToday = isSameDay(cell.date, today);

      // The background cell - clickable to open day modal
      gridHTML += `<div class="cal-cell ${cell.muted ? "muted" : ""} ${isToday ? "today" : ""}" 
                        data-date="${key}"
                        style="grid-column: ${colIndex + 1}; grid-row: ${currentRow} / span ${weekSpan}"></div>`;

      // The header content (date)
      gridHTML += `<div class="cal-cell-header" data-date="${key}" style="grid-column: ${colIndex + 1}; grid-row: ${currentRow}; z-index: 5;">
        <div class="cal-date">${cell.date.getDate()}</div>
      </div>`;

      // Overflow indicator
      const overflow = dayOverflowCounts[key];
      if (overflow > 0) {
        gridHTML += `<div class="cal-more-indicator" data-date="${key}" 
                          style="grid-column: ${colIndex + 1}; grid-row: ${currentRow + 4}; z-index: 10;">
          +${overflow} more
        </div>`;
      }
    });

    // 2. Event Bars (Iterate by slot to find contiguous segments)
    for (let slot = 0; slot < 3; slot++) {
      let currentEventId = null;
      let startCol = -1;

      for (let c = 0; c <= 7; c++) {
        const key = c < 7 ? isoDate(weekCells[c].date) : null;
        const eventIdAtSlot = key ? (usedSlotsByDay[key]?.[slot] || null) : null;

        if (eventIdAtSlot !== currentEventId) {
          if (currentEventId) {
            // Render the segment from startCol to c-1
            const event = weekEvents.find(e => String(e.id) === currentEventId);
            if (event) {
              const span = c - startCol;
              
              // Check if this event actually continues from the previous day in this specific week
              const prevDayKey = startCol > 0 ? isoDate(weekCells[startCol - 1].date) : null;
              const continuesFromPrevDay = prevDayKey && usedSlotsByDay[prevDayKey]?.[slot] === currentEventId;
              
              // Check if this event actually continues to the next day in this specific week
              const nextDayKey = c < 7 ? isoDate(weekCells[c].date) : null;
              const continuesToNextDay = nextDayKey && usedSlotsByDay[nextDayKey]?.[slot] === currentEventId;

              const classes = [eventBarClasses(event)];
              if (event.endDate && event.endDate !== event.date) {
                if (continuesFromPrevDay || (startCol === 0 && isoDate(weekCells[0].date) > event.date)) {
                  classes.push("connect-left");
                }
                if (continuesToNextDay || (c === 7 && isoDate(weekCells[6].date) < (event.endDate || event.date))) {
                  classes.push("connect-right");
                }
              }

              gridHTML += `<button class="${classes.join(" ")}" type="button" data-event-id="${escapeHTML(event.id)}" title="${escapeHTML(eventTooltip(event))}" 
                              style="grid-column: ${startCol + 1} / span ${span}; grid-row: ${currentRow + 1 + slot}; z-index: ${10 + slot}; ${eventColorStyle(event)}">
                ${escapeHTML(event.title)}
              </button>`;
            }
          }
          currentEventId = eventIdAtSlot;
          startCol = c;
        }
      }
    }

    currentRow += weekSpan;
  });

  grid.innerHTML = gridHTML;

  // Footer count
  document.getElementById("cal-foot-count").textContent =
    `${events.length} events in view`;
}

function renderCalHeader() {
  document.getElementById("cal-month").innerHTML =
    `${MONTH_NAMES[calState.month]}<span class="yr">${calState.year}</span>`;
}

function renderCalLegend() {
  const container = document.getElementById("cal-legend");
  if (!container) return;

  const groupColors = state.calendarGroupColors || {};

  container.innerHTML = CAL_KINDS.map(kind => {
    const currentColor = groupColors[kind] || (kind === "personal" ? "var(--muted)" : "var(--ink)");
    let pickerValue = currentColor;
    
    // If it's a variable, we need a hex fallback for the <input type="color">
    if (currentColor.startsWith("var(")) {
      pickerValue = (kind === "personal" ? "#6e6655" : "#39352e");
    }

    return `
      <label class="cal-project">
        <input type="checkbox" data-kind="${kind}" ${calState.kinds.has(kind) ? "checked" : ""} />
        <input type="color" class="swatch-picker" data-kind-color="${kind}" value="${pickerValue}" title="Change ${kind} color" />
        <span>${EVENT_KIND_LABELS[kind]}</span>
      </label>
    `;
  }).join("");

  container.querySelectorAll("input[type=checkbox]").forEach(cb => {
    cb.addEventListener("change", () => {
      const kind = cb.dataset.kind;
      if (cb.checked) calState.kinds.add(kind);
      else calState.kinds.delete(kind);
      renderCalGrid();
    });
  });

  container.querySelectorAll("input[type=color]").forEach(picker => {
    picker.addEventListener("change", () => {
      const kind = picker.dataset.kindColor;
      if (!state.calendarGroupColors) state.calendarGroupColors = {};
      state.calendarGroupColors[kind] = picker.value;
      saveState();
      refreshActiveView();
      // Also update timeline if visible
      if (document.getElementById("view-timeline").style.display !== "none") {
        renderCalTimeline();
      }
    });
  });
}

function renderCalendar() {
  renderHeader();
  renderCalHeader();
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

  document.getElementById("new-event-btn").addEventListener("click", () => {
    openEventModal();
  });

  // Listen to clicks in both grids
  [document.getElementById("cal-grid"), document.getElementById("cal-week-grid")].forEach(grid => {
    if (!grid) return;
    grid.addEventListener("click", e => {
      const eventButton = e.target.closest("[data-event-id]");
      if (eventButton) {
        openEventModal(eventButton.dataset.eventId);
        e.stopPropagation();
        return;
      }

      const moreButton = e.target.closest(".cal-more-indicator");
      if (moreButton) {
        openDayModal(moreButton.dataset.date);
        e.stopPropagation();
        return;
      }

      const cell = e.target.closest(".cal-cell");
      if (cell && cell.dataset.date) {
        openDayModal(cell.dataset.date);
        return;
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
  bindDayModal();
}

function openDayModal(dateStr) {
  const modal = document.getElementById("calendar-day-modal");
  const title = document.getElementById("calendar-day-modal-title");
  const list = document.getElementById("calendar-day-events-list");
  
  const d = new Date(`${dateStr}T00:00:00`);
  title.textContent = d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  
  const allEvents = filterEvents();
  const dayEvents = allEvents.filter(e => {
    const s = e.date;
    const end = e.endDate || e.date;
    return dateStr >= s && dateStr <= end;
  });

  if (dayEvents.length === 0) {
    list.innerHTML = '<p class="empty-msg">No events for this day.</p>';
  } else {
    list.innerHTML = dayEvents.map(e => {
      const style = eventColorStyle(e);
      return `
        <div class="cal-day-event-item" data-event-id="${e.id}">
          <span class="swatch bar-${e.group}" style="${style} background: var(--event-color)"></span>
          <span class="title">${escapeHTML(e.title)}</span>
          <span class="group-tag" style="${style} border-color: var(--event-color); color: var(--event-color)">${e.group}</span>
        </div>
      `;
    }).join("");
    
    list.querySelectorAll(".cal-day-event-item").forEach(item => {
      item.addEventListener("click", () => {
        closeDayModal();
        openEventModal(item.dataset.eventId);
      });
    });
  }

  // Quick add button
  const addBtn = document.getElementById("calendar-day-add-btn");
  addBtn.onclick = () => {
    closeDayModal();
    openEventModal(null, dateStr);
  };

  modal.hidden = false;
}

function closeDayModal() {
  document.getElementById("calendar-day-modal").hidden = true;
}

function bindDayModal() {
  const modal = document.getElementById("calendar-day-modal");
  document.getElementById("calendar-day-modal-close").addEventListener("click", closeDayModal);
  document.getElementById("calendar-day-close-btn").addEventListener("click", closeDayModal);
  modal.addEventListener("click", e => { if (e.target === modal) closeDayModal(); });
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
    container.innerHTML = '<div class="timeline-empty">No active issues found in tracker.</div>';
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
        <div class="label-col">Issue Timelines</div>
        <div class="days-col">
          ${daysArr.map(d => `<div class="day-tick ${d.getDay() === 0 || d.getDay() === 6 ? "weekend" : ""}" data-day="${d.getDate()}"><span>${d.getDate()}</span></div>`).join("")}
        </div>
      </div>
      <div class="timeline-body">
  `;

  issues.forEach(issue => {
    const sStr = issue.startDate || issue.dueDate;
    const eStr = issue.dueDate || issue.startDate;
    if (!sStr) return;

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

    const color = issue.color || "var(--ink)";

    html += `
      <div class="timeline-row">
        <div class="label-col">
          <div class="issue-title" title="${escapeHTML(issue.title)}">${escapeHTML(issue.title)}</div>
        </div>
        <div class="days-col">
          <div class="timeline-bar-wrap" style="left: ${leftPct}%; width: ${widthPct}%">
            <div class="timeline-bar" data-issue-id="${escapeHTML(issue.id)}" style="background: ${color}; border-color: ${color}; cursor: pointer;">
              <div class="assignee-pill" title="Assigned to ${escapeHTML(owner.name)}">
                <span class="avatar">${initials}</span>
              </div>
              <span class="bar-title" style="color: var(--paper)">${escapeHTML(issue.title)}</span>
              <span class="bar-dates" style="color: var(--paper); opacity: 0.8">${barDateRange}</span>
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

  // Add click listeners to timeline bars
  container.querySelectorAll(".timeline-bar").forEach(bar => {
    bar.addEventListener("click", () => {
      const issueId = bar.dataset.issueId;
      window.location.href = `issues.html?id=${issueId}`;
    });
  });
}

function getDefaultEventDate() {
  const today = new Date();
  const isViewingCurrentMonth =
    today.getFullYear() === calState.year && today.getMonth() === calState.month;
  return isoDate(isViewingCurrentMonth ? today : new Date(calState.year, calState.month, 1));
}

function openEventModal(eventId = null, defaultDate = null) {
  const event = eventId ? findCalendarEvent(eventId) : null;
  const modal = document.getElementById("calendar-event-modal");
  const form = document.getElementById("calendar-event-form");
  const title = document.getElementById("calendar-event-modal-title");
  const name = document.getElementById("calendar-event-name");
  const date = document.getElementById("calendar-event-date");
  const endDate = document.getElementById("calendar-event-end-date");
  const group = document.getElementById("calendar-event-group");
  const error = document.getElementById("calendar-event-error");
  const deleteButton = document.getElementById("calendar-event-delete");
  const submitButton = document.getElementById("calendar-event-submit");

  form.reset();
  calState.editingEventId = event?.id || null;
  title.textContent = event ? "Edit event" : "New event";
  name.value = event?.title || "";
  date.value = event?.date || defaultDate || getDefaultEventDate();
  endDate.value = event?.endDate || "";
  group.value = event?.group || "global";
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
  const endDate = document.getElementById("calendar-event-end-date").value;
  const group = document.getElementById("calendar-event-group").value;
  const error = document.getElementById("calendar-event-error");

  if (!title || !date || !group) {
    error.textContent = "Please complete every field before creating the event.";
    error.hidden = false;
    return;
  }

  if (endDate && endDate < date) {
    error.textContent = "End date cannot be before start date.";
    error.hidden = false;
    return;
  }

  const eventData = { date, endDate, title, group };

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

function isHexColor(value) {
  return /^#[0-9a-f]{6}$/i.test(value);
}

document.addEventListener("DOMContentLoaded", () => {
  renderCalendar();
  bindCalendar();
});
