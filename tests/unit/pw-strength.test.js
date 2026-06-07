/**
 * Unit tests for js/features/pw-strength.js
 *
 * The real module wraps its scoring logic in an IIFE and attaches
 * `update()` to `window.PwStrength`. The DOM-touching half (paints
 * the bar / fill / text / requirement list) is intentionally left
 * to the E2E layer.
 *
 * What this file covers is the pure scoring logic: PASSWORD_REQS,
 * the score 0–4 ladder, and the `requiredMet` gate (length + letter
 * + number must all pass; "strong" is bonus-only and does not gate).
 *
 * Same inline pattern as utils.test.js / blockers.test.js — keeps
 * the test runnable without a bundler.
 */

const PASSWORD_REQS = [
  { key: 'length', test: (p) => p.length >= 8 },
  { key: 'letter', test: (p) => /[a-zA-Z]/.test(p) },
  { key: 'number', test: (p) => /\d/.test(p) },
  { key: 'strong', test: (p) =>
    (/[a-z]/.test(p) && /[A-Z]/.test(p)) || /[^a-zA-Z0-9]/.test(p) },
];
const REQUIRED_KEYS = ['length', 'letter', 'number'];

function scorePassword(password) {
  if (!password) return { score: 0, requiredMet: false };
  const met = {};
  let score = 0;
  for (const req of PASSWORD_REQS) {
    const ok = req.test(password);
    met[req.key] = ok;
    if (ok) score += 1;
  }
  const requiredMet = REQUIRED_KEYS.every((k) => met[k]);
  return { score, requiredMet };
}

// -- tests --

describe('individual PASSWORD_REQS predicates', () => {
  const byKey = Object.fromEntries(PASSWORD_REQS.map((r) => [r.key, r.test]));

  test('length requires 8+ characters', () => {
    expect(byKey.length('1234567')).toBe(false);
    expect(byKey.length('12345678')).toBe(true);
    expect(byKey.length('a very long password indeed')).toBe(true);
  });

  test('letter accepts upper or lower case', () => {
    expect(byKey.letter('12345678')).toBe(false);
    expect(byKey.letter('abcdefgh')).toBe(true);
    expect(byKey.letter('ABCDEFGH')).toBe(true);
    expect(byKey.letter('A1234567')).toBe(true);
  });

  test('number requires at least one digit', () => {
    expect(byKey.number('abcdefgh')).toBe(false);
    expect(byKey.number('abcdefg1')).toBe(true);
    expect(byKey.number('!@#$%^&*0')).toBe(true);
  });

  test('strong needs mixed case OR a special character', () => {
    expect(byKey.strong('alllower1')).toBe(false);
    expect(byKey.strong('ALLUPPER1')).toBe(false);
    expect(byKey.strong('MixedCase')).toBe(true);
    expect(byKey.strong('alllower!')).toBe(true);
  });
});

describe('scorePassword score ladder', () => {
  test('returns score 0 for empty string', () => {
    expect(scorePassword('').score).toBe(0);
  });

  test('returns score 0 for null/undefined', () => {
    expect(scorePassword(null).score).toBe(0);
    expect(scorePassword(undefined).score).toBe(0);
  });

  test('short letter-only password scores 1 (letter only)', () => {
    // "abc" — only `letter` passes
    expect(scorePassword('abc').score).toBe(1);
  });

  test('long letter-only password scores 2 (length + letter)', () => {
    expect(scorePassword('abcdefgh').score).toBe(2);
  });

  test('length + letter + number scores 3', () => {
    expect(scorePassword('abcdef12').score).toBe(3);
  });

  test('all four requirements scores 4', () => {
    expect(scorePassword('Abcdef12').score).toBe(4);
    expect(scorePassword('abcdef1!').score).toBe(4);
  });
});

describe('scorePassword requiredMet gate', () => {
  test('false for empty', () => {
    expect(scorePassword('').requiredMet).toBe(false);
  });

  test('false when only length passes', () => {
    expect(scorePassword('12345678').requiredMet).toBe(false); // no letter
  });

  test('false when length + letter pass but no number', () => {
    expect(scorePassword('abcdefgh').requiredMet).toBe(false);
  });

  test('false when length + number pass but no letter', () => {
    expect(scorePassword('12345678').requiredMet).toBe(false);
  });

  test('true once length + letter + number all pass', () => {
    expect(scorePassword('abcdef12').requiredMet).toBe(true);
  });

  test('strong is a bonus, not a gate — requiredMet stays true without it', () => {
    // "abcdef12" — passes length/letter/number, fails strong (all lower, no special)
    const result = scorePassword('abcdef12');
    expect(result.requiredMet).toBe(true);
    expect(result.score).toBe(3); // confirms "strong" did NOT pass
  });
});
