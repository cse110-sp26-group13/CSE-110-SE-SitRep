import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import vm from 'vm'

const STATE_CODE = readFileSync('./js/state.js', 'utf8')

function storageStub(initial = {}) {
  const store = { ...initial }
  return {
    getItem: (key) => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: (key) => { delete store[key] },
    dump: () => ({ ...store }),
  }
}

function makeCtx(storage = {}) {
  const localStorage = storageStub(storage)
  const ctx = vm.createContext({
    localStorage,
    JSON,
  })
  vm.runInContext(STATE_CODE, ctx)
  return { ctx, localStorage }
}

function stateIn(ctx) {
  return vm.runInContext('state', ctx)
}

describe('state defaults', () => {
  it('hydrates the expected client-only state shape when localStorage is empty', () => {
    const { ctx } = makeCtx()

    expect(stateIn(ctx)).toEqual({
      githubIssues: [],
      severityFilter: 'all',
      statusFilter: 'open',
      slotAvailability: {},
      aiSessions: [],
    })
  })

  it('keeps defaults for missing keys while preserving known stored values', () => {
    const { ctx } = makeCtx({
      sitrep_state_v3: JSON.stringify({
        statusFilter: 'resolved',
        githubIssues: [{ id: 'gh-1', title: 'Synced' }],
      }),
    })

    expect(stateIn(ctx)).toEqual(expect.objectContaining({
      statusFilter: 'resolved',
      severityFilter: 'all',
      slotAvailability: {},
      aiSessions: [],
      githubIssues: [{ id: 'gh-1', title: 'Synced' }],
    }))
  })

  it('falls back to defaults when localStorage contains corrupt JSON', () => {
    const { ctx } = makeCtx({ sitrep_state_v3: '{not json' })

    expect(stateIn(ctx).githubIssues).toEqual([])
    expect(stateIn(ctx).severityFilter).toBe('all')
    expect(stateIn(ctx).statusFilter).toBe('open')
  })
})

describe('saveState()', () => {
  it('persists the current state object to the v3 storage key', () => {
    const { ctx, localStorage } = makeCtx()

    vm.runInContext("state.severityFilter = 'critical'; state.statusFilter = 'resolved'; saveState()", ctx)

    expect(JSON.parse(localStorage.dump().sitrep_state_v3)).toEqual(expect.objectContaining({
      severityFilter: 'critical',
      statusFilter: 'resolved',
    }))
  })
})

describe('setGithubIssues()', () => {
  it('replaces GitHub issues and persists immediately', () => {
    const { ctx, localStorage } = makeCtx({
      sitrep_state_v3: JSON.stringify({
        githubIssues: [{ id: 'old' }],
        severityFilter: 'medium',
      }),
    })

    ctx.setGithubIssues([{ id: 'gh-2', title: 'Fresh issue' }])

    expect(stateIn(ctx).githubIssues).toEqual([{ id: 'gh-2', title: 'Fresh issue' }])
    expect(JSON.parse(localStorage.dump().sitrep_state_v3)).toEqual(expect.objectContaining({
      severityFilter: 'medium',
      githubIssues: [{ id: 'gh-2', title: 'Fresh issue' }],
    }))
  })
}
)
