/**
 * Calendar page orchestrator — handles month, week, and timeline views.
 * 
 * ## Architecture Overview
 * This module manages the SitRep calendar interface, providing three distinct views:
 * 1. **Month View**: A traditional 7-column grid showing events and issue bars.
 * 2. **Week View**: A focused single-week view with higher vertical density for events.
 * 3. **Projects Timeline**: A horizontal Gantt-style view for project issues/blockers.
 *
 * ## Data Sources
 * - **Calendar Events**: Stored in Supabase `calendar_events`. Can be "global" (team-wide) or "personal".
 * - **Calendar Groups**: Custom shared circles (Supabase `calendar_groups`) with their own events and colors.
 * - **Blockers/Issues**: Fetched from Supabase and GitHub (via `selectors.js`). Only shown in the Timeline view.
 *
 * ## Visibility & Filtering
 * Visibility is controlled via the sidebar legend. The `calState` object tracks:
 * - `kinds`: Set of basic visibility types ("global", "personal").
 * - `customGroups`: Set of active custom group IDs.
 * Filtering is performed in real-time by `filterEvents()` for calendar grids and locally within `renderCalTimeline()` for issues.
 *
 * ## Rendering Logic
 * - **Grids**: Use CSS Grid with dynamic row/column spanning for multi-day events.
 * - **Slots**: `calculateEventSlots()` performs a two-pass layout to ensure visual continuity 
 *   (bars stay on the same vertical row across days/weeks) while maximizing space usage.
 * - **Contrast**: `getContrastColor()` dynamically calculates high-contrast text colors for event bars.
 */

// ─── Constants ────────────────────────────────────────────────────────
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
    // Default to today (page loads on current month).
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    kinds: new Set(CAL_KINDS),
    customGroups: new Set(),
    editingEventId: null,
    editingGroupId: null,
    weekStart: getStartOfWeek(new Date()),
  };
  
  // Initialize customGroups to show all by default
  getCalendarGroups().forEach(g => calState.customGroups.add(g.id));
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
    const group = e.group || "global";
    return CAL_KINDS.includes(group)
      ? calState.kinds.has(group)
      : calState.customGroups.has(group);
  });
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
    "var(--good)":      { light: "var(--paper)", dark: "var(--paper)" },
    "var(--good-soft)": { light: "var(--ink)",   dark: "var(--paper)" },
    "var(--warn)":      { light: "var(--paper)", dark: "var(--paper)" },
    "var(--warn-soft)": { light: "var(--ink)",   dark: "var(--paper)" },
    "var(--bad)":       { light: "var(--paper)", dark: "var(--paper)" },
    "var(--bad-soft)":  { light: "var(--ink)",   dark: "var(--paper)" },
    "var(--ink)":       { light: "var(--paper)", dark: "var(--paper)" },
    "var(--ink-2)":     { light: "var(--paper)", dark: "var(--paper)" },
    "var(--muted)":     { light: "var(--paper)", dark: "var(--paper)" },
    "var(--subtle)":    { light: "var(--ink)",   dark: "var(--paper)" },
    "var(--card-3)":    { light: "var(--ink)",   dark: "var(--paper)" },
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
 * Renders a contiguous event segment inside a week or month grid.
 */
function renderEventSegment(event, startCol, span, slot, rowBase, weekCells, usedSlotsByDay) {
  const prevDayKey = startCol > 0 ? isoDate(weekCells[startCol - 1].date) : null;
  const nextDayKey = startCol + span < 7 ? isoDate(weekCells[startCol + span].date) : null;
  const continuesFromPrevDay = prevDayKey && usedSlotsByDay[prevDayKey]?.[slot] === String(event.id);
  const continuesToNextDay = nextDayKey && usedSlotsByDay[nextDayKey]?.[slot] === String(event.id);

  const classes = [eventBarClasses(event)];
  if (event.endDate && event.endDate !== event.date) {
    if (continuesFromPrevDay || (startCol === 0 && isoDate(weekCells[0].date) > event.date)) {
      classes.push("connect-left");
    }
    if (continuesToNextDay || (startCol + span === 7 && isoDate(weekCells[6].date) < (event.endDate || event.date))) {
      classes.push("connect-right");
    }
  }

  return `
    <button class="${classes.join(" ")}" type="button" data-event-id="${escapeHTML(event.id)}" title="${escapeHTML(eventTooltip(event))}"
      style="grid-column: ${startCol + 1} / span ${span}; grid-row: ${rowBase + 1 + slot}; z-index: ${10 + slot}; ${eventColorStyle(event)}">
      ${escapeHTML(event.title)}
    </button>`;
}

