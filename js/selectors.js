function effectiveTeammates() {
  return teammates.map(t => {
    const extra = state.extraCheckIns[t.id];
    const covered = state.coveredFor.includes(t.id);
    return {
      ...t,
      mood: extra?.mood ?? t.mood,
      lastCheckIn: extra
        ? { ...(t.lastCheckIn || {}), ...extra }
        : t.lastCheckIn,
      coverNeeded: covered ? false : t.coverNeeded,
    };
  });
}

function setGithubIssues(issues) {
  state.githubIssues = issues;
  saveState();
}

function effectiveBlockers() {
  const allIssues = [
    ...state.extraBlockers, 
    ...(state.githubIssues || []), 
    ...blockers
  ];

  return allIssues.map(b => {
    const ov = state.blockerOverrides[b.id] || {};
    return {
      ...b,
      description: ov.description ?? b.description ?? "",
      status: ov.status ?? b.status ?? "open",
      comments: ov.comments ?? b.comments ?? [],
      startDate: ov.startDate ?? b.startDate ?? "",
      dueDate: ov.dueDate ?? b.dueDate ?? "",
      category: ov.category ?? b.category ?? "",
      color: ov.color ?? b.color ?? "#ff453a22", // Default soft red
    };
  });
}

function findBlockerById(id) {
  return effectiveBlockers().find(b => b.id === id);
}

function updateBlocker(id, patch) {
  const existing = state.blockerOverrides[id] || {};
  const allIssues = [
    ...state.extraBlockers, 
    ...(state.githubIssues || []), 
    ...blockers
  ];
  const base = allIssues.find(b => b.id === id);
  
  state.blockerOverrides[id] = {
    ...existing,
    description: existing.description ?? base?.description ?? "",
    status: existing.status ?? base?.status ?? "open",
    comments: existing.comments ?? base?.comments ?? [],
    startDate: existing.startDate ?? base?.startDate ?? "",
    dueDate: existing.dueDate ?? base?.dueDate ?? "",
    category: existing.category ?? base?.category ?? "",
    color: existing.color ?? base?.color ?? "#ff453a22",
    ...patch,
  };
}

function effectiveActivity() {
  return [...state.extraActivity, ...activity];
}

function pushActivity(entry) {
  state.extraActivity.unshift({ ...entry, time: entry.time || nowTime() });
  if (state.extraActivity.length > 20) state.extraActivity.length = 20;
}
