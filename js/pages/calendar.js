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
const CAL_EVENTS = [];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ─── State ────────────────────────────────────────────────────────────
const CAL_KINDS = ["global", "personal"];
let calState = {};

/**
 * Initializes the calendar state with default values based on the current date.
 * Sets the year, month, and active filters.
 */
function initCalState() {
  calState = {
    // Default to today (page loads on current month). Easy to override for demo.
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    projects: new Set(getCalendarProjects().filter(p => p.on).map(p => p.id)),
    kinds: new Set(CAL_KINDS),
    customGroups: new Set(),
    editingEventId: null,
    editingGroupId: null,
    weekStart: getStartOfWeek(new Date()),
  };
  
  // Initialize customGroups to show all by default
  getCalendarGroups().forEach(g => calState.customGroups.add(g.id));
}

/**
 * Returns an array of IDs for all custom calendar groups.
 * @returns {string[]} Array of group IDs.
 */
function getCustomGroupIds() {
  const groups = Array.isArray(window.calendarGroups) ? window.calendarGroups : [];
  return groups.map(g => g.id);
}

const EVENT_KIND_LABELS = {
  global: "Team",
  personal: "Personal",
};

// ─── Rendering ───────────────────────────────────────────────────────

/**
 * Calculates and returns the dates needed to fill a month-view grid.
 * Includes leading/trailing days from adjacent months to complete weeks.
 * @param {number} year - The year to build for.
 * @param {number} month - The month index (0-11).
 * @returns {Object[]} Array of cell objects { date: Date, muted: boolean }.
 */
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

/**
 * Formats a Date object into an ISO date string (YYYY-MM-DD).
 * @param {Date} d - The date to format.
 * @returns {string} The ISO date string.
 */
function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Checks if two Date objects represent the same calendar day.
 * @param {Date} a 
 * @param {Date} b 
 * @returns {boolean}
 */
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth()    === b.getMonth()
      && a.getDate()     === b.getDate();
}

/**
 * Filters the list of calendar events based on current visibility state.
 * @returns {Object[]} Filtered list of events.
 */
function filterEvents() {
  return getCalendarEvents().filter(e => {
    // Map event group to our UI kinds: default to global if not specified
    const uiKind = e.group === "personal" ? "personal" : (e.group === "global" ? "global" : e.group);
    
    if (CAL_KINDS.includes(uiKind)) {
      if (!calState.kinds.has(uiKind)) return false;
    } else {
      // It's a custom group
      if (!calState.customGroups.has(uiKind)) return false;
    }
    return true;
  });
}

/**
 * Merges sample projects with custom project data.
 * @returns {Object[]} Combined project list.
 */
function getCalendarProjects() {
  const customProjects = Array.isArray(state.extraCalendarProjects) ? state.extraCalendarProjects : [];
  const deletedSampleIds = new Set(Array.isArray(state.deletedSampleProjectIds) ? state.deletedSampleProjectIds : []);
  const samples = CAL_PROJECTS.filter(p => !deletedSampleIds.has(p.id));
  return [...samples, ...customProjects];
}

/**
 * Retrieves the current list of calendar groups from the global window object.
 * @returns {Object[]}
 */
function getCalendarGroups() {
  return Array.isArray(window.calendarGroups) ? window.calendarGroups : [];
}

/**
 * Retrieves the current list of calendar events from the global window object.
 * @returns {Object[]}
 */
function getCalendarEvents() {
  return Array.isArray(window.calendarEvents) ? window.calendarEvents : [];
}

const contrastCache = new Map();

/**
 * Calculates the best contrast color (white or black) for a given background color.
 * Caches results to improve performance during large grid renders.
 * @param {string} color - CSS color value (hex, rgb, or var).
 * @returns {string} Contrast color CSS variable.
 */
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

/**
 * Generates the style string for an event bar's background and text colors.
 * @param {Object} event - The event object.
 * @returns {string} CSS style string.
 */
function eventColorStyle(event) {
  const groupColors = state.calendarGroupColors || {};
  let color = groupColors[event.group] || (event.group === "personal" ? "var(--muted)" : "var(--ink)");
  
  // Check if it's a custom group
  const customGroups = getCalendarGroups();
  const customGroup = customGroups.find(g => g.id === event.group);
  if (customGroup) {
    color = customGroup.color;
  }
  
  const textColor = getContrastColor(color);
  return `--event-color:${color};--event-text:${textColor};`;
}

