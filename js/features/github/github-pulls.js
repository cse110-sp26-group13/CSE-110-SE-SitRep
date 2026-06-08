/**
 * GitHub pull-request data layer: fetches PRs and performs create / edit /
 * close / merge actions, normalizing GitHub's shape into the app's internal
 * PR shape. Builds on the shared client in [github-client.js](github-client.js).
 */

/**
 * Normalizes a raw GitHub PR object into the app's internal PR shape.
 * @param {object} pr - raw pull request from the GitHub API.
 * @param {string} repoPath - the `owner/repo` the PR belongs to.
 * @returns {object} the app-shaped pull request.
 */
function mapGitHubPullRequest(pr, repoPath) {
  // GitHub marks merged PRs as closed; merged_at lets the UI distinguish the two outcomes.
  const status = pr.merged_at ? "merged" : pr.state;

  return {
    // Prefix PR ids separately so they never collide with issue ids.
    id: `gh-pr-${pr.id}`,
    repoPath,
    ghNumber: pr.number,
    title: pr.title,
    body: pr.body || "",
    status,
    author: pr.user?.login || "",
    headRef: pr.head?.ref || "",
    baseRef: pr.base?.ref || "",
    createdAt: pr.created_at || "",
    updatedAt: pr.updated_at || "",
    closedAt: pr.closed_at || "",
    mergedAt: pr.merged_at || "",
    draft: Boolean(pr.draft),
    // htmlUrl lets the PR row open the real GitHub PR in a new tab.
    htmlUrl: pr.html_url || "",
    mergeable: pr.mergeable ?? null,
    mergeableState: pr.mergeable_state || "",
    isExternal: true,
  };
}

/**
 * Fetches all pull requests (any state) for a repo.
 * @param {string} repoPath - `owner/repo`.
 * @param {string} [token] - optional PAT override.
 * @returns {Promise<object[]>} app-shaped pull requests.
 */
async function fetchGitHubPullRequests(repoPath, token) {
  // PR lists are paginated too, so this mirrors issue sync.
  const data = await ghFetchAllPages(`/repos/${repoPath}/pulls?state=all`, { token });
  return data.map(pr => mapGitHubPullRequest(pr, repoPath));
}

/**
 * @param {unknown} value
 * @param {string} label - field name used in the error message.
 * @returns {string} the trimmed value.
 * @throws {Error} if the value is missing or blank.
 */
function requirePullRequestField(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

/**
 * @param {unknown} value
 * @returns {string} the trimmed string, or "" when nullish.
 */
function cleanOptionalString(value) {
  if (value == null) return "";
  return String(value).trim();
}

/**
 * @param {string} [repoPath]
 * @returns {string} the given repo, falling back to the configured one.
 */
function repoForPullRequestAction(repoPath) {
  return repoPath || getGHRepo();
}

/**
 * Opens a new pull request on GitHub.
 * @param {string} repoPath - `owner/repo` (falls back to the configured repo).
 * @param {object} [pullRequest] - `{ title, head, base, body?, draft? }`.
 * @param {string} [token] - optional PAT override.
 * @returns {Promise<object>} the created, app-shaped pull request.
 */
async function createGitHubPullRequest(repoPath, pullRequest = {}, token) {
  const repo = repoForPullRequestAction(repoPath);
  const payload = {
    title: requirePullRequestField(pullRequest.title, "Title"),
    head: requirePullRequestField(pullRequest.head, "Head branch"),
    base: requirePullRequestField(pullRequest.base, "Base branch"),
  };

  const body = cleanOptionalString(pullRequest.body);
  if (body) payload.body = body;
  if ("draft" in pullRequest) payload.draft = Boolean(pullRequest.draft);

  const response = await ghFetch(`/repos/${repo}/pulls`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
  return mapGitHubPullRequest(await response.json(), repo);
}

/**
 * Edits an existing pull request's title, body, and/or base branch.
 * @param {string} repoPath - `owner/repo`.
 * @param {number} ghNumber - the PR number.
 * @param {object} [updates] - any of `{ title, body, base }`.
 * @param {string} [token] - optional PAT override.
 * @returns {Promise<object>} the updated, app-shaped pull request.
 * @throws {Error} if no supported fields were supplied.
 */
async function updateGitHubPullRequest(repoPath, ghNumber, updates = {}, token) {
  const repo = repoForPullRequestAction(repoPath);
  const payload = {};

  if ("title" in updates) payload.title = requirePullRequestField(updates.title, "Title");
  if ("body" in updates) payload.body = cleanOptionalString(updates.body);
  if ("base" in updates) payload.base = requirePullRequestField(updates.base, "Base branch");

  if (Object.keys(payload).length === 0) {
    throw new Error("No supported pull request fields were provided.");
  }

  const response = await ghFetch(`/repos/${repo}/pulls/${ghNumber}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
  return mapGitHubPullRequest(await response.json(), repo);
}

/**
 * Closes a pull request without merging it.
 * @param {string} repoPath - `owner/repo`.
 * @param {number} ghNumber - the PR number.
 * @param {string} [token] - optional PAT override.
 * @returns {Promise<object>} the closed, app-shaped pull request.
 */
async function closeGitHubPullRequest(repoPath, ghNumber, token) {
  const repo = repoForPullRequestAction(repoPath);
  const response = await ghFetch(`/repos/${repo}/pulls/${ghNumber}`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ state: "closed" }),
  });
  return mapGitHubPullRequest(await response.json(), repo);
}

/**
 * Merges a pull request.
 * @param {string} repoPath - `owner/repo`.
 * @param {number} ghNumber - the PR number.
 * @param {string} [token] - optional PAT override.
 * @returns {Promise<object>} GitHub's raw merge result.
 */
async function mergeGitHubPullRequest(repoPath, ghNumber, token) {
  const repo = repoForPullRequestAction(repoPath);
  const response = await ghFetch(`/repos/${repo}/pulls/${ghNumber}/merge`, {
    method: "PUT",
    token,
    body: JSON.stringify({}),
  });
  return response.json();
}
