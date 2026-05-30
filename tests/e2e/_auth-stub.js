// Short-circuit auth + DB loading during e2e tests so pages render
// without a real Supabase session or team data.
//
// - js/auth-guard.js is replaced with an empty body so the redirect
//   to splash.html never fires.
// - js/db.js is replaced with a minimal stub that defines the same
//   globals (team / teammates / blockers / meetingSlots / activity)
//   as empty values and a no-op window.db API. Pages render their
//   empty-state UI instead of crashing or redirecting.
//
// Underscore prefix keeps Playwright's default test-file glob from
// picking this up as a spec.

const DB_STUB = `
  window.team = { id: null, name: '', joinCode: '', currentUserId: null };
  window.teammates = [];
  window.blockers = [];
  window.meetingSlots = [];
  window.activity = [];
  window.db = {
    loadAll:            async () => {},
    saveMood:           async () => {},
    saveStandupCompose: async () => {},
    addActivity:        async () => {},
    createBlocker:      async () => {},
    updateBlocker:      async () => {},
    addBlockerComment:  async () => {},
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
