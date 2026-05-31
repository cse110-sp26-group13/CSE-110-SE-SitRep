/**
 * Shared formatting/escaping helpers used across feature modules.
 * No DOM access here — these stay pure so they're cheap to call
 * inside template-literal HTML strings.
 */

const AVATAR_COLORS = ["#4f8cff", "#34c759", "#ffb020", "#ff453a", "#af52de", "#5ac8fa"];

/**
 * HTML-escape an untrusted string for safe interpolation into innerHTML.
 * Every user-supplied field that lands in a template literal goes through
 * this — the codebase relies on it as the only XSS defense.
 *
 * @param {unknown} s - value to escape; `null`/`undefined` becomes `""`.
 * @returns {string}
 */
function escapeHTML(s) {
  if (s == null) return "";
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

/**
 * Map a 1–10 mood score to one of the CSS mood classes used by the
 * mood-trend and check-in cards.
 *
 * @param {number|null|undefined} score
 * @returns {"mood-good"|"mood-ok"|"mood-bad"|"mood-none"}
 */
function moodClass(score) {
  if (score == null) return "mood-none";
  if (score >= 8) return "mood-good";
  if (score >= 5) return "mood-ok";
  return "mood-bad";
}

/**
 * Render the small colored circle with a teammate's initials. Color is
 * deterministic per teammate (hash of their id's first char) so the
 * same person always gets the same avatar across renders.
 *
 * @param {string} name - full display name; first letters of the first
 *   two words become the initials.
 * @param {string} [id] - stable teammate id; drives color selection.
 * @returns {string} HTML string safe to drop into innerHTML.
 */
function avatar(name, id) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const color = AVATAR_COLORS[(id?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
  return `<div class="avatar" style="background:${color}">${initials}</div>`;
}
