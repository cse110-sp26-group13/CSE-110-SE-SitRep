/**
 * Calendar page orchestrator.
 *
 * How this file works:
 * - Owns `calState`, the local UI state for the selected month, selected week,
 *   active filters, and currently edited records.
 * - Renders the three main calendar surfaces: month grid, week grid, and project
 *   timeline.
 * - Wires page-level controls such as navigation buttons, tabs, legend filters,
 *   day popups, hover syncing, and timeline links.
 * - Uses helper functions from `calendar-utils.js` for date math, event layout,
 *   filtering, and color handling.
 * - Uses modal functions from `calendar-modals.js` for event/group persistence.
 *
 * Load order matters because these are plain browser scripts:
 * `calendar-utils.js` -> `calendar.js` -> `calendar-modals.js`.
 */

let calState = {};

function initCalState() {
  // Keep mutable calendar UI state centralized so renderers and modal handlers
  // operate against one shared source of truth.
  calState = {
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    kinds: new Set(CAL_KINDS),
    customGroups: new Set(),
    editingEventId: null,
    editingGroupId: null,
    weekStart: getStartOfWeek(new Date()),
  };

  // Start with every custom calendar group visible so the first load shows the
  // complete team context.
  getCalendarGroups().forEach(g => calState.customGroups.add(g.id));
}