/**
 * Returns the CSS classes for an event bar.
 * @param {Object} event - The event object.
 * @returns {string} Space-separated class list.
 */
function eventBarClasses(event) {
  return ["cal-bar", event.group, "custom-color"].filter(Boolean).join(" ");
}

/**
 * Generates the tooltip text for an event bar.
 * @param {Object} event - The event object.
 * @returns {string}
 */
function eventTooltip(event) {
  const customGroups = getCalendarGroups();
  const customGroup = customGroups.find(g => g.id === event.group);
  const groupLabel = customGroup ? customGroup.name : (EVENT_KIND_LABELS[event.group] || "Event");
  return `${event.title} - ${groupLabel}`;
}

/**
 * Finds an event in the global list by its ID.
 * @param {string} id - The event UUID.
 * @returns {Object|undefined}
 */
function findCalendarEvent(id) {
  return getCalendarEvents().find(event => event.id === id);
}

/**
 * Finds a custom group in the global list by its ID.
 * @param {string} id - The group UUID.
 * @returns {Object|undefined}
 */
function findCalendarGroup(id) {
  return getCalendarGroups().find(g => g.id === id);
}

/**
 * Calculates the Sunday starting a week for any given date.
 * @param {Date} d 
 * @returns {Date}
 */
function getStartOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day; // 0 = Sunday
  return new Date(date.setDate(diff));
}

/**
 * Renders the single-week grid view.
 */
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

/**
 * Renders the main month-view grid with advanced multi-day bar stacking.
 */
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

/**
 * Updates the main calendar header with current month and year.
 */
function renderCalHeader() {
  document.getElementById("cal-month").innerHTML =
    `${MONTH_NAMES[calState.month]}<span class="yr">${calState.year}</span>`;
}

/**
 * Renders the sidebar legend with filter checkboxes and color pickers.
 */
