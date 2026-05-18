import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import vm from 'vm'

// Load selectors.js once — no modification to source files needed.
// The vm module runs the script in a sandboxed context where we control all globals,
// mimicking what the browser does with <script> tags.
const SELECTORS_CODE = readFileSync('./js/selectors.js', 'utf8')

const BASE_STATE = {
  extraCheckIns: {},
  extraActivity: [],
  coveredFor: [],
  extraBlockers: [],
  blockerOverrides: {},
  severityFilter: 'all',
  statusFilter: 'open',
  slotAvailability: {},
}

const SAMPLE_BLOCKER = {
  id: 'b1',
  title: 'Auth tokens expiring',
  description: 'Tokens expire mid-session',
  severity: 'critical',
  status: 'open',
  ownerId: 'alex',
  owner: 'Alex Kim',
  postedAt: '8:20 AM',
  startDate: '2026-05-10',
  dueDate: '2026-05-20',
  category: 'backend',
  comments: [{ id: 'c1', who: 'Alex Kim', text: 'Reproduced on my account.', time: '9:05 AM' }],
}

/**
 * Creates a fresh vm context with controlled globals and runs selectors.js inside it.
 * Each call produces an isolated environment — no state leaks between tests.
 */
function makeCtx({ state = {}, blockers = [], teammates = [] } = {}) {
  const ctx = vm.createContext({
    state: {
      ...BASE_STATE,
      ...state,
      blockerOverrides: state.blockerOverrides ?? {},
      extraBlockers: state.extraBlockers ?? [],
    },
    blockers,
    teammates,
    activity: [],
  })
  vm.runInContext(SELECTORS_CODE, ctx)
  return ctx
}

// ---------------------------------------------------------------------------
// effectiveBlockers()
// ---------------------------------------------------------------------------

describe('effectiveBlockers()', () => {
  it('returns base blockers when no extra blockers or overrides', () => {
    const ctx = makeCtx({ blockers: [SAMPLE_BLOCKER] })
    const result = ctx.effectiveBlockers()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('b1')
    expect(result[0].title).toBe('Auth tokens expiring')
  })

  it('returns empty array when blockers and extraBlockers are both empty', () => {
    const ctx = makeCtx()
    expect(ctx.effectiveBlockers()).toHaveLength(0)
  })

  it('prepends extraBlockers before base blockers', () => {
    const extra = { ...SAMPLE_BLOCKER, id: 'u1', title: 'Extra issue' }
    const ctx = makeCtx({
      blockers: [SAMPLE_BLOCKER],
      state: { extraBlockers: [extra] },
    })
    const result = ctx.effectiveBlockers()
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('u1')
    expect(result[1].id).toBe('b1')
  })

  it('preserves base values when no overrides exist', () => {
    const ctx = makeCtx({ blockers: [SAMPLE_BLOCKER] })
    const b = ctx.effectiveBlockers()[0]
    expect(b.status).toBe('open')
    expect(b.description).toBe('Tokens expire mid-session')
    expect(b.startDate).toBe('2026-05-10')
    expect(b.dueDate).toBe('2026-05-20')
    expect(b.category).toBe('backend')
    expect(b.comments).toEqual(SAMPLE_BLOCKER.comments)
  })

  it('defaults missing status to "open"', () => {
    const noStatus = { ...SAMPLE_BLOCKER, status: undefined }
    const ctx = makeCtx({ blockers: [noStatus] })
    expect(ctx.effectiveBlockers()[0].status).toBe('open')
  })

  it('defaults missing description to empty string', () => {
    const noDesc = { ...SAMPLE_BLOCKER, description: undefined }
    const ctx = makeCtx({ blockers: [noDesc] })
    expect(ctx.effectiveBlockers()[0].description).toBe('')
  })

  it('applies status override from blockerOverrides', () => {
    const ctx = makeCtx({
      blockers: [SAMPLE_BLOCKER],
      state: { blockerOverrides: { b1: { status: 'resolved' } } },
    })
    expect(ctx.effectiveBlockers()[0].status).toBe('resolved')
  })

  it('applies description override from blockerOverrides', () => {
    const ctx = makeCtx({
      blockers: [SAMPLE_BLOCKER],
      state: { blockerOverrides: { b1: { description: 'Updated description' } } },
    })
    expect(ctx.effectiveBlockers()[0].description).toBe('Updated description')
  })

  it('applies comments override from blockerOverrides', () => {
    const newComments = [{ id: 'c2', who: 'Jordan', text: 'Fixed it', time: '10:00 AM' }]
    const ctx = makeCtx({
      blockers: [SAMPLE_BLOCKER],
      state: { blockerOverrides: { b1: { comments: newComments } } },
    })
    expect(ctx.effectiveBlockers()[0].comments).toEqual(newComments)
  })

  it('applies startDate override from blockerOverrides', () => {
    const ctx = makeCtx({
      blockers: [SAMPLE_BLOCKER],
      state: { blockerOverrides: { b1: { startDate: '2026-06-01' } } },
    })
    expect(ctx.effectiveBlockers()[0].startDate).toBe('2026-06-01')
  })

  it('applies dueDate override from blockerOverrides', () => {
    const ctx = makeCtx({
      blockers: [SAMPLE_BLOCKER],
      state: { blockerOverrides: { b1: { dueDate: '2026-07-01' } } },
    })
    expect(ctx.effectiveBlockers()[0].dueDate).toBe('2026-07-01')
  })

  it('applies category override from blockerOverrides', () => {
    const ctx = makeCtx({
      blockers: [SAMPLE_BLOCKER],
      state: { blockerOverrides: { b1: { category: 'ui' } } },
    })
    expect(ctx.effectiveBlockers()[0].category).toBe('ui')
  })

  it('does not apply overrides intended for a different blocker id', () => {
    const ctx = makeCtx({
      blockers: [SAMPLE_BLOCKER],
      state: { blockerOverrides: { b99: { status: 'resolved' } } },
    })
    expect(ctx.effectiveBlockers()[0].status).toBe('open')
  })
})

