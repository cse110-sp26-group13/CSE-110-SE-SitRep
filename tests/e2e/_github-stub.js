// Intercept api.github.com during e2e so tests stay fast and deterministic
// (no live network, no rate-limit flakiness). github-embeds.js degrades
// gracefully on empty data, so the UI still renders without GH enrichment.
//
// Underscore prefix keeps Playwright's default test glob from treating this
// as a spec file.

export async function stubGitHub(page) {
  await page.route('**://api.github.com/**', (route) => {
    const url = route.request().url();
    let body = '[]';
    if (/\/pulls\/\d+(\?|$)/.test(url)) body = '{}';
    else if (/\/actions\/runs/.test(url)) body = '{"workflow_runs":[]}';
    else if (/check-runs/.test(url)) body = '{"check_runs":[]}';
    route.fulfill({ status: 200, contentType: 'application/json', body });
  });
}
