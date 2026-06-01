function mapGitHubPullRequest(pr, repoPath) {
  const status = pr.merged_at ? "merged" : pr.state;

  return {
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
    htmlUrl: pr.html_url || "",
    mergeable: pr.mergeable ?? null,
    mergeableState: pr.mergeable_state || "",
    isExternal: true,
  };
}

async function fetchGitHubPullRequests(repoPath, token) {
  const response = await ghFetch(`/repos/${repoPath}/pulls?state=all`, { token });
  const data = await response.json();
  return data.map(pr => mapGitHubPullRequest(pr, repoPath));
}
