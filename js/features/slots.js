let isDraggingAvailability = false;
let dragAvailabilityValue = null;
let slotsDocumentMouseupBound = false;
let slotsModalBound = false;
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

function paintAvailabilityCell(cell, value) {
  cell.classList.toggle("available", value);
  cell.classList.toggle("unavailable", !value);
}

async function saveDraggedAvailability() {
  if (!isDraggingAvailability) return;

  isDraggingAvailability = false;
  for (const [slotId, value] of dragChangedSlots) {
    await db.setSlotAvailability(slotId, value);
  }
  dragChangedSlots.clear();
  await db.loadAll();
  renderSlots();
}

function bindAvailabilityModal() {
  if (slotsModalBound) return;
  slotsModalBound = true;

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
}

function slotBgColor(count, total) {
  if (total === 0) return "#F1EFE8";
  const ratio = count / total;
  const r = Math.round(241 + (47  - 241) * ratio);
  const g = Math.round(239 + (63  - 239) * ratio);
  const b = Math.round(232 + (50  - 232) * ratio);
  return `rgb(${r},${g},${b})`;
}

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
  if (!currentUser) {
    if (personalList) personalList.innerHTML = "";
    if (overlapList) overlapList.innerHTML = "";
    return;
  }

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
      paintAvailabilityCell(cell, dragAvailabilityValue);
    });

    cell.addEventListener("mouseenter", () => {

      if (!isDraggingAvailability) return;

      setSlotAvailability(
        cell.dataset.slot,
        cell.dataset.teammate,
        dragAvailabilityValue
      );
      paintAvailabilityCell(cell, dragAvailabilityValue);
    });
  });

  if (!slotsDocumentMouseupBound) {
    slotsDocumentMouseupBound = true;
    document.addEventListener("mouseup", saveDraggedAvailability);
  }

  bindAvailabilityModal();

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
