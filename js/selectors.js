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

function effectiveBlockers() {
  return [...state.extraBlockers, ...blockers].map(b => {
    const ov = state.blockerOverrides[b.id] || {};
    return {
      ...b,
      description: ov.description ?? b.description ?? "",
      status: ov.status ?? b.status ?? "open",
      comments: ov.comments ?? b.comments ?? [],
    };
  });
}

function findBlockerById(id) {
  return effectiveBlockers().find(b => b.id === id);
}

function updateBlocker(id, patch) {
  const existing = state.blockerOverrides[id] || {};
  const base = [...state.extraBlockers, ...blockers].find(b => b.id === id);
  state.blockerOverrides[id] = {
    description: existing.description ?? base?.description ?? "",
    status: existing.status ?? base?.status ?? "open",
    comments: existing.comments ?? base?.comments ?? [],
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
