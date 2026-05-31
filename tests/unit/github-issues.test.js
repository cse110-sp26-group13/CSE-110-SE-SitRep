import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import vm from 'vm'

const GITHUB_ISSUES_CODE = readFileSync('./js/features/github/github-issues.js', 'utf8')

describe('fetchGitHubIssues()', () => {
  it('filters pull-request-shaped items out of the GitHub issues response', async () => {
    const ctx = vm.createContext({
      ghFetch: async () => ({
        json: async () => [
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
          {
            id: 2,
            number: 11,
            title: 'PR returned by issues endpoint',
            state: 'open',
            pull_request: { url: 'https://api.github.com/repos/demo/repo/pulls/11' },
          },
        ],
      }),
    })
    vm.runInContext(GITHUB_ISSUES_CODE, ctx)

    const result = await ctx.fetchGitHubIssues('demo/repo', 'token-123')

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
})
