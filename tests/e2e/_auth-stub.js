// Short-circuit auth + DB loading during e2e tests so pages render
// without a real Supabase session.
//
// - js/auth-guard.js is replaced with an empty body so the redirect
//   to splash.html never fires.
// - js/db.js is replaced with a stub that owns a tiny in-memory team
//   (one user) and persists mutations into localStorage so reloads
//   carry state forward — matching what the real Supabase layer
//   would do.
//
// Underscore prefix keeps Playwright's default test-file glob from
// picking this up as a spec.

const DB_STUB = `
  const STUB_KEY = 'sitrep-e2e-stub';
  function _read() {
    try { return JSON.parse(localStorage.getItem(STUB_KEY)) || {}; }
    catch { return {}; }
  }
  function _write(s) {
    try { localStorage.setItem(STUB_KEY, JSON.stringify(s)); } catch {}
  }

  window.team = {
    id: 'test-team',
    name: 'Test Team',
    joinCode: 'TEST-0001',
    currentUserId: 'test-user',
  };
  window.meetingSlots = [];

  function _hydrate() {
    const s = _read();
    window.teammates = [
      {
        id: 'test-user',
        name: 'Test User',
        role: 'Lead',
        mood: s.mood ?? null,
        moodHistory: Array.from({ length: 14 }, () => null),
        lastCheckIn: s.lastCheckIn ?? null,
        coverNeeded: false,
        coverNote: '',
      },
      {
        id: 'other-user',
        name: 'Other Teammate',
        role: 'Developer',
        mood: null,
        moodHistory: Array.from({ length: 14 }, () => null),
        lastCheckIn: null,
        coverNeeded: false,
        coverNote: '',
      }
    ];
    window.blockers = s.blockers || [];
    window.activity = s.activity || [];
    window.calendarEvents = s.calendarEvents || [];
    window.calendarGroups = s.calendarGroups || [];
  }
  _hydrate();

  window.db = {
    loadAll: async () => { _hydrate(); },
    saveMood: async (score) => {
      const s = _read();
      s.mood = score;
      _write(s);
    },
    saveStandupCompose: async ({ yesterday, today, blockersNote }) => {
      const s = _read();
      s.lastCheckIn = {
        time: 'just now',
        yesterday: yesterday || '',
        today: today || '',
        blockers: blockersNote || '',
      };
      _write(s);
    },
    addActivity: async () => {},
    createBlocker: async (b) => {
      const s = _read();
      s.blockers = s.blockers || [];
      s.blockers.push({
        id: 'b-' + s.blockers.length + '-' + (b.title || '').slice(0, 8),
        title: b.title,
        description: b.description || '',
        severity: b.severity || 'high',
        status: 'open',
        owner: 'Test User',
        ownerId: b.ownerId || 'test-user',
        startDate: b.startDate || null,
        dueDate: b.dueDate || null,
        category: b.category || null,
        comments: [],
        postedAt: 'just now',
      });
      _write(s);
    },
    updateBlocker: async (id, patch) => {
      const s = _read();
      const i = (s.blockers || []).findIndex(b => b.id === id);
      if (i >= 0) { Object.assign(s.blockers[i], patch); _write(s); }
    },
    addBlockerComment: async () => {},
    setSlotAvailability: async () => {},

    // Calendar Stubs
    createCalendarEvent: async (ev) => {
      const s = _read();
      s.calendarEvents = s.calendarEvents || [];
      s.calendarEvents.push({
        id: 'ev-' + Math.random().toString(36).slice(2, 9),
        ownerId: 'test-user',
        ...ev
      });
      _write(s);
    },
    updateCalendarEvent: async (id, patch) => {
      const s = _read();
      const i = (s.calendarEvents || []).findIndex(e => e.id === id);
      if (i >= 0) { Object.assign(s.calendarEvents[i], patch); _write(s); }
    },
    deleteCalendarEvent: async (id) => {
      const s = _read();
      s.calendarEvents = (s.calendarEvents || []).filter(e => e.id !== id);
      _write(s);
    },
    createCalendarGroup: async (g) => {
      const s = _read();
      s.calendarGroups = s.calendarGroups || [];
      s.calendarGroups.push({
        id: 'grp-' + Math.random().toString(36).slice(2, 9),
        creatorId: 'test-user',
        ...g
      });
      _write(s);
    },
    updateCalendarGroup: async (id, patch) => {
      const s = _read();
      const i = (s.calendarGroups || []).findIndex(g => g.id === id);
      if (i >= 0) { Object.assign(s.calendarGroups[i], patch); _write(s); }
    },
    deleteCalendarGroup: async (id) => {
      const s = _read();
      s.calendarGroups = (s.calendarGroups || []).filter(g => g.id !== id);
      _write(s);
    },
    leaveCalendarGroup: async (id) => {
      const s = _read();
      const i = (s.calendarGroups || []).findIndex(g => g.id === id);
      if (i >= 0) {
        s.calendarGroups[i].members = (s.calendarGroups[i].members || []).filter(uid => uid !== 'test-user');
        _write(s);
      }
    }
  };
`;

export async function bypassAuth(page) {
  await page.route('**/js/auth-guard.js', (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }),
  );
  await page.route('**/js/db.js', (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: DB_STUB }),
  );
}
