/**
 * When2meet-style availability grid. Renders a teammate × slot grid
 * with a "free/busy" cell per pair plus an overlap row showing how
 * many teammates are available for each slot.
 *
 * Only the current user can toggle their own row — other rows render
 * disabled with aria-disabled so screen readers announce them as
 * read-only.
 */

/**
 * Look up whether `teammateId` is marked available for `slot`.
 *
 * @param {{availability: Record<string, boolean>}} slot
 * @param {string} teammateId
 * @returns {boolean}
 */
function effectiveAvailability(slot, teammateId) {
  return !!slot.availability[teammateId];
}

/**
 * Flip the current user's availability for one slot and re-render.
 * No-op if `teammateId` isn't the current user (defense in depth —
 * the UI already disables other people's cells).
 *
 * @param {string} slotId
 * @param {string} teammateId
 */
async function toggleSlotAvailability(slotId, teammateId) {
  if (teammateId !== team.currentUserId) return;
  const slot = meetingSlots.find(s => s.id === slotId);
  if (!slot) return;
  const next = !effectiveAvailability(slot, teammateId);
  await db.setSlotAvailability(slotId, next);
  await db.loadAll();
  renderSlots();
}

/**
 * Bucket the overlap count into one of five CSS classes driving the
 * heatmap shading. "most" is total−1 (anyone-but-one), "some" is
 * majority, "few" is minority, "none" is zero, "all" is unanimous.
 *
 * @param {number} count - how many teammates are available.
 * @param {number} total - total teammates.
 * @returns {"all"|"most"|"some"|"few"|"none"}
 */
function overlapClass(count, total) {
  if (count === total) return "all";
  if (count >= total - 1) return "most";
  if (count * 2 >= total) return "some";
  if (count === 0) return "none";
  return "few";
}

/**
 * Build and inject the full availability grid (header row of times,
 * one row per teammate, overlap row at the bottom, legend) and bind
 * click handlers on the current user's cells.
 */
function renderSlots() {
  const list = document.getElementById("slots-list");
  const total = teammates.length;
  const counts = meetingSlots.map(s =>
    teammates.reduce((sum, t) => sum + (effectiveAvailability(s, t.id) ? 1 : 0), 0)
  );

  const headerCells = meetingSlots
    .map(s => `<div class="w2m-time" title="${escapeHTML(s.label)}">${escapeHTML(s.time)}</div>`)
    .join("");

  const rows = teammates.map(t => {
    const initials = t.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
    const cells = meetingSlots.map(s => {
      const avail = effectiveAvailability(s, t.id);
      const isMe = t.id === team.currentUserId;
      return `<button
        type="button"
        class="w2m-cell ${avail ? "available" : "unavailable"} ${isMe ? "me" : ""}"
        data-slot="${s.id}"
        data-teammate="${t.id}"
        aria-pressed="${avail}"
        ${isMe ? "" : "disabled aria-disabled=\"true\""}
        title="${escapeHTML(t.name)} — ${escapeHTML(s.label)}: ${avail ? "Available" : "Unavailable"}"
        aria-label="${isMe ? `Toggle your availability at ${escapeHTML(s.label)}` : `${escapeHTML(t.name)} at ${escapeHTML(s.label)}: ${avail ? "Available" : "Unavailable"}`}"
      ></button>`;
    }).join("");
    return `<div class="w2m-name" title="${escapeHTML(t.name)}">${escapeHTML(initials)}</div>${cells}`;
  }).join("");

  const overlapCells = counts.map(c =>
    `<div class="w2m-overlap ${overlapClass(c, total)}" title="${c} of ${total} available">${c}</div>`
  ).join("");

  list.innerHTML = `
    <div class="w2m-grid" style="grid-template-columns: 30px repeat(${meetingSlots.length}, 1fr);">
      <div class="w2m-corner"></div>
      ${headerCells}
      ${rows}
      <div class="w2m-overlap-label" title="Total available">∑</div>
      ${overlapCells}
    </div>
    <div class="w2m-legend">
      <span class="w2m-swatch unavailable"></span><span>busy</span>
      <span class="w2m-swatch available"></span><span>free</span>
      <span class="w2m-swatch me"></span><span>you</span>
    </div>
  `;

  list.querySelectorAll(".w2m-cell.me").forEach(btn => {
    btn.addEventListener("click", () => {
      toggleSlotAvailability(btn.dataset.slot, btn.dataset.teammate);
    });
  });
}
