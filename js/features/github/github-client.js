const GH_API_BASE = "https://api.github.com";

function getGHRepo() {
  const repo = sessionStorage.getItem("sitrep_gh_repo");
  if (!repo) throw new Error("GitHub repo not configured. Set sitrep_gh_repo in sessionStorage.");
  return repo;
}

function getGHToken() {
  return sessionStorage.getItem("sitrep_gh_token") || "";
}

async function ghFetch(path, options = {}) {
  const { token: explicitToken, ...fetchOptions } = options;
  const token = explicitToken ?? getGHToken();
  const url = GH_API_BASE + path;

  const headers = {
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchOptions.headers || {}),
  };

  const response = await fetch(url, { ...fetchOptions, headers });

  if (!response.ok) {
    if (response.status === 404) throw new Error(`GitHub resource not found: ${path}`);
    if (response.status === 401) throw new Error("GitHub authentication failed. Check your token.");
    if (response.status === 403) throw new Error("GitHub access forbidden. Token may lack required permissions.");
    throw new Error(`GitHub API error ${response.status}: ${response.statusText}`);
  }

  return response;
}
