# Calendar Feature Documentation

This document tracks the development and features of the SitRep Calendar.

## Latest Enhancements (June 3, 2026)

### Sidebar & Legend Interactivity
- **Interactive Group Editing:** Upgraded the calendar legend to allow direct editing of custom groups. Clicking a group name button now opens the **Group Edit Modal** for immediate modifications.
- **Team Info Toggling:** Clicking the **"Team"** name in the legend now toggles the visibility of the **Team Members** list in the sidebar, providing a faster alternative to the info ("i") button.
- **Improved Action Separation:** Refactored the legend row structure to separate visibility toggling (checkbox) from management actions (buttons), preventing accidental visibility changes during group edits.

### Projects Timeline Synchronization
- **Global Visibility Sync:** Synchronized the Projects Timeline with the calendar's global visibility filters. Hiding a group or team in the sidebar legend now correctly filters its corresponding issues from the timeline view.
- **Real-time Filter Updates:** The timeline now automatically re-renders upon any filter change, ensuring visual consistency across all calendar views.

## Previous Enhancements (May 31 - June 1, 2026)

### UI & Sidebar Refinement
- **Relative Unit Migration:** Refactored the entire `calendar.css` to use relative units (`rem`, `em`, `%`) instead of absolute `px`, ensuring better scalability and consistency with modern design standards.
- **Sidebar Alignment Fix:** Removed redundant `flex: 1` property from project labels to resolve excessive gaps between color swatches and text.
- **Tighter Row Spacing:** Adjusted gaps to relative units (`0.5rem` / `0.375rem`) for a more compact and balanced sidebar layout.
- **Swatch Picker Styling:** Implemented responsive styling for `.swatch-picker` using relative dimensions to maintain visual harmony in the issues legend.

### Navigation & Tab System
- **Implemented Folder Structure:** Custom "folder" style trapezoid tabs created using CSS `clip-path`, providing a unique and tactile physical folder aesthetic.
- **Implemented View Sub-Tabs:** Specific sub-tab structure that allows for seamless switching between the **Week View** and the **Projects Timeline View**, expanding the calendar's utility beyond the standard month grid.
- **Standardized Tab Sizing:** All calendar view tabs (Month, Week, and Timeline) now share a uniform width of `11.25rem`.
- **Label Centering:** Centered tab labels using flexbox for perfect alignment within the trapezoidal folder structure.
- **Week View Event Creation:** Clicking any date cell in the Week View now correctly opens the day modal for event creation, perfectly mirroring the Month View's interactive behavior.

### Projects Timeline Refinement
- **Interactive Date Ticks:** Added day numbers (1-31) to the timeline header grid for precise temporal reference.
- **Milestone Date Ranges:** Timeline bars now explicitly display their day range (e.g., "12–15") to indicate exactly how long each block is.
- **Text Overflow Management:** Implemented `text-overflow: ellipsis` for task titles on timeline bars, ensuring text fits cleanly within small blocks or cuts off with "..." where applicable.
- **Strict Boundary Clipping:** Applied `overflow: hidden` to the timeline grid to ensure that projects spanning multiple months are perfectly clipped at the month boundaries and do not run off the tab.
- **Status-Based Color Coding:** Refactored the timeline to use semantic status colors (Green for Resolved, Orange for In-Progress, Ink for Open) while maintaining high-contrast visibility.
- **Visual Aesthetic "Squished Square":** Adopted a modern "squished square" look for assignee pills and timeline bars, using slight border radii and consistent padding for a professional finish.
- **Auto-Scroll to Today:** The timeline now automatically scrolls to the current date upon loading, ensuring the user immediately sees the most relevant active tasks.
- **Synchronized Hover States:** Implemented cross-view synchronization; hovering over an event in the Month or Week grid highlights its corresponding bar in the Timeline view, and vice-versa.

