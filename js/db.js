/**
 * Supabase data layer for SE SitRep.
 *
 * Exposes the same globals the UI used to read from data.js — `team`,
 * `teammates`, `blockers`, `meetingSlots`, `activity` — but populates
 * them from Postgres on every page load. RLS scopes everything to the
 * caller's team automatically.
 *
 * Pages await db.loadAll() in their DOMContentLoaded handler before
 * rendering. All mutations go through db.* helpers; callers re-load
 * (or update the in-memory slice) and re-render.
 */
(function () {
  'use strict';

  // Predefined meeting slots are shared across teams. Each team's
  // availability is stored in slot_availability keyed by slot_id.
  const SLOT_DEFS = [
    { id: 's1', time: '11:00', label: '11:00 – 11:30 AM' },
    { id: 's2', time: '1:30',  label: '1:30 – 2:00 PM' },
    { id: 's3', time: '3:00',  label: '3:00 – 3:30 PM' },
    { id: 's4', time: '4:30',  label: '4:30 – 5:00 PM' },
  ];

  window.team = { id: null, name: '', joinCode: '', githubRepo: '', currentUserId: null };
  window.teammates = [];
  window.blockers = [];
  window.meetingSlots = SLOT_DEFS.map(s => ({ ...s, availability: {} }));
  window.activity = [];

  // Per-user GitHub PAT for writes (creating mirror issues). Stored on
  // the user's device only — keeping PATs out of Supabase avoids handing
  // each team member access to every other member's token.
  const GH_TOKEN_KEY = 'sitrep-gh-token';
  function readGithubToken() {
    try { return window.localStorage.getItem(GH_TOKEN_KEY) || ''; }
    catch (_e) { return ''; }
  }
  function writeGithubToken(token) {
    try {
      if (token) window.localStorage.setItem(GH_TOKEN_KEY, token);
      else window.localStorage.removeItem(GH_TOKEN_KEY);
    } catch (_e) { /* private mode */ }
  }

  const sb = () => window.sbClient;

  function fmtTime(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function dayKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function last7Days() {
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      out.push(dayKey(d));
    }
    return out;
  }

  // -------- loaders --------

  const ACTIVE_TEAM_KEY = 'sitrep-active-team';

  function readActiveTeamId() {
    try { return window.localStorage.getItem(ACTIVE_TEAM_KEY) || null; }
    catch (_e) { return null; }
  }

  function writeActiveTeamId(id) {
    try {
      if (id) window.localStorage.setItem(ACTIVE_TEAM_KEY, id);
      else window.localStorage.removeItem(ACTIVE_TEAM_KEY);
    } catch (_e) { /* private mode */ }
  }

  async function loadCurrentTeam(userId) {
    const { data, error } = await sb()
      .from('memberships')
      .select('team_id, teams ( id, name, join_code, github_repo ), joined_at')
      .eq('user_id', userId)
      .order('joined_at', { ascending: true });
    if (error) throw error;
    const rows = (data || []).filter(r => r.teams);
    if (!rows.length) return null;

    const wantId = readActiveTeamId();
    const match = wantId ? rows.find(r => r.teams.id === wantId) : null;
    const chosen = (match || rows[0]).teams;
    // Keep the stored id in sync — covers first load, stale ids from a
    // since-left circle, and the rail switcher reading the same key.
    if (chosen.id !== wantId) writeActiveTeamId(chosen.id);
    return chosen;
  }

  async function loadTeamMembers(teamId) {
    const { data, error } = await sb()
      .from('memberships')
      .select('profiles ( id, display_name, role, avatar_url )')
      .eq('team_id', teamId);
    if (error) throw error;
    return (data || []).map(r => r.profiles).filter(Boolean);
  }

  async function loadRecentStandups(teamId) {
    const days = last7Days();
    const { data, error } = await sb()
      .from('standups')
      .select('*')
      .eq('team_id', teamId)
      .gte('day', days[0])
      .order('day', { ascending: false })
      .order('posted_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function loadBlockers(teamId) {
    const { data: rows, error } = await sb()
      .from('blockers')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const ids = (rows || []).map(b => b.id);
    let comments = [];
    if (ids.length) {
      const { data: cs, error: ce } = await sb()
        .from('blocker_comments')
        .select('id, blocker_id, author_id, text, created_at, profiles ( display_name )')
        .in('blocker_id', ids)
        .order('created_at', { ascending: true });
      if (ce) throw ce;
      comments = cs || [];
    }
    return { rows: rows || [], comments };
  }

  async function loadSlotAvailability(teamId) {
    const { data, error } = await sb()
      .from('slot_availability')
      .select('user_id, slot_id, is_available')
      .eq('team_id', teamId);
    if (error) throw error;
    return data || [];
  }

  async function loadActivity(teamId) {
    const { data, error } = await sb()
      .from('activity_events')
      .select('id, kind, text, created_at, profiles ( display_name )')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data || [];
  }

  /**
   * Hydrate every global the dashboard reads from — `team`, `teammates`,
   * `blockers`, `meetingSlots`, `activity`. Each page calls this once
   * inside its DOMContentLoaded handler before the first render.
   *
   * If there's no session or the user has no team, the page redirects
   * to splash.html instead of returning — callers can `await` and
   * trust that anything after this line has a populated `team`.
   *
   * @returns {Promise<void>}
   */
  async function loadAll() {
    const { data: { session } } = await sb().auth.getSession();
    if (!session) {
      window.location.replace('splash.html');
      return;
    }
    const userId = session.user.id;
    const t = await loadCurrentTeam(userId);
    if (!t) {
      window.location.replace('splash.html');
      return;
    }
    window.team = {
      id: t.id,
      name: t.name,
      joinCode: t.join_code,
      githubRepo: t.github_repo || '',
      currentUserId: userId,
    };

    const [members, standups, blockerData, slotAvail, activityRows] = await Promise.all([
      loadTeamMembers(t.id),
      loadRecentStandups(t.id),
      loadBlockers(t.id),
      loadSlotAvailability(t.id),
      loadActivity(t.id),
    ]);

    const days = last7Days();
    const todayKey = days[6];
    const standupByUserDay = new Map();
    for (const s of standups) {
      standupByUserDay.set(`${s.user_id}|${s.day}`, s);
    }

    window.teammates = members.map(p => {
      const moodHistory = days.map(d => {
        const s = standupByUserDay.get(`${p.id}|${d}`);
        return s ? (s.mood ?? null) : null;
      });
      const today = standupByUserDay.get(`${p.id}|${todayKey}`);
      const hasCheckIn = !!(today && (today.yesterday || today.today || today.blockers_note));
      return {
        id: p.id,
        name: p.display_name || 'Unknown',
        role: p.role || '',
        mood: today?.mood ?? null,
        moodHistory,
        lastCheckIn: hasCheckIn ? {
          time: fmtTime(today.posted_at),
          yesterday: today.yesterday || '',
          today: today.today || '',
          blockers: today.blockers_note || '',
        } : null,
        coverNeeded: !!today?.cover_needed,
        coverNote: today?.cover_note || '',
      };
    });

    const profilesById = Object.fromEntries(members.map(m => [m.id, m]));
    const commentsByBlocker = {};
    for (const c of blockerData.comments) {
      (commentsByBlocker[c.blocker_id] = commentsByBlocker[c.blocker_id] || []).push({
        id: c.id,
        who: c.profiles?.display_name || 'Unknown',
        text: c.text,
        time: fmtTime(c.created_at),
      });
    }
    window.blockers = blockerData.rows.map(b => ({
      id: b.id,
      title: b.title,
      description: b.description || '',
      severity: b.severity,
      status: b.status,
      ownerId: b.owner_id,
      owner: profilesById[b.owner_id]?.display_name || 'Unassigned',
      postedAt: fmtTime(b.created_at),
      startDate: b.start_date || '',
      dueDate: b.due_date || '',
      category: b.category || '',
      externalSource: b.external_source || null,
      externalId: b.external_id || null,
      externalUrl: b.external_url || null,
      comments: commentsByBlocker[b.id] || [],
    }));

    const availBySlot = {};
    for (const r of slotAvail) {
      (availBySlot[r.slot_id] = availBySlot[r.slot_id] || {})[r.user_id] = r.is_available;
    }
    window.meetingSlots = SLOT_DEFS.map(s => ({
      ...s,
      availability: availBySlot[s.id] || {},
    }));

    window.activity = activityRows.map(a => ({
      time: fmtTime(a.created_at),
      type: a.kind,
      who: a.profiles?.display_name || 'System',
      text: a.text,
    }));
  }

  // -------- mutators --------

  async function _writeStandupPatch(patch) {
    const today = dayKey(new Date());
    const { data: updated, error: ue } = await sb()
      .from('standups')
      .update({ ...patch, posted_at: new Date().toISOString() })
      .eq('team_id', team.id)
      .eq('user_id', team.currentUserId)
      .eq('day', today)
      .select();
    if (ue) throw ue;
    if (updated && updated.length > 0) return;
    const { error: ie } = await sb()
      .from('standups')
      .insert({
        team_id: team.id,
        user_id: team.currentUserId,
        day: today,
        ...patch,
      });
    if (ie) throw ie;
  }

  /**
   * Upsert the current user's mood for today.
   *
   * @param {number} score - 1–10 mood rating.
   */
  async function saveMood(score) {
    await _writeStandupPatch({ mood: score });
  }

  /**
   * Upsert today's check-in prose. Empty strings collapse to NULL in
   * the DB so a partial check-in doesn't pretend to have answers it
   * doesn't have.
   *
   * @param {{yesterday?: string, today?: string, blockersNote?: string}} args
   */
  async function saveStandupCompose({ yesterday, today, blockersNote }) {
    await _writeStandupPatch({
      yesterday: yesterday || null,
      today: today || null,
      blockers_note: blockersNote || null,
    });
  }

  /**
   * Append a row to the activity feed for the current team and user.
   *
   * @param {string} kind - one of: "checkin", "blocker", "mood", …
   *   (free-form; the feed renders by `kind` class).
   * @param {string} text - human-readable summary.
   */
  async function addActivity(kind, text) {
    const { error } = await sb()
      .from('activity_events')
      .insert({
        team_id: team.id,
        user_id: team.currentUserId,
        kind,
        text,
      });
    if (error) throw error;
  }

  /**
   * Insert a new blocker for the current team. Required: title and
   * severity. Optional: description, ownerId, category, startDate,
   * dueDate. Defaults `status` to "open" and `created_by` to the
   * caller's id.
   *
   * If the team has a `github_repo` configured and the current user
   * has a PAT cached locally, also mirrors the blocker to GitHub as a
   * new issue and links the two via `external_source` / `external_id`
   * / `external_url`. Mirror failures (no token, no repo, GH error)
   * are swallowed: the Supabase row still exists, the link-back just
   * doesn't happen.
   *
   * @param {{
   *   title: string, severity: "critical"|"high"|"medium",
   *   description?: string, ownerId?: string|null, category?: string|null,
   *   startDate?: string|null, dueDate?: string|null
   * }} input
   * @returns {Promise<object>} the inserted row.
   */
  async function createBlocker(input) {
    const { data, error } = await sb()
      .from('blockers')
      .insert({
        team_id: team.id,
        title: input.title,
        description: input.description || '',
        severity: input.severity,
        status: 'open',
        owner_id: input.ownerId || null,
        category: input.category || null,
        start_date: input.startDate || null,
        due_date: input.dueDate || null,
        created_by: team.currentUserId,
      })
      .select()
      .single();
    if (error) throw error;

    await _mirrorBlockerToGithub(data).catch(err => {
      // Best-effort: Supabase has the row, the user sees it. Mirror
      // failure stays in the console so devs notice but users don't.
      console.warn('GitHub mirror skipped:', err.message);
    });

    return data;
  }

  async function _mirrorBlockerToGithub(row) {
    const repo = team.githubRepo;
    const token = readGithubToken();
    if (!repo || !token) return;

    const gh = await createGithubIssue(repo, token, {
      title: row.title,
      body: row.description || '',
    });

    const { error } = await sb()
      .from('blockers')
      .update({
        external_source: 'github',
        external_id: String(gh.id),
        external_url: gh.html_url,
      })
      .eq('id', row.id);
    if (error) throw error;
  }

  /**
   * Apply a partial update to a blocker. Only keys present in `patch`
   * are sent to the DB — passing `{}` is a no-op. UI-shaped keys are
   * mapped to their DB column names here (e.g. `ownerId` → `owner_id`).
   *
   * @param {string} id
   * @param {Partial<{
   *   title: string, description: string, status: string, severity: string,
   *   ownerId: string|null, startDate: string|null, dueDate: string|null,
   *   category: string|null
   * }>} patch
   */
  async function updateBlocker(id, patch) {
    const dbPatch = {};
    if ('title' in patch)       dbPatch.title       = patch.title;
    if ('description' in patch) dbPatch.description = patch.description;
    if ('status' in patch)      dbPatch.status      = patch.status;
    if ('severity' in patch)    dbPatch.severity    = patch.severity;
    if ('ownerId' in patch)     dbPatch.owner_id    = patch.ownerId || null;
    if ('startDate' in patch)   dbPatch.start_date  = patch.startDate || null;
    if ('dueDate' in patch)     dbPatch.due_date    = patch.dueDate || null;
    if ('category' in patch)    dbPatch.category    = patch.category || null;
    if (Object.keys(dbPatch).length === 0) return;
    const { error } = await sb().from('blockers').update(dbPatch).eq('id', id);
    if (error) throw error;
  }

  /**
   * Append a comment to a blocker, authored by the current user.
   *
   * @param {string} blockerId
   * @param {string} text
   */
  async function addBlockerComment(blockerId, text) {
    const { error } = await sb()
      .from('blocker_comments')
      .insert({
        blocker_id: blockerId,
        author_id: team.currentUserId,
        text,
      });
    if (error) throw error;
  }

  /**
   * Set the current user's availability for one meeting slot. Upserts
   * on (team_id, user_id, slot_id) so toggling repeatedly doesn't
   * accumulate rows.
   *
   * @param {string} slotId - one of the SLOT_DEFS ids.
   * @param {boolean} isAvailable
   */
  async function setSlotAvailability(slotId, isAvailable) {
    const { error } = await sb()
      .from('slot_availability')
      .upsert({
        team_id: team.id,
        user_id: team.currentUserId,
        slot_id: slotId,
        is_available: !!isAvailable,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'team_id,user_id,slot_id' });
    if (error) throw error;
  }

  /**
   * Persist the chosen "owner/repo" on the team row so every member's
   * sync modal opens to the same default. Any team member can call
   * this — matched by the `team_member_update` RLS policy. Pass an
   * empty string to clear it.
   *
   * @param {string} repo
   */
  async function setTeamGithubRepo(repo) {
    const next = (repo || '').trim();
    const { error } = await sb()
      .from('teams')
      .update({ github_repo: next || null })
      .eq('id', team.id);
    if (error) throw error;
    team.githubRepo = next;
  }

  /**
   * Pull every issue from `repo` and reconcile against this team's
   * existing GitHub-synced blockers. Two-pass:
   *
   *   1. Look up the rows we already have for (team, external_source='github').
   *   2. Partition the incoming issues into NEW vs EXISTING by external_id.
   *      - NEW → INSERT with team defaults (severity=medium, category=swe).
   *      - EXISTING → UPDATE title / description / external_url AND
   *        `status` (GitHub is source-of-truth for open vs closed). Leaves
   *        severity / owner / category alone so triage survives.
   *
   * The "GitHub owns status, team owns triage" split is deliberate: a
   * GH close should flip the row to `resolved` automatically, but
   * "Sam owns this" and "this is critical" are app-side judgements
   * sync shouldn't clobber. Note this means an in-app status edit on
   * a GH-synced row gets overwritten on the next sync — by design.
   *
   * Token is optional for public repos (60 req/hr/IP, fine for demos).
   * A token also unlocks the createGithubIssue mirror flow, so we
   * stash it in localStorage on success.
   *
   * @param {{repo: string, token?: string}} args
   * @returns {Promise<{added: number, updated: number, total: number}>}
   */
  async function syncGithubIssues({ repo, token }) {
    const cleanRepo = (repo || '').trim();
    if (!cleanRepo) throw new Error('Repository is required.');

    const issues = await fetchGitHubIssues(cleanRepo, token);

    const { data: existing, error: exErr } = await sb()
      .from('blockers')
      .select('id, external_id, status')
      .eq('team_id', team.id)
      .eq('external_source', 'github');
    if (exErr) throw exErr;

    const existingById = new Map((existing || []).map(r => [r.external_id, r]));

    const inserts = [];
    const updates = [];
    for (const issue of issues) {
      const hit = existingById.get(issue.externalId);
      const ghStatus = issue.status === 'resolved' ? 'resolved' : 'open';
      if (hit) {
        // GitHub owns open vs closed. If the team had set the row to
        // 'in-progress' and upstream is still 'open', leave it as
        // 'in-progress' — that's a triage state GitHub doesn't have a
        // concept of. Only flip when upstream and app actually disagree
        // on the open/closed bit.
        const nextStatus =
          ghStatus === 'resolved' ? 'resolved'
          : hit.status === 'resolved' ? 'open'
          : hit.status;
        updates.push({
          id: hit.id,
          title: issue.title,
          description: issue.description,
          external_url: issue.externalUrl,
          status: nextStatus,
        });
      } else {
        inserts.push({
          team_id: team.id,
          title: issue.title,
          description: issue.description,
          severity: 'medium',
          status: ghStatus,
          category: 'swe',
          created_by: team.currentUserId,
          external_source: 'github',
          external_id: issue.externalId,
          external_url: issue.externalUrl,
        });
      }
    }

    if (inserts.length) {
      const { error } = await sb().from('blockers').insert(inserts);
      if (error) throw error;
    }
    for (const u of updates) {
      const { id, ...patch } = u;
      const { error } = await sb().from('blockers').update(patch).eq('id', id);
      if (error) throw error;
    }

    // Remember the repo on the team and the token on this device.
    await setTeamGithubRepo(cleanRepo);
    if (token) writeGithubToken(token);

    return { added: inserts.length, updated: updates.length, total: issues.length };
  }

  window.db = {
    loadAll,
    saveMood,
    saveStandupCompose,
    addActivity,
    createBlocker,
    updateBlocker,
    addBlockerComment,
    setSlotAvailability,
    syncGithubIssues,
    setTeamGithubRepo,
    readGithubToken,
    writeGithubToken,
  };
})();
