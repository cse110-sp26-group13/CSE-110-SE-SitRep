/**
 * Event and group modal behavior for the calendar page.
 *
 * How this file works:
 * - Opens and closes the event, group, and related form modals used by the
 *   calendar page.
 * - Applies client-side permission rules before fields are enabled. Event owners
 *   can edit their own events; custom group creators can manage group-scoped
 *   events; non-creators get read-only context where appropriate.
 * - Builds dynamic form controls for group visibility and group membership.
 * - Persists creates, updates, deletes, and "leave group" actions through `db`,
 *   then reloads shared state and asks `calendar.js` to repaint the active view.
 *
 * This file depends on globals from `calendar-utils.js` and `calendar.js`,
 * especially `calState`, `findCalendarEvent`, `findCalendarGroup`,
 * `renderCalLegend`, and `refreshActiveView`.
 */

/**
 * Returns a default date for new events, preferring today if in range.
 * @returns {string} ISO date string.
 */
function getDefaultEventDate() {
  const today = new Date();
  const isViewingCurrentMonth =
    today.getFullYear() === calState.year && today.getMonth() === calState.month;
  return isoDate(isViewingCurrentMonth ? today : new Date(calState.year, calState.month, 1));
}

/**
 * Opens the event creation/editing modal.
 * Handles role-based permissions, pre-filling data, and UI state toggling.
 * @param {string|null} eventId - The ID of the event to edit, or null for new.
 * @param {string|null} defaultDate - Optional pre-selected date.
 */
