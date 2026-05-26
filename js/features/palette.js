/**
 * palette.js — ⌘K command palette.
 *
 * Lazy-injects an overlay into <body> on first open. Indexes:
 *   • Jump-to commands (g o / g s / g i / g c chords)
 *   • Issues from effectiveBlockers()
 *   • Open PRs from github-embeds.js cache (best-effort, async)
 *   • Action verbs (post standup, new issue, sync GitHub)
 *
 * Keyboard: ⌘K / Ctrl-K toggles; ↑↓ move; Enter opens; Esc closes.
 * Chord: `g` then o/s/i/c jumps between pages (when no input is focused).
 *
 * Page orchestrators call initPalette() once on load.
 */

let _palEl = null;
let _palInput = null;
let _palList = null;
let _palOpen = false;
let _palActive = 0;
let _palItems = [];
let _palFiltered = [];
let _palInited = false;

const _PAGE_ROUTES = {
  o: 'index.html',
  s: 'standup.html',
  i: 'issues.html',
  c: 'calendar.html',
};

function initPalette() {
  if (_palInited) return;
  _palInited = true;
  document.addEventListener('keydown', _palGlobalKeydown);
  const trigger = document.getElementById('cmd-trigger');
  if (trigger) trigger.addEventListener('click', openPalette);
}

function _palIsInputFocused() {
  const el = document.activeElement;
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

function _palGlobalKeydown(e) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    _palOpen ? closePalette() : openPalette();
    return;
  }
  if (_palOpen) {
    if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); _palMove(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); _palMove(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); _palActivate(); }
    return;
  }
  // `g` chord → next key picks the page (Linear-style)
  if (e.key === 'g' && !_palIsInputFocused()) {
    const onNext = (ev) => {
      document.removeEventListener('keydown', onNext, true);
      const dest = _PAGE_ROUTES[ev.key.toLowerCase()];
      if (dest) { ev.preventDefault(); window.location.href = dest; }
    };
    document.addEventListener('keydown', onNext, true);
    setTimeout(() => document.removeEventListener('keydown', onNext, true), 1500);
  }
}

function openPalette() {
  if (!_palEl) _palBuild();
  _palEl.classList.add('open');
  _palOpen = true;
  _palActive = 0;
  _palBuildItems();
  _palRender();
  setTimeout(() => _palInput && _palInput.focus(), 40);
}

function closePalette() {
  if (!_palEl) return;
  _palEl.classList.remove('open');
  _palOpen = false;
  _palInput.value = '';
  _palActive = 0;
}

function _palBuild() {
  _palEl = document.createElement('div');
  _palEl.className = 'palette-backdrop';
  _palEl.innerHTML = `
    <div class="palette" role="dialog" aria-label="Command palette">
      <div class="palette-input-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.5" y2="16.5"/></svg>
        <input class="palette-input" id="palette-input" type="text" autocomplete="off"
               placeholder="Search issues, PRs, people, or run a command…" />
      </div>
      <div class="palette-list" id="palette-list"></div>
      <div class="palette-foot">
        <span><kbd>↑↓</kbd>Navigate</span>
        <span><kbd>↵</kbd>Open</span>
        <span><kbd>esc</kbd>Close</span>
      </div>
    </div>`;
  document.body.appendChild(_palEl);
  _palInput = _palEl.querySelector('#palette-input');
  _palList = _palEl.querySelector('#palette-list');

  _palEl.addEventListener('click', (e) => { if (e.target === _palEl) closePalette(); });
  _palInput.addEventListener('input', () => { _palActive = 0; _palRender(); });
  _palList.addEventListener('click', (e) => {
    const item = e.target.closest('.palette-item');
    if (!item) return;
    _palActive = Number(item.dataset.idx);
    _palActivate();
  });
}

