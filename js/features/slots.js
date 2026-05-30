let isDraggingAvailability = false;
let dragAvailabilityValue = null;

function effectiveAvailability(slot, teammateId) {
  return !!slot.availability[teammateId];
}

function setSlotAvailability(slotId, teammateId, value) {
  if (teammateId !== team.currentUserId) return;
  const slot = meetingSlots.find(
    s => s.id === slotId
  );
  if (!slot) return;
  if (!state.slotAvailability) {
    state.slotAvailability = {};
  }
  if (!state.slotAvailability[slotId]) {
    state.slotAvailability[slotId] = {};
  }
  state.slotAvailability[slotId][teammateId] = value;
}

function overlapClass(count, total) {
  if (count === total) return "all";
  if (count >= total - 1) return "most";
  if (count * 2 >= total) return "some";
  if (count === 0) return "none";
  if (count === 1) return "one";
  return "few";
}

function renderSlots() {
  const DAYS = meetingDays;
  const HOURS = meetingHours;
  const personalList = document.getElementById("personal-availability");
  const overlapList = document.getElementById("team-overlap");
  const total = teammates.length;
  const counts = meetingSlots.map(s =>
    teammates.reduce((sum, t) => sum + (effectiveAvailability(s, t.id) ? 1 : 0), 0)
  );

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
      const slot = meetingSlots.find(
        s => s.day === day && s.hour === hour
      );

      const avail = effectiveAvailability(
        slot,
        currentUser.id
      );

      return `
        <button
          type="button"
          class="w2m-calendar-cell ${avail ? "available" : "unavailable"}"
          title="
          ${day} ${hour}
          Click to toggle availability
          "
          data-slot="${slot.id}"
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
      const slot = meetingSlots.find(
        s => s.day === day && s.hour === hour
      );

      const count = teammates.reduce(
        (sum, t) => sum + (effectiveAvailability(slot, t.id) ? 1 : 0),
        0
      );
      const availablePeople = teammates
        .filter(t => effectiveAvailability(slot, t.id))
        .map(t => t.name);

      const unavailablePeople = teammates
        .filter(t => !effectiveAvailability(slot, t.id))
        .map(t => t.name);

      return `
        <div
          class="
            w2m-calendar-cell
            w2m-overlap-cell
            ${overlapClass(count, total)}
          "
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

      const slot = meetingSlots.find(
        s => s.id === cell.dataset.slot
      );

      const current =
        effectiveAvailability(
          slot,
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

  document.addEventListener("mouseup", () => {
    if (!isDraggingAvailability) return;

    isDraggingAvailability = false;
    saveState();
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
