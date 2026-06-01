/**
 * Circle switcher — top-of-rail button + popover for picking the
 * active circle (team) the rest of the UI scopes to.
 *
 * Mounts into `[data-circle-switcher]` placed inside the rail.
 * Reads memberships + team names from Supabase, persists the
 * selected team id in localStorage under `sitrep-active-team`,
 * and broadcasts changes via the `sitrep:active-team` event.
 *
 * Other modules can read the active team via window.activeCircle.get().
 */
(function () {
  'use strict';

  const KEY = 'sitrep-active-team';
  const MARK_KEY = 'sitrep-active-team-mark';
  const EVENT = 'sitrep:active-team';

  const state = {
    mount: null,
    circles: [],
    activeId: null,
    open: false,
  };

  /**
   * Read the persisted active-team id from localStorage.
   * Returns null in private mode (storage throws).
   *
   * @returns {string|null}
   */
  function readStoredId() {
    try { return localStorage.getItem(KEY) || null; } catch (_e) { return null; }
  }

  /**
   * Persist (or clear) the active-team id. No-op when localStorage
   * is unavailable.
   *
   * @param {string|null} id
   */
  function writeStoredId(id) {
    try {
      if (id) localStorage.setItem(KEY, id);
      else localStorage.removeItem(KEY);
    } catch (_e) { /* private mode */ }
  }

  function readStoredMark() {
    try { return localStorage.getItem(MARK_KEY) || null; } catch (_e) { return null; }
  }

  function writeStoredMark(mark) {
    try {
      if (mark) localStorage.setItem(MARK_KEY, mark);
      else localStorage.removeItem(MARK_KEY);
    } catch (_e) { /* private mode */ }
  }

  /** @returns {object|null} the currently-active circle row, or null. */
  function activeCircle() {
    return state.circles.find((c) => c.id === state.activeId) || null;
  }

  /**
   * 1–2 letter initials for the circle name (used in the rail mark).
   *
   * @param {string} name
   * @returns {string}
   */
  function initials(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) return '?';
    const parts = trimmed.split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]).join('').toUpperCase();
  }

  /**
   * Pull every circle the signed-in user belongs to, with role info.
   * Scoped to `auth.uid()` explicitly because RLS allows reading
   * memberships for *any* team you belong to (including teammates'
   * rows) — without the filter, teammates show up as extra circles.
   *
   * @returns {Promise<Array<{id: string, name: string, joinCode: string, role: string}>>}
   */
  async function fetchCircles() {
    if (!window.sbClient) return [];
    // RLS lets you read every membership for any team you belong to —
    // not just your own. So scope explicitly to the signed-in user,
    // otherwise teammates show up as extra rows with their roles.
    const { data: sess } = await window.sbClient.auth.getSession();
    const uid = sess && sess.session && sess.session.user && sess.session.user.id;
    if (!uid) return [];
    const { data, error } = await window.sbClient
      .from('memberships')
      .select('role, team_id, teams ( id, name, join_code )')
      .eq('user_id', uid)
      .order('joined_at', { ascending: true });
    if (error || !Array.isArray(data)) return [];
    return data
      .filter((row) => row.teams)
      .map((row) => ({
        id: row.teams.id,
        name: row.teams.name,
        joinCode: row.teams.join_code,
        role: row.role,
      }));
  }

  /** Paint the rail mark and the popover list from `state.circles`. */
  function render() {
    const btn = state.mount.querySelector('.circle-switcher-btn');
    const pop = state.mount.querySelector('.circle-pop');
    if (!btn || !pop) return;

    const active = activeCircle();
    const mark = active ? initials(active.name) : '+';
    btn.querySelector('.circle-switcher-mark').textContent = mark;
    btn.title = active ? `Active circle: ${active.name}` : 'No active circle';
    btn.setAttribute('aria-label', btn.title);
    writeStoredMark(active ? mark : null);

    if (!state.circles.length) {
      pop.innerHTML = `
        <div class="circle-pop-empty">No circles yet.</div>
        <a class="circle-pop-manage" href="settings.html#circles">Join or create →</a>
      `;
      return;
    }

    const items = state.circles.map((c) => `
      <button type="button" class="circle-pop-item ${c.id === state.activeId ? 'active' : ''}"
              data-team-id="${c.id}">
        <span class="circle-pop-mark">${initials(c.name)}</span>
        <span class="circle-pop-text">
          <span class="circle-pop-name">${escapeHtml(c.name)}</span>
          <span class="circle-pop-role">${escapeHtml(c.role || 'member')}</span>
        </span>
        ${c.id === state.activeId ? '<span class="circle-pop-check" aria-hidden="true">✓</span>' : ''}
      </button>
    `).join('');

    pop.innerHTML = `
      <div class="circle-pop-head">Switch circle</div>
      <div class="circle-pop-list">${items}</div>
      <a class="circle-pop-manage" href="settings.html#circles">Manage circles →</a>
    `;

    pop.querySelectorAll('.circle-pop-item').forEach((el) => {
      el.addEventListener('click', () => setActive(el.dataset.teamId));
    });
  }

  /**
   * Local HTML escaper. Duplicated from utils.js because this module
   * loads on splash.html where utils.js isn't included.
   *
   * @param {unknown} s
   * @returns {string}
   */
  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Toggle the popover open/closed. Updates the aria-expanded attribute
   * on the trigger button so assistive tech reflects the state.
   *
   * @param {boolean} open
   */
  function setOpen(open) {
    state.open = open;
    state.mount.classList.toggle('open', open);
    const btn = state.mount.querySelector('.circle-switcher-btn');
    if (btn) btn.setAttribute('aria-expanded', String(open));
  }

  /**
   * Switch to a different circle, persist the choice, and reload the
   * page so every feature module re-hydrates from the new team. Skips
   * if the id is already active or empty.
   *
   * @param {string} id - team id from `state.circles`.
   */
  function setActive(id) {
    if (!id || id === state.activeId) { setOpen(false); return; }
    state.activeId = id;
    writeStoredId(id);
    render();
    setOpen(false);
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { id } }));
    // Reload so feature modules pick up the new active circle.
    window.location.reload();
  }

  /** Close the popover on outside click or Escape. Bound once. */
  function bindOutsideClose() {
    document.addEventListener('click', (e) => {
      if (!state.open) return;
      if (!state.mount.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.open) setOpen(false);
    });
  }

  /**
   * One-time setup on DOMContentLoaded. Mounts the rail button +
   * popover into `[data-circle-switcher]`, fetches the user's circles,
   * picks the active one (stored id when valid, else first), renders,
   * and fires `sitrep:active-team` so listeners (header subline, etc.)
   * can paint with the right name.
   */
  async function init() {
    const mount = document.querySelector('[data-circle-switcher]');
    if (!mount) return;
    state.mount = mount;

    // Paint the last-known initials immediately so cross-page navigation
    // doesn't flash `…` while we wait for Supabase. Falls back to `…`
    // on the very first sign-in when nothing is cached yet.
    const cachedMark = readStoredMark();
    mount.innerHTML = `
      <button type="button" class="rail-icon circle-switcher-btn"
              aria-haspopup="menu" aria-expanded="false" title="Switch circle">
        <span class="circle-switcher-mark">${escapeHtml(cachedMark || '…')}</span>
      </button>
      <div class="circle-pop" role="menu"></div>
    `;

    mount.querySelector('.circle-switcher-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      setOpen(!state.open);
    });
    bindOutsideClose();

    state.circles = await fetchCircles();
    const stored = readStoredId();
    const hasStored = stored && state.circles.some((c) => c.id === stored);
    state.activeId = hasStored ? stored : (state.circles[0] && state.circles[0].id) || null;
    if (state.activeId && state.activeId !== stored) writeStoredId(state.activeId);
    render();
    window.dispatchEvent(new CustomEvent(EVENT, {
      detail: { id: state.activeId, hydrated: true },
    }));
  }

  window.activeCircle = {
    get: () => activeCircle(),
  };

  document.addEventListener('DOMContentLoaded', init);
})();
