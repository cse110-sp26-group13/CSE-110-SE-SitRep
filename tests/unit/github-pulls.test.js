import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import vm from 'vm'

const GITHUB_PULLS_CODE = readFileSync('./js/features/github/github-pulls.js', 'utf8')

function makeCtx(pulls = []) {
  const ctx = vm.createContext({
    ghFetch: async () => ({
      json: async () => pulls,
    }),
  })
  vm.runInContext(GITHUB_PULLS_CODE, ctx)
  return ctx
}

describe('mapGitHubPullRequest()', () => {
  it('maps GitHub PR data into the local view model', () => {
    const ctx = makeCtx()
    const result = ctx.mapGitHubPullRequest({
      id: 123,
      number: 7,
      title: 'Add pull request list',
      state: 'open',
      user: { login: 'octocat' },
      head: { ref: 'feature/pr-list' },
      base: { ref: 'main' },
      created_at: '2026-05-01T10:00:00Z',
      updated_at: '2026-05-02T10:00:00Z',
      draft: true,
      html_url: 'https://github.com/demo/repo/pull/7',
      mergeable: true,
      mergeable_state: 'clean',
    })

    expect(result).toEqual({
      id: 'gh-pr-123',
      ghNumber: 7,
      title: 'Add pull request list',
      status: 'open',
      author: 'octocat',
      headRef: 'feature/pr-list',
      baseRef: 'main',
      createdAt: '2026-05-01T10:00:00Z',
      updatedAt: '2026-05-02T10:00:00Z',
      draft: true,
      htmlUrl: 'https://github.com/demo/repo/pull/7',
      mergeable: true,
      mergeableState: 'clean',
      isExternal: true,
    })
  })

  it('marks closed PRs with merged_at as merged', () => {
    const ctx = makeCtx()
    const result = ctx.mapGitHubPullRequest({
      id: 456,
      number: 8,
      title: 'Merged work',
      state: 'closed',
      merged_at: '2026-05-03T10:00:00Z',
    })

    expect(result.status).toBe('merged')
  })
})

describe('fetchGitHubPullRequests()', () => {
  it('fetches all PR states for the configured repo path', async () => {
    const calls = []
    const ctx = vm.createContext({
      ghFetch: async (path, options) => {
        calls.push({ path, options })
        return {
          json: async () => [{
            id: 123,
            number: 7,
            title: 'Add pull request list',
            state: 'open',
          }],
        }
      },
    })
    vm.runInContext(GITHUB_PULLS_CODE, ctx)

    const result = await ctx.fetchGitHubPullRequests('demo/repo', 'token-123')

    expect(calls).toEqual([{
      path: '/repos/demo/repo/pulls?state=all',
      options: { token: 'token-123' },
    }])
    expect(result[0].id).toBe('gh-pr-123')
  })
})
