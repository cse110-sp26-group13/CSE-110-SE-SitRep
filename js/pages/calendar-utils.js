/**
 * Shared calendar constants and helpers used by the calendar page scripts.
 *
 * How this file works:
 * - Defines labels and constants used by every calendar view.
 * - Provides date helpers for month grid construction, ISO date keys, and
 *   same-day checks.
 * - Reads calendar events/groups from globals populated by `db.loadAll()`.
 * - Converts event records into render-ready details: colors, contrast text,
 *   tooltips, CSS classes, and multi-day bar segments.
 * - Calculates slot maps for month/week grids so events stay on the same visual
 *   row as they continue across adjacent days.
 *
 * This file intentionally has no DOM event binding or database writes. It is
 * loaded before `calendar.js`, so these helpers are available globally to the
 * page orchestrator.
 */
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ─── State ────────────────────────────────────────────────────────────
// Basic visibility categories available to all users.
const CAL_KINDS = ["global", "personal"];

const EVENT_KIND_LABELS = {
  global: "Team",
  personal: "Personal",
};

// ─── Rendering ───────────────────────────────────────────────────────

/**
 * Calculates and returns the dates needed to fill a month-view grid.
 * Includes leading/trailing days from adjacent months to complete weeks (7 columns).
 * @param {number} year - The year to build for.
 * @param {number} month - The month index (0-11).
 * @returns {Object[]} Array of cell objects { date: Date, muted: boolean }.
 */
function buildMonthCells(year, month) {
  const first = new Date(year, month, 1);
  const startDow = first.getDay(); // Find which day of the week the month starts on.
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const cells = [];

  // Previous-month tail: Fill the gap before the 1st of the month.
  for (let i = startDow - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrev - i), muted: true });
  }

  // This month: The core days of the currently viewed month.
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), muted: false });
  }

  // Next-month head: Round out the grid to ensure full 7-day rows.
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), muted: true });
  }
  return cells;
}

/**
 * Formats a Date object into an ISO date string (YYYY-MM-DD).
 * Used as a key for state mapping and database queries.
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
 * Filters the list of calendar events based on current visibility state (legend toggles).
 * @returns {Object[]} Filtered list of events.
 */
function filterEvents() {
  return getCalendarEvents().filter(e => {
    const group = e.group || "global";
    // Built-in kinds and custom group ids live in separate calState sets.
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
 * 
 * Logic:
 * 1. Resolves CSS variables to absolute RGB values.
 * 2. Calculates perceived brightness using the standard YIQ formula.
 * 3. Switches based on theme (Dark/Light) to ensure readability against the background.
 * 
 * @param {string} color - CSS color value (hex, rgb, or var).
 * @returns {string} Contrast color CSS variable.
 */
function getContrastColor(color) {
  if (!color) return "var(--ink)";
  
  const isDark = document.documentElement.dataset.theme === "dark";
  const cacheKey = `${color}-${isDark}`;
  if (contrastCache.has(cacheKey)) return contrastCache.get(cacheKey);

  // Known design-system tokens get stable answers without asking the browser to
  // resolve CSS variables.
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

  // Unknown colors are resolved through a temporary DOM node so CSS variables,
  // rgb(), and hex values all flow through the same brightness calculation.
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

  // Last resort: use the theme's primary ink color.
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
  
  // Custom groups own their color record; built-in kinds use app state.
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
  // Look left/right in the slot map to decide whether this visible segment
  // should connect to an off-screen or adjacent-day continuation.
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
  // Walk each slot horizontally and collapse adjacent cells with the same event
  // id into a single spanning button.
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
    // Find all events active on this specific day.
    const dayEvents = events.filter(e => key >= e.date && key <= (e.endDate || e.date));
    
    // Earlier events get first choice of slots; longer same-day starts win ties.
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

    // Pass 1: keep continuing events in their previous day's slot.
    for (let s = 0; s < maxSlots; s++) {
      const prevId = prevSlots[s];
      if (prevId && dayEvents.some(e => String(e.id) === prevId)) {
        daySlots[s] = prevId;
      }
    }

    // Pass 2: fill empty slots with newly visible events and count overflow.
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
