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
  // Central wrapper for GitHub API calls so auth and error handling stay consistent.
  const { token: explicitToken, ...fetchOptions } = options;
  const token = explicitToken ?? getGHToken();
  const url = GH_API_BASE + path;

  const headers = {
    // GitHub recommends this media type for the REST API.
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchOptions.headers || {}),
  };

  const response = await fetch(url, { ...fetchOptions, headers });

  if (!response.ok) {
    // Surface common GitHub failures as user-readable modal errors.
    const detail = await githubErrorDetail(response);
    if (response.status === 404) throw new Error(`GitHub resource not found: ${path}${detail ? ` (${detail})` : ""}`);
    if (response.status === 401) throw new Error(detail || "GitHub authentication failed. Check your token.");
    if (response.status === 403) throw new Error(detail || "GitHub access forbidden. Token may lack required permissions.");
    throw new Error(detail || `GitHub API error ${response.status}: ${response.statusText}`);
  }

  return response;
}

async function githubErrorDetail(response) {
  try {
    const data = await response.json();
    const errors = Array.isArray(data.errors)
      ? data.errors.map(error => error.message || error.code).filter(Boolean).join("; ")
      : "";
    if (data.message && errors) return `${data.message}: ${errors}`;
    return data.message || errors || "";
  } catch {
    return "";
  }
}

async function ghFetchAllPages(path, options = {}) {
  // Ask GitHub for the largest normal page size so large repos need fewer requests.
  const joiner = path.includes("?") ? "&" : "?";
  const basePath = `${path}${joiner}per_page=100`;
  const results = [];

  for (let page = 1; ; page += 1) {
    // Page is appended here instead of passed by callers so all endpoints paginate the same way.
    const response = await ghFetch(`${basePath}&page=${page}`, options);
    const data = await response.json();
    results.push(...data);

    // GitHub tells us another page exists through the Link header.
    const linkHeader = response.headers?.get?.("Link") || "";
    if (!linkHeader.includes('rel="next"')) break;
  }

  return results;
}
