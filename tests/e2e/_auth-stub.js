// Short-circuit js/auth-guard.js during e2e tests so pages render without a real Supabase session.
// The real auth-guard redirects unauthenticated visitors to splash.html; in tests we replace its
// body with an empty script so the rest of the page loads normally.
//
// Underscore prefix keeps Playwright's default test-file glob from picking this up as a spec.

export async function bypassAuth(page) {
  await page.route('**/js/auth-guard.js', (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }),
  );
}