function openEventModal(eventId = null, defaultDate = null) {
  // Existing events load by id; a null id means the form creates a new record.
  const event = eventId ? findCalendarEvent(eventId) : null;
  const modal = document.getElementById("calendar-event-modal");
  const form = document.getElementById("calendar-event-form");
  const title = document.getElementById("calendar-event-modal-title");
  const name = document.getElementById("calendar-event-name");
  const date = document.getElementById("calendar-event-date");
  const endDate = document.getElementById("calendar-event-end-date");
  const description = document.getElementById("calendar-event-description");
  const groupSelect = document.getElementById("calendar-event-group");
  const error = document.getElementById("calendar-event-error");
  const deleteButton = document.getElementById("calendar-event-delete");
  const submitButton = document.getElementById("calendar-event-submit");

  form.reset();

  // Enforce visibility transition rules. Personal events can move anywhere,
  // global events stay team-wide, and custom-group events can move to team.
  const currentGroup = event?.group || "personal";
  let groupOptions = "";

  if (!event || currentGroup === "personal") {
    // New event or current Personal: Can go anywhere.
    groupOptions += `<option value="personal">Personal</option>`;
    groupOptions += `<option value="global">Team</option>`;
    getCalendarGroups().forEach(g => {
      groupOptions += `<option value="${g.id}">${escapeHTML(g.name)}</option>`;
    });
    groupSelect.disabled = false;
  } else if (currentGroup === "global") {
    // Current Global: Locked to Team visibility.
    groupOptions += `<option value="global">Team</option>`;
    groupSelect.disabled = true;
  } else {
    // Current Custom Group: Can go to Global, but not back to Personal.
    const customGroup = findCalendarGroup(currentGroup);
    groupOptions += `<option value="${currentGroup}">${escapeHTML(customGroup?.name || "Current Group")}</option>`;
    groupOptions += `<option value="global">Team</option>`;
    groupSelect.disabled = false;
  }

  groupSelect.innerHTML = groupOptions;

  calState.editingEventId = event?.id || null;
  title.textContent = event ? "Edit event" : "New event";
  name.value = event?.title || "";
  date.value = event?.date || defaultDate || getDefaultEventDate();
  endDate.value = event?.endDate || "";
  description.value = event?.description || "";
  groupSelect.value = currentGroup;

  // Handle group member preview visibility when the selected audience changes.
  const teamField = document.getElementById("calendar-event-team-field");
  const teamList = document.getElementById("calendar-event-team-list");
  const teamLabel = teamField.querySelector('span');
  
  function updateTeamVisibility() {
    // Personal events have no shared audience to preview.
    const val = groupSelect.value;
    
    if (val === 'personal') {
      teamField.hidden = true;
      return;
    }

    teamField.hidden = false;
    let members = [];
    
    if (val === 'global') {
      teamLabel.textContent = "Team Members";
      members = effectiveTeammates();
    } else {
      teamLabel.textContent = "Group Members";
      const group = findCalendarGroup(val);
      if (group) {
        // Map member ids to teammate objects for visual listing.
        members = (group.members || [])
          .map(uid => window.teammates.find(t => t.id === uid))
          .filter(Boolean);
      }
    }

    teamList.innerHTML = members.map(t => {
      const isOwner = event && event.ownerId === t.id;
      return `
        <div class="people-row readonly">
          <div class="people-info">
            ${avatar(t.name, t.id)}
            <div class="people-meta">
              <span class="name">${escapeHTML(t.name)}</span>
              <span class="role">${escapeHTML(t.role || "")}</span>
              ${isOwner ? '<span class="creator-tag">Creator</span>' : ''}
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  groupSelect.onchange = updateTeamVisibility;
  updateTeamVisibility();
  
  // Permission check: only the event owner or custom group creator can modify an
  // existing event. New events are editable by the current user.
  const currentUserId = window.team.currentUserId;
  const isOwner = !event || event.ownerId === currentUserId;
  
  let isGroupLeader = false;
  if (event && currentGroup !== 'global' && currentGroup !== 'personal') {
    const group = findCalendarGroup(currentGroup);
    if (group && group.creatorId === currentUserId) {
      isGroupLeader = true;
    }
  }

  const canEdit = isOwner || isGroupLeader;

  // Apply permissions to the form controls rather than hiding the whole modal,
  // so users can still inspect shared event details.
  name.disabled = !canEdit;
  date.disabled = !canEdit;
  endDate.disabled = !canEdit;
  description.disabled = !canEdit;
  if (!canEdit) groupSelect.disabled = true;

  deleteButton.hidden = !event || !canEdit;
  submitButton.textContent = event ? "Save changes" : "Create event";
  submitButton.hidden = !canEdit && currentGroup === 'global';

  error.hidden = true;
  error.textContent = "";
  modal.hidden = false;
  if (canEdit) name.focus();
}

/**
 * Opens the group creation/editing modal.
 * @param {string|null} groupId - The ID of the group to edit, or null for new.
 */
function openGroupModal(groupId = null) {
  // Existing groups load by id; a null id means the form creates a new group.
  const group = groupId ? findCalendarGroup(groupId) : null;
  const modal = document.getElementById("calendar-group-modal");
  const form = document.getElementById("calendar-group-form");
  const title = document.getElementById("calendar-group-modal-title");
  const name = document.getElementById("calendar-group-name");
  const color = document.getElementById("calendar-group-color");
  const peopleList = document.getElementById("calendar-group-people-list");
  const error = document.getElementById("calendar-group-error");
  const deleteButton = document.getElementById("calendar-group-delete");
  const leaveButton = document.getElementById("calendar-group-leave");
  const submitButton = document.getElementById("calendar-group-submit");

  form.reset();
  calState.editingGroupId = group?.id || null;
  title.textContent = group ? "Edit group" : "New group";
  name.value = group?.name || "";
  color.value = group?.color || "#4f8cff";
  
  const currentUserId = window.team.currentUserId;
  const isCreator = !group || group.creatorId === currentUserId;

  deleteButton.hidden = !group || !isCreator;
  leaveButton.hidden = !group || isCreator;
  submitButton.textContent = group ? "Save changes" : "Create group";
  
  // Only the creator can change group details or membership.
  name.disabled = !isCreator;
  color.disabled = !isCreator;

  // Populate the membership picker, excluding the creator because they are
  // always part of their own group.
  const teammates = effectiveTeammates();
  
  peopleList.innerHTML = teammates
    .filter(t => t.id !== currentUserId)
    .map(t => {
      const isChecked = group?.members?.includes(t.id);
      return `
        <label class="people-row ${isChecked ? "active" : ""} ${!isCreator ? "disabled" : ""}">
          <input type="checkbox" name="members" value="${t.id}" ${isChecked ? "checked" : ""} ${!isCreator ? "disabled" : ""}>
          <div class="people-info">
            ${avatar(t.name, t.id)}
            <div class="people-meta">
              <span class="name">${escapeHTML(t.name)}</span>
              <span class="role">${escapeHTML(t.role || "")}</span>
            </div>
          </div>
          <div class="check-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
        </label>
      `;
    }).join("");

  // Keep checkbox state and row styling in sync.
  peopleList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      cb.closest('.people-row').classList.toggle('active', cb.checked);
    });
  });

  error.hidden = true;
  error.textContent = "";
  modal.hidden = false;
  if (isCreator) name.focus();
}

/**
 * Closes the group modal.
 */
function closeGroupModal() {
  document.getElementById("calendar-group-modal").hidden = true;
  calState.editingGroupId = null;
}

/**
 * Binds events for the group modal.
 */
function bindGroupModal() {
  const modal = document.getElementById("calendar-group-modal");
  const form = document.getElementById("calendar-group-form");

  document.getElementById("calendar-group-modal-close").addEventListener("click", closeGroupModal);
  document.getElementById("calendar-group-cancel").addEventListener("click", closeGroupModal);
  document.getElementById("calendar-group-delete").addEventListener("click", deleteCalendarGroup);
  document.getElementById("calendar-group-leave").addEventListener("click", leaveCalendarGroup);
  modal.addEventListener("click", e => {
    // Clicking the backdrop closes the modal; clicking the dialog body does not.
    if (e.target === modal) closeGroupModal();
  });
  form.addEventListener("submit", saveGroup);
}

/**
 * Persists a new or existing group to the database.
 * @param {Event} e - Form submission event.
 */
async function saveGroup(e) {
  e.preventDefault();
  // Read form state at submit time so generated checkbox rows are current.
  const name = document.getElementById("calendar-group-name").value.trim();
  const color = document.getElementById("calendar-group-color").value;
  const checkboxes = document.querySelectorAll('#calendar-group-people-list input[name="members"]:checked');
  const members = Array.from(checkboxes).map(cb => cb.value);
  const error = document.getElementById("calendar-group-error");

  const currentUserId = window.team.currentUserId;
  const group = calState.editingGroupId ? findCalendarGroup(calState.editingGroupId) : null;
  const isCreator = !group || group.creatorId === currentUserId;

  // Double-check permissions before attempting a database write.
  if (!isCreator) {
    error.textContent = "Only the creator can edit group details.";
    error.hidden = false;
    return;
  }

  if (!name) {
    error.textContent = "Please enter a group name.";
    error.hidden = false;
    return;
  }

  // Mandatory: the creator is always in the group they create/manage.
  if (!members.includes(currentUserId)) {
    members.push(currentUserId);
  }

  const groupData = {
    name,
    color,
    members
  };

  try {
    if (calState.editingGroupId) {
      await db.updateCalendarGroup(calState.editingGroupId, groupData);
    } else {
      await db.createCalendarGroup(groupData);
    }

    await db.loadAll(); // Refresh global calendar groups/events.
    
    // Auto-show newly created groups so the user sees them immediately.
    getCalendarGroups().forEach(g => {
      if (!calState.customGroups.has(g.id)) calState.customGroups.add(g.id);
    });

    renderCalLegend();
    refreshActiveView();
    closeGroupModal();
  } catch (err) {
    error.textContent = "Failed to save group. Please try again.";
    error.hidden = false;
    console.error(err);
  }
}

/**
 * Deletes the currently edited group.
 */
async function deleteCalendarGroup() {
  const id = calState.editingGroupId;
  if (!id) return;

  // This is destructive for every member's shared calendar view.
  if (!confirm("Are you sure you want to delete this group? All shared events in this group will be hidden for everyone.")) return;

  try {
    await db.deleteCalendarGroup(id);
    await db.loadAll();
    
    calState.customGroups.delete(id);
    
    renderCalLegend();
    refreshActiveView();
    closeGroupModal();
  } catch (err) {
    alert("Failed to delete group.");
    console.error(err);
  }
}

/**
 * Removes the current user from the edited group.
 */
async function leaveCalendarGroup() {
  const id = calState.editingGroupId;
  if (!id) return;

  const group = findCalendarGroup(id);
  if (!group) return;

  // Leaving removes only the current user from the group.
  if (!confirm("Are you sure you want to leave this group? You will no longer see its events.")) return;

  try {
    await db.leaveCalendarGroup(id);
    await db.loadAll();
    
    calState.customGroups.delete(id);
    
    renderCalLegend();
    refreshActiveView();
    closeGroupModal();
  } catch (err) {
    console.error("Leave group failed:", err);
    const msg = err.message || "Unknown error";
    alert(`Failed to leave group: ${msg}`);
  }
}

/**
 * Closes the event modal.
 */
function closeEventModal() {
  document.getElementById("calendar-event-modal").hidden = true;
  calState.editingEventId = null;
}

/**
 * Binds events for the event creation/editing modal.
 */
function bindEventModal() {
  const modal = document.getElementById("calendar-event-modal");
  const form = document.getElementById("calendar-event-form");

  document.getElementById("calendar-event-modal-close").addEventListener("click", closeEventModal);
  document.getElementById("calendar-event-cancel").addEventListener("click", closeEventModal);
  document.getElementById("calendar-event-delete").addEventListener("click", deleteCalendarEvent);
  modal.addEventListener("click", e => {
    // Backdrop click closes the modal.
    if (e.target === modal) closeEventModal();
  });
  document.addEventListener("keydown", e => {
    // Escape offers a consistent keyboard close path for the event modal.
    if (e.key === "Escape" && !modal.hidden) closeEventModal();
  });
  form.addEventListener("submit", createCalendarEvent);
}

/**
 * Persists a new or edited event to the database.
 * @param {Event} e - Form submission event.
 */
async function createCalendarEvent(e) {
  e.preventDefault();

  // Extract form values at submit time so edits made after opening are included.
  const title = document.getElementById("calendar-event-name").value.trim();
  const date = document.getElementById("calendar-event-date").value;
  const endDate = document.getElementById("calendar-event-end-date").value;
  const description = document.getElementById("calendar-event-description").value.trim();
  const group = document.getElementById("calendar-event-group").value;
  const error = document.getElementById("calendar-event-error");

  // Client-side validation catches obvious mistakes before hitting the database.
  if (!title || !date || !group) {
    error.textContent = "Please complete every field before creating the event.";
    error.hidden = false;
    return;
  }

  if (endDate && endDate < date) {
    error.textContent = "End date cannot be before start date.";
    error.hidden = false;
    return;
  }

  const eventData = { 
    date, 
    endDate: endDate || null, 
    title, 
    description,
    group,
    teamId: (group === 'global' || group !== 'personal') ? window.team.id : null
  };

  try {
    if (calState.editingEventId) {
      await db.updateCalendarEvent(calState.editingEventId, eventData);
    } else {
      await db.createCalendarEvent(eventData);
    }

    await db.loadAll(); // Refresh global calendar events/groups.

    // Navigate to the month/week containing the saved event.
    const selectedDate = new Date(`${date}T00:00:00`);
    calState.year = selectedDate.getFullYear();
    calState.month = selectedDate.getMonth();
    calState.weekStart = getStartOfWeek(selectedDate);
    
    renderCalHeader();
    refreshActiveView();
    closeEventModal();
  } catch (err) {
    error.textContent = "Failed to save event. Please try again.";
    error.hidden = false;
    console.error(err);
  }
}

/**
 * Deletes the currently edited event.
 */
async function deleteCalendarEvent() {
  const id = calState.editingEventId;
  if (!id) return;

  try {
    // Deleting an event leaves calendar state in place and simply refreshes the
    // currently active view.
    await db.deleteCalendarEvent(id);
    await db.loadAll();
    
    refreshActiveView();
    closeEventModal();
  } catch (err) {
    alert("Failed to delete event.");
    console.error(err);
  }
}
