const STORAGE_KEY = "sitrep_state_v2";

/**
 * Returns the initial state for the application.
 * Used for first-time visits and manual resets.
 */
function defaultState() {
  return {
    extraCheckIns: {},
    extraActivity: [],
    coveredFor: [],
    extraBlockers: [],
    blockerOverrides: {},
    severityFilter: "all",
    statusFilter: "open",
    slotAvailability: {},
    /**
     * Map of project/issue IDs to their new end dates (YYYY-MM-DD).
     * Overrides the static 'endDate' defined in data.js.
     */
    projectExtensions: {}, 
  };
}

/**
 * Loads application state from localStorage.
 * Merges with defaultState to ensure new keys are always present.
 */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch (err) {
    console.error("Failed to load state:", err);
    return defaultState();
  }
}

/**
 * Persists the current global 'state' object to localStorage.
 */
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Initialize application state
let state = loadState();
