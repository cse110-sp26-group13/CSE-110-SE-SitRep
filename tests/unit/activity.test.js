import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import vm from 'vm'

const ACTIVITY_CODE = readFileSync('./js/features/activity.js', 'utf8')

function makeElement() {
  return { textContent: '', innerHTML: '' }
}

function makeCtx(activity = []) {
  const nodes = {
    'activity-sub': makeElement(),
    'activity-list': makeElement(),
  }
  const ctx = vm.createContext({
    document: {
      getElementById: (id) => nodes[id],
    },
    effectiveActivity: () => activity,
    escapeHTML: (value) => String(value ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c])),
  })
  vm.runInContext(ACTIVITY_CODE, ctx)
  return { ctx, nodes }
}

describe('renderActivity()', () => {
  it('renders an empty state when there are no activity events', () => {
    const { ctx, nodes } = makeCtx([])

    ctx.renderActivity()

    expect(nodes['activity-sub'].textContent).toBe('0 events')
    expect(nodes['activity-list'].innerHTML).toContain('No activity yet.')
  })

  it('shows the total event count while rendering only the ten newest rows', () => {
    const activity = Array.from({ length: 12 }, (_unused, i) => ({
      type: 'checkin',
      who: `User ${i}`,
      text: `event ${i}`,
      time: `${i}:00`,
    }))
    const { ctx, nodes } = makeCtx(activity)

    ctx.renderActivity()

    expect(nodes['activity-sub'].textContent).toBe('12 events')
    expect((nodes['activity-list'].innerHTML.match(/activity-row/g) || [])).toHaveLength(10)
    expect(nodes['activity-list'].innerHTML).toContain('event 9')
    expect(nodes['activity-list'].innerHTML).not.toContain('event 10')
  })

  it('escapes user-controlled activity text before writing HTML', () => {
    const { ctx, nodes } = makeCtx([{
      type: 'blocker',
      who: '<Alex>',
      text: 'posted <script>alert(1)</script>',
      time: '"now"',
    }])

    ctx.renderActivity()

    expect(nodes['activity-list'].innerHTML).toContain('&lt;Alex&gt;')
    expect(nodes['activity-list'].innerHTML).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(nodes['activity-list'].innerHTML).toContain('&quot;now&quot;')
    expect(nodes['activity-list'].innerHTML).not.toContain('<script>')
  })

  it('falls back to a middle-dot glyph for unknown activity types', () => {
    const { ctx, nodes } = makeCtx([{
      type: 'mystery',
      who: 'Sam',
      text: 'did something',
      time: 'later',
    }])

    ctx.renderActivity()

    expect(nodes['activity-list'].innerHTML).toContain('activity-icon mystery')
    expect(nodes['activity-list'].innerHTML).toContain('·')
  })
})
