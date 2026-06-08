/**
 * KPI strip — four summary tiles at the top of the dashboard:
 * check-ins today, team mood average, open issues, cover-needed
 * count. Each tile picks a `good`/`warn`/`alert` class to drive its
 * accent color in [css/kpis.css](../../css/kpis.css).
 */

/**
 * Recompute the four KPI tiles from the current globals and re-render
 * them into `#kpis`. Pure render — no event binding, no I/O.
 */
function renderKPIs() {
  const tm = effectiveTeammates();
  const checkedIn = tm.filter(t => t.lastCheckIn).length;
  const moods = tm.filter(t => t.mood != null).map(t => t.mood);
  const avg = moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : null;
  const avgStr = avg == null ? "—" : avg.toFixed(1);
  const openIssues = effectiveBlockers().filter(b => b.status !== "resolved");
  const open = openIssues.length;
  const critical = openIssues.filter(b => b.severity === "critical").length;
  const cover = tm.filter(t => t.coverNeeded).length;

  // AI metrics — sourced from ai-agents.js (loaded on all pages)
  const ai = typeof aiKPIData === "function" ? aiKPIData() : null;

  const moodCls = avg == null ? "" : avg >= 7 ? "good" : avg >= 5 ? "warn" : "alert";
  const tiles = [
    { label: "Checked in today", value: `${checkedIn}/${tm.length}`,
      cls: checkedIn === tm.length ? "good" : "",
      sub: checkedIn === tm.length ? "Full team in" : `${tm.length - checkedIn} pending`,
      href: "standup.html" },
    { label: "Team mood", value: `${avgStr}/10`, cls: moodCls,
      sub: "Avg across team",
      href: "standup.html#mood-title" },
    { label: "Open issues", value: open,
      cls: open === 0 ? "good" : critical > 0 ? "alert" : "warn",
      sub: open === 0 ? "All clear" : `${critical} critical`,
      href: "issues.html" },
    { label: "Cover needed", value: cover,
      cls: cover === 0 ? "good" : "warn",
      sub: cover === 0 ? "No requests" : "Help wanted",
      href: "standup.html#meet-title" },
    ...(ai ? [
      { label: "AI sessions today", value: ai.todayCount,
        cls: ai.todayCount > 0 ? "good" : "",
        sub: `Review rate ${ai.reviewRate}`,
        href: "ai-agents.html" },
    ] : []),
  ];
  document.getElementById("kpis").innerHTML = tiles.map(t => `
    <a class="kpi" href="${t.href}">
      <div class="kpi-label">${t.label}</div>
      <div class="kpi-value ${t.cls || ""}">${t.value}</div>
      <div class="kpi-trend">${t.sub}</div>
    </a>
  `).join("");
}
