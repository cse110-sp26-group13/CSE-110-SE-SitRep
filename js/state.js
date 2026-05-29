const STORAGE_KEY = "sitrep_state_v3";

function defaultState() {
  return {
    githubIssues: [],
    severityFilter: "all",
    statusFilter: "open",
    slotAvailability: {},
    aiSessions: [],
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

function setGithubIssues(issues) {
  state.githubIssues = issues;
  saveState();
}

let state = loadState();
