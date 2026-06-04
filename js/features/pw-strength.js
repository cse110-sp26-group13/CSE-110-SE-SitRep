/**
 * Password strength meter — shared by splash (sign-up) and settings (change password).
 *
 * Markup contract (wrap, fill, text are looked up by id):
 *   <div id="${prefix}-strength" class="pw-strength" aria-live="polite">
 *     <div class="pw-strength-bar">
 *       <div id="${prefix}-strength-fill" class="pw-strength-fill" data-level="0"></div>
 *     </div>
 *     <div class="pw-strength-label">
 *       <span>Password strength</span>
 *       <span id="${prefix}-strength-text"></span>
 *     </div>
 *     <ul class="pw-strength-reqs">
 *       <li data-req="length">…</li>
 *       <li data-req="letter">…</li>
 *       <li data-req="number">…</li>
 *       <li data-req="strong">…</li>
 *     </ul>
 *   </div>
 *
 * `update(prefix, password)` returns `{ score, requiredMet }`. The "strong"
 * requirement is a bonus for the bar — only length/letter/number gate submit.
 */
(function () {
  'use strict';

  const PASSWORD_REQS = [
    { key: 'length', test: (p) => p.length >= 8 },
    { key: 'letter', test: (p) => /[a-zA-Z]/.test(p) },
    { key: 'number', test: (p) => /\d/.test(p) },
    { key: 'strong', test: (p) =>
      (/[a-z]/.test(p) && /[A-Z]/.test(p)) || /[^a-zA-Z0-9]/.test(p) },
  ];
  const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const REQUIRED_KEYS = ['length', 'letter', 'number'];

  /**
   * Score `password` against the four checks, paint the bar / label /
   * requirement list keyed by `prefix`, and return the result.
   *
   * `requiredMet` reflects only length/letter/number — "strong" is a
   * bonus point for the bar score but never gates submit, so users
   * aren't forced into special characters.
   *
   * Reused from both splash signup (prefix "signup") and settings
   * password-change (prefix "pw-new"); each page renders its own
   * matching markup.
   *
   * @param {string} prefix - id prefix for the three DOM nodes.
   * @param {string} password
   * @returns {{score: number, requiredMet: boolean}}
   *   `score` is 0–4; `requiredMet` is true once the gating reqs pass.
   */
  function update(prefix, password) {
    const wrap = document.getElementById(`${prefix}-strength`);
    const fill = document.getElementById(`${prefix}-strength-fill`);
    const text = document.getElementById(`${prefix}-strength-text`);
    if (!wrap || !fill || !text) return { score: 0, requiredMet: false };

    if (!password) {
      wrap.classList.remove('is-active');
      fill.dataset.level = '0';
      text.textContent = '';
      wrap.querySelectorAll('[data-req]').forEach((li) => li.classList.remove('met'));
      return { score: 0, requiredMet: false };
    }
    wrap.classList.add('is-active');

    const met = {};
    let score = 0;
    for (const req of PASSWORD_REQS) {
      const ok = req.test(password);
      met[req.key] = ok;
      if (ok) score += 1;
    }
    fill.dataset.level = String(score);
    text.textContent = STRENGTH_LABELS[score] || '';
    wrap.querySelectorAll('[data-req]').forEach((li) => {
      li.classList.toggle('met', !!met[li.dataset.req]);
    });
    return { score, requiredMet: REQUIRED_KEYS.every((k) => met[k]) };
  }

  window.PwStrength = { update };
})();
