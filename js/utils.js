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
 * Marks a string as already-safe HTML so the `html` tagged template leaves
 * it untouched instead of escaping it. Produced by `html` and `raw`; it
 * stringifies to its inner markup, so it can be assigned to `innerHTML` or
 * nested inside another `html` call.
 */
class SafeHTML {
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}

/**
 * Wrap a trusted HTML string so `html` interpolates it verbatim. Use only
 * for markup you built yourself (e.g. an already-escaped string) — never
 * for raw user input.
 *
 * @param {string} value
 * @returns {SafeHTML}
 */
function raw(value) {
  return new SafeHTML(value);
}

/** Render one interpolated value: pass safe HTML (and arrays of it) through, escape everything else. */
function renderHTMLValue(value) {
  if (value instanceof SafeHTML) return value.value;
  if (Array.isArray(value)) return value.map(renderHTMLValue).join("");
  return escapeHTML(value);
}

/**
 * Tagged template for building HTML safely. Every interpolated value is
 * HTML-escaped by default, so user data can't inject markup; values that
 * are already safe — nested `html` results, `raw(...)`, or arrays of those
 * — pass through, which is what lets templates compose.
 *
 *   html`<li>${user.name}</li>`                 // name is escaped
 *   html`<ul>${items.map(rowTemplate)}</ul>`    // rows are SafeHTML, kept as-is
 *
 * @param {TemplateStringsArray} strings
 * @param {...unknown} values
 * @returns {SafeHTML}
 */
function html(strings, ...values) {
  const out = strings.reduce((acc, chunk, i) =>
    acc + chunk + (i < values.length ? renderHTMLValue(values[i]) : ""), "");
  return new SafeHTML(out);
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

/**
 * 1–2 letter initials for a name (e.g. circle marks). Returns "?" when the
 * name is empty so the UI always has something to render.
 *
 * @param {string} name
 * @returns {string}
 */
function initials(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return "?";
  return trimmed.split(/\s+/).slice(0, 2).map(p => p[0]).join("").toUpperCase();
}
