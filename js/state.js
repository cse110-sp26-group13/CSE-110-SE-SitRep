const STORAGE_KEY = "sitrep_state_v3";

function defaultState() {
  return {
    githubIssues: [],
    githubPullRequests: [],
    githubRepos: [],
    activeGithubRepo: "",
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

function setGithubPullRequests(pullRequests) {
  state.githubPullRequests = pullRequests;
  saveState();
}

function setGithubRepos(repos) {
  state.githubRepos = repos;
  saveState();
}

function setActiveGithubRepo(repoPath) {
  state.activeGithubRepo = repoPath;
  saveState();
}

function upsertGithubRepo({ repoPath, issues, pullRequests }) {
  const syncedAt = new Date().toISOString();
  const repoData = { repoPath, issues, pullRequests, syncedAt };
  const repos = (state.githubRepos || []).filter(repo => repo.repoPath !== repoPath);
  setGithubRepos([...repos, repoData]);
  setActiveGithubRepo(repoPath);
}

function removeGithubRepo(repoPath) {
  const repos = (state.githubRepos || []).filter(repo => repo.repoPath !== repoPath);
  setGithubRepos(repos);
  if (state.activeGithubRepo === repoPath) {
    setActiveGithubRepo(repos[0]?.repoPath || "");
  }
}

let state = loadState();
