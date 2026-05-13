const STORAGE_KEY = "sitrep_state_v2";

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
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();