function renderEventSegments(weekEvents, usedSlotsByDay, weekCells, rowBase, maxSlots) {
  const eventMap = new Map(weekEvents.map(event => [String(event.id), event]));
  let html = "";

  for (let slot = 0; slot < maxSlots; slot++) {
    let currentEventId = null;
    let startCol = -1;

    for (let c = 0; c <= 7; c++) {
      const key = c < 7 ? isoDate(weekCells[c].date) : null;
      const eventIdAtSlot = key ? (usedSlotsByDay[key]?.[slot] || null) : null;

      if (eventIdAtSlot !== currentEventId) {
        if (currentEventId) {
          const event = eventMap.get(String(currentEventId));
          if (event) {
            const span = c - startCol;
            html += renderEventSegment(event, startCol, span, slot, rowBase, weekCells, usedSlotsByDay);
          }
        }
        currentEventId = eventIdAtSlot;
        startCol = c;
      }
    }
  }

  return html;
}

/**
 * Calculates event slots for a range of dates to support multi-day bars.
 * Standard priority sort: earlier start date first, then longer duration.
 * 
 * @param {Object[]} events - Filtered events to stack.
 * @param {Date[]} days - Array of Date objects representing the columns.
 * @param {number} maxSlots - Maximum number of visible slots before overflow.
 * @returns {Object} { usedSlotsByDay: { dateKey: string[] }, dayOverflowCounts: { dateKey: number } }
 */