### Month View Enhancements
- **Implemented Spanning Issue Bars:** Re-engineered the Issue Tracker to use `grid-column` spanning. Multi-day issues now appear as a single continuous bar with a centered title, providing a professional and highly readable timeline within the grid.
- **Anti-Overlap Grid Architecture:** Implemented a dedicated row-indexing system that separates day headers (dates and month events) from issue slots. This ensures multi-day bars never overlap with calendar dates or daily markers.
- **Global Overflow Control:** Applied `overflow: hidden` to all calendar grids to ensure that connection indicators and long-running bars are strictly clipped at the grid borders.
- **Color-Coded Legend Borders:** Implemented a system of visual indicators where calendar cells display color-coded top borders (using `box-shadow`) to represent team, personal, risk, or blocked milestones at a glance.
- **Implemented Theme-Aware Contrast:** Implemented a dynamic contrast system (`getContrastColor`) that automatically adjusts text color based on the background project color and the active theme (light/dark), ensuring maximum readability across all visual states.
- **Standardized Header Structure:** Updated the cell rendering logic to use a consistent `.cal-cell-header` across all views, ensuring uniform alignment of date labels and interaction targets.

## Implementation History

### Phase 7: Interactive Management & Filter Sync (June 3, 2026)
- **Interactive Legend Actions:** Transformed legend text into functional buttons for editing groups and toggling team info.
- **Timeline Synchronization:** Integrated the Projects Timeline with the global state and sidebar filters to ensure data consistency across all views.

### Phase 6: Interactive Parity & Visual Polish (May 31 - June 1, 2026)
- **Week-Month Parity:** Aligned the Week View's event creation logic and DOM structure with the Month View.
- **Timeline UX Overhaul:** Integrated status-based coloring, auto-scroll, and synchronized hovering to transform the timeline into a fully interactive planning tool.
- **Contrast & Legibility Fixes:** Resolved text visibility issues in light mode by forcing high-contrast cream/white text on dark status bars and eliminating muddy shadows.

### Phase 5: Grid Re-engineering & Data Clarity (May 30, 2026)
- **Spanning Logic Implementation:** Refactored the month view from a cell-nested architecture to a grid-spanning architecture to support continuous multi-day bars.
- **Vertical Slot Management:** Implemented dynamic week-height calculation to align background cells perfectly with variable numbers of issue slots.
- **Readability Optimization:** Resolved collisions between calendar dates and issue bars through explicit row separation in the CSS grid.

### Phase 4: UI Polish & Responsive Refactoring (May 29, 2026)
- **Unit Modernization:** Moved away from `px` at all costs to adopt a fully relative unit system across the calendar interface.
- **Timeline Information Density:** Enhanced the timeline view with date markers and duration labels to improve its utility as a planning tool.
- **Code Audit & Cleanup:** Performed a comprehensive audit to remove redundant logic and duplicate function definitions in `calendar.js`.
- **Visual Feedback:** Integrated the user's custom legend border system for improved scannability of the month grid.

### Phase 3: Project System Integration (May 28, 2026)
- **New Project Feature:** Added a "+ New project" button to the page header.
- **Centralized Coloring:** Moved the color picker from individual events to the Project level.
- **Project-Event Linkage:** Events are now tied to projects via a dropdown in the event modal. They inherit the color of their parent project.
- **Sidebar Integration:** New projects and their color swatches appear automatically in the sidebar.

### Phase 2: Event Editing & Persistence (May 27, 2026)
- **Event Interaction:** Made calendar event bars clickable.
- **Edit/Delete Flow:** Clicking an event opens the modal in "Edit" mode, allowing for name, date, and criteria changes, or deletion.
- **State Persistence:** All user-created projects and events are saved to `localStorage` and persist through page refreshes.
- **Caching Fixes:** Implemented versioned cache tags (`?v=3`, `?v=4`) for CSS and JS files to ensure users always load the latest logic.

### Phase 1: Initial "New Event" Feature (May 27, 2026)
- **Event Modal:** Created the "New event" popup in `calendar.html`.
- **Core Logic:** Wired up the create/save/render cycle in `calendar.js`.
- **Styling:** Added custom color rendering and layout for event bars in `calendar.css`.
- **Global State:** Registered `extraCalendarEvents` in `state.js`.

## Technical Details

### Files Modified
- `js/pages/calendar.js`: Refactored legend rendering for interactivity and updated `renderCalTimeline` for filter synchronization.
- `css/calendar.css`: (Prior changes) Refactor to `rem`/`em` units, folder tab structure, and grid overflow clipping.

### Verification
- Manual verification of legend interactivity (buttons vs checkboxes).
- Confirmation of timeline filtering synchronization with sidebar state.
- Syntax check of `js/pages/calendar.js` using `node --check`.
