/**
 * Unit tests for the date helpers in js/features/blockers.js:
 *   - formatIssueDate(dateString) — short locale-formatted month/day
 *   - isIssueOverdue(issue)       — true only when past-due AND not resolved
 *
 * These were added alongside Andrew's GitHub Issues tracker (start/due
 * date support on blockers). They're pure functions, so we inline them
 * here the same way the other unit tests do.
 */

function formatIssueDate(dateString) {
  if (!dateString) return '';
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function isIssueOverdue(issue) {
  if (!issue.dueDate || issue.status === 'resolved') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${issue.dueDate}T00:00:00`);
  return due < today;
}

// -- tests --

describe('formatIssueDate', () => {
  test('returns empty string for null', () => {
    expect(formatIssueDate(null)).toBe('');
  });

  test('returns empty string for undefined', () => {
    expect(formatIssueDate(undefined)).toBe('');
  });

  test('returns empty string for empty string', () => {
    expect(formatIssueDate('')).toBe('');
  });

  test('returns a non-empty locale-formatted string for a valid date', () => {
    const result = formatIssueDate('2026-06-01');
    expect(result).not.toBe('');
    expect(typeof result).toBe('string');
  });

  test('output contains the day number', () => {
    // toLocaleDateString output varies by locale, but the day number
    // should always be present somewhere in the string.
    const result = formatIssueDate('2026-06-15');
    expect(result).toMatch(/15/);
  });
});

describe('isIssueOverdue', () => {
  // Helper to produce a YYYY-MM-DD string offset from today.
  function offsetDate(days) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  test('false when issue has no dueDate', () => {
    expect(isIssueOverdue({ status: 'open' })).toBe(false);
    expect(isIssueOverdue({ status: 'open', dueDate: null })).toBe(false);
    expect(isIssueOverdue({ status: 'open', dueDate: '' })).toBe(false);
  });

  test('false when status is "resolved" even if past due', () => {
    expect(isIssueOverdue({
      status: 'resolved',
      dueDate: offsetDate(-10),
    })).toBe(false);
  });

  test('false when due date is today (boundary)', () => {
    expect(isIssueOverdue({
      status: 'open',
      dueDate: offsetDate(0),
    })).toBe(false);
  });

  test('false when due date is in the future', () => {
    expect(isIssueOverdue({
      status: 'open',
      dueDate: offsetDate(7),
    })).toBe(false);
  });

  test('true when due date is in the past and status is open', () => {
    expect(isIssueOverdue({
      status: 'open',
      dueDate: offsetDate(-1),
    })).toBe(true);
  });

  test('true when due date is in the past and status is in-progress', () => {
    expect(isIssueOverdue({
      status: 'in-progress',
      dueDate: offsetDate(-3),
    })).toBe(true);
  });
});