function calculateEventSlots(events, days, maxSlots) {
  const usedSlotsByDay = {}; 
  const dayOverflowCounts = {};
  const dateKeys = days.map(d => isoDate(d));

  dateKeys.forEach((key, c) => {
    // Find all events active on this specific day
    const dayEvents = events.filter(e => key >= e.date && key <= (e.endDate || e.date));
    
    // Sort by start date, then duration (descending)
    dayEvents.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      const aEnd = a.endDate || a.date;
      const bEnd = b.endDate || b.date;
      const aDur = (new Date(aEnd) - new Date(a.date)) || 0;
      const bDur = (new Date(bEnd) - new Date(b.date)) || 0;
      return bDur - aDur;
    });

    const daySlots = [];
    const prevKey = c > 0 ? dateKeys[c - 1] : null;
    const prevSlots = prevKey ? (usedSlotsByDay[prevKey] || []) : [];

    // Pass 1: Maintain continuity (prefer same slot as previous day)
    for (let s = 0; s < maxSlots; s++) {
      const prevId = prevSlots[s];
      if (prevId && dayEvents.some(e => String(e.id) === prevId)) {
        daySlots[s] = prevId;
      }
    }

    // Pass 2: Fill remaining visible slots
    let overflowCount = 0;
    dayEvents.forEach(event => {
      const id = String(event.id);
      if (daySlots.includes(id)) return;

      let assigned = false;
      for (let s = 0; s < maxSlots; s++) {
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
  });

  return { usedSlotsByDay, dayOverflowCounts };
}

/**
 * Sunday starting a week for any given date.
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
  const weekStartStr = isoDate(start);
  const weekEndStr = isoDate(end);

  // Update header label
  const startM = MONTH_NAMES[start.getMonth()].slice(0, 3);
  const endM = MONTH_NAMES[end.getMonth()].slice(0, 3);
  const yearText = start.getFullYear() === end.getFullYear() ? start.getFullYear() : `${start.getFullYear()}-${end.getFullYear()}`;
  label.innerHTML = `${startM} ${start.getDate()} – ${endM} ${end.getDate()}<span class="yr">${yearText}</span>`;

  const events = filterEvents();
  const weekCells = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    weekCells.push({ date: d });
  }

  // Filter events active in THIS week
  const weekEvents = events.filter(e => {
    const s = e.date;
    const evEnd = e.endDate || e.date;
    return s <= weekEndStr && evEnd >= weekStartStr;
  });

  // Calculate slots
  const { usedSlotsByDay, dayOverflowCounts } = calculateEventSlots(weekEvents, weekCells.map(c => c.date), 15);

  const dayHeader = DAY_NAMES.map(n => `<div class="cal-dayname">${n}</div>`).join("");
  let gridHTML = dayHeader;

  // 1. Background Cells & Day Headers
  weekCells.forEach((cell, colIndex) => {
    const key = isoDate(cell.date);
    const isToday = isSameDay(cell.date, today);

    gridHTML += `<div class="cal-cell ${isToday ? "today" : ""}" 
                      data-date="${key}"
                      style="grid-column: ${colIndex + 1}; grid-row: 2 / span 20"></div>`;

    gridHTML += `<div class="cal-cell-header" data-date="${key}" style="grid-column: ${colIndex + 1}; grid-row: 2; z-index: 5;">
      <div class="cal-date">${cell.date.getDate()}</div>
    </div>`;

    const overflow = dayOverflowCounts[key];
    if (overflow > 0) {
      gridHTML += `<div class="cal-more-indicator" data-date="${key}" 
                        style="grid-column: ${colIndex + 1}; grid-row: 18; z-index: 10;">
        +${overflow} more
      </div>`;
    }
  });

  // 2. Event Bars
  gridHTML += renderEventSegments(weekEvents, usedSlotsByDay, weekCells, 2, 15);

  container.innerHTML = gridHTML;

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

    // Calculate slots
    const { usedSlotsByDay, dayOverflowCounts } = calculateEventSlots(weekEvents, weekCells.map(c => c.date), 3);

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
    gridHTML += renderEventSegments(weekEvents, usedSlotsByDay, weekCells, currentRow, 3);

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

  let html = "";

  // 1. Kinds (Team, Personal) First
  html += CAL_KINDS.map(kind => {
    const currentColor = groupColors[kind] || (kind === "personal" ? "var(--muted)" : "var(--ink)");
    const pickerValue = currentColor.startsWith("var(")
      ? (kind === "personal" ? "#6e6655" : "#39352e")
      : currentColor;
    const colorStyle = `background: ${currentColor}`;

    return `
      <div class="cal-project">
        <input type="checkbox" data-kind="${kind}" ${calState.kinds.has(kind) ? "checked" : ""} />
        <div style="position: relative; display: flex;">
          <button type="button" class="swatch-btn" data-kind-swatch="${kind}" style="${colorStyle}" title="Change ${kind} color"></button>
          <input type="color" class="hidden-picker" data-kind-color="${kind}" value="${pickerValue}" />
        </div>
        <button type="button" class="cal-project-name truncate" data-kind-name="${kind}" title="${EVENT_KIND_LABELS[kind]}">${EVENT_KIND_LABELS[kind]}</button>
        ${kind === 'global' ? `<button type="button" class="btn-info-sm" id="toggle-team-list" title="View Team Members">i</button>` : ''}
      </div>
    `;
  }).join("");

  // 2. Custom Groups Second
  if (customGroups.length > 0) {
    html += '<div class="legend-divider"></div>';
    html += customGroups.map(group => {
      return `
        <div class="cal-project">
          <input type="checkbox" data-group-id="${group.id}" ${calState.customGroups.has(group.id) ? "checked" : ""} />
          <div style="position: relative; display: flex;">
            <button type="button" class="swatch-btn" data-group-swatch="${group.id}" style="background: ${group.color}" title="Change group color"></button>
            <input type="color" class="hidden-picker" data-group-color-input="${group.id}" value="${group.color}" />
          </div>
          <button type="button" class="cal-project-name truncate" data-edit-group="${group.id}" title="${escapeHTML(group.name)}">${escapeHTML(group.name)}</button>
        </div>
      `;
    }).join("");
  }

  container.innerHTML = html;
}

/**
 * Orchestrates the full rendering process for the current page state.
 */
function renderCalendar() {
  renderHeader();
  renderCalHeader();
  renderCalLegend();
  renderTeamList();
  refreshActiveView();
}

/**
 * Renders the team members list in the sidebar.
 */
function renderTeamList() {
  const container = document.getElementById("cal-team-list");
  if (!container) return;

  const teammates = effectiveTeammates();
  container.innerHTML = teammates.map(t => `
    <div class="people-row readonly">
      <div class="people-info">
        ${avatar(t.name, t.id)}
        <div class="people-meta">
          <span class="name">${escapeHTML(t.name)}</span>
          <span class="role">${escapeHTML(t.role || "")}</span>
        </div>
      </div>
    </div>
  `).join("");
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
  const calPrev = document.getElementById("cal-prev");
  const calNext = document.getElementById("cal-next");
  const calToday = document.getElementById("cal-today");

  if (calPrev) {
    calPrev.addEventListener("click", () => {
      if (calState.month === 0) { calState.month = 11; calState.year--; }
      else calState.month--;
      calState.weekStart = getStartOfWeek(new Date(calState.year, calState.month, 1));
      renderCalHeader();
      refreshActiveView();
    });
  }

  if (calNext) {
    calNext.addEventListener("click", () => {
      if (calState.month === 11) { calState.month = 0; calState.year++; }
      else calState.month++;
      calState.weekStart = getStartOfWeek(new Date(calState.year, calState.month, 1));
      renderCalHeader();
      refreshActiveView();
    });
  }

  if (calToday) {
    calToday.addEventListener("click", () => {
      const t = new Date();
      calState.year = t.getFullYear();
      calState.month = t.getMonth();
      calState.weekStart = getStartOfWeek(t);
      renderCalHeader();
      refreshActiveView();
    });
  }

  // Week Nav
  const weekPrev = document.getElementById("week-prev");
  const weekNext = document.getElementById("week-next");
  const weekToday = document.getElementById("week-today");

  if (weekPrev) {
    weekPrev.addEventListener("click", () => {
      calState.weekStart.setDate(calState.weekStart.getDate() - 7);
      calState.year = calState.weekStart.getFullYear();
      calState.month = calState.weekStart.getMonth();
      renderCalHeader();
      refreshActiveView();
    });
  }

  if (weekNext) {
    weekNext.addEventListener("click", () => {
      calState.weekStart.setDate(calState.weekStart.getDate() + 7);
      calState.year = calState.weekStart.getFullYear();
      calState.month = calState.weekStart.getMonth();
      renderCalHeader();
      refreshActiveView();
    });
  }

  if (weekToday) {
    weekToday.addEventListener("click", () => {
      const t = new Date();
      calState.weekStart = getStartOfWeek(t);
      calState.year = t.getFullYear();
      calState.month = t.getMonth();
      renderCalHeader();
      refreshActiveView();
    });
  }

  const newGroupBtn = document.getElementById("new-group-btn");
  if (newGroupBtn) newGroupBtn.addEventListener("click", () => openGroupModal());

  const newEventBtn = document.getElementById("new-event-btn");
  if (newEventBtn) newEventBtn.addEventListener("click", () => openEventModal());

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

  bindCalLegend();
  bindEventModal();
  bindGroupModal();
  bindDayModal();
  bindSyncHover();
}

/**
 * One-time setup for the calendar legend using event delegation.
 * This prevents listener accumulation during re-renders.
 */
function bindCalLegend() {
  const container = document.getElementById("cal-legend");
  if (!container) return;

  // Helper: Toggle Team Section
  const toggleTeam = () => {
    const teamSection = document.getElementById("cal-team-section");
    if (teamSection) {
      teamSection.hidden = !teamSection.hidden;
      const infoBtn = container.querySelector("#toggle-team-list");
      if (infoBtn) infoBtn.classList.toggle("active", !teamSection.hidden);
    }
  };

  // 1. Interactions (Swatches and Labels) via Click Delegation
  container.addEventListener("click", (e) => {
    const target = e.target;
    
    // Kind Name/Swatch
    const kindName = target.closest("[data-kind-name]")?.dataset.kindName;
    const kindSwatch = target.closest("[data-kind-swatch]")?.dataset.kindSwatch;
    const kindId = kindName || kindSwatch;

    if (kindId) {
      if (kindName) {
        if (kindId === "global") {
          // Team label: ONLY toggle the team list view
          toggleTeam();
        } else {
          // Personal (and others): Toggle visibility checkbox for events
          const cb = container.querySelector(`input[data-kind="${kindId}"]`);
          if (cb) {
            cb.checked = !cb.checked;
            cb.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }
      } else {
        // Swatch click: open color picker
        container.querySelector(`input[data-kind-color="${kindId}"]`)?.click();
      }
      return;
    }

    // Group Swatch
    const groupSwatch = target.closest("[data-group-swatch]")?.dataset.groupSwatch;
    if (groupSwatch) {
      container.querySelector(`input[data-group-color-input="${groupSwatch}"]`)?.click();
      return;
    }

    // Edit Group (Name click)
    const editGroupId = target.closest("[data-edit-group]")?.dataset.editGroup;
    if (editGroupId) {
      openGroupModal(editGroupId);
      return;
    }

    // Info Button
    if (target.closest("#toggle-team-list")) {
      toggleTeam();
    }
  });

  // 2. Visibility Toggles via Change Delegation
  container.addEventListener("change", (e) => {
    const target = e.target;
    const kind = target.dataset.kind;
    const groupId = target.dataset.groupId;
    
    if (kind || groupId) {
      if (kind) {
        if (target.checked) calState.kinds.add(kind);
        else calState.kinds.delete(kind);
      } else if (groupId) {
        if (target.checked) calState.customGroups.add(groupId);
        else calState.customGroups.delete(groupId);
      }
      refreshActiveView();
      return;
    }

    // Live Color Change Persistence (Kinds)
    const kindColor = target.dataset.kindColor;
    if (kindColor) {
      saveState();
      refreshActiveView();
      return;
    }

    // Live Color Change Persistence (Groups)
    const groupColorInputId = target.dataset.groupColorInput;
    if (groupColorInputId) {
      (async () => {
        try {
          await db.updateCalendarGroup(groupColorInputId, { color: target.value });
          await db.loadAll();
          refreshActiveView();
        } catch (err) {
          console.error("Failed to update group color:", err);
        }
      })();
    }
  });

  // 3. Live Color Feedback via Input Delegation
  container.addEventListener("input", (e) => {
    const target = e.target;
    const kindColor = target.dataset.kindColor;
    const groupColorInputId = target.dataset.groupColorInput;

    if (kindColor) {
      if (!state.calendarGroupColors) state.calendarGroupColors = {};
      state.calendarGroupColors[kindColor] = target.value;
      container.querySelector(`button[data-kind-swatch="${kindColor}"]`).style.background = target.value;
    } else if (groupColorInputId) {
      container.querySelector(`button[data-group-swatch="${groupColorInputId}"]`).style.background = target.value;
    }
  });
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
      const customGroup = findCalendarGroup(e.group);
      const groupLabel = customGroup ? customGroup.name : (EVENT_KIND_LABELS[e.group] || "Event");
      
      return `
        <div class="cal-day-event-item" data-event-id="${e.id}">
          <span class="swatch bar-${e.group}" style="${style} background: var(--event-color)"></span>
          <span class="title">${escapeHTML(e.title)}</span>
          <span class="group-tag" style="${style} border-color: var(--event-color); color: var(--event-color)">${escapeHTML(groupLabel)}</span>
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
  const allIssues = effectiveBlockers(); // Include resolved issues
  const teammates = effectiveTeammates();

  // Range: Current month bounds PLUS previous and next month for context
  const monthStart = new Date(calState.year, calState.month - 1, 1);
  const monthEnd = new Date(calState.year, calState.month + 2, 0);

  // 1. Filter and Sort issues active in this 3-month window
  const issues = allIssues.filter(issue => {
    // Sync: Respect group visibility filters
    if (issue.group) {
      if (CAL_KINDS.includes(issue.group)) {
        if (!calState.kinds.has(issue.group)) return false;
      } else {
        if (!calState.customGroups.has(issue.group)) return false;
      }
    }

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
    container.innerHTML = '<div class="timeline-empty">No active issues found for this period.</div>';
    return;
  }

  // 2. Determine "Relevant Range" based on the actual dates of the issues found
  const issueDates = issues.flatMap(i => {
    const s = new Date(`${i.startDate || i.dueDate}T00:00:00`);
    const e = new Date(`${i.dueDate || i.startDate}T00:00:00`);
    return [s < monthStart ? monthStart : s, e > monthEnd ? monthEnd : e];
  });

  const minDate = new Date(Math.min(...issueDates));
  const maxDate = new Date(Math.max(...issueDates));
  
  // Ensure we at least show the current month even if no issues are in it
  const viewMin = minDate < monthStart ? minDate : monthStart;
  const viewMax = maxDate > monthEnd ? maxDate : monthEnd;

  const daysArr = [];
  let curr = new Date(viewMin);
  while (curr <= viewMax) {
    daysArr.push(new Date(curr));
    curr.setDate(curr.getDate() + 1);
  }

  const totalVisibleDays = daysArr.length;

  let html = `
    <div class="timeline-grid">
      <div class="timeline-header">
        <div class="label-col">Issue Timelines</div>
        <div class="days-col">
          ${daysArr.map(d => {
            const isFirstOfMonth = d.getDate() === 1;
            const monthLabel = isFirstOfMonth ? `<div class="month-marker">${MONTH_NAMES[d.getMonth()].slice(0, 3)}</div>` : '';
            return `<div class="day-tick ${d.getDay() === 0 || d.getDay() === 6 ? "weekend" : ""}" data-date="${isoDate(d)}">${monthLabel}<span>${d.getDate()}</span></div>`;
          }).join("")}
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

    const startIdx = Math.round((visibleStart - daysArr[0]) / (1000 * 60 * 60 * 24));
    const duration = Math.round((visibleEnd - visibleStart) / (1000 * 60 * 60 * 24)) + 1;

    const leftPct = (startIdx / totalVisibleDays) * 100;
    const widthPct = (duration / totalVisibleDays) * 100;

    const owner = teammates.find(t => t.id === issue.ownerId) || { name: issue.owner, id: "unknown" };
    const initials = (owner.name || "??").split(" ").map(n => n[0]).join("").toUpperCase();
    
    // Status-based color coding
    const status = (issue.status || "open").toLowerCase();
    const isDark = document.documentElement.dataset.theme === "dark";
    
    let color = issue.color;
    if (!color) {
      if (status === "in-progress") color = "var(--warn)";
      else if (status === "resolved") color = "var(--good)";
      else color = "var(--ink)";
    }

    const textColor = "var(--paper)"; 
    const borderColor = isDark ? "var(--ink)" : "white";
    const tooltipText = `${escapeHTML(issue.title)}\nStatus: ${status}\nDates: ${sStr} to ${eStr}\nAssignee: ${escapeHTML(owner.name)}`;

    html += `
      <div class="timeline-row">
        <div class="label-col">
          <div class="issue-title" title="${tooltipText}">${escapeHTML(issue.title)}</div>
        </div>
        <div class="days-col">
          ${daysArr.map(d => `<div class="day-tick ${d.getDay() === 0 || d.getDay() === 6 ? "weekend" : ""}"></div>`).join("")}
          <div class="timeline-bar-wrap" style="left: ${leftPct}%; width: ${widthPct}%">
            <div class="timeline-bar" data-issue-id="${escapeHTML(issue.id)}" style="background: ${color}; border-color: ${borderColor}; cursor: pointer;" title="${tooltipText}">
              <div class="assignee-pill">
                <span class="avatar">${initials}</span>
              </div>
              <span class="bar-title" style="color: ${textColor}">${escapeHTML(issue.title)}</span>
              <span class="bar-dates" style="color: ${textColor}">${visibleStart.getDate()}–${visibleEnd.getDate()}</span>
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

  // Auto-scroll to today
  const today = new Date();
  const todayStr = isoDate(today);
  setTimeout(() => {
    const todayTick = container.querySelector(`.timeline-header [data-date="${todayStr}"]`);
    if (todayTick && scrollWrapper) {
      const labelWidth = 256; 
      scrollWrapper.scrollLeft = todayTick.offsetLeft - labelWidth - 100; 
    }
  }, 0);

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

  // Handle Group Members Field
  const teamField = document.getElementById("calendar-event-team-field");
  const teamList = document.getElementById("calendar-event-team-list");
  const teamLabel = teamField.querySelector('span');
  
  function updateTeamVisibility() {
    const val = groupSelect.value;
    
    if (val === 'personal') {
      teamField.hidden = true;
      return;
    }

    teamField.hidden = false;
    let members = [];
    
    if (val === 'global') {
      teamLabel.textContent = "Team Members";
      members = effectiveTeammates();
    } else {
      teamLabel.textContent = "Group Members";
      const group = findCalendarGroup(val);
      if (group) {
        // Map member IDs to teammate objects
        members = (group.members || [])
          .map(uid => window.teammates.find(t => t.id === uid))
          .filter(Boolean);
      }
    }

    teamList.innerHTML = members.map(t => `
      <div class="people-row readonly">
        <div class="people-info">
          ${avatar(t.name, t.id)}
          <div class="people-meta">
            <span class="name">${escapeHTML(t.name)}</span>
            <span class="role">${escapeHTML(t.role || "")}</span>
          </div>
        </div>
      </div>
    `).join("");
  }

  groupSelect.onchange = updateTeamVisibility;
  updateTeamVisibility();
  
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

  try {
    await db.leaveCalendarGroup(id);
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
