function effectiveAvailability(slot, teammateId) {
  const override = state.slotAvailability?.[slot.id]?.[teammateId];
  if (typeof override === "boolean") return override;
  return !!slot.availability[teammateId];
}

function toggleSlotAvailability(slotId, teammateId) {
  const slot = meetingSlots.find(s => s.id === slotId);
  if (!slot) return;
  if (!state.slotAvailability) state.slotAvailability = {};
  if (!state.slotAvailability[slotId]) state.slotAvailability[slotId] = {};
  state.slotAvailability[slotId][teammateId] = !effectiveAvailability(slot, teammateId);
  saveState();
  renderSlots();
}

function overlapClass(count, total) {
  if (count === total) return "all";
  if (count >= total - 1) return "most";
  if (count * 2 >= total) return "some";
  if (count === 0) return "none";
  return "few";
}

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
        title="${escapeHTML(t.name)} — ${escapeHTML(s.label)}: ${avail ? "Available" : "Unavailable"}"
        aria-label="Toggle ${escapeHTML(t.name)} availability at ${escapeHTML(s.label)}"
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

  list.querySelectorAll(".w2m-cell").forEach(btn => {
    btn.addEventListener("click", () => {
      toggleSlotAvailability(btn.dataset.slot, btn.dataset.teammate);
    });
  });
}
