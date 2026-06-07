# Calendar Feature Documentation

This document tracks the development and features of the SitRep Calendar.

## Latest Enhancements (June 2026)

### Sidebar & Legend Interactivity
- **Interactive Group Editing:** Upgraded the calendar legend to allow direct editing of custom groups. Clicking a group name button now opens the **Group Edit Modal** for immediate modifications.
- **Team Info Toggling:** Clicking the **"Team"** name in the legend now toggles the visibility of the **Team Members** list in the sidebar, providing a faster alternative to the info ("i") button.
- **Improved Action Separation:** Refactored the legend row structure to separate visibility toggling (checkbox) from management actions (buttons), preventing accidental visibility changes during group edits.

### Projects Timeline Synchronization
- **Global Visibility Sync:** Synchronized the Projects Timeline with the calendar's global visibility filters. Hiding a group or team in the sidebar legend now correctly filters its corresponding issues from the timeline view.
- **Real-time Filter Updates:** The timeline now automatically re-renders upon any filter change, ensuring visual consistency across all calendar views.

### Shared Group Management System
- **Custom Groups:** Replaced the legacy "Project" button with a robust **"+ New group"** system.
    - **Group Creation:** Creators can define a group name, pick a custom color, and invite specific teammates from their circle.
    - **Implicit Membership:** Creators are automatically added as members of their own groups.
    - **Member UI:** Improved teammate selection with a visual list featuring avatars, roles, and interactive row toggling.
- **Strict Privacy Model:**
    - **Membership-Based Visibility:** Group metadata (name/color) and events are strictly invisible to anyone not in the group.
    - **Event Redaction:** Once a user leaves a group, they immediately lose access to all its events, even if they were the original author.
    - **Sidebar Integration:** Groups only appear in the sidebar legend for active members/creators.
- **Administrative Permissions:**
    - **Group Leaders:** Group creators act as "leaders" with the ability to edit or delete any event posted within their group, regardless of ownership.
    - **Promotion Logic:** Group events can be promoted to "Global (Team)" visibility but cannot be downgraded to "Personal".
    - **Secure Exit:** Implemented a secure database function (`leave_calendar_group`) to handle member self-removal while bypassing standard RLS update restrictions.

### Database Integration & Visibility Control
- **Supabase Persistence:** Transitioned from `localStorage` to a centralized Supabase database. All calendar events are now stored in the `calendar_events` table, ensuring data persists across different devices and users.
- **Granular Visibility:** Implemented a visibility model for events:
    - **Team Events:** Visible to everyone on the team. Tied to a `team_id` in the database.
    - **Personal Events:** Private to the creator. `team_id` is set to NULL, and Row-Level Security (RLS) ensures only the owner can access them.
- **Terminology Update:** Renamed "Global" events to **"Team"** events in the UI for better clarity within the team collaboration context.

### Performance & UI Responsiveness
- **Instant UI Updates:** Refactored the event handling logic to use a unified `refreshActiveView()` function. All views (Month, Week, and Timeline) now update instantly upon event creation, modification, or deletion without requiring a tab switch.
- **Synchronized View State:** Linked the internal date context (Year, Month, and Week Start) across all navigation controls. Navigating in Month view now correctly positions the Week view and vice-versa.
- **Clean Slate:** Removed all hard-coded sample events. The calendar now relies entirely on dynamic data from the database and the issues tracker.

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

### Phase 4: Interactive Management & Filter Sync (June 2026)
- **Interactive Legend Actions:** Transformed legend text into functional buttons for editing groups and toggling team info.
- **Timeline Synchronization:** Integrated the Projects Timeline with the global state and sidebar filters to ensure data consistency across all views.

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
- `calendar.html`: Structure for the calendar grid, group modals, and header buttons.
- `js/pages/calendar.js`: Orchestration logic for groups, visibility transitions, and legend interactivity.
- `js/db.js`: Database layer for shared groups and RPC calls.
- `css/calendar.css`: Layout and visual styling for groups, visual member lists, and interactive rows.
- `supabase/migrations/`: New migrations for `calendar_groups` table, RLS policies, and `leave_calendar_group` function.
- `js/pages/issues.js`: Deep linking support via URL parameters.
- `js/selectors.js`: Blocker data aggregation and color override support.

### Verification
- Syntax checks performed using `node --check`.
- State persistence verified via local storage.
- UI responsiveness and interaction flow tested manually across various data states.
- Confirmation of timeline filtering synchronization with sidebar state.
