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