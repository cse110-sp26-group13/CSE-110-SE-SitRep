import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import vm from 'vm'

const CALENDAR_CODE = readFileSync('./js/features/calendar.js', 'utf8')

function makeCtx(issues = []) {
  const ctx = vm.createContext({
    document: { addEventListener: () => {} },
    effectiveBlockers: () => issues,
  })
  vm.runInContext(CALENDAR_CODE, ctx)
  return ctx
}

describe('calendar issue date mapping', () => {
  it('maps issue start and due dates into a timeline range', () => {
    const ctx = makeCtx()
    const item = ctx.normalizeCalendarIssue({
      id: 'b1',
      title: 'Auth token bug',
      startDate: '2026-05-10',
      dueDate: '2026-05-20',
    })

    expect(item.startKey).toBe('2026-05-10')
    expect(item.dueKey).toBe('2026-05-20')
    expect(item.durationDays).toBe(11)
  })

  it('keeps issues with only one date visible on the calendar', () => {
    const ctx = makeCtx()
    const item = ctx.normalizeCalendarIssue({
      id: 'gh-1',
      title: 'GitHub issue without due date',
      startDate: '2026-05-18',
      dueDate: '',
    })

    expect(item.startKey).toBe('2026-05-18')
    expect(item.dueKey).toBe('2026-05-18')
    expect(item.durationDays).toBe(1)
  })

  it('drops undated issues because there is no calendar placement', () => {
    const ctx = makeCtx()
    expect(ctx.normalizeCalendarIssue({ id: 'b2', title: 'No dates' })).toBeNull()
  })

  it('normalizes accidental inverted date ranges', () => {
    const ctx = makeCtx()
    const item = ctx.normalizeCalendarIssue({
      id: 'b3',
      title: 'Inverted',
      startDate: '2026-06-12',
      dueDate: '2026-06-02',
    })

    expect(item.startKey).toBe('2026-06-02')
    expect(item.dueKey).toBe('2026-06-12')
  })

  it('sorts dated issues by due date, then severity', () => {
    const ctx = makeCtx([
      { id: 'medium-later', title: 'Later', severity: 'medium', startDate: '2026-05-01', dueDate: '2026-05-22' },
      { id: 'high-same-day', title: 'High', severity: 'high', startDate: '2026-05-01', dueDate: '2026-05-20' },
      { id: 'critical-same-day', title: 'Critical', severity: 'critical', startDate: '2026-05-01', dueDate: '2026-05-20' },
      { id: 'undated', title: 'Undated', severity: 'critical' },
    ])

    expect(ctx.calendarIssues().map(item => item.id)).toEqual([
      'critical-same-day',
      'high-same-day',
      'medium-later',
    ])
  })
})
