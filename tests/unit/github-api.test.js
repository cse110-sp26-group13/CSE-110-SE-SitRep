/**
 * Unit tests for js/features/github-api.js — fetchGitHubIssues().
 *
 * Real network is mocked via vi.stubGlobal('fetch', ...).
 * The function under test is inlined here (same pattern as the other
 * unit tests) so we don't need a bundler or ESM dance.
 */

import { vi, afterEach } from 'vitest';

async function fetchGitHubIssues(repoPath, token) {
  const url = `https://api.github.com/repos/${repoPath}/issues?state=all`;
  const headers = { Accept: 'application/vnd.github.v3+json' };
  if (token && token.trim() !== '') {
    headers.Authorization = `token ${token}`;
  }
  const response = await fetch(url, { headers });
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Repository not found or private (try adding a token).');
    }
    throw new Error(`GitHub API Error: ${response.statusText}`);
  }
  const data = await response.json();
  return data.map((issue) => ({
    id: `gh-${issue.id}`,
    title: issue.title,
    description: issue.body || 'No description provided on GitHub.',
    severity: 'medium',
    status: issue.state === 'open' ? 'open' : 'resolved',
    owner: issue.assignee ? issue.assignee.login : issue.user.login,
    postedAt: 'GitHub Sync',
    startDate: issue.created_at.split('T')[0],
    dueDate: '',
    category: 'swe',
    comments: [],
    isExternal: true,
  }));
}

// -- helpers --

function mockResponse({ ok = true, status = 200, statusText = 'OK', json = [] } = {}) {
  return {
    ok,
    status,
    statusText,
    json: async () => json,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// -- tests --

describe('fetchGitHubIssues — error paths', () => {
  test('throws "Repository not found" message on 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      mockResponse({ ok: false, status: 404, statusText: 'Not Found' }),
    ));
    await expect(fetchGitHubIssues('ghost/repo')).rejects.toThrow(
      /Repository not found/i,
    );
  });

  test('throws with status text on other non-ok responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      mockResponse({ ok: false, status: 500, statusText: 'Server Error' }),
    ));
    await expect(fetchGitHubIssues('any/repo')).rejects.toThrow(
      /Server Error/,
    );
  });

  test('throws with status text on 403 (rate limit)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      mockResponse({ ok: false, status: 403, statusText: 'rate limit exceeded' }),
    ));
    await expect(fetchGitHubIssues('any/repo')).rejects.toThrow(
      /rate limit/i,
    );
  });
});

describe('fetchGitHubIssues — request headers', () => {
  test('omits Authorization header when no token is provided', async () => {
    const fakeFetch = vi.fn().mockResolvedValue(mockResponse({ json: [] }));
    vi.stubGlobal('fetch', fakeFetch);

    await fetchGitHubIssues('owner/repo');

    const [, opts] = fakeFetch.mock.calls[0];
    expect(opts.headers.Authorization).toBeUndefined();
    expect(opts.headers.Accept).toBe('application/vnd.github.v3+json');
  });

  test('omits Authorization header when token is empty string', async () => {
    const fakeFetch = vi.fn().mockResolvedValue(mockResponse({ json: [] }));
    vi.stubGlobal('fetch', fakeFetch);

    await fetchGitHubIssues('owner/repo', '');

    const [, opts] = fakeFetch.mock.calls[0];
    expect(opts.headers.Authorization).toBeUndefined();
  });

  test('sends "token <pat>" Authorization header when token is provided', async () => {
    const fakeFetch = vi.fn().mockResolvedValue(mockResponse({ json: [] }));
    vi.stubGlobal('fetch', fakeFetch);

    await fetchGitHubIssues('owner/repo', 'ghp_testtoken');

    const [, opts] = fakeFetch.mock.calls[0];
    expect(opts.headers.Authorization).toBe('token ghp_testtoken');
  });

  test('targets the /issues?state=all endpoint for the given repo', async () => {
    const fakeFetch = vi.fn().mockResolvedValue(mockResponse({ json: [] }));
    vi.stubGlobal('fetch', fakeFetch);

    await fetchGitHubIssues('cse110-sp26-group13/CSE-110-SE-SitRep');

    const [url] = fakeFetch.mock.calls[0];
    expect(url).toBe(
      'https://api.github.com/repos/cse110-sp26-group13/CSE-110-SE-SitRep/issues?state=all',
    );
  });
});

describe('fetchGitHubIssues — response mapping', () => {
  const sampleIssues = [
    {
      id: 101,
      title: 'Open issue with assignee',
      body: 'Hello world',
      state: 'open',
      assignee: { login: 'alice' },
      user: { login: 'bob' },
      created_at: '2026-05-01T12:34:56Z',
    },
    {
      id: 202,
      title: 'Closed issue, no assignee, no body',
      body: null,
      state: 'closed',
      assignee: null,
      user: { login: 'carol' },
      created_at: '2026-04-15T08:00:00Z',
    },
  ];

  test('maps state "open" to status "open"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse({ json: sampleIssues })));
    const out = await fetchGitHubIssues('owner/repo');
    expect(out[0].status).toBe('open');
  });

  test('maps state "closed" to status "resolved"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse({ json: sampleIssues })));
    const out = await fetchGitHubIssues('owner/repo');
    expect(out[1].status).toBe('resolved');
  });

  test('flags every row with isExternal: true', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse({ json: sampleIssues })));
    const out = await fetchGitHubIssues('owner/repo');
    expect(out.every((row) => row.isExternal === true)).toBe(true);
  });

  test('prefixes ids with "gh-" + GitHub id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse({ json: sampleIssues })));
    const out = await fetchGitHubIssues('owner/repo');
    expect(out[0].id).toBe('gh-101');
    expect(out[1].id).toBe('gh-202');
  });

  test('uses assignee.login as owner when assignee is set', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse({ json: sampleIssues })));
    const out = await fetchGitHubIssues('owner/repo');
    expect(out[0].owner).toBe('alice');
  });

  test('falls back to user.login as owner when assignee is null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse({ json: sampleIssues })));
    const out = await fetchGitHubIssues('owner/repo');
    expect(out[1].owner).toBe('carol');
  });

  test('falls back to a placeholder description when body is null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse({ json: sampleIssues })));
    const out = await fetchGitHubIssues('owner/repo');
    expect(out[1].description).toBe('No description provided on GitHub.');
  });

  test('uses the date portion of created_at as startDate', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse({ json: sampleIssues })));
    const out = await fetchGitHubIssues('owner/repo');
    expect(out[0].startDate).toBe('2026-05-01');
    expect(out[1].startDate).toBe('2026-04-15');
  });

  test('returns an empty array when GitHub returns no issues', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse({ json: [] })));
    const out = await fetchGitHubIssues('owner/repo');
    expect(out).toEqual([]);
  });
});
