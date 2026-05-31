// Short-circuit auth + DB loading during e2e tests so pages render
// without a real Supabase session or team data.
//
// - js/auth-guard.js is replaced with an empty body so the redirect
//   to splash.html never fires.
// - js/db.js is replaced with a minimal stub that defines the same
//   globals (team / teammates / blockers / meetingSlots / activity)
//   as in-memory values and a tiny window.db API. Pages render and
//   update without crashing, redirecting, or hitting Supabase.
//
// Underscore prefix keeps Playwright's default test-file glob from
// picking this up as a spec.

const DB_STUB = `
  window.team = { id: 'team-test', name: 'Test Team', joinCode: 'TEST', currentUserId: 'u1' };
  const STANDUP_KEY = 'sitrep_e2e_standup';
  const BASE_TEAMMATE = { id: 'u1', name: 'Test User', role: 'Engineer', moodHistory: [] };
  function readStandup() {
    try {
      return JSON.parse(localStorage.getItem(STANDUP_KEY)) || {};
    } catch {
      return {};
    }
  }
  function writeStandup(patch) {
    localStorage.setItem(STANDUP_KEY, JSON.stringify({ ...readStandup(), ...patch }));
  }
  function hydrateTeammates() {
    const standup = readStandup();
    const hasCheckIn = Boolean(standup.yesterday || standup.today || standup.blockers);
    window.teammates = [{
      ...BASE_TEAMMATE,
      mood: standup.mood ?? null,
      moodHistory: [null, null, null, null, null, null, standup.mood ?? null],
      lastCheckIn: hasCheckIn ? {
        time: standup.time || 'Now',
        yesterday: standup.yesterday || '',
        today: standup.today || '',
        blockers: standup.blockers || '',
      } : null,
    }];
  }
  hydrateTeammates();
  window.blockers = [];
  window.meetingSlots = [];
  window.activity = [];
  let blockerId = 0;
  window.db = {
    loadAll:            async () => { hydrateTeammates(); },
    saveMood:           async (score) => {
      writeStandup({ mood: score });
      hydrateTeammates();
    },
    saveStandupCompose: async ({ yesterday, today, blockersNote }) => {
      writeStandup({
        yesterday: yesterday || '',
        today: today || '',
        blockers: blockersNote || '',
        time: 'Now',
      });
      hydrateTeammates();
    },
    addActivity:        async (type, text) => {
      window.activity.unshift({ type, text, who: 'Test User', time: 'Now' });
    },
    createBlocker:      async ({ title, description, severity, ownerId, startDate, dueDate, category }) => {
      const owner = window.teammates.find(t => t.id === ownerId);
      window.blockers.unshift({
        id: 'b-test-' + (++blockerId),
        title,
        description,
        severity,
        status: 'open',
        owner: owner?.name || 'Test User',
        postedAt: 'Now',
        startDate,
        dueDate,
        category,
        comments: [],
      });
    },
    updateBlocker:      async (id, patch) => {
      window.blockers = window.blockers.map(b => b.id === id ? { ...b, ...patch } : b);
    },
    addBlockerComment:  async (id, text) => {
      window.blockers = window.blockers.map(b =>
        b.id === id
          ? { ...b, comments: [...(b.comments || []), { who: 'Test User', text, time: 'Now' }] }
          : b
      );
    },
    setSlotAvailability:async () => {},
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