function renderCalLegend() {
  const container = document.getElementById("cal-legend");
  if (!container) return;

  const groupColors = state.calendarGroupColors || {};
  const customGroups = getCalendarGroups();

  let html = CAL_KINDS.map(kind => {
    const currentColor = groupColors[kind] || (kind === "personal" ? "var(--muted)" : "var(--ink)");
    let pickerValue = currentColor;
    
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

  if (customGroups.length > 0) {
    html += '<div class="legend-divider"></div>';
    html += customGroups.map(group => {
      return `
        <label class="cal-project">
          <input type="checkbox" data-group-id="${group.id}" ${calState.customGroups.has(group.id) ? "checked" : ""} />
          <button type="button" class="swatch-btn" data-edit-group="${group.id}" style="background: ${group.color}" title="Edit group"></button>
          <span class="truncate" title="${escapeHTML(group.name)}">${escapeHTML(group.name)}</span>
        </label>
      `;
    }).join("");
  }

  container.innerHTML = html;

  container.querySelectorAll("input[data-kind]").forEach(cb => {
    cb.addEventListener("change", () => {
      const kind = cb.dataset.kind;
      if (cb.checked) calState.kinds.add(kind);
      else calState.kinds.delete(kind);
      refreshActiveView();
    });
  });

  container.querySelectorAll("input[data-group-id]").forEach(cb => {
    cb.addEventListener("change", () => {
      const id = cb.dataset.groupId;
      if (cb.checked) calState.customGroups.add(id);
      else calState.customGroups.delete(id);
      refreshActiveView();
    });
  });

  container.querySelectorAll("input[data-kind-color]").forEach(picker => {
    picker.addEventListener("change", () => {
      const kind = picker.dataset.kindColor;
      if (!state.calendarGroupColors) state.calendarGroupColors = {};
      state.calendarGroupColors[kind] = picker.value;
      saveState();
      refreshActiveView();
    });
  });

  container.querySelectorAll("[data-edit-group]").forEach(btn => {
    btn.addEventListener("click", () => {
      openGroupModal(btn.dataset.editGroup);
    });
  });
}

/**
 * Orchestrates the full rendering process for the current page state.
 */
function renderCalendar() {
  renderHeader();
  renderCalHeader();
  renderCalLegend();
  refreshActiveView();
}

/**
 * Refreshes only the currently active view (Month, Week, or Timeline).
 */
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

/**
 * Binds all event listeners for calendar navigation and controls.
 */
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
    calState.weekStart = getStartOfWeek(new Date(calState.year, calState.month, 1));
    renderCalHeader();
    refreshActiveView();
  });
  document.getElementById("cal-next").addEventListener("click", () => {
    if (calState.month === 11) { calState.month = 0; calState.year++; }
    else calState.month++;
    calState.weekStart = getStartOfWeek(new Date(calState.year, calState.month, 1));
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
    calState.year = calState.weekStart.getFullYear();
    calState.month = calState.weekStart.getMonth();
    renderCalHeader();
    refreshActiveView();
  });
  document.getElementById("week-next").addEventListener("click", () => {
    calState.weekStart.setDate(calState.weekStart.getDate() + 7);
    calState.year = calState.weekStart.getFullYear();
    calState.month = calState.weekStart.getMonth();
    renderCalHeader();
    refreshActiveView();
  });
  document.getElementById("week-today").addEventListener("click", () => {
    const t = new Date();
    calState.weekStart = getStartOfWeek(t);
    calState.year = t.getFullYear();
    calState.month = t.getMonth();
    renderCalHeader();
    refreshActiveView();
  });

  document.getElementById("new-group-btn").addEventListener("click", () => {
    openGroupModal();
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
  bindGroupModal();
  bindDayModal();
  bindSyncHover();
}

/**
 * Synchronizes hover states for events or issues that appear in multiple places 
 * (e.g., spanning multiple weeks in the grid or appearing in both grid and timeline).
 */
function bindSyncHover() {
  const containers = [
    document.getElementById("cal-grid"),
    document.getElementById("cal-week-grid"),
    document.getElementById("timeline-container")
  ];

  containers.forEach(container => {
    if (!container) return;

    container.addEventListener("mouseover", e => {
      const target = e.target.closest("[data-event-id], [data-issue-id]");
      if (!target) return;

      const id = target.dataset.eventId || target.dataset.issueId;
      const selector = target.dataset.eventId 
        ? `[data-event-id="${CSS.escape(id)}"]` 
        : `[data-issue-id="${CSS.escape(id)}"]`;

      document.querySelectorAll(selector).forEach(el => el.classList.add("hovered"));
    });

    container.addEventListener("mouseout", e => {
      const target = e.target.closest("[data-event-id], [data-issue-id]");
      if (!target) return;

      const id = target.dataset.eventId || target.dataset.issueId;
      const selector = target.dataset.eventId 
        ? `[data-event-id="${CSS.escape(id)}"]` 
        : `[data-issue-id="${CSS.escape(id)}"]`;

      document.querySelectorAll(selector).forEach(el => el.classList.remove("hovered"));
    });
  });
}

/**
 * Opens a modal showing all events for a specific day.
 * @param {string} dateStr - ISO date string of the day to inspect.
 */
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

/**
 * Closes the day details modal.
 */
function closeDayModal() {
  document.getElementById("calendar-day-modal").hidden = true;
}

/**
 * Binds closing events for the day modal.
 */
function bindDayModal() {
  const modal = document.getElementById("calendar-day-modal");
  document.getElementById("calendar-day-modal-close").addEventListener("click", closeDayModal);
  document.getElementById("calendar-day-close-btn").addEventListener("click", closeDayModal);
  modal.addEventListener("click", e => { if (e.target === modal) closeDayModal(); });
}

/**
 * Renders the horizontal timeline view for project issues.
 */
function renderCalTimeline() {
  const container = document.getElementById("timeline-container");
  const scrollWrapper = document.querySelector(".cal-timeline-view");
  const hd = document.getElementById("timeline-hd");
  const allIssues = effectiveBlockers().filter(b => b.status?.toLowerCase() !== "resolved");
  const teammates = effectiveTeammates();

  // Range: Current month bounds
  const monthStart = new Date(calState.year, calState.month, 1);
  const monthEnd = new Date(calState.year, calState.month + 1, 0);

  // 1. Filter and Sort issues active in this month
  const issues = allIssues.filter(issue => {
    const s = issue.startDate || issue.dueDate;
    const e = issue.dueDate || issue.startDate;
    if (!s) return false;
    const iStart = new Date(`${s}T00:00:00`);
    const iEnd = new Date(`${e}T00:00:00`);
    return iStart <= monthEnd && iEnd >= monthStart;
  }).sort((a, b) => (a.startDate || a.dueDate).localeCompare(b.startDate || b.dueDate));

  if (hd) {
    hd.innerHTML = `<div class="cal-month">${MONTH_NAMES[calState.month]}<span class="yr">${calState.year}</span></div>`;
  }

  if (issues.length === 0) {
    container.innerHTML = '<div class="timeline-empty">No active issues found for this month.</div>';
    return;
  }

  // 2. Determine "Relevant Range" (earliest start to latest end within month)
  let firstRelevantDay = monthStart.getDate();
  let lastRelevantDay = monthEnd.getDate();

  const issueDates = issues.flatMap(i => {
    const s = new Date(`${i.startDate || i.dueDate}T00:00:00`);
    const e = new Date(`${i.dueDate || i.startDate}T00:00:00`);
    return [s < monthStart ? monthStart : s, e > monthEnd ? monthEnd : e];
  });

  firstRelevantDay = Math.min(...issueDates.map(d => d.getDate()));
  lastRelevantDay = Math.max(...issueDates.map(d => d.getDate()));

  // Always include today if it's in the month
  const today = new Date();
  if (today.getFullYear() === calState.year && today.getMonth() === calState.month) {
    firstRelevantDay = Math.min(firstRelevantDay, today.getDate());
    lastRelevantDay = Math.max(lastRelevantDay, today.getDate());
  }

  const daysArr = [];
  for (let d = firstRelevantDay; d <= lastRelevantDay; d++) {
    daysArr.push(new Date(calState.year, calState.month, d));
  }

  const totalVisibleDays = daysArr.length;

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
    const iStart = new Date(`${sStr}T00:00:00`);
    const iEnd = new Date(`${eStr}T00:00:00`);

    const visibleStart = iStart < daysArr[0] ? daysArr[0] : iStart;
    const visibleEnd = iEnd > daysArr[totalVisibleDays - 1] ? daysArr[totalVisibleDays - 1] : iEnd;

    const startIdx = visibleStart.getDate() - firstRelevantDay;
    const duration = Math.round((visibleEnd - visibleStart) / (1000 * 60 * 60 * 24)) + 1;

    const leftPct = (startIdx / totalVisibleDays) * 100;
    const widthPct = (duration / totalVisibleDays) * 100;

    const owner = teammates.find(t => t.id === issue.ownerId) || { name: issue.owner, id: "unknown" };
    const initials = (owner.name || "??").split(" ").map(n => n[0]).join("").toUpperCase();
    const barDateRange = duration > 1 ? `${visibleStart.getDate()}–${visibleEnd.getDate()} (${duration}d)` : `${visibleStart.getDate()}`;
    const color = issue.color || "var(--ink)";
    const textColor = getContrastColor(color);
    const tooltipText = `${escapeHTML(issue.title)}\nDates: ${sStr} to ${eStr}\nAssignee: ${escapeHTML(owner.name)}`;

    html += `
      <div class="timeline-row">
        <div class="label-col">
          <div class="issue-title" title="${tooltipText}">${escapeHTML(issue.title)}</div>
        </div>
        <div class="days-col">
          ${daysArr.map(d => `<div class="day-tick ${d.getDay() === 0 || d.getDay() === 6 ? "weekend" : ""}"></div>`).join("")}
          <div class="timeline-bar-wrap" style="left: ${leftPct}%; width: ${widthPct}%">
            <div class="timeline-bar" data-issue-id="${escapeHTML(issue.id)}" style="background: ${color}; border-color: var(--ink); cursor: pointer;" title="${tooltipText}">
              <div class="assignee-pill">
                <span class="avatar">${initials}</span>
              </div>
              <span class="bar-title" style="color: ${textColor}">${escapeHTML(issue.title)}</span>
              <span class="bar-dates" style="color: ${textColor}">${barDateRange}</span>
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

  // Auto-scroll to today if today is in the visible range
  if (today.getFullYear() === calState.year && today.getMonth() === calState.month) {
    setTimeout(() => {
      const todayTick = container.querySelector(`.timeline-header [data-day="${today.getDate()}"]`);
      if (todayTick && scrollWrapper) {
        const labelWidth = 256; // 16rem in px
        scrollWrapper.scrollLeft = todayTick.offsetLeft - labelWidth - 100; // Center it a bit
      }
    }, 0);
  }

  // Add click listeners to timeline bars
  container.querySelectorAll(".timeline-bar").forEach(bar => {
    bar.addEventListener("click", () => {
      const issueId = bar.dataset.issueId;
      window.location.href = `issues.html?id=${issueId}`;
    });
  });
}

/**
 * Returns a default date for new events, preferring today if in range.
 * @returns {string} ISO date string.
 */
function getDefaultEventDate() {
  const today = new Date();
  const isViewingCurrentMonth =
    today.getFullYear() === calState.year && today.getMonth() === calState.month;
  return isoDate(isViewingCurrentMonth ? today : new Date(calState.year, calState.month, 1));
}

/**
 * Opens the event creation/editing modal.
 * @param {string|null} eventId - The ID of the event to edit, or null for new.
 * @param {string|null} defaultDate - Optional pre-selected date.
 */
function openEventModal(eventId = null, defaultDate = null) {
  const event = eventId ? findCalendarEvent(eventId) : null;
  const modal = document.getElementById("calendar-event-modal");
  const form = document.getElementById("calendar-event-form");
  const title = document.getElementById("calendar-event-modal-title");
  const name = document.getElementById("calendar-event-name");
  const date = document.getElementById("calendar-event-date");
  const endDate = document.getElementById("calendar-event-end-date");
  const groupSelect = document.getElementById("calendar-event-group");
  const error = document.getElementById("calendar-event-error");
  const deleteButton = document.getElementById("calendar-event-delete");
  const submitButton = document.getElementById("calendar-event-submit");

  form.reset();

  // Enforce Visibility Transition Rules
  const currentGroup = event?.group || "personal";
  let groupOptions = "";

  if (!event || currentGroup === "personal") {
    // New event or current Personal: Can go anywhere
    groupOptions += `<option value="personal">Personal</option>`;
    groupOptions += `<option value="global">Team</option>`;
    getCalendarGroups().forEach(g => {
      groupOptions += `<option value="${g.id}">${escapeHTML(g.name)}</option>`;
    });
    groupSelect.disabled = false;
  } else if (currentGroup === "global") {
    // Current Global: Locked
    groupOptions += `<option value="global">Team</option>`;
    groupSelect.disabled = true;
  } else {
    // Current Custom Group: Can go to Global, but not back to Personal
    const customGroup = findCalendarGroup(currentGroup);
    groupOptions += `<option value="${currentGroup}">${escapeHTML(customGroup?.name || "Current Group")}</option>`;
    groupOptions += `<option value="global">Team</option>`;
    groupSelect.disabled = false;
  }

  groupSelect.innerHTML = groupOptions;

  calState.editingEventId = event?.id || null;
  title.textContent = event ? "Edit event" : "New event";
  name.value = event?.title || "";
  date.value = event?.date || defaultDate || getDefaultEventDate();
  endDate.value = event?.endDate || "";
  groupSelect.value = currentGroup;
  
  // Permissions: Owner OR Group Leader can edit
  const currentUserId = window.team.currentUserId;
  const isOwner = !event || event.ownerId === currentUserId;
  
  let isGroupLeader = false;
  if (event && currentGroup !== 'global' && currentGroup !== 'personal') {
    const group = findCalendarGroup(currentGroup);
    if (group && group.creatorId === currentUserId) {
      isGroupLeader = true;
    }
  }

  const canEdit = isOwner || isGroupLeader;

  name.disabled = !canEdit;
  date.disabled = !canEdit;
  endDate.disabled = !canEdit;
  if (!canEdit) groupSelect.disabled = true;

  deleteButton.hidden = !event || !canEdit;
  submitButton.textContent = event ? "Save changes" : "Create event";
  submitButton.hidden = !canEdit && currentGroup === 'global';

  error.hidden = true;
  error.textContent = "";
  modal.hidden = false;
  if (canEdit) name.focus();
}

/**
 * Opens the group creation/editing modal.
 * @param {string|null} groupId - The ID of the group to edit, or null for new.
 */
function openGroupModal(groupId = null) {
  const group = groupId ? findCalendarGroup(groupId) : null;
  const modal = document.getElementById("calendar-group-modal");
  const form = document.getElementById("calendar-group-form");
  const title = document.getElementById("calendar-group-modal-title");
  const name = document.getElementById("calendar-group-name");
  const color = document.getElementById("calendar-group-color");
  const peopleList = document.getElementById("calendar-group-people-list");
  const error = document.getElementById("calendar-group-error");
  const deleteButton = document.getElementById("calendar-group-delete");
  const leaveButton = document.getElementById("calendar-group-leave");
  const submitButton = document.getElementById("calendar-group-submit");

  form.reset();
  calState.editingGroupId = group?.id || null;
  title.textContent = group ? "Edit group" : "New group";
  name.value = group?.name || "";
  color.value = group?.color || "#4f8cff";
  
  const currentUserId = window.team.currentUserId;
  const isCreator = !group || group.creatorId === currentUserId;

  deleteButton.hidden = !group || !isCreator;
  leaveButton.hidden = !group || isCreator;
  submitButton.textContent = group ? "Save changes" : "Create group";
  
  // Disable fields if not creator
  name.disabled = !isCreator;
  color.disabled = !isCreator;

  // Populate people list (excluding the current user)
  const teammates = effectiveTeammates();
  
  peopleList.innerHTML = teammates
    .filter(t => t.id !== currentUserId)
    .map(t => {
      const isChecked = group?.members?.includes(t.id);
      return `
        <label class="people-row ${isChecked ? "active" : ""} ${!isCreator ? "disabled" : ""}">
          <input type="checkbox" name="members" value="${t.id}" ${isChecked ? "checked" : ""} ${!isCreator ? "disabled" : ""}>
          <div class="people-info">
            ${avatar(t.name, t.id)}
            <div class="people-meta">
              <span class="name">${escapeHTML(t.name)}</span>
              <span class="role">${escapeHTML(t.role || "")}</span>
            </div>
          </div>
          <div class="check-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
        </label>
      `;
    }).join("");

  // Add listener for visual toggle
  peopleList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      cb.closest('.people-row').classList.toggle('active', cb.checked);
    });
  });

  error.hidden = true;
  error.textContent = "";
  modal.hidden = false;
  if (isCreator) name.focus();
}

/**
 * Closes the group modal.
 */
function closeGroupModal() {
  document.getElementById("calendar-group-modal").hidden = true;
  calState.editingGroupId = null;
}

/**
 * Binds events for the group modal.
 */
function bindGroupModal() {
  const modal = document.getElementById("calendar-group-modal");
  const form = document.getElementById("calendar-group-form");

  document.getElementById("calendar-group-modal-close").addEventListener("click", closeGroupModal);
  document.getElementById("calendar-group-cancel").addEventListener("click", closeGroupModal);
  document.getElementById("calendar-group-delete").addEventListener("click", deleteCalendarGroup);
  document.getElementById("calendar-group-leave").addEventListener("click", leaveCalendarGroup);
  modal.addEventListener("click", e => {
    if (e.target === modal) closeGroupModal();
  });
  form.addEventListener("submit", saveGroup);
}

/**
 * Persists a new or existing group to the database.
 * @param {Event} e - Form submission event.
 */
async function saveGroup(e) {
  e.preventDefault();
  const name = document.getElementById("calendar-group-name").value.trim();
  const color = document.getElementById("calendar-group-color").value;
  const checkboxes = document.querySelectorAll('#calendar-group-people-list input[name="members"]:checked');
  const members = Array.from(checkboxes).map(cb => cb.value);
  const error = document.getElementById("calendar-group-error");

  const currentUserId = window.team.currentUserId;
  const group = calState.editingGroupId ? findCalendarGroup(calState.editingGroupId) : null;
  const isCreator = !group || group.creatorId === currentUserId;

  if (!isCreator) {
    error.textContent = "Only the creator can edit group details.";
    error.hidden = false;
    return;
  }

  if (!name) {
    error.textContent = "Please enter a group name.";
    error.hidden = false;
    return;
  }

  // Creator is always in the group
  if (!members.includes(currentUserId)) {
    members.push(currentUserId);
  }

  const groupData = {
    name,
    color,
    members
  };

  try {
    if (calState.editingGroupId) {
      await db.updateCalendarGroup(calState.editingGroupId, groupData);
    } else {
      await db.createCalendarGroup(groupData);
    }

    await db.loadAll(); // Refresh groups and events from DB
    
    // Ensure all groups are in the local visibility set if they were newly created
    getCalendarGroups().forEach(g => {
      if (!calState.customGroups.has(g.id)) calState.customGroups.add(g.id);
    });

    renderCalLegend();
    refreshActiveView();
    closeGroupModal();
  } catch (err) {
    error.textContent = "Failed to save group. Please try again.";
    error.hidden = false;
    console.error(err);
  }
}

/**
 * Deletes the currently edited group.
 */
async function deleteCalendarGroup() {
  const id = calState.editingGroupId;
  if (!id) return;

  if (!confirm("Are you sure you want to delete this group? All shared events in this group will be hidden for everyone.")) return;

  try {
    await db.deleteCalendarGroup(id);
    await db.loadAll();
    
    calState.customGroups.delete(id);
    
    renderCalLegend();
    refreshActiveView();
    closeGroupModal();
  } catch (err) {
    alert("Failed to delete group.");
    console.error(err);
  }
}

/**
 * Removes the current user from the edited group.
 */
async function leaveCalendarGroup() {
  const id = calState.editingGroupId;
  if (!id) return;

  const group = findCalendarGroup(id);
  if (!group) return;

  if (!confirm("Are you sure you want to leave this group? You will no longer see its events.")) return;

  console.log("Leaving group via RPC:", id);

  try {
    await db.leaveCalendarGroup(id);
    console.log("Leave group successful");
    await db.loadAll();
    
    calState.customGroups.delete(id);
    
    renderCalLegend();
    refreshActiveView();
    closeGroupModal();
  } catch (err) {
    console.error("Leave group failed:", err);
    const msg = err.message || "Unknown error";
    alert(`Failed to leave group: ${msg}`);
  }
}

/**
 * Closes the event modal.
 */
function closeEventModal() {
  document.getElementById("calendar-event-modal").hidden = true;
  calState.editingEventId = null;
}

/**
 * Binds events for the event creation/editing modal.
 */
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

/**
 * Persists a new or edited event to the database.
 * @param {Event} e - Form submission event.
 */
async function createCalendarEvent(e) {
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

  const eventData = { 
    date, 
    endDate: endDate || null, 
    title, 
    group,
    teamId: (group === 'global' || group !== 'personal') ? window.team.id : null
  };

  try {
    if (calState.editingEventId) {
      await db.updateCalendarEvent(calState.editingEventId, eventData);
    } else {
      await db.createCalendarEvent(eventData);
    }

    await db.loadAll(); // Refresh global state from DB

    const selectedDate = new Date(`${date}T00:00:00`);
    calState.year = selectedDate.getFullYear();
    calState.month = selectedDate.getMonth();
    calState.weekStart = getStartOfWeek(selectedDate);
    
    renderCalHeader();
    refreshActiveView();
    closeEventModal();
  } catch (err) {
    error.textContent = "Failed to save event. Please try again.";
    error.hidden = false;
    console.error(err);
  }
}

/**
 * Deletes the currently edited event.
 */
async function deleteCalendarEvent() {
  const id = calState.editingEventId;
  if (!id) return;

  try {
    await db.deleteCalendarEvent(id);
    await db.loadAll();
    
    refreshActiveView();
    closeEventModal();
  } catch (err) {
    alert("Failed to delete event.");
    console.error(err);
  }
}

/**
 * Basic hex color validation.
 * @param {string} value 
 * @returns {boolean}
 */
function isHexColor(value) {
  return /^#[0-9a-f]{6}$/i.test(value);
}

// Initial entry point
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await db.loadAll();
    initCalState(); // Ensure state is ready before rendering
    renderCalendar();
    bindCalendar();
  } catch (err) {
    console.error("Initialization failed:", err);
    const header = document.getElementById("header-sub");
    if (header) header.textContent = "Error loading data. Please check your connection.";
  }
});
