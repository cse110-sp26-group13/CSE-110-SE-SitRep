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

  window.team = { id: null, name: '', joinCode: '', currentUserId: null };
  window.teammates = [];
  window.blockers = [];
  window.meetingSlots = SLOT_DEFS.map(s => ({ ...s, availability: {} }));
  window.slotAvailability = {};
  window.activity = [];

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
      .select('team_id, teams ( id, name, join_code ), joined_at')
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
      id: t.id, name: t.name, joinCode: t.join_code, currentUserId: userId,
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
    window.slotAvailability = availBySlot;

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

  async function saveMood(score) {
    await _writeStandupPatch({ mood: score });
  }

  async function saveStandupCompose({ yesterday, today, blockersNote }) {
    await _writeStandupPatch({
      yesterday: yesterday || null,
      today: today || null,
      blockers_note: blockersNote || null,
    });
  }

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
    return data;
  }

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

  window.db = {
    loadAll,
    saveMood,
    saveStandupCompose,
    addActivity,
    createBlocker,
    updateBlocker,
    addBlockerComment,
    setSlotAvailability,
  };
})();
