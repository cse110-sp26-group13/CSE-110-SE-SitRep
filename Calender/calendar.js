/**
 * Renders the Gantt-style project timeline.
 * Displays a 14-day window starting from May 11, 2026.
 */
function renderCalendar() {
  const container = document.getElementById("calendar-timeline");
  if (!container) return;

  // Window configuration: 14 days starting from May 11, 2026
  const windowStartDate = new Date("2026-05-11");
  const totalDays = 14;

  let html = `
    <div class="timeline-view">
      <div class="timeline-grid">
        <div class="timeline-row">
          <div class="timeline-label"></div>
          <div class="timeline-days-header">
  `;

  // Render day labels for the header row
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(windowStartDate);
    date.setDate(windowStartDate.getDate() + i);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = date.getDate();
    const isToday = date.toDateString() === new Date("2026-05-17").toDateString();
    html += `<div class="timeline-day-col ${isToday ? 'today' : ''}">${dayName}<br>${dayNum}</div>`;
  }

  html += `
          </div>
        </div>
  `;

  // 1. Render Team and Individual Projects
  projects.forEach(project => {
    html += renderTimelineRow(
      project.name, 
      project.type === 'team' ? 'Team Project' : 'Individual Project', 
      project, 
      windowStartDate, 
      totalDays, 
      project.color
    );
  });

  // 2. Render Active Issues (Blockers) as timeline items
  const allIssues = (typeof effectiveBlockers === "function" ? effectiveBlockers() : blockers) || [];
  const filteredIssues = allIssues
    .filter(b => {
      const sevFilter = state?.severityFilter ?? "all";
      return sevFilter === "all" ? true : b.severity === sevFilter;
    })
    .filter(b => {
      const statusFilter = state?.statusFilter ?? "open";
      const status = b.status ?? "open";
      if (statusFilter === "all") return true;
      if (statusFilter === "resolved") return status === "resolved";
      return status === "open" || status === "in-progress";
    });

  filteredIssues.forEach(blocker => {
    const owner = teammates.find(t => t.id === blocker.ownerId);
    html += renderTimelineRow(
      blocker.title, 
      `Issue: ${owner ? owner.name : blocker.owner}`, 
      blocker, 
      windowStartDate, 
      totalDays, 
      '#ef4444', 
      true // Mark as issue to apply specific styling
    );
  });

  html += `
      </div>
      <div class="calendar-legend">
        <div class="legend-item"><div class="legend-color" style="background: #4f46e5"></div>Team Project</div>
        <div class="legend-item"><div class="legend-color" style="background: #0891b2"></div>Individual Project</div>
        <div class="legend-item"><div class="legend-color" style="background: #ef4444"></div>Issue</div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Calendar -> Issues sync: clicking an issue opens the same issue modal.
  if (typeof openDetailModal === "function") {
    container.querySelectorAll("[data-open-issue]").forEach(el => {
      el.addEventListener("click", e => {
        e.preventDefault();
        const id = el.getAttribute("data-open-issue");
        if (id) openDetailModal(id);
      });
    });
  }
}

/**
 * Generates HTML for a single row in the timeline grid.
 * @param {string} title - Primary label for the row.
 * @param {string} subtext - Secondary label (e.g. "Team Project").
 * @param {Object} item - Data object containing startDate and endDate.
 * @param {Date} windowStart - Starting date of the visible window.
 * @param {number} windowDays - Total days shown in the window.
 * @param {string} color - Hex color for the timeline bar.
 * @param {boolean} isIssue - Whether this row represents an issue (changes avatar sizing).
 */
function renderTimelineRow(title, subtext, item, windowStart, windowDays, color, isIssue = false) {
  const startStr = item.startDate || item.createdAt || item.created_at;
  const start = new Date(startStr || windowStart);

  // Use extended date if available in state (projects only), otherwise fall back:
  // - project: endDate
  // - issue: dueDate
  // - missing: start date (1-day bar)
  const extension = state?.projectExtensions?.[item.id];
  const endStr = (!isIssue ? extension : null) || item.endDate || item.dueDate || startStr;
  const end = new Date(endStr || start);
  
  // Calculate grid positions (relative to window start)
  const startDiff = Math.floor((start - windowStart) / (1000 * 60 * 60 * 24));
  const rawDuration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  const duration = Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 1;
  
  // Constrain bar to window boundaries
  const gridStart = Math.max(0, startDiff);
  const gridEnd = Math.min(windowDays, startDiff + duration);
  const span = gridEnd - gridStart;

  // Skip rendering if the item is completely outside the visible window
  if (gridEnd <= 0 || gridStart >= windowDays) return '';

  const isExtended = !isIssue && !!extension;
  const owner = teammates.find(t => t.id === item.ownerId);

  return `
    <div class="timeline-row">
      <div class="timeline-label">
        <span>${title}</span>
        <span class="subtext">${subtext}</span>
        ${!isIssue ? `<button class="btn-secondary request-extension-btn" onclick="requestExtension('${item.id}')">Request Extension</button>` : ''}
      </div>
      <div class="timeline-content">
        <div class="timeline-bar-container">
          <div class="timeline-bar ${isIssue ? 'issue' : ''}" 
               style="grid-column: ${gridStart + 1} / span ${span}; background-color: ${color};"
               title="${title}: ${startStr || ''} to ${endStr || ''}${isExtended ? ' (Extended)' : ''}">
            ${owner ? `<img src="${owner.avatar}" class="bar-avatar" title="${owner.name}" alt="${owner.name}">` : ''}
            <span ${isIssue ? `data-open-issue="${item.id}"` : ''}>${title} ${isExtended ? '<span class="extension-badge">Extended</span>' : ''}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Prompts user for a new end date and updates the project timeline.
 * Logs the request in the Activity Feed and persists to local state.
 * @param {string} itemId - ID of the project or issue to extend.
 */
function requestExtension(itemId) {
  const newDate = prompt("Enter new end date (YYYY-MM-DD):", "2026-05-25");
  if (newDate && /^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
    // 1. Update state and save
    state.projectExtensions[itemId] = newDate;
    
    // 2. Log request in global activity
    const item = [...projects, ...(typeof effectiveBlockers === "function" ? effectiveBlockers() : blockers)].find(i => i.id === itemId);
    const currentUser = teammates.find(t => t.id === team.currentUserId);
    
    state.extraActivity.unshift({
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'extension',
      who: currentUser ? currentUser.name : team.currentUserId,
      text: `requested extension for ${item.name || item.title} until ${newDate}`
    });
    
    saveState();
    
    // 3. Re-render affected UI components
    renderCalendar();
    if (typeof renderActivity === 'function') renderActivity();
  } else if (newDate) {
    alert("Invalid date format. Please use YYYY-MM-DD.");
  }
}

/**
 * Toggles the 'expanded' class on the calendar card.
 * Used for manual layout testing (deprecated by drag-to-resize).
 */
function toggleCalendarExpand() {
  const card = document.getElementById("calendar-card");
  const btn = card.querySelector(".btn-expand");
  const isExpanded = card.classList.toggle("expanded");
  if (btn) btn.textContent = isExpanded ? "Collapse view" : "Expand view";
}

// Global hook into the app lifecycle
window.renderCalendar = renderCalendar;
window.requestExtension = requestExtension;
window.toggleCalendarExpand = toggleCalendarExpand;
