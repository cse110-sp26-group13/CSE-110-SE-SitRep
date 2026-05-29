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
  const EVENT = 'sitrep:active-team';

  const state = {
    mount: null,
    circles: [],
    activeId: null,
    open: false,
  };

  function readStoredId() {
    try { return localStorage.getItem(KEY) || null; } catch (_e) { return null; }
  }

  function writeStoredId(id) {
    try {
      if (id) localStorage.setItem(KEY, id);
      else localStorage.removeItem(KEY);
    } catch (_e) { /* private mode */ }
  }

  function activeCircle() {
    return state.circles.find((c) => c.id === state.activeId) || null;
  }

  function initials(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) return '?';
    const parts = trimmed.split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]).join('').toUpperCase();
  }

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

  function render() {
    const btn = state.mount.querySelector('.circle-switcher-btn');
    const pop = state.mount.querySelector('.circle-pop');
    if (!btn || !pop) return;

    const active = activeCircle();
    btn.querySelector('.circle-switcher-mark').textContent =
      active ? initials(active.name) : '+';
    btn.title = active ? `Active circle: ${active.name}` : 'No active circle';
    btn.setAttribute('aria-label', btn.title);

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

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setOpen(open) {
    state.open = open;
    state.mount.classList.toggle('open', open);
    const btn = state.mount.querySelector('.circle-switcher-btn');
    if (btn) btn.setAttribute('aria-expanded', String(open));
  }

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

  function bindOutsideClose() {
    document.addEventListener('click', (e) => {
      if (!state.open) return;
      if (!state.mount.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.open) setOpen(false);
    });
  }

  async function init() {
    const mount = document.querySelector('[data-circle-switcher]');
    if (!mount) return;
    state.mount = mount;

    mount.innerHTML = `
      <button type="button" class="rail-icon circle-switcher-btn"
              aria-haspopup="menu" aria-expanded="false" title="Switch circle">
        <span class="circle-switcher-mark">…</span>
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
    getId: () => state.activeId,
    list: () => state.circles.slice(),
  };

  document.addEventListener('DOMContentLoaded', init);
})();
