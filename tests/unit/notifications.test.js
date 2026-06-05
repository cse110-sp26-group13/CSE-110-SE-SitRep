import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import vm from 'vm'

const NOTIFICATIONS_CODE = readFileSync('./js/features/notifications.js', 'utf8')

function storageStub(initial = {}) {
  const store = { ...initial }
  return {
    getItem: (key) => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: (key) => { delete store[key] },
    dump: () => ({ ...store }),
  }
}

function fixedDateClass(iso) {
  const RealDate = Date
  return class FixedDate extends RealDate {
    constructor(...args) {
      super(...(args.length ? args : [iso]))
    }
    static now() {
      return new RealDate(iso).getTime()
    }
  }
}

function makeCtx({
  storage = {},
  team = { id: 'team-a', currentUserId: 'u1' },
  teammates = [{ id: 'u1', name: 'Alex Kim', lastCheckIn: null }],
  blockers = [],
  activity = [],
} = {}) {
  const localStorage = storageStub(storage)
  const ctx = vm.createContext({
    window: { team },
    team,
    localStorage,
    Date: fixedDateClass('2026-06-04T16:00:00Z'),
    Set,
    JSON,
    String,
    Object,
    Array,
    encodeURIComponent,
    escapeHTML: (value) => String(value ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c])),
    effectiveTeammates: () => teammates,
    effectiveBlockers: () => blockers,
    effectiveActivity: () => activity,
    document: {
      getElementById: () => null,
      querySelectorAll: () => [],
    },
  })
  vm.runInContext(NOTIFICATIONS_CODE, ctx)
  return { ctx, localStorage }
}

const assignedCritical = {
  id: 'b-critical',
  title: 'Deploy credentials are blocked',
  severity: 'critical',
  status: 'open',
  ownerId: 'u1',
}

const assignedMedium = {
  id: 'b-medium',
  title: 'Design copy is missing',
  severity: 'medium',
  status: 'open',
  ownerId: 'u1',
}

describe('notificationPrefEnabled()', () => {
  it('defaults notification preferences on', () => {
    const { ctx } = makeCtx()
    expect(ctx.notificationPrefEnabled('standup')).toBe(true)
    expect(ctx.notificationPrefEnabled('mentions')).toBe(true)
    expect(ctx.notificationPrefEnabled('digest')).toBe(true)
  })

  it('treats an explicit localStorage 0 as disabled', () => {
    const { ctx } = makeCtx({ storage: { 'sitrep-notify-standup': '0' } })
    expect(ctx.notificationPrefEnabled('standup')).toBe(false)
  })
})

describe('standupNotifications()', () => {
  it('creates a same-day reminder when the current user has not checked in', () => {
    const { ctx } = makeCtx()
    expect(ctx.standupNotifications()).toEqual([
      expect.objectContaining({
        id: 'standup:2026-06-04:u1',
        level: 'warn',
        href: 'standup.html',
      }),
    ])
  })

  it('does not remind after the current user has checked in', () => {
    const { ctx } = makeCtx({
      teammates: [{ id: 'u1', name: 'Alex Kim', lastCheckIn: { time: '9:00 AM' } }],
    })
    expect(ctx.standupNotifications()).toEqual([])
  })
})

describe('assignedBlockerNotifications()', () => {
  it('only includes unresolved blockers assigned to the current user', () => {
    const { ctx } = makeCtx({
      blockers: [
        assignedCritical,
        { ...assignedMedium, status: 'resolved' },
        { id: 'other', title: 'Other owner', severity: 'high', status: 'open', ownerId: 'u2' },
      ],
    })
    const result = ctx.assignedBlockerNotifications()
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(expect.objectContaining({
      id: 'issue:b-critical:open:critical',
      level: 'alert',
      href: 'issues.html#b-critical',
    }))
  })

  it('sorts assigned blockers by severity before rendering', () => {
    const { ctx } = makeCtx({ blockers: [assignedMedium, assignedCritical] })
    const result = ctx.assignedBlockerNotifications()
    expect(result.map(n => n.id)).toEqual([
      'issue:b-critical:open:critical',
      'issue:b-medium:open:medium',
    ])
  })

  it('honors the issue mention preference', () => {
    const { ctx } = makeCtx({
      storage: { 'sitrep-notify-mentions': '0' },
      blockers: [assignedCritical],
    })
    expect(ctx.assignedBlockerNotifications()).toEqual([])
  })
})

describe('digestNotifications()', () => {
  it('summarizes check-ins, open issues, and activity', () => {
    const { ctx } = makeCtx({
      teammates: [
        { id: 'u1', name: 'Alex Kim', lastCheckIn: { time: '9:00 AM' } },
        { id: 'u2', name: 'Sam Lee', lastCheckIn: null },
      ],
      blockers: [assignedCritical],
      activity: [{ type: 'checkin' }, { type: 'cover' }],
    })
    const digest = ctx.digestNotifications()[0]
    expect(digest.id).toBe('digest:2026-06-04:1:1:2')
    expect(digest.level).toBe('alert')
    expect(digest.body).toBe('1/2 checked in, 1 open issues, 2 recent updates.')
    expect(digest.meta).toBe('1 critical')
  })

  it('falls back to a good digest when the team is unblocked', () => {
    const { ctx } = makeCtx({
      teammates: [{ id: 'u1', name: 'Alex Kim', lastCheckIn: { time: '9:00 AM' } }],
      blockers: [],
    })
    expect(ctx.digestNotifications()[0].level).toBe('good')
  })
})

describe('buildNotifications()', () => {
  it('combines notification sources and sorts alert before warn before good', () => {
    const { ctx } = makeCtx({
      teammates: [{ id: 'u1', name: 'Alex Kim', lastCheckIn: null }],
      blockers: [assignedCritical],
    })
    expect(ctx.buildNotifications().map(n => n.level)).toEqual(['alert', 'alert', 'warn'])
  })
})

describe('read state', () => {
  it('scopes read ids by active team', () => {
    const { ctx, localStorage } = makeCtx()
    ctx.saveNotificationIds(['a', 'b'])

    expect(JSON.parse(localStorage.dump()['sitrep-notifications-read-v1'])).toEqual({
      'team-a': ['a', 'b'],
    })
    expect([...ctx.readNotificationIds()]).toEqual(['a', 'b'])

    ctx.team.id = 'team-b'
    ctx.window.team.id = 'team-b'
    expect([...ctx.readNotificationIds()]).toEqual([])
  })

  it('markAllNotificationsRead stores every current notification id', () => {
    const { ctx, localStorage } = makeCtx({ blockers: [assignedCritical] })
    ctx.markAllNotificationsRead()

    const stored = JSON.parse(localStorage.dump()['sitrep-notifications-read-v1'])
    expect(stored['team-a']).toEqual([
      'issue:b-critical:open:critical',
      'digest:2026-06-04:0:1:0',
      'standup:2026-06-04:u1',
    ])
  })
})
