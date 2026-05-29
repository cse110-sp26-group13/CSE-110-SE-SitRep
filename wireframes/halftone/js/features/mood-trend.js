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
