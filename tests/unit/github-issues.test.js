import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import vm from 'vm'

const GITHUB_ISSUES_CODE = readFileSync('./js/features/github/github-issues.js', 'utf8')

describe('fetchGitHubIssues()', () => {
  it('filters pull-request-shaped items out of the GitHub issues response', async () => {
    const ctx = vm.createContext({
      ghFetchAllPages: async () => [
        // Normal GitHub issue should be kept.
        {
          id: 1,
          number: 10,
          title: 'Actual issue',
          body: 'Issue body',
          labels: [{ name: 'high' }],
          state: 'open',
          user: { login: 'octocat' },
          created_at: '2026-05-01T10:00:00Z',
        },
        // The issues endpoint also returns PRs; those belong in the PR section instead.
        {
          id: 2,
          number: 11,
          title: 'PR returned by issues endpoint',
          state: 'open',
          pull_request: { url: 'https://api.github.com/repos/demo/repo/pulls/11' },
        },
      ],
    })
    vm.runInContext(GITHUB_ISSUES_CODE, ctx)

    const result = await ctx.fetchGitHubIssues('demo/repo', 'token-123')

    // Only the real issue should survive the PR filter.
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: 'gh-1',
      ghNumber: 10,
      title: 'Actual issue',
      severity: 'high',
      status: 'open',
      owner: 'octocat',
    })
  })

  it('maps every fetched issue page and treats closed issues as resolved', async () => {
    // Closed GitHub issues feed the app's Resolved assignment filter/count.
    const ctx = vm.createContext({
      ghFetchAllPages: async () => [
        {
          id: 1,
          number: 10,
          title: 'Open issue',
          body: '',
          labels: [],
          state: 'open',
          user: { login: 'octocat' },
          created_at: '2026-05-01T10:00:00Z',
        },
        {
          id: 2,
          number: 11,
          title: 'Closed issue',
          body: '',
          labels: [],
          state: 'closed',
          user: { login: 'hubot' },
          created_at: '2026-05-02T10:00:00Z',
        },
      ],
    })
    vm.runInContext(GITHUB_ISSUES_CODE, ctx)

    const result = await ctx.fetchGitHubIssues('demo/repo', 'token-123')

    // Both open and closed issues should be stored so counts and filters are accurate.
    expect(result).toHaveLength(2)
    expect(result.map(issue => issue.status)).toEqual(['open', 'resolved'])
  })
})
