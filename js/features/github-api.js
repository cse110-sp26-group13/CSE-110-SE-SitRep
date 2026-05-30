/**
 * Fetch every issue (open and closed) from a public or private GitHub
 * repo and normalize each row into a minimal upstream shape. Callers
 * (today: db.syncGithubIssues in [../db.js](../db.js)) decide how to
 * land those into Supabase — this layer no longer invents app fields
 * like severity or category.
 *
 * Without a token, GitHub allows 60 requests/hour per IP — fine for
 * smoke-testing but easy to hit during real use. A PAT (even one with
 * no scopes) bumps that to 5,000/hour and is required for private repos.
 *
 * Note: GitHub's `/issues` endpoint returns pull requests too (they're
 * issues with a `pull_request` field). We filter those out so the
 * synced list matches what users see under the "Issues" tab on GitHub.
 *
 * @param {string} repoPath - e.g. `"owner/name"`.
 * @param {string} [token] - GitHub Personal Access Token.
 * @returns {Promise<Array<{
 *   externalId: string, externalUrl: string,
 *   title: string, description: string,
 *   status: "open"|"resolved"
 * }>>}
 * @throws {Error} On 404 (repo missing / private without token) or
 *   any other non-OK GitHub response.
 */
async function fetchGitHubIssues(repoPath, token) {
    const url = `https://api.github.com/repos/${repoPath}/issues?state=all&per_page=100`;
    const headers = {
      "Accept": "application/vnd.github.v3+json"
    };

    if (token && token.trim() !== "") {
        headers["Authorization"] = `token ${token}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error("Repository not found or private (try adding a token).");
        }
        throw new Error(`GitHub API Error: ${response.statusText}`);
    }

    const data = await response.json();

    return data
      .filter(issue => !issue.pull_request)
      .map(issue => ({
        externalId: String(issue.id),
        externalUrl: issue.html_url,
        title: issue.title,
        description: issue.body || "",
        status: issue.state === "open" ? "open" : "resolved",
      }));
  }

/**
 * Create a new issue in `repoPath` and return the GitHub response so
 * the caller can persist `id` + `html_url` as the link-back keys.
 * Used by db.createBlocker when the team has a github_repo set and
 * the current user has a PAT cached — the native blocker mirrors out
 * to GitHub so the two trackers stay in lockstep.
 *
 * Needs a token with `repo` scope (public repos: `public_repo` works).
 *
 * @param {string} repoPath - `"owner/name"`.
 * @param {string} token - PAT with write access.
 * @param {{title: string, body?: string}} fields
 * @returns {Promise<{id: number, html_url: string, number: number}>}
 * @throws {Error} On any non-2xx response. Error includes the GitHub
 *   message so callers can decide whether to surface it.
 */
async function createGithubIssue(repoPath, token, { title, body }) {
  const url = `https://api.github.com/repos/${repoPath}/issues`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Accept": "application/vnd.github.v3+json",
      "Authorization": `token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, body: body || "" }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub create failed (${response.status}): ${detail}`);
  }
  return await response.json();
}
