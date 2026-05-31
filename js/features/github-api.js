/**
 * Fetch every issue (open and closed) from a public or private GitHub
 * repo and normalize each row into the same shape the local blockers
 * panel uses. Synced rows get id `gh-<github-id>` and `isExternal: true`
 * so the rest of the UI can keep them separate from Supabase blockers.
 *
 * Without a token, GitHub allows 60 requests/hour per IP — fine for
 * smoke-testing but easy to hit during real use. A PAT (even one with
 * no scopes) bumps that to 5,000/hour and is required for private repos.
 *
 * @param {string} repoPath - e.g. `"owner/name"`.
 * @param {string} [token] - GitHub Personal Access Token.
 * @returns {Promise<Array<{
 *   id: string, title: string, description: string, severity: string,
 *   status: "open"|"resolved", owner: string, postedAt: string,
 *   startDate: string, dueDate: string, category: string,
 *   comments: object[], isExternal: true
 * }>>}
 * @throws {Error} On 404 (repo missing / private without token) or
 *   any other non-OK GitHub response.
 */
async function fetchGitHubIssues(repoPath, token) {
    const url = `https://api.github.com/repos/${repoPath}/issues?state=all`;
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
  
    return data.map(issue => ({
      id: `gh-${issue.id}`,
      title: issue.title,
      description: issue.body || "No description provided on GitHub.",
      severity: "medium", // Default fallback
      status: issue.state === "open" ? "open" : "resolved",
      owner: issue.assignee ? issue.assignee.login : issue.user.login,
      postedAt: "GitHub Sync",
      startDate: issue.created_at.split('T')[0],
      dueDate: "", // GitHub issues don't have native due dates
      category: "swe", // Default fallback
      comments: [],
      isExternal: true // Flag to identify it came from an API
    }));
  }