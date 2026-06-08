/**
 * Low-level GitHub REST client shared by the issues and pull-request sync
 * features. Centralizes auth (token from sessionStorage), error mapping into
 * user-readable messages, and Link-header pagination so callers stay simple.
 *
 * Tokens live only in sessionStorage (see [ADR-0006](../../../docs/adr/0006-implement-github-api-vanilla.md))
 * and are never persisted to disk or sent anywhere but api.github.com.
 */

const GH_API_BASE = "https://api.github.com";

/**
 * @returns {string} the configured `owner/repo` slug.
 * @throws {Error} if no repo is set in sessionStorage.
 */
function getGHRepo() {
  const repo = sessionStorage.getItem("sitrep_gh_repo");
  if (!repo) throw new Error("GitHub repo not configured. Set sitrep_gh_repo in sessionStorage.");
  return repo;
}

/** @returns {string} the stored Personal Access Token, or "" if none. */
function getGHToken() {
  return sessionStorage.getItem("sitrep_gh_token") || "";
}

/**
 * @param {unknown} token
 * @returns {string} the trimmed token, or "" if it is not a string.
 */
function cleanGHToken(token) {
  return typeof token === "string" ? token.trim() : "";
}

/**
 * Central wrapper for GitHub API calls so auth and error handling stay
 * consistent across every endpoint.
 *
 * @param {string} path - API path beginning with `/` (e.g. `/repos/o/r/issues`).
 * @param {object} [options] - fetch options, plus an optional `token` override.
 * @param {string} [options.token] - PAT to use instead of the stored one.
 * @returns {Promise<Response>} the successful response.
 * @throws {Error} with a user-readable message on any non-2xx status.
 */
async function ghFetch(path, options = {}) {
  // Central wrapper for GitHub API calls so auth and error handling stay consistent.
  const { token: explicitToken, ...fetchOptions } = options;
  const token = cleanGHToken(explicitToken ?? getGHToken());
  const url = GH_API_BASE + path;

  const headers = {
    // GitHub recommends this media type for the REST API.
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchOptions.headers || {}),
  };

  const response = await fetch(url, { ...fetchOptions, headers });

  if (!response.ok) {
    // Surface common GitHub failures as user-readable modal errors.
    const detail = await githubErrorDetail(response);
    if (response.status === 404) throw new Error(githubNotFoundMessage(path, token, detail));
    if (response.status === 401) throw new Error(detail || "GitHub authentication failed. Check your token.");
    if (response.status === 403) throw new Error(detail || "GitHub access forbidden. Token may lack required permissions.");
    throw new Error(detail || `GitHub API error ${response.status}: ${response.statusText}`);
  }

  return response;
}

/**
 * Builds the 404 message, tailoring the hint to whether a token was supplied.
 * @param {string} path
 * @param {string} token
 * @param {string} detail - extra context parsed from the API response body.
 * @returns {string}
 */
function githubNotFoundMessage(path, token, detail) {
  const base = `GitHub repository not found or inaccessible: ${path}${detail ? ` (${detail})` : ""}.`;
  if (token) {
    return `${base} For private repos, make sure the token is authorized for this repository and has read access to Issues and Pull requests, or use a classic token with the repo scope.`;
  }
  return `${base} Private repos require a token with repository access and read permissions for Issues and Pull requests.`;
}

/**
 * Pulls a readable error string out of a failed GitHub response body.
 * @param {Response} response
 * @returns {Promise<string>} the parsed message, or "" if none could be read.
 */
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

/**
 * Fetches every page of a paginated GitHub collection, following the
 * `rel="next"` Link header until exhausted.
 *
 * @param {string} path - collection path (query string allowed).
 * @param {object} [options] - same options as {@link ghFetch}.
 * @returns {Promise<object[]>} the concatenated items across all pages.
 */
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