// ---------------------------------------------------------------------------
// updateBlocker()
// ---------------------------------------------------------------------------

describe('updateBlocker()', () => {
  it('creates a blockerOverrides entry for the given id', () => {
    const ctx = makeCtx({ blockers: [SAMPLE_BLOCKER] })
    ctx.updateBlocker('b1', { status: 'resolved' })
    expect(ctx.state.blockerOverrides['b1']).toBeDefined()
  })

  it('writes the patch field into blockerOverrides', () => {
    const ctx = makeCtx({ blockers: [SAMPLE_BLOCKER] })
    ctx.updateBlocker('b1', { status: 'resolved' })
    expect(ctx.state.blockerOverrides['b1'].status).toBe('resolved')
  })

  it('initializes description from base blocker on first patch', () => {
    const ctx = makeCtx({ blockers: [SAMPLE_BLOCKER] })
    ctx.updateBlocker('b1', { status: 'in-progress' })
    expect(ctx.state.blockerOverrides['b1'].description).toBe('Tokens expire mid-session')
  })

  it('initializes comments from base blocker on first patch', () => {
    const ctx = makeCtx({ blockers: [SAMPLE_BLOCKER] })
    ctx.updateBlocker('b1', { status: 'in-progress' })
    expect(ctx.state.blockerOverrides['b1'].comments).toEqual(SAMPLE_BLOCKER.comments)
  })

  it('initializes status from base blocker on first patch when patch targets a different field', () => {
    const ctx = makeCtx({ blockers: [SAMPLE_BLOCKER] })
    ctx.updateBlocker('b1', { description: 'New description' })
    expect(ctx.state.blockerOverrides['b1'].status).toBe('open')
  })

  it('overwrites the same field on a subsequent patch', () => {
    const ctx = makeCtx({
      blockers: [SAMPLE_BLOCKER],
      state: { blockerOverrides: { b1: { status: 'in-progress' } } },
    })
    ctx.updateBlocker('b1', { status: 'resolved' })
    expect(ctx.state.blockerOverrides['b1'].status).toBe('resolved')
  })

  // Regression test for Bug 1: existing override fields must survive subsequent patches.
  it('preserves startDate override when patching status (Bug 1 regression)', () => {
    const ctx = makeCtx({
      blockers: [SAMPLE_BLOCKER],
      state: { blockerOverrides: { b1: { startDate: '2026-06-01' } } },
    })
    ctx.updateBlocker('b1', { status: 'resolved' })
    expect(ctx.state.blockerOverrides['b1'].startDate).toBe('2026-06-01')
    expect(ctx.state.blockerOverrides['b1'].status).toBe('resolved')
  })

  it('preserves dueDate override when patching status (Bug 1 regression)', () => {
    const ctx = makeCtx({
      blockers: [SAMPLE_BLOCKER],
      state: { blockerOverrides: { b1: { dueDate: '2026-07-31' } } },
    })
    ctx.updateBlocker('b1', { status: 'in-progress' })
    expect(ctx.state.blockerOverrides['b1'].dueDate).toBe('2026-07-31')
  })

  it('preserves category override when patching comments (Bug 1 regression)', () => {
    const ctx = makeCtx({
      blockers: [SAMPLE_BLOCKER],
      state: { blockerOverrides: { b1: { category: 'ui' } } },
    })
    ctx.updateBlocker('b1', { comments: [] })
    expect(ctx.state.blockerOverrides['b1'].category).toBe('ui')
  })

  it('preserves multiple override fields across two patches (Bug 1 regression)', () => {
    const ctx = makeCtx({ blockers: [SAMPLE_BLOCKER] })
    ctx.updateBlocker('b1', { startDate: '2026-06-01' })
    ctx.updateBlocker('b1', { dueDate: '2026-06-30' })
    ctx.updateBlocker('b1', { status: 'resolved' })
    const ov = ctx.state.blockerOverrides['b1']
    expect(ov.startDate).toBe('2026-06-01')
    expect(ov.dueDate).toBe('2026-06-30')
    expect(ov.status).toBe('resolved')
  })

  it('works for blockers that exist only in extraBlockers (user-created issues)', () => {
    const extra = { ...SAMPLE_BLOCKER, id: 'u1', title: 'User issue' }
    const ctx = makeCtx({ state: { extraBlockers: [extra] } })
    ctx.updateBlocker('u1', { status: 'resolved' })
    expect(ctx.state.blockerOverrides['u1'].status).toBe('resolved')
  })

  it('makes the update visible through effectiveBlockers()', () => {
    const ctx = makeCtx({ blockers: [SAMPLE_BLOCKER] })
    ctx.updateBlocker('b1', { status: 'resolved' })
    expect(ctx.effectiveBlockers()[0].status).toBe('resolved')
  })
})
