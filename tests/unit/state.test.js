import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import vm from 'vm'

// state.js owns the per-circle GitHub repo storage. Repos are bucketed
// by the active-circle id the circle switcher writes to localStorage
// under `sitrep-active-team`; the accessors read that key fresh on every
// call so switching circles (which reloads the page) swaps the set.
const STATE_CODE = readFileSync('./js/state.js', 'utf8')
const ACTIVE_KEY = 'sitrep-active-team'

/** Minimal localStorage backed by a Map, shared to simulate reloads. */
function makeStore() {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)) },
    removeItem: (k) => { map.delete(k) },
  }
}

/** Run state.js in a fresh context over the given store (default: new). */
function load(localStorage = makeStore()) {
  const ctx = vm.createContext({ localStorage, console })
  vm.runInContext(STATE_CODE, ctx)
  ctx.__store = localStorage
  return ctx
}

const REPO_A = { repoPath: 'team-a/repo', issues: [{ id: 'gh-1' }], pullRequests: [] }
const REPO_B = { repoPath: 'team-b/repo', issues: [{ id: 'gh-2' }], pullRequests: [] }

describe('per-circle GitHub repos', () => {
  it('starts empty for any circle', () => {
    const ctx = load()
    ctx.localStorage.setItem(ACTIVE_KEY, 'team-a')
    expect(ctx.currentGithubRepos()).toHaveLength(0)
    expect(ctx.currentActiveRepoPath()).toBe('')
  })

  it('keeps each circle\'s synced repos separate', () => {
    const ctx = load()

    ctx.localStorage.setItem(ACTIVE_KEY, 'team-a')
    ctx.upsertGithubRepo(REPO_A)
    expect(ctx.currentGithubRepos().map(r => r.repoPath)).toEqual(['team-a/repo'])
    expect(ctx.currentActiveRepoPath()).toBe('team-a/repo')

    // Switch circle — the other circle sees none of A's repos.
    ctx.localStorage.setItem(ACTIVE_KEY, 'team-b')
    expect(ctx.currentGithubRepos()).toHaveLength(0)
    ctx.upsertGithubRepo(REPO_B)
    expect(ctx.currentGithubRepos().map(r => r.repoPath)).toEqual(['team-b/repo'])

    // Switching back restores A's set untouched.
    ctx.localStorage.setItem(ACTIVE_KEY, 'team-a')
    expect(ctx.currentGithubRepos().map(r => r.repoPath)).toEqual(['team-a/repo'])
    expect(ctx.currentActiveRepoPath()).toBe('team-a/repo')
  })

  it('removeGithubRepo only affects the active circle', () => {
    const ctx = load()
    ctx.localStorage.setItem(ACTIVE_KEY, 'team-a')
    ctx.upsertGithubRepo(REPO_A)
    ctx.localStorage.setItem(ACTIVE_KEY, 'team-b')
    ctx.upsertGithubRepo(REPO_B)

    ctx.removeGithubRepo('team-b/repo')
    expect(ctx.currentGithubRepos()).toHaveLength(0)
    expect(ctx.currentActiveRepoPath()).toBe('')

    ctx.localStorage.setItem(ACTIVE_KEY, 'team-a')
    expect(ctx.currentGithubRepos().map(r => r.repoPath)).toEqual(['team-a/repo'])
  })

  it('persists per-circle repos across a reload', () => {
    const store = makeStore()
    const first = load(store)
    first.localStorage.setItem(ACTIVE_KEY, 'team-a')
    first.upsertGithubRepo(REPO_A)

    // Fresh context over the same storage = page reload.
    const second = load(store)
    second.localStorage.setItem(ACTIVE_KEY, 'team-a')
    expect(second.currentGithubRepos().map(r => r.repoPath)).toEqual(['team-a/repo'])
  })
})
