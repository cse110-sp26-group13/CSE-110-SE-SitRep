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

async function fetchGitHubPullRequests(repoPath, token) {
  // PR lists are paginated too, so this mirrors issue sync.
  const data = await ghFetchAllPages(`/repos/${repoPath}/pulls?state=all`, { token });
  return data.map(pr => mapGitHubPullRequest(pr, repoPath));
}

function requirePullRequestField(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function cleanOptionalString(value) {
  if (value == null) return "";
  return String(value).trim();
}

function repoForPullRequestAction(repoPath) {
  return repoPath || getGHRepo();
}

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

async function closeGitHubPullRequest(repoPath, ghNumber, token) {
  const repo = repoForPullRequestAction(repoPath);
  const response = await ghFetch(`/repos/${repo}/pulls/${ghNumber}`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ state: "closed" }),
  });
  return mapGitHubPullRequest(await response.json(), repo);
}

async function mergeGitHubPullRequest(repoPath, ghNumber, token) {
  const repo = repoForPullRequestAction(repoPath);
  const response = await ghFetch(`/repos/${repo}/pulls/${ghNumber}/merge`, {
    method: "PUT",
    token,
    body: JSON.stringify({}),
  });
  return response.json();
}
