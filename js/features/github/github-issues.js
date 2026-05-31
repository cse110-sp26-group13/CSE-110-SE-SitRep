function labelToSeverity(labels) {
  const names = labels.map((l) => l.name.toLowerCase());
  if (names.includes("critical")) return "critical";
  if (names.includes("high")) return "high";
  if (names.includes("medium")) return "medium";
  return "medium";
}

async function fetchGitHubIssues(repoPath, token) {
  const response = await ghFetch(`/repos/${repoPath}/issues?state=all`);
  const data = await response.json();
  return data.map((issue) => ({
    id: `gh-${issue.id}`,
    ghNumber: issue.number,
    title: issue.title,
    description: issue.body || "",
    severity: labelToSeverity(issue.labels || []),
    status: issue.state === "closed" ? "resolved" : "open",
    owner: issue.user?.login || "",
    postedAt: "GitHub Sync",
    startDate: issue.created_at ? issue.created_at.split("T")[0] : "",
    dueDate: "",
    category: "swe",
    comments: [],
    isExternal: true,
  }));
}

async function createGitHubIssue(title, body) {
  const repo = getGHRepo();
  const response = await ghFetch(`/repos/${repo}/issues`, {
    method: "POST",
    body: JSON.stringify({ title, body }),
  });
  return response.json();
}

async function addGitHubComment(ghNumber, text) {
  const repo = getGHRepo();
  return ghFetch(`/repos/${repo}/issues/${ghNumber}/comments`, {
    method: "POST",
    body: JSON.stringify({ body: text }),
  });
}

async function closeGitHubIssue(ghNumber) {
  const repo = getGHRepo();
  return ghFetch(`/repos/${repo}/issues/${ghNumber}`, {
    method: "PATCH",
    body: JSON.stringify({ state: "closed" }),
  });
}

async function fetchGitHubComments(ghNumber) {
  const repo = getGHRepo();
  const response = await ghFetch(`/repos/${repo}/issues/${ghNumber}/comments`);
  const data = await response.json();
  return data.map((comment) => ({
    who: comment.user.login,
    text: comment.body,
    time: new Date(comment.created_at).toLocaleTimeString(),
  }));
}
