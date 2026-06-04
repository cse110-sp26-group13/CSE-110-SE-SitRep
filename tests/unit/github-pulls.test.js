import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import vm from 'vm'

const GITHUB_PULLS_CODE = readFileSync('./js/features/github/github-pulls.js', 'utf8')

function makeCtx(pulls = []) {
  const ctx = vm.createContext({
    // Tests provide already-paginated data so PR mapping stays focused.
    ghFetchAllPages: async () => pulls,
  })
  vm.runInContext(GITHUB_PULLS_CODE, ctx)
  return ctx
}

describe('mapGitHubPullRequest()', () => {
  it('maps GitHub PR data into the local view model', () => {
    const ctx = makeCtx()
    // Full-ish API sample verifies the fields used by PR list rendering.
    const result = ctx.mapGitHubPullRequest({
      id: 123,
      number: 7,
      title: 'Add pull request list',
      body: 'PR body',
      state: 'open',
      user: { login: 'octocat' },
      head: { ref: 'feature/pr-list' },
      base: { ref: 'main' },
      created_at: '2026-05-01T10:00:00Z',
      updated_at: '2026-05-02T10:00:00Z',
      closed_at: null,
      merged_at: null,
      draft: true,
      html_url: 'https://github.com/demo/repo/pull/7',
      mergeable: true,
      mergeable_state: 'clean',
    })

    expect(result).toEqual({
      id: 'gh-pr-123',
      ghNumber: 7,
      title: 'Add pull request list',
      body: 'PR body',
      status: 'open',
      author: 'octocat',
      headRef: 'feature/pr-list',
      baseRef: 'main',
      createdAt: '2026-05-01T10:00:00Z',
      updatedAt: '2026-05-02T10:00:00Z',
      closedAt: '',
      mergedAt: '',
      draft: true,
      htmlUrl: 'https://github.com/demo/repo/pull/7',
      mergeable: true,
      mergeableState: 'clean',
      isExternal: true,
    })
  })

  it('marks closed PRs with merged_at as merged', () => {
    const ctx = makeCtx()
    // GitHub reports merged PRs as closed, so merged_at is the important signal.
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

describe('createGitHubPullRequest()', () => {
  it('posts a new PR payload to the configured repo', async () => {
    const calls = []
    const ctx = vm.createContext({
      ghFetch: async (path, options) => {
        calls.push({ path, options })
        return {
          json: async () => ({
            id: 321,
            number: 13,
            title: 'Open the PR',
            body: 'Ready for review',
            state: 'open',
          }),
        }
      },
    })
    vm.runInContext(GITHUB_PULLS_CODE, ctx)

    const result = await ctx.createGitHubPullRequest('demo/repo', {
      title: 'Open the PR',
      body: 'Ready for review',
      head: 'feature/pr-actions',
      base: 'main',
      draft: true,
    }, 'token-123')

    expect(calls).toHaveLength(1)
    expect(calls[0].path).toBe('/repos/demo/repo/pulls')
    expect(calls[0].options.method).toBe('POST')
    expect(calls[0].options.token).toBe('token-123')
    expect(JSON.parse(calls[0].options.body)).toEqual({
      title: 'Open the PR',
      body: 'Ready for review',
      head: 'feature/pr-actions',
      base: 'main',
      draft: true,
    })
    expect(result.id).toBe('gh-pr-321')
  })

  it('validates required create fields before calling GitHub', async () => {
    const calls = []
    const ctx = vm.createContext({
      ghFetch: async () => {
        calls.push('called')
      },
    })
    vm.runInContext(GITHUB_PULLS_CODE, ctx)

    await expect(ctx.createGitHubPullRequest('demo/repo', {
      title: 'Missing head',
      head: '',
      base: 'main',
    })).rejects.toThrow('Head branch is required.')
    expect(calls).toHaveLength(0)
  })
})

describe('updateGitHubPullRequest()', () => {
  it('patches supported editable fields only', async () => {
    const calls = []
    const ctx = vm.createContext({
      ghFetch: async (path, options) => {
        calls.push({ path, options })
        return {
          json: async () => ({
            id: 321,
            number: 13,
            title: 'Updated title',
            body: 'Updated body',
            base: { ref: 'develop' },
            state: 'open',
          }),
        }
      },
    })
    vm.runInContext(GITHUB_PULLS_CODE, ctx)

    await ctx.updateGitHubPullRequest('demo/repo', 13, {
      title: 'Updated title',
      body: 'Updated body',
      base: 'develop',
    }, 'token-123')

    expect(calls[0].path).toBe('/repos/demo/repo/pulls/13')
    expect(calls[0].options.method).toBe('PATCH')
    expect(JSON.parse(calls[0].options.body)).toEqual({
      title: 'Updated title',
      body: 'Updated body',
      base: 'develop',
    })
  })
})

describe('closeGitHubPullRequest()', () => {
  it('closes an open PR through the pulls patch endpoint', async () => {
    const calls = []
    const ctx = vm.createContext({
      ghFetch: async (path, options) => {
        calls.push({ path, options })
        return {
          json: async () => ({
            id: 321,
            number: 13,
            title: 'Close me',
            state: 'closed',
          }),
        }
      },
    })
    vm.runInContext(GITHUB_PULLS_CODE, ctx)

    const result = await ctx.closeGitHubPullRequest('demo/repo', 13, 'token-123')

    expect(calls[0].path).toBe('/repos/demo/repo/pulls/13')
    expect(calls[0].options.method).toBe('PATCH')
    expect(calls[0].options.token).toBe('token-123')
    expect(JSON.parse(calls[0].options.body)).toEqual({ state: 'closed' })
    expect(result.status).toBe('closed')
  })
})

describe('mergeGitHubPullRequest()', () => {
  it('uses the explicit merge endpoint and returns GitHub merge data', async () => {
    const calls = []
    const ctx = vm.createContext({
      ghFetch: async (path, options) => {
        calls.push({ path, options })
        return {
          json: async () => ({ merged: true, message: 'Pull Request successfully merged' }),
        }
      },
    })
    vm.runInContext(GITHUB_PULLS_CODE, ctx)

    const result = await ctx.mergeGitHubPullRequest('demo/repo', 13, 'token-123')

    expect(calls[0].path).toBe('/repos/demo/repo/pulls/13/merge')
    expect(calls[0].options.method).toBe('PUT')
    expect(calls[0].options.token).toBe('token-123')
    expect(JSON.parse(calls[0].options.body)).toEqual({})
    expect(result.merged).toBe(true)
  })
})

describe('fetchGitHubPullRequests()', () => {
  it('fetches all PR states for the configured repo path', async () => {
    const calls = []
    const ctx = vm.createContext({
      // Verifies PR sync uses the shared paginated GitHub fetch path.
      ghFetchAllPages: async (path, options) => {
        calls.push({ path, options })
        return [{
          id: 123,
          number: 7,
          title: 'Add pull request list',
          state: 'open',
        }]
      },
    })
    vm.runInContext(GITHUB_PULLS_CODE, ctx)

    const result = await ctx.fetchGitHubPullRequests('demo/repo', 'token-123')

    // The fetch function should delegate pagination and only handle PR mapping.
    expect(calls).toEqual([{
      path: '/repos/demo/repo/pulls?state=all',
      options: { token: 'token-123' },
    }])
    expect(result[0].id).toBe('gh-pr-123')
  })
})