/**
 * Renders the focused seven-day calendar grid.
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

  // Update the compact week range label above the grid.
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

  // Include events that overlap this week even if they start before Sunday or
  // end after Saturday.
  const weekEvents = events.filter(e => {
    const s = e.date;
    const evEnd = e.endDate || e.date;
    return s <= weekEndStr && evEnd >= weekStartStr;
  });

  // Slot calculation keeps multi-day event bars visually continuous.
  const { usedSlotsByDay, dayOverflowCounts } = calculateEventSlots(weekEvents, weekCells.map(c => c.date), 15);

  const dayHeader = DAY_NAMES.map(n => `<div class="cal-dayname">${n}</div>`).join("");
  let gridHTML = dayHeader;

  // First lay down clickable day cells and headers.
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

  // Then draw event bars above the cells.
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
  
  // Apply legend filters once, then each week row narrows this list to events
  // that overlap that specific row.
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

    // Include events that overlap this week row even if their true start/end is
    // outside the visible seven-day slice.
    const weekEvents = events.filter(e => {
      const s = e.date;
      const end = e.endDate || e.date;
      return s <= weekEndStr && end >= weekStartStr;
    });

    // Month view has limited vertical room, so overflow becomes a day modal.
    const { usedSlotsByDay, dayOverflowCounts } = calculateEventSlots(weekEvents, weekCells.map(c => c.date), 3);

    // Add an extra grid row only when at least one day needs a "+N more" label.
    const hasWeekOverflow = Object.keys(dayOverflowCounts).some(dateKey => {
      return dateKey >= weekStartStr && dateKey <= weekEndStr && dayOverflowCounts[dateKey] > 0;
    });

    const weekSpan = hasWeekOverflow ? 5 : 4;

    // Draw the static cell layer before event bars so bars can span columns.
    weekCells.forEach((cell, colIndex) => {
      const key = isoDate(cell.date);
      const isToday = isSameDay(cell.date, today);

      // The background cell is the click target for opening the day modal.
      gridHTML += `<div class="cal-cell ${cell.muted ? "muted" : ""} ${isToday ? "today" : ""}" 
                        data-date="${key}"
                        style="grid-column: ${colIndex + 1}; grid-row: ${currentRow} / span ${weekSpan}"></div>`;

      // Date numbers sit in a separate layer above the background cell.
      gridHTML += `<div class="cal-cell-header" data-date="${key}" style="grid-column: ${colIndex + 1}; grid-row: ${currentRow}; z-index: 5;">
        <div class="cal-date">${cell.date.getDate()}</div>
      </div>`;

      // Overflow uses the same day modal as the cell click.
      const overflow = dayOverflowCounts[key];
      if (overflow > 0) {
        gridHTML += `<div class="cal-more-indicator" data-date="${key}" 
                          style="grid-column: ${colIndex + 1}; grid-row: ${currentRow + 4}; z-index: 10;">
          +${overflow} more
        </div>`;
      }
    });

    // Event segments span adjacent day columns when the slot map says they are
    // the same event across multiple cells.
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

  // Built-in visibility buckets render first because every account has them.
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

  // Custom groups render after a divider and use their persisted group colors.
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
  // Render shared page chrome first, then refresh only the selected calendar
  // surface. This avoids duplicating header/sidebar setup in each view renderer.
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

  // The team list is a read-only context panel surfaced from the legend info
  // button.
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
  // The active tab class is the single source of truth for which expensive
  // calendar surface should redraw after state changes.
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
  // Bind one-time page-level controls. Calendar cells and event bars are
  // regenerated often, so those use delegated listeners below.
  const themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      // theme.js updates the DOM immediately, but we wait a tick to ensure data-theme is set
      setTimeout(renderCalendar, 0);
    });
  }

  // Month navigation controls the month grid and timeline month.
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

  // Week navigation moves the focused seven-day range by full weeks.
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

  // Listen to clicks in both grids with delegation so re-rendered cells keep
  // working without rebinding.
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

  // Folder tabs switch visible panels; `refreshActiveView` handles rendering.
  document.querySelectorAll(".cal-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      const mode = tab.dataset.tab;
      
      // Update tab UI and ARIA state together.
      document.querySelectorAll(".cal-tab").forEach(t => {
        t.classList.toggle("active", t === tab);
        t.setAttribute("aria-selected", t === tab);
      });

      // Show/hide the heavy view sections before rendering the selected one.
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

  // Click delegation handles generated legend rows without rebinding after every
  // legend render.
  container.addEventListener("click", (e) => {
    const target = e.target;
    
    // Built-in kind labels toggle visibility; built-in swatches open pickers.
    const kindName = target.closest("[data-kind-name]")?.dataset.kindName;
    const kindSwatch = target.closest("[data-kind-swatch]")?.dataset.kindSwatch;
    const kindId = kindName || kindSwatch;

    if (kindId) {
      if (kindName) {
        if (kindId === "global") {
          // Team label only toggles the team list view; its checkbox controls
          // actual event visibility.
          toggleTeam();
        } else {
          // Personal label toggles the matching visibility checkbox.
          const cb = container.querySelector(`input[data-kind="${kindId}"]`);
          if (cb) {
            cb.checked = !cb.checked;
            cb.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }
      } else {
        // Swatch clicks proxy to hidden native color inputs.
        container.querySelector(`input[data-kind-color="${kindId}"]`)?.click();
      }
      return;
    }

    // Custom group swatches also proxy to hidden native color inputs.
    const groupSwatch = target.closest("[data-group-swatch]")?.dataset.groupSwatch;
    if (groupSwatch) {
      container.querySelector(`input[data-group-color-input="${groupSwatch}"]`)?.click();
      return;
    }

    // Group names open the group editor instead of toggling visibility.
    const editGroupId = target.closest("[data-edit-group]")?.dataset.editGroup;
    if (editGroupId) {
      openGroupModal(editGroupId);
      return;
    }

    // Info button is a second entry point for the team list panel.
    if (target.closest("#toggle-team-list")) {
      toggleTeam();
    }
  });

  // Change delegation handles checkbox visibility and completed color picks.
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

    // Built-in colors live in local app state.
    const kindColor = target.dataset.kindColor;
    if (kindColor) {
      saveState();
      refreshActiveView();
      return;
    }

    // Group colors are shared records, so they persist through the database.
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

  // Input delegation gives immediate swatch feedback while the user drags the
  // color picker.
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
  // Related rendered elements share the same record id; toggling one class on
  // all matches lets bars, rows, and cards highlight together.
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
  // Overflow/detail modal for a single day. Editing still routes through the
  // event modal so permission and save logic stays in one place.
  const modal = document.getElementById("calendar-day-modal");
  const title = document.getElementById("calendar-day-modal-title");
  const list = document.getElementById("calendar-day-events-list");
  
  const d = new Date(`${dateStr}T00:00:00`);
  title.textContent = d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  
  // Show the same filtered event set the user currently sees in the grid.
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

  // Quick add pre-fills the selected date.
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
  // Timeline rows are issue/blocker records rather than calendar events.
  const allIssues = effectiveBlockers(); // Include resolved issues
  const teammates = effectiveTeammates();

  // Range: current month bounds plus previous and next month for context.
  const monthStart = new Date(calState.year, calState.month - 1, 1);
  const monthEnd = new Date(calState.year, calState.month + 2, 0);

  // Filter to issues active in this three-month window and allowed by the
  // current legend visibility.
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

  // Determine the visible date range from actual issue dates, while still
  // keeping the surrounding calendar context.
  const issueDates = issues.flatMap(i => {
    const s = new Date(`${i.startDate || i.dueDate}T00:00:00`);
    const e = new Date(`${i.dueDate || i.startDate}T00:00:00`);
    return [s < monthStart ? monthStart : s, e > monthEnd ? monthEnd : e];
  });

  const minDate = new Date(Math.min(...issueDates));
  const maxDate = new Date(Math.max(...issueDates));
  
  // Ensure the current month stays visible even if issue dates extend wider.
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
    
    // Status-based color coding mirrors issue state at a glance.
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

  // Auto-scroll to today when the current visible range contains it.
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
      // Timeline bars deep-link to the issue detail page.
      const issueId = bar.dataset.issueId;
      window.location.href = `issues.html?id=${issueId}`;
    });
  });
}

// ─── Initialization ───────────────────────────────────────────────────

/**
 * Initial entry point.
 * Loads all shared data from Supabase before initializing UI state and bindings.
 */
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Hydrate shared Supabase-backed state before any renderers ask selectors
    // for events, groups, teammates, or issues.
    await db.loadAll();
    initCalState(); 
    renderCalendar();
    bindCalendar();
  } catch (err) {
    console.error("Initialization failed:", err);
    const header = document.getElementById("header-sub");
    if (header) header.textContent = "Error loading data. Please check your connection.";
  }
});
