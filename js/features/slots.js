
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
=======
let isDraggingAvailability = false;
let dragAvailabilityValue = null;
const dragChangedSlots = new Map();

const meetingDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const meetingHours = [
  "8 AM", "9 AM", "10 AM", "11 AM", "12 PM",
  "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM", "7 PM", "8 PM", "9 PM", "10 PM",
];

function effectiveAvailability(slotId, teammateId) {
  return !!(window.slotAvailability?.[slotId]?.[teammateId]);
}

function setSlotAvailability(slotId, teammateId, value) {

  if (teammateId !== team.currentUserId) return;
  if (!window.slotAvailability) window.slotAvailability = {};
  if (!window.slotAvailability[slotId]) window.slotAvailability[slotId] = {};
  window.slotAvailability[slotId][teammateId] = value;
  dragChangedSlots.set(slotId, value);
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
=======
function slotBgColor(count, total) {
  if (total === 0) return "#F1EFE8";
  const ratio = count / total;
  const r = Math.round(241 + (47  - 241) * ratio);
  const g = Math.round(239 + (63  - 239) * ratio);
  const b = Math.round(232 + (50  - 232) * ratio);
  return `rgb(${r},${g},${b})`;

}

/**
 * Build and inject the full availability grid (header row of times,
 * one row per teammate, overlap row at the bottom, legend) and bind
 * click handlers on the current user's cells.
 */
function renderSlots() {
  const DAYS = meetingDays;
  const HOURS = meetingHours;
  const personalList = document.getElementById("personal-availability");
  const overlapList = document.getElementById("team-overlap");
  const total = teammates.length;

  const legendEl = document.getElementById("w2m-legend");
  if (legendEl) {
    legendEl.innerHTML = `
      <span class="w2m-scale-label">0 / ${total}</span>
      <div class="w2m-scale-bar" style="background: linear-gradient(to right, #F1EFE8, #2F3F32)"></div>
      <span class="w2m-scale-label">${total} / ${total}</span>
    `;
  }

  const currentUser = teammates.find(
    t => t.id === team.currentUserId
  );

  const personalGrid = HOURS.map(hour => {
    const hourLabel = `
      <div class="w2m-hour-label">
        ${hour}
      </div>
    `;

    const cells = DAYS.map(day => {
      const slotId = `${day}-${hour}`;
      const avail = effectiveAvailability(slotId, currentUser.id);

      return `
        <button
          type="button"
          class="w2m-calendar-cell ${avail ? "available" : "unavailable"}"
          title="
          ${day} ${hour}
          Click to toggle availability
          "
          data-slot="${slotId}"
          data-teammate="${currentUser.id}"
        ></button>
      `;
    }).join("");

    return `
      ${hourLabel}
      ${cells}
    `;
  }).join("");

  const overlapGrid = HOURS.map(hour => {
    const hourLabel = `
      <div class="w2m-hour-label">
        ${hour}
      </div>
    `;

    const cells = DAYS.map(day => {
      const slotId = `${day}-${hour}`;
      const count = teammates.reduce(
        (sum, t) => sum + (effectiveAvailability(slotId, t.id) ? 1 : 0),
        0
      );
      const availablePeople = teammates
        .filter(t => effectiveAvailability(slotId, t.id))
        .map(t => t.name);

      const unavailablePeople = teammates
        .filter(t => !effectiveAvailability(slotId, t.id))
        .map(t => t.name);

      return `
        <div
          class="w2m-calendar-cell w2m-overlap-cell"
          style="background: ${slotBgColor(count, total)}"
          data-day="${day}"
          data-hour="${hour}"
          data-count="${count}"
          data-total="${total}"
          data-available="${availablePeople.join(",")}"
          data-unavailable="${unavailablePeople.join(",")}"
        ></div>
      `;
    }).join("");

    return `
      ${hourLabel}
      ${cells}
    `;
  }).join("");

  personalList.innerHTML = `
    <div
      class="w2m-calendar-grid"
      style="
        grid-template-columns:
        70px repeat(7, 1fr);
      "
    >

      <div class="w2m-corner"></div>

      ${DAYS.map(day => `
        <div class="w2m-day-label">
          ${day}
        </div>
      `).join("")}

      ${personalGrid}

    </div>
  `;

  overlapList.innerHTML = `
    <div
      class="w2m-calendar-grid"
      style="
        grid-template-columns:
        70px repeat(7, 1fr);
      "
    >
      <div class="w2m-corner"></div>

      ${DAYS.map(day => `
        <div class="w2m-day-label">
          ${day}
        </div>
      `).join("")}

      ${overlapGrid}
    </div>
  `;

  const personalCells =
    personalList.querySelectorAll(
      ".w2m-calendar-cell"
    );

  personalCells.forEach(cell => {

    cell.addEventListener("mousedown", e => {
      e.preventDefault();

      isDraggingAvailability = true;

      const current = effectiveAvailability(
        cell.dataset.slot,
        cell.dataset.teammate
      );

      dragAvailabilityValue = !current;

      setSlotAvailability(
        cell.dataset.slot,
        cell.dataset.teammate,
        dragAvailabilityValue
      );
    });

    cell.addEventListener("mouseenter", () => {

      if (!isDraggingAvailability) return;

      setSlotAvailability(
        cell.dataset.slot,
        cell.dataset.teammate,
        dragAvailabilityValue
      );
    });
  });

  document.addEventListener("mouseup", async () => {
    if (!isDraggingAvailability) return;

    isDraggingAvailability = false;
    for (const [slotId, value] of dragChangedSlots) {
      await db.setSlotAvailability(slotId, value);
    }
    dragChangedSlots.clear();
    await db.loadAll();
    renderSlots();
  });

  const availabilityModal = document.getElementById("availability-modal");
  document.getElementById("edit-mine-btn")?.addEventListener("click", () => {
    availabilityModal.classList.remove("hidden");
  });
  document.getElementById("close-availability-modal")?.addEventListener("click", () => {
    availabilityModal.classList.add("hidden");
  });
  availabilityModal?.addEventListener("click", e => {
    if (e.target === availabilityModal) availabilityModal.classList.add("hidden");
  });

  const tooltip = document.getElementById("availability-tooltip");

  overlapList
    .querySelectorAll(".w2m-overlap-cell")
    .forEach(cell => {
      cell.addEventListener("mouseenter", () => {
        const available = cell.dataset.available
          ? cell.dataset.available.split(",")
          : [];

        const unavailable = cell.dataset.unavailable
          ? cell.dataset.unavailable.split(",")
          : [];

        tooltip.innerHTML = `
          <div class="tooltip-count">
            ${cell.dataset.count}/${cell.dataset.total} Available
          </div>

          <div class="tooltip-time">
            ${cell.dataset.day} ${cell.dataset.hour}
          </div>

          <div class="tooltip-columns">
            <div>
              <div class="tooltip-heading">Available</div>
              ${available.map(name => `<div>${name}</div>`).join("")}
            </div>

            <div>
              <div class="tooltip-heading">Unavailable</div>
              ${unavailable.map(name => `<div>${name}</div>`).join("")}
            </div>
          </div>
        `;

        tooltip.classList.remove("hidden");
      });

      cell.addEventListener("mousemove", e => {
        const tooltipWidth = tooltip.offsetWidth;
        const tooltipHeight = tooltip.offsetHeight;
        const padding = 20;

        let left = e.pageX + 18;
        let top = e.pageY + 18;
        if (left + tooltipWidth > window.innerWidth - padding) {
          left = e.pageX - tooltipWidth - 18;
        }
        if (top + tooltipHeight > window.innerHeight + window.scrollY - padding) {
          top = e.pageY - tooltipHeight - 18;
        }

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
      });

      cell.addEventListener("mouseleave", () => {
        tooltip.classList.add("hidden");
      });
    });
}