function _palBuildItems() {
  _palItems = [
    { group: 'Jump to', id: 'G O', title: 'Go to Overview', href: 'index.html', kbd: 'G O' },
    { group: 'Jump to', id: 'G S', title: 'Go to Standup', href: 'standup.html', kbd: 'G S' },
    { group: 'Jump to', id: 'G I', title: 'Go to Issues', href: 'issues.html', kbd: 'G I' },
    { group: 'Jump to', id: 'G C', title: 'Go to Calendar', href: 'calendar.html', kbd: 'G C' },
  ];

  if (typeof effectiveBlockers === 'function') {
    try {
      effectiveBlockers().slice(0, 30).forEach((b) => {
        _palItems.push({
          group: 'Issues',
          kind: 'issue',
          id: b.id.length > 12 ? b.id.slice(0, 12) : b.id,
          title: b.title,
          sev: b.severity,
          href: `issues.html#${b.id}`,
        });
      });
    } catch (_) { /* state not ready — skip */ }
  }

  _palItems.push(
    { group: 'Actions', id: '▶', title: "Post today's standup", href: 'standup.html', kbd: 'N S' },
    { group: 'Actions', id: '▶', title: 'Create new issue…', href: 'issues.html', kbd: 'N I' },
    { group: 'Actions', id: '▶', title: 'Sync from GitHub', href: 'issues.html' },
  );

  // PRs arrive async; re-render when they land (only if still open).
  if (typeof fetchOpenPRs === 'function') {
    fetchOpenPRs().then((prs) => {
      if (!_palOpen || !prs) return;
      const insertAt = _palItems.findIndex((it) => it.group === 'Actions');
      const prItems = prs.slice(0, 20).map((pr) => ({
        group: 'Pull requests',
        kind: 'pr',
        id: `#${pr.number}`,
        title: `${pr.title} · @${(pr.user && pr.user.login) || '?'}`,
        href: pr.html_url,
        external: true,
      }));
      _palItems.splice(insertAt < 0 ? _palItems.length : insertAt, 0, ...prItems);
      _palRender();
    });
  }
}

function _palRender() {
  const q = _palInput.value.trim().toLowerCase();
  _palFiltered = q
    ? _palItems.filter((it) => `${it.title} ${it.id}`.toLowerCase().includes(q))
    : _palItems;

  const esc = (typeof escapeHTML === 'function') ? escapeHTML : (s) => s;

  if (!_palFiltered.length) {
    _palList.innerHTML = `<div class="palette-empty">No matches for "${esc(q)}"</div>`;
    return;
  }
  if (_palActive >= _palFiltered.length) _palActive = _palFiltered.length - 1;

  let html = '';
  let lastGroup = '';
  _palFiltered.forEach((it, idx) => {
    if (it.group !== lastGroup) {
      html += `<div class="palette-group-label">${esc(it.group)}</div>`;
      lastGroup = it.group;
    }
    const sev = it.sev ? `<span class="sev-badge ${it.sev}">${esc(it.sev)}</span>` : '';
    const kbd = it.kbd ? `<kbd class="pi-kbd">${esc(it.kbd)}</kbd>` : '';
    html += `
      <div class="palette-item ${idx === _palActive ? 'active' : ''}" data-idx="${idx}">
        <span class="pi-id">${esc(it.id)}</span>
        <span class="pi-title">${esc(it.title)}</span>
        ${sev}${kbd}
      </div>`;
  });
  _palList.innerHTML = html;
}

function _palMove(delta) {
  if (!_palFiltered.length) return;
  _palActive = (_palActive + delta + _palFiltered.length) % _palFiltered.length;
  _palRender();
  const active = _palList.querySelector('.palette-item.active');
  if (active) active.scrollIntoView({ block: 'nearest' });
}

function _palActivate() {
  const it = _palFiltered[_palActive];
  if (!it) return;
  if (it.external) window.open(it.href, '_blank', 'noopener');
  else window.location.href = it.href;
  closePalette();
}

window.initPalette = initPalette;
window.openPalette = openPalette;
window.closePalette = closePalette;
