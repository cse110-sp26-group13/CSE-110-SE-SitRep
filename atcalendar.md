# Calendar Feature Documentation

This document tracks the development and features of the SitRep Calendar.

## Latest Enhancements (May 2026)

### Visual Timeline Optimization
- **Seamless Multi-day Bars:** Fixed visual gaps and truncation in timeline bars. Issues now use precise negative margins and calculated widths to connect perfectly across day cells.
- **Weekly Slot Management:** Refactored the rendering logic to calculate vertical slots on a **per-week basis**. This ensures visual stability within a single week while allowing issues to automatically "move up" to the highest available row at the start of a new week if space has been vacated.
- **Standardized Sizing:** Standardized all bars and spacers to a consistent 22px height, ensuring perfect vertical alignment across the entire grid regardless of how many items are active.

### Blocker & Issue Management
- **Issues Tracker View:** Dedicated "Issues Tracker" toggle in the sidebar with a clear visual hierarchy.
- **Strict Filtering:** Implemented case-insensitive status filtering. Issues marked as "Resolved" are strictly excluded from both the visual grid and the sidebar legend to focus on active blockers.
- **Custom Issue Colors:** Added color pickers to individual issues in the legend. Users can customize the background color of blocker bars while the red border remains fixed for quick identification.
- **Deep Linking:** Clicking any issue bar on the calendar redirects the user to the Issue Tracker and automatically opens that specific issue's details.

### Project & Event Logic
- **Interactive Legend:** Sidebar legend items for standard events now include visibility checkboxes.
- **Enhanced Project Modal:** Projects are now clickable. The project modal lists all associated events (ordered by date) and allows for renaming, recoloring, or deletion.
- **Fixed Creation Flow:** Resolved a bug where the "New Project" button would incorrectly trigger "Edit" mode.

## Implementation History

### Phase 3: Project System Integration
- **New Project Feature:** Added a "+ New project" button to the page header.
- **Centralized Coloring:** Moved the color picker from individual events to the Project level.
- **Project-Event Linkage:** Events are now tied to projects via a dropdown in the event modal. They inherit the color of their parent project.
- **Sidebar Integration:** New projects and their color swatches appear automatically in the sidebar.

### Phase 2: Event Editing & Persistence
- **Event Interaction:** Made calendar event bars clickable.
- **Edit/Delete Flow:** Clicking an event opens the modal in "Edit" mode, allowing for name, date, and criteria changes, or deletion.
- **State Persistence:** All user-created projects and events are saved to `localStorage` and persist through page refreshes.
- **Caching Fixes:** Implemented versioned cache tags (`?v=3`, `?v=4`) for CSS and JS files to ensure users always load the latest logic.

### Phase 1: Initial "New Event" Feature
- **Event Modal:** Created the "New event" popup in `calendar.html`.
- **Core Logic:** Wired up the create/save/render cycle in `calendar.js`.
- **Styling:** Added custom color rendering and layout for event bars in `calendar.css`.
- **Global State:** Registered `extraCalendarEvents` in `state.js`.

## Technical Details

### Files Modified
- `calendar.html`: Structure for the calendar grid, view toggles, and modals.
- `js/pages/calendar.js`: Orchestration logic for rendering (weekly slots), filtering, and modal management.
- `js/pages/issues.js`: Deep linking support via URL parameters.
- `css/calendar.css`: Layout and visual styling for seamless bars, standard heights, and modal lists.
- `js/state.js`: Global state management and persistence.
- `js/selectors.js`: Blocker data aggregation and color override support.

### Verification
- Syntax checks performed using `node --check`.
- State persistence verified via local storage.
- UI responsiveness and interaction flow tested manually across various data states.
