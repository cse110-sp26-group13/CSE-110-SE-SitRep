/**
 * Dashboard page orchestrator ([index.html](../../index.html)).
 *
 * Summary view: KPIs, standup + issues snapshots, mood trend, activity.
 * Lighter-weight than the standup or issues pages — most cards are
 * read-only previews that link out to the full pages for editing.
 */

/**
 * "Standup" snapshot card on the dashboard. Shows how many teammates
 * have checked in today, the team mood average, who's still pending,
 * and the most recent blocker note as a heads-up.
 */
function renderStandupSnapshot() {
  const tm = effectiveTeammates();
  const checkedIn = tm.filter(t => t.lastCheckIn).length;
  const pending = tm.filter(t => !t.lastCheckIn);
  const moods = tm.filter(t => t.mood != null).map(t => t.mood);
  const avg = moods.length ? (moods.reduce((a, b) => a + b, 0) / moods.length) : null;

  document.getElementById("snap-standup-num").innerHTML =
    `${checkedIn}<span class="light"> / ${tm.length}</span>`;
  document.getElementById("snap-standup-sub").textContent =
    avg == null ? "Mood pending" : `Avg mood ${avg.toFixed(1)} / 10`;

  const recentBlocker = tm.find(t => t.lastCheckIn?.blockers);
  const body = document.getElementById("snap-standup-body");
  let html = "";
  if (pending.length > 0) {
    html += `<div class="av-row">
      ${pending.map(p => avatar(p.name, p.id)).join("")}
      <div class="pending-names">
        <strong>${escapeHTML(pending.map(p => p.name.split(" ")[0]).join(", "))}</strong>
        <span style="color:var(--muted);"> · not in yet</span>
      </div>
    </div>`;
  } else {
    html += `<div class="pending-names" style="color:var(--good);font-weight:600">
      Whole team's in.
    </div>`;
  }
  if (recentBlocker) {
    html += `<div class="checkin-note checkin-blocker" style="margin-top:6px">
      <span class="checkin-field-label">Heads up:</span>
      ${escapeHTML(recentBlocker.lastCheckIn.blockers)}
    </div>`;
  }
  body.innerHTML = html;
}

/**
 * "Issues" snapshot card on the dashboard. Open-blocker count, severity
 * breakdown, and the top 2 most-severe issues as quick links into the
 * full issues page.
 */
function renderIssuesSnapshot() {
  const open = effectiveBlockers().filter(b => b.status !== "resolved");
  const counts = {
    critical: open.filter(b => b.severity === "critical").length,
    high:     open.filter(b => b.severity === "high").length,
    medium:   open.filter(b => b.severity === "medium").length,
  };
  document.getElementById("snap-issues-num").innerHTML =
    `${open.length}<span class="light"> open</span>`;
  document.getElementById("snap-issues-sub").textContent =
    open.length === 0 ? "Nothing's blocking" : `${counts.critical} critical · ${counts.high} high · ${counts.medium} medium`;

  document.getElementById("snap-issues-sev").innerHTML = `
    <span><i class="dot critical"></i>${counts.critical} critical</span>
    <span><i class="dot high"></i>${counts.high} high</span>
    <span><i class="dot medium"></i>${counts.medium} medium</span>
  `;

  // Top 2 most-severe issues
  const order = { critical: 0, high: 1, medium: 2 };
  const top = open.slice().sort((a, b) => order[a.severity] - order[b.severity]).slice(0, 2);
  document.getElementById("snap-issues-body").innerHTML = top.length
    ? top.map(b => `
        <a class="mini-issue" href="issues.html#${escapeHTML(b.id)}">
          <span class="mini-dot ${b.severity}"></span>
          <div>
            <div class="mini-title">${escapeHTML(b.title)}</div>
            <div class="mini-meta">${escapeHTML(b.owner)} · ${escapeHTML(b.postedAt)}</div>
          </div>
        </a>`).join("")
    : `<div class="empty" style="padding:8px 0">Team's unblocked.</div>`;
}

/** Re-render every card on the dashboard. Reads from the loaded globals. */
function renderDashboard() {
  renderHeader();
  renderKPIs();
  renderMoodTrend();
  renderActivity();
  renderStandupSnapshot();
  renderIssuesSnapshot();
}

document.addEventListener("DOMContentLoaded", async () => {
  await db.loadAll();
  renderDashboard();
});
