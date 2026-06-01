/**
 * Mood trend sparkline — 7-day rolling team mood average rendered as
 * an inline SVG into `#sparkline-wrap`. Days with no data show a gap
 * in the line; the area fill is anchored to the first/last data
 * points so partial weeks don't smear across empty days.
 */

/**
 * Aggregate every teammate's moodHistory into a 7-point series, then
 * draw the sparkline (grid, area, line, points, labels) plus the
 * three summary stats below it (today, week avg, vs 6d ago).
 * Reads from window.teammates; no I/O.
 */
function renderMoodTrend() {
  const days = 7;
  const series = [];
  for (let d = 0; d < days; d++) {
    const vals = teammates.map(t => t.moodHistory[d]).filter(v => v != null);
    series.push(vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null);
  }

  const w = 600, h = 110, padX = 20, padY = 14;
  const validIdx = series.map((v, i) => v == null ? null : i).filter(i => i != null);
  const xStep = (w - 2 * padX) / (days - 1);
  const yMap = v => h - padY - ((v - 0) / 10) * (h - 2 * padY);
  const points = validIdx.map(i => [padX + i * xStep, yMap(series[i])]);

  const linePath = points.length
    ? "M " + points.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L ")
    : "";
  const areaPath = points.length
    ? `M ${points[0][0].toFixed(1)} ${h - padY} ` +
      "L " + points.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L ") +
      ` L ${points[points.length - 1][0].toFixed(1)} ${h - padY} Z`
    : "";

  const dayLabels = ["−6d", "−5d", "−4d", "−3d", "−2d", "−1d", "Today"];
  const xLabels = dayLabels.map((lbl, i) => `
    <text class="label" x="${padX + i * xStep}" y="${h - 2}" text-anchor="middle">${lbl}</text>
  `).join("");

  const gridLines = [3, 5, 7].map(v => `
    <line class="grid" x1="${padX}" y1="${yMap(v)}" x2="${w - padX}" y2="${yMap(v)}" />
    <text class="label" x="${padX - 4}" y="${yMap(v) + 3}" text-anchor="end">${v}</text>
  `).join("");

  const validVals = series.filter(v => v != null);
  const weekAvg = validVals.length
    ? (validVals.reduce((a, b) => a + b, 0) / validVals.length).toFixed(1) : "—";
  const todayAvg = series[6] != null ? series[6].toFixed(1) : "—";
  const firstAvg = series.find(v => v != null);
  const delta = (series[6] != null && firstAvg != null) ? (series[6] - firstAvg) : null;
  const deltaStr = delta == null ? "—" : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}`;
  const deltaCls = delta == null ? "" : delta > 0 ? "up" : delta < 0 ? "down" : "";

  document.getElementById("mood-card-sub").textContent =
    weekAvg === "—" ? "No data" : `Week avg ${weekAvg}/10`;

  bindMoodModal();

  document.getElementById("sparkline-wrap").innerHTML = `
    <svg class="sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      ${gridLines}
      ${areaPath ? `<path class="area" d="${areaPath}" />` : ""}
      ${linePath ? `<path class="line" d="${linePath}" />` : ""}
      ${points.map(p => `<circle class="point" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" />`).join("")}
      ${xLabels}
    </svg>
    <div class="mood-summary">
      <div class="mood-stat">
        <div class="mood-stat-label">Today</div>
        <div class="mood-stat-value">${todayAvg}</div>
      </div>
      <div class="mood-stat">
        <div class="mood-stat-label">Week avg</div>
        <div class="mood-stat-value">${weekAvg}</div>
      </div>
      <div class="mood-stat">
        <div class="mood-stat-label">vs 6d ago</div>
        <div class="mood-stat-value ${deltaCls}">${deltaStr}</div>
      </div>
    </div>`;
}

// ── Team Mood Modal ───────────────────────────────────────────

function buildMoodModalHTML() {
  const tm = effectiveTeammates();
  const dayLabels = ["−6d", "−5d", "−4d", "−3d", "−2d", "−1d", "Today"];

  // Section 1: Team Mood History Table
  const tableRows = tm.map(t => {
    const cells = t.moodHistory.map(score => {
      if (score == null) return `<td class="mh-cell mh-cell-empty">—</td>`;
      return `<td class="mh-cell">${moodSVG(moodBucket(score), "mood-icon-xs")}</td>`;
    }).join("");
    return `<tr><td class="mh-member">${escapeHTML(t.name)}</td>${cells}</tr>`;
  }).join("");

  const section1 = `
    <div class="mood-modal-section">
      <h4 class="mood-modal-h">Team Mood History</h4>
      <div class="mh-table-wrap">
        <table class="mh-table">
          <thead><tr>
            <th class="mh-th-member">Member</th>
            ${dayLabels.map(d => `<th class="mh-th-day">${d}</th>`).join("")}
          </tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </div>`;

  // Section 2: Team Wellness Watch
  const LOW_MOOD = 6; // "surviving" and below
  const atRisk = tm.map(t => {
    let streak = 0;
    for (let i = t.moodHistory.length - 1; i >= 0; i--) {
      const s = t.moodHistory[i];
      if (s == null) break;
      if (s <= LOW_MOOD) streak++;
      else break;
    }
    return { name: t.name, streak };
  }).filter(r => r.streak >= 2);

  const section2 = `
    <div class="mood-modal-section">
      <h4 class="mood-modal-h">&#9888; Team Wellness Watch</h4>
      ${atRisk.length === 0
        ? `<p class="mood-modal-empty">Nobody currently has a low-mood streak.</p>`
        : atRisk.map(r => `
            <div class="mood-wellness-item">
              <strong>${escapeHTML(r.name)}</strong>
              <ul><li>Low mood for ${r.streak} consecutive day${r.streak !== 1 ? "s" : ""}</li></ul>
            </div>`).join("")}
    </div>`;

  // Section 3: Team Mood Summary
  const allScores = tm.flatMap(t => t.moodHistory.filter(s => s != null));
  const teamAvg = allScores.length
    ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1)
    : "—";

  const bucketCounts = {};
  allScores.forEach(s => {
    const b = moodBucket(s);
    bucketCounts[b] = (bucketCounts[b] || 0) + 1;
  });
  const topBucket = Object.keys(bucketCounts).length
    ? Number(Object.entries(bucketCounts).sort((a, b) => b[1] - a[1])[0][0])
    : null;
  const mostCommon = topBucket != null
    ? `${moodSVG(topBucket, "mood-icon-xs")} ${MOOD_LABELS[topBucket]}`
    : "—";

  const dayAvgs = [];
  for (let d = 0; d < 7; d++) {
    const vals = tm.map(t => t.moodHistory[d]).filter(v => v != null);
    dayAvgs.push(vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null);
  }
  const validDays = dayAvgs.map((v, i) => ({ v, i })).filter(x => x.v != null);
  let highDay = "—", lowDay = "—";
  if (validDays.length) {
    highDay = dayLabels[validDays.reduce((a, b) => b.v > a.v ? b : a).i];
    lowDay  = dayLabels[validDays.reduce((a, b) => b.v < a.v ? b : a).i];
  }

  const section3 = `
    <div class="mood-modal-section">
      <h4 class="mood-modal-h">Team Mood Summary</h4>
      <div class="mood-summary-stats">
        <div class="mood-summary-stat">
          <div class="mood-summary-label">Team avg this week</div>
          <div class="mood-summary-val">${teamAvg}</div>
        </div>
        <div class="mood-summary-stat">
          <div class="mood-summary-label">Most common mood</div>
          <div class="mood-summary-val mood-summary-val--face">${mostCommon}</div>
        </div>
        <div class="mood-summary-stat">
          <div class="mood-summary-label">Highest mood day</div>
          <div class="mood-summary-val">${highDay}</div>
        </div>
        <div class="mood-summary-stat">
          <div class="mood-summary-label">Lowest mood day</div>
          <div class="mood-summary-val">${lowDay}</div>
        </div>
      </div>
    </div>`;

  return section1 + section2 + section3;
}

function openMoodModal() {
  document.getElementById("mood-modal-body").innerHTML = buildMoodModalHTML();
  document.getElementById("mood-modal").hidden = false;
}

function closeMoodModal() {
  document.getElementById("mood-modal").hidden = true;
}

function ensureMoodModal() {
  if (document.getElementById("mood-modal")) return;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "mood-modal";
  backdrop.hidden = true;
  backdrop.innerHTML = `
    <div class="modal modal--wide" role="dialog" aria-modal="true" aria-labelledby="mood-modal-title">
      <div class="modal-head">
        <h3 id="mood-modal-title">Team Mood Details</h3>
        <button class="modal-close" id="mood-modal-close" aria-label="Close">×</button>
      </div>
      <div class="modal-body" id="mood-modal-body"></div>
    </div>`;
  document.body.appendChild(backdrop);
}

let _moodModalBound = false;
function bindMoodModal() {
  if (_moodModalBound) return;
  const btn = document.getElementById("view-team-mood-btn");
  if (!btn) return;
  _moodModalBound = true;

  ensureMoodModal();

  btn.addEventListener("click", openMoodModal);
  document.getElementById("mood-modal-close")
    .addEventListener("click", closeMoodModal);
  document.getElementById("mood-modal")
    .addEventListener("click", e => {
      if (e.target.id === "mood-modal") closeMoodModal();
    });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !document.getElementById("mood-modal").hidden)
      closeMoodModal();
  });
}
