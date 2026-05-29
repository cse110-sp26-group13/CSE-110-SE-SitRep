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

// Each event: { date: "YYYY-MM-DD", title, kind: team|personal|blocked|stretch, project }
const CAL_EVENTS = [
  { date: "2026-05-01", title: "Sprint 4 kickoff",        kind: "team",     project: "onboarding" },
  { date: "2026-05-05", title: "Auth refactor — PR open", kind: "team",     project: "auth" },
  { date: "2026-05-08", title: "Empty-state illos due",   kind: "personal", project: "design" },
  { date: "2026-05-12", title: "Design review",           kind: "team",     project: "onboarding" },
  { date: "2026-05-14", title: "Onboarding flow demo",    kind: "team",     project: "onboarding" },
  { date: "2026-05-15", title: "QA pass",                 kind: "personal", project: "onboarding" },
  { date: "2026-05-18", title: "Sprint 4 mid-sync",       kind: "team",     project: "onboarding" },
  { date: "2026-05-20", title: "Auth tokens — ETA",       kind: "blocked",  project: "auth" },
  { date: "2026-05-21", title: "iOS cert renewal",        kind: "stretch",  project: "ios" },
  { date: "2026-05-22", title: "Sprint 4 retro",          kind: "team",     project: "onboarding" },
  { date: "2026-05-25", title: "Sprint 5 kickoff",        kind: "team",     project: "onboarding" },
  { date: "2026-05-26", title: "Stakeholder demo",        kind: "personal", project: "onboarding" },
  { date: "2026-05-28", title: "Mobile cert deadline",    kind: "stretch",  project: "ios" },
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
const calState = {
  // Default to today (page loads on current month). Easy to override for demo.
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  view: "all", // all | personal | team
  projects: new Set(CAL_PROJECTS.filter(p => p.on).map(p => p.id)),
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
  return CAL_EVENTS.filter(e => {
    if (calState.view !== "all") {
      // Map view → matching kinds: personal = personal only, team = team/blocked/stretch
      if (calState.view === "personal" && e.kind !== "personal") return false;
      if (calState.view === "team" && e.kind === "personal") return false;
    }
    if (e.project && !calState.projects.has(e.project)) return false;
    return true;
  });
}

function renderCalGrid() {
  const today = new Date();
  const grid = document.getElementById("cal-grid");
  const cells = buildMonthCells(calState.year, calState.month);
  const events = filterEvents();
  const byDay = events.reduce((acc, e) => {
    (acc[e.date] = acc[e.date] || []).push(e);
    return acc;
  }, {});

  const dayHeader = DAY_NAMES.map(n => `<div class="cal-dayname">${n}</div>`).join("");
  const cellHTML = cells.map(({ date, muted }) => {
    const key = isoDate(date);
    const evs = byDay[key] || [];
    const max = 3;
    const visible = evs.slice(0, max);
    const overflow = evs.length - visible.length;
    const isToday = isSameDay(date, today);

    return `<div class="cal-cell ${muted ? "muted" : ""} ${isToday ? "today" : ""}">
      <div class="cal-date">${date.getDate()}</div>
      ${visible.map(e => `
        <div class="cal-bar ${e.kind}" title="${escapeHTML(e.title)}">${escapeHTML(e.title)}</div>
      `).join("")}
      ${overflow > 0 ? `<div class="cal-more">+${overflow} more</div>` : ""}
    </div>`;
  }).join("");

  grid.innerHTML = dayHeader + cellHTML;

  // Footer count
  document.getElementById("cal-foot-count").textContent =
    `${events.length} events in view`;
}

function renderCalHeader() {
  document.getElementById("cal-month").innerHTML =
    `${MONTH_NAMES[calState.month]}<span class="yr">${calState.year}</span>`;
}

function renderCalProjects() {
  document.getElementById("cal-projects").innerHTML =
    CAL_PROJECTS.map(p => `
      <label class="cal-project">
        <input type="checkbox" data-project="${p.id}" ${calState.projects.has(p.id) ? "checked" : ""} />
        <span class="swatch" style="background:${p.color}"></span>
        <span>${escapeHTML(p.name)}</span>
      </label>
    `).join("");
  document.querySelectorAll(".cal-project input[type=checkbox]").forEach(cb => {
    cb.addEventListener("change", () => {
      const id = cb.dataset.project;
      if (cb.checked) calState.projects.add(id);
      else calState.projects.delete(id);
      renderCalGrid();
    });
  });
}

function renderCalendar() {
  renderHeader();
  renderCalHeader();
  renderCalProjects();
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
  document.querySelectorAll("#cal-toggle button").forEach(b => {
    b.addEventListener("click", () => {
      calState.view = b.dataset.view;
      document.querySelectorAll("#cal-toggle button")
        .forEach(x => x.classList.toggle("on", x === b));
      renderCalGrid();
    });
  });
  document.getElementById("new-event-btn").addEventListener("click", () => {
    alert("New-event flow coming in v2 — Stephanie's working on it.");
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await db.loadAll();
  renderCalendar();
  bindCalendar();
});
