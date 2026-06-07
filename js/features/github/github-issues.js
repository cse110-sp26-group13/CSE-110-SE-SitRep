function labelToSeverity(labels) {
  // GitHub labels are free-form, so only known labels affect severity.
  const names = labels.map((l) => l.name.toLowerCase());
  if (names.includes("critical")) return "critical";
  if (names.includes("high")) return "high";
  if (names.includes("medium")) return "medium";
  return "medium";
}

async function fetchGitHubIssues(repoPath, token) {
  // GitHub's issues endpoint also returns PRs, so fetch all pages then remove PR-shaped rows.
  const data = await ghFetchAllPages(`/repos/${repoPath}/issues?state=all`, { token });
  return data.filter((issue) => !issue.pull_request).map(issue => mapGitHubIssue(issue, repoPath));
}

function mapGitHubIssue(issue, repoPath) {
  // Normalize GitHub's issue shape into the app's assignment/blocker shape.
  return {
    id: `gh-${issue.id}`,
    repoPath,
    ghNumber: issue.number,
    title: issue.title,
    description: issue.body || "",
    severity: labelToSeverity(issue.labels || []),
    // The app calls closed assignments "resolved".
    status: issue.state === "closed" ? "resolved" : "open",
    owner: issue.user?.login || "",
    postedAt: "GitHub Sync",
    // GitHub issues do not have native start/due dates, so only created_at is available.
    startDate: issue.created_at ? issue.created_at.split("T")[0] : "",
    dueDate: "",
    category: "swe",
    comments: [],
    isExternal: true,
  };
}

async function createGitHubIssue(title, body) {
  const repo = getGHRepo();
  const response = await ghFetch(`/repos/${repo}/issues`, {
    method: "POST",
    body: JSON.stringify({ title, body }),
  });
  return response.json();
}

async function addGitHubComment(ghNumber, text, repoPath = getGHRepo()) {
  const repo = repoPath;
  return ghFetch(`/repos/${repo}/issues/${ghNumber}/comments`, {
    method: "POST",
    body: JSON.stringify({ body: text }),
  });
}

async function closeGitHubIssue(ghNumber, repoPath = getGHRepo()) {
  const repo = repoPath;
  return ghFetch(`/repos/${repo}/issues/${ghNumber}`, {
    method: "PATCH",
    body: JSON.stringify({ state: "closed" }),
  });
}

async function fetchGitHubComments(ghNumber, repoPath = getGHRepo()) {
  const repo = repoPath;
  const response = await ghFetch(`/repos/${repo}/issues/${ghNumber}/comments`);
  const data = await response.json();
  return data.map((comment) => ({
    who: comment.user.login,
    text: comment.body,
    time: new Date(comment.created_at).toLocaleTimeString(),
  }));
}
