import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import vm from 'vm'

// js/selectors.js is now a thin layer over the Supabase-backed globals
// populated by js/db.js. It merges the active GitHub repo's issues with
// the team's DB blockers and exposes the active repo's PRs.
const SELECTORS_CODE = readFileSync('./js/selectors.js', 'utf8')

const SAMPLE_BLOCKER = {
  id: 'b1',
  title: 'Auth tokens expiring',
  severity: 'critical',
  status: 'open',
  owner: 'Alex Kim',
  postedAt: '8:20 AM',
}

const SAMPLE_GH_ISSUE = {
  id: 'gh-42',
  title: 'GH issue from sync',
  severity: 'medium',
  status: 'open',
  owner: 'octocat',
  postedAt: 'GitHub Sync',
  isExternal: true,
}

const SAMPLE_GH_PR = {
  id: 'gh-pr-99',
  title: 'Add PR support',
  status: 'open',
  author: 'octocat',
  isExternal: true,
}

function makeCtx({ state = {}, blockers = [], teammates = [], activity = [] } = {}) {
  const ctx = vm.createContext({
    state: {
      githubIssues: [],
      githubPullRequests: [],
      githubRepos: [],
      activeGithubRepo: '',
      severityFilter: 'all',
      statusFilter: 'open',
      ...state,
    },
    blockers,
    teammates,
    activity,
  })
  vm.runInContext(SELECTORS_CODE, ctx)
  return ctx
}

describe('effectiveTeammates()', () => {
  it('returns the teammates global verbatim', () => {
    const tm = [{ id: 'u1', name: 'Alex' }]
    const ctx = makeCtx({ teammates: tm })
    expect(ctx.effectiveTeammates()).toBe(tm)
  })
})

describe('effectiveBlockers()', () => {
  it('returns DB blockers when no GitHub issues are synced', () => {
    const ctx = makeCtx({ blockers: [SAMPLE_BLOCKER] })
    expect(ctx.effectiveBlockers()).toHaveLength(1)
    expect(ctx.effectiveBlockers()[0].id).toBe('b1')
  })

  it('returns empty array when both sources are empty', () => {
    expect(makeCtx().effectiveBlockers()).toHaveLength(0)
  })

  it('prepends GitHub-synced issues before DB blockers', () => {
    const ctx = makeCtx({
      blockers: [SAMPLE_BLOCKER],
      state: {
        activeGithubRepo: 'owner/repo',
        githubRepos: [{ repoPath: 'owner/repo', issues: [SAMPLE_GH_ISSUE], pullRequests: [] }],
      },
    })
    const result = ctx.effectiveBlockers()
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('gh-42')
    expect(result[1].id).toBe('b1')
  })

  it('tolerates a missing state.githubIssues field', () => {
    const ctx = makeCtx({ blockers: [SAMPLE_BLOCKER], state: { githubIssues: undefined } })
    expect(ctx.effectiveBlockers()).toHaveLength(1)
  })
})

describe('findBlockerById()', () => {
  it('finds a DB blocker by id', () => {
    const ctx = makeCtx({ blockers: [SAMPLE_BLOCKER] })
    expect(ctx.findBlockerById('b1').title).toBe('Auth tokens expiring')
  })

  it('finds a GitHub-synced issue by id', () => {
    const ctx = makeCtx({
      state: {
        activeGithubRepo: 'owner/repo',
        githubRepos: [{ repoPath: 'owner/repo', issues: [SAMPLE_GH_ISSUE], pullRequests: [] }],
      },
    })
    expect(ctx.findBlockerById('gh-42').title).toBe('GH issue from sync')
  })

  it('returns undefined for an unknown id', () => {
    const ctx = makeCtx({ blockers: [SAMPLE_BLOCKER] })
    expect(ctx.findBlockerById('nope')).toBeUndefined()
  })
})

describe('effectivePullRequests()', () => {
  it('returns GitHub-synced pull requests', () => {
    const ctx = makeCtx({
      state: {
        activeGithubRepo: 'owner/repo',
        githubRepos: [{ repoPath: 'owner/repo', issues: [], pullRequests: [SAMPLE_GH_PR] }],
      },
    })
    expect(ctx.effectivePullRequests()).toHaveLength(1)
    expect(ctx.effectivePullRequests()[0].id).toBe('gh-pr-99')
  })

  it('tolerates a missing state.githubPullRequests field', () => {
    const ctx = makeCtx({ state: { githubPullRequests: undefined } })
    expect(ctx.effectivePullRequests()).toHaveLength(0)
  })
})

describe('findPullRequestById()', () => {
  it('finds a GitHub-synced pull request by id', () => {
    const ctx = makeCtx({
      state: {
        activeGithubRepo: 'owner/repo',
        githubRepos: [{ repoPath: 'owner/repo', issues: [], pullRequests: [SAMPLE_GH_PR] }],
      },
    })
    expect(ctx.findPullRequestById('gh-pr-99').title).toBe('Add PR support')
  })

  it('returns undefined for an unknown pull request id', () => {
    const ctx = makeCtx({
      state: {
        activeGithubRepo: 'owner/repo',
        githubRepos: [{ repoPath: 'owner/repo', issues: [], pullRequests: [SAMPLE_GH_PR] }],
      },
    })
    expect(ctx.findPullRequestById('gh-pr-nope')).toBeUndefined()
  })
})

describe('effectiveActivity()', () => {
  it('returns the activity global verbatim', () => {
    const a = [{ time: '9:00 AM', type: 'checkin', who: 'Alex', text: 'standup' }]
    const ctx = makeCtx({ activity: a })
    expect(ctx.effectiveActivity()).toBe(a)
  })
})
