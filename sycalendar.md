# Calendar Feature Documentation

This document tracks the development and features of the SitRep Calendar.

## Latest Enhancements (May 2026)

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

### Projects Timeline Refinement
- **Interactive Date Ticks:** Added day numbers (1-31) to the timeline header grid for precise temporal reference.
- **Milestone Date Ranges:** Timeline bars now explicitly display their day range (e.g., "12–15") to indicate exactly how long each block is.
- **Text Overflow Management:** Implemented `text-overflow: ellipsis` for task titles on timeline bars, ensuring text fits cleanly within small blocks or cuts off with "..." where applicable.
- **Strict Boundary Clipping:** Applied `overflow: hidden` to the timeline grid to ensure that projects spanning multiple months are perfectly clipped at the month boundaries and do not run off the tab.

### Month View Enhancements
- **Color-Coded Legend Borders:** Implemented a system of visual indicators where calendar cells display color-coded top borders (using `box-shadow`) to represent team, personal, risk, or blocked milestones at a glance.
- **Implemented Theme-Aware Contrast:** Implemented a dynamic contrast system (`getContrastColor`) that automatically adjusts text color based on the background project color and the active theme (light/dark), ensuring maximum readability across all visual states.

## Implementation History

### Phase 4: UI Polish & Responsive Refactoring
- **Unit Modernization:** Moved away from `px` at all costs to adopt a fully relative unit system across the calendar interface.
- **Timeline Information Density:** Enhanced the timeline view with date markers and duration labels to improve its utility as a planning tool.
- **Code Audit & Cleanup:** Performed a comprehensive audit to remove redundant logic and duplicate function definitions in `calendar.js`.
- **Visual Feedback:** Integrated the user's custom legend border system for improved scannability of the month grid.

## Technical Details

### Files Modified
- `css/calendar.css`: Complete refactor to `rem`/`em` units. Added folder tab structure, uniform sizing, custom kind indicator borders, and timeline clipping.
- `js/pages/calendar.js`: Refactored to remove duplicate logic, updated timeline rendering for date labels, and improved state initialization.
- `calendar.html`: Structure for the calendar grid, folder tabs, and various view sections.

### Verification
- Manual verification of layout stability across multiple zoom levels.
- Visual check of tab folder symmetry and text centering.
- Confirmation of timeline bar clipping and date label accuracy.
- Successful audit for redundant code and function duplicates.
