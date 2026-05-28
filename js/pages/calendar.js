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
  { id: "onboarding", name: "Onboarding flow", color: "var(--accent)",  on: true },
  { id: "auth",       name: "Auth refactor",   color: "var(--good)",    on: true },
  { id: "ios",        name: "iOS app",         color: "var(--warn)",    on: true },
  { id: "design",     name: "Design system",   color: "oklch(60% 0.13 280)", on: false },
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
};

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

function eventColorStyle(event) {
  const project = getProjectById(event.project);
  const color = project?.color || event.color;
  if (!color) return "";
  const textColor = isHexColor(color) ? readableTextColor(color) : "var(--ink)";
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
  
  // Group cells into weeks
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const weekHTML = weeks.map(weekCells => {
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
      
      // We only care about days that are IN this week
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

    // Determine the max slot index used across this specific week
    let weekMaxSlot = -1;
    weekCells.forEach(cell => {
      const key = isoDate(cell.date);
      const daySlots = usedSlotsByDay[key] || [];
      const cellMax = Math.max(-1, ...daySlots.map((id, index) => id ? index : -1));
      if (cellMax > weekMaxSlot) weekMaxSlot = cellMax;
    });

    return weekCells.map(({ date, muted }) => {
      const key = isoDate(date);
      const dayEvents = eventsByDay[key] || [];
      const dayIssueIds = usedSlotsByDay[key] || [];
      const isToday = isSameDay(date, today);

      let html = `<div class="cal-cell ${muted ? "muted" : ""} ${isToday ? "today" : ""}">
        <div class="cal-date">${date.getDate()}</div>`;
      
      dayEvents.slice(0, 3).forEach(e => {
        html += `<button class="${eventBarClasses(e)}" type="button" data-event-id="${escapeHTML(e.id)}" title="${escapeHTML(eventTooltip(e))}"${eventColorStyle(e)}>${escapeHTML(e.title)}</button>`;
      });

      // Render slots consistently up to the week's max to ensure vertical alignment
      for (let i = 0; i <= weekMaxSlot; i++) {
        const issueId = dayIssueIds[i];
        const item = weekIssues.find(b => String(b.id) === issueId);
        
        if (item) {
          const isStart = key === item.startDate;
          const isEnd = key === item.dueDate;
          const isStartOfWeek = date.getDay() === 0;
          const isEndOfWeek = date.getDay() === 6;
          
          const classes = ["cal-bar", "issue"];
          if (item.startDate && item.dueDate) {
            if (!isStart && !isStartOfWeek) classes.push("connect-left");
            if (!isEnd && !isEndOfWeek) classes.push("connect-right");
          }
          
          html += `<button class="${classes.join(" ")}" type="button" data-issue-id="${escapeHTML(item.id)}" title="${escapeHTML(item.title)}" style="background-color: ${item.color}; z-index: ${5 + i}">${escapeHTML(item.title)}</button>`;
        } else {
          html += `<div class="cal-bar-spacer"></div>`;
        }
      }

      html += `</div>`;
      return html;
    }).join("");
  }).join("");

  grid.innerHTML = dayHeader + weekHTML;

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
  renderCalGrid();
}

// ─── Controls ─────────────────────────────────────────────────────────
function bindCalendar() {
  document.getElementById("cal-prev").addEventListener("click", () => {
    if (calState.month === 0) { calState.month = 11; calState.year--; }
    else calState.month--;
    renderCalHeader();
    renderCalGrid();
  });
  document.getElementById("cal-next").addEventListener("click", () => {
    if (calState.month === 11) { calState.month = 0; calState.year++; }
    else calState.month++;
    renderCalHeader();
    renderCalGrid();
  });
  document.getElementById("cal-today").addEventListener("click", () => {
    const t = new Date();
    calState.year = t.getFullYear();
    calState.month = t.getMonth();
    renderCalHeader();
    renderCalGrid();
  });
  document.querySelectorAll(".cal-toggle button").forEach(b => {
    b.addEventListener("click", () => {
      calState.view = b.dataset.view;
      document.querySelectorAll(".cal-toggle button")
        .forEach(x => x.classList.toggle("on", x === b));
      renderCalLegend();
      renderCalGrid();
    });
  });
  document.getElementById("new-event-btn").addEventListener("click", () => {
    openEventModal();
  });
  document.getElementById("new-project-btn").addEventListener("click", () => openProjectModal());
  document.getElementById("cal-grid").addEventListener("click", e => {
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

  bindEventModal();
  bindProjectModal();
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
  colorInput.value = project?.color || "#4f8cff";
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

function readableTextColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? "var(--ink)" : "var(--paper)";
}

document.addEventListener("DOMContentLoaded", () => {
  renderCalendar();
  bindCalendar();
});
;
