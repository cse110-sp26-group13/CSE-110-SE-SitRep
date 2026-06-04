function mapGitHubPullRequest(pr, repoPath) {
  // GitHub marks merged PRs as closed; merged_at lets the UI distinguish the two outcomes.
  const status = pr.merged_at ? "merged" : pr.state;

  return {
    // Prefix PR ids separately so they never collide with issue ids.
    id: `gh-pr-${pr.id}`,
    repoPath,
    ghNumber: pr.number,
    title: pr.title,
    status,
    author: pr.user?.login || "",
    headRef: pr.head?.ref || "",
    baseRef: pr.base?.ref || "",
    createdAt: pr.created_at || "",
    updatedAt: pr.updated_at || "",
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
