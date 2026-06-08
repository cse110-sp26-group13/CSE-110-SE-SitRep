# Calendar Feature Documentation

This document tracks the development, features, and technical architecture of the SitRep Calendar.

## Current Feature Set (June 2026)

### Shared Group Management System
- **Custom Groups:** Robust **"+ New group"** system allows creators to define group names, pick custom colors, and invite specific teammates.
- **Implicit Membership:** Creators are automatically added as members of their own groups.
- **Member UI:** Improved teammate selection with a visual list featuring avatars, roles, and interactive row toggling.
- **Strict Privacy Model:**
    - **Membership-Based Visibility:** Group metadata and events are strictly invisible to anyone not in the group.
    - **Event Redaction:** Access is lost immediately upon leaving a group.
    - **Administrative Permissions:** Group creators (Leaders) can edit or delete any event within their group.

### Sidebar & Legend Interactivity
- **Interactive Group Editing:** Legend row structure separates visibility toggling (checkbox) from management actions. Clicking a group name opens the **Group Edit Modal**.
- **Team Info Toggling:** Clicking the **"Team"** name in the legend toggles the **Team Members** list visibility.
- **Live Color Feedback:** Swatches in the legend support real-time color picking and persistence.

### Projects Timeline & Multi-View Support
- **Month View:** Grid-spanning architecture supporting multi-day bars and connection indicators.
- **Week View:** High-density single-week grid with full parity for event creation and interaction.
- **Projects Timeline:** Gantt-style horizontal view for project issues/blockers.
    - **Auto-scroll to Today:** Focuses on the current date upon load.
    - **Interactive Date Ticks:** Day numbers and month markers for precise temporal reference.
    - **Status-Based Color Coding:** Green (Resolved), Orange (In-Progress), Ink (Open).
- **Global Visibility Sync:** All views respect the filters set in the sidebar legend.

### Blocker & Issue Management
- **GitHub Integration:** Issues are merged from GitHub and Supabase into a unified view.
- **Deep Linking:** Clicking issue bars redirects to the Issue Tracker and opens specific details.
- **Customization:** Users can override blocker bar colors in the legend for better visual organization.

### Event & Group Details
- **Description Field:** Added a rich description box for calendar events, allowing users to add detailed notes and context.
- **Permissions System:** Only the event owner or group leader can edit descriptions; others see a read-only view.
- **3D UI Polish:** All secondary buttons (including Cancel buttons) now feature a consistent 3D pop effect on hover and depress on click.

### Technical Architecture
- **Supabase Persistence:** All shared data (events, groups) resides in Postgres with Row-Level Security (RLS).
- **Vertical Slot Management:** A two-pass allocation algorithm (`calculateEventSlots`) ensures visual stability and continuity for multi-day bars across day/week boundaries.
- **Theme-Aware Contrast:** Dynamic calculation of text color (white/black) based on background bar brightness and active theme.
- **Relative Unit System:** Fully responsive layout using `rem`, `em`, and percentages for scalability.

---

## Implementation History

### Phase 8: Contextual Metadata & UI Parity (June 7, 2026)
- **Event Descriptions:** Implemented a persistence layer and UI for event-specific notes.
- **Role-Based Interaction:** Added logic to disable form fields for non-authorized users.
- **Global Stylistic Cleanup:** Unified the 3D interaction language across all primary and secondary buttons.

### Phase 7: Interactive Management & Filter Sync (June 3, 2026)
- **Interactive Legend Actions:** Transformed legend text into functional buttons for editing groups and toggling team info.
- **Timeline Synchronization:** Integrated the Projects Timeline with the global state and sidebar filters.

### Phase 6: Interactive Parity & Visual Polish (May 31 - June 1, 2026)
- **Week-Month Parity:** Aligned Week View's event creation logic and DOM structure with the Month View.
- **Timeline UX Overhaul:** Integrated status-based coloring, auto-scroll, and synchronized hovering.
- **Contrast & Legibility Fixes:** Resolved text visibility issues in light mode.

### Phase 5: Grid Re-engineering & Data Clarity (May 30, 2026)
- **Spanning Logic Implementation:** Refactored month view to support continuous multi-day bars using `grid-column` spanning.
- **Vertical Slot Management:** Implemented dynamic week-height calculation and row-indexing to prevent overlaps with date labels.

### Phase 4: UI Polish & Responsive Refactoring (May 29, 2026)
- **Unit Modernization:** Migration from absolute `px` to relative units (`rem`/`em`).
- **Timeline Information Density:** Enhanced timeline with date markers and duration labels.

### Phase 3: Project System Integration (May 28, 2026)
- **New Project Feature:** Added "+ New project" button (later refactored to Groups).
- **Centralized Coloring:** Linked event colors to their parent project/group.

### Phase 2: Event Editing & Persistence (May 27, 2026)
- **Event Interaction:** Made calendar bars clickable for editing/deletion.
- **State Persistence:** Initial `localStorage` implementation for projects and events.

### Phase 1: Initial "New Event" Feature (May 27, 2026)
- **Core Orchestration:** Initial grid rendering and modal logic for custom events.

---

## Technical Details

### Files
- `js/pages/calendar.js`: Main orchestrator and view rendering.
- `js/db.js`: Supabase data layer and mutators.
- `css/calendar.css`: Responsive grid layout and bar styling.
- `js/selectors.js`: Data aggregation for issues and teammates.
- `atcalendar.md` / `sycalendar.md`: (Deprecated) Initial development logs.
