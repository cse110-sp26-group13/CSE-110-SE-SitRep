/**
 * github-embeds.js — live GitHub data for UI surfaces.
 *
 * SIBLING to js/features/github-api.js (owned by the GitHub integration
 * subteam). That file does issue-sync into the blockers list and is NOT
 * touched here. This file handles EMBED data — PRs, CI runs, reviews —
 * for: the From-GitHub sidebar counts, inline PR chips in standup notes,
 * and PR/CI events in the activity feed.
 *
 * Public API (intentionally small, so the GH subteam can absorb it later):
 *   parsePRRefs(text)            → [number]      detect #N + PR URLs in text
 *   renderPRChipsFor(text)       → HTMLString    escape text, turn #N into chip placeholders
 *   enrichPRChips()              → Promise       hydrate placeholder chips from the API
 *   renderGHSidebarCounts()      → Promise       fill #nav-count-prs / -ci
 *   renderGHActivity()           → Promise       append recent PR events to #activity-list
 *   initGHEmbeds()               → Promise       run all of the above (called by page orchestrators)
 *
 * Failure mode: unauthenticated GitHub REST is 60 req/hr/IP. On rate-limit
 * or network error every renderer degrades silently — chips stay plain
 * #N links, counts hide. Watch the console for `[github-embeds]` warnings.
 */

const GH_REPO = 'cse110-sp26-group13/CSE-110-SE-SitRep';
const GH_API_BASE = 'https://api.github.com';
const GH_CACHE_TTL_MS = 5 * 60 * 1000;

// In-memory cache: key → { value, expiresAt }. Cleared on full reload.
const _ghCache = new Map();

function _withCache(key, fn) {
  const now = Date.now();
  const hit = _ghCache.get(key);
  if (hit && hit.expiresAt > now) return Promise.resolve(hit.value);
  return fn()
    .then((value) => {
      _ghCache.set(key, { value, expiresAt: now + GH_CACHE_TTL_MS });
      return value;
    })
    .catch((err) => {
      console.warn(`[github-embeds] ${key} failed:`, err.message);
      return null; // failures are not cached
    });
}

async function _ghFetch(path) {
  const res = await fetch(`${GH_API_BASE}${path}`, {
    headers: { Accept: 'application/vnd.github.v3+json' },
  });
  if (res.status === 403 || res.status === 429) {
    console.warn(`[github-embeds] rate-limited (${res.status}) on ${path}`);
    throw new Error('rate-limited');
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── Fetchers ─────────────────────────────────────────────────────────

function fetchOpenPRs(repo = GH_REPO) {
  return _withCache(`prs:${repo}:open`,
    () => _ghFetch(`/repos/${repo}/pulls?state=open&per_page=20`));
}

function fetchPR(repo, num) {
  return _withCache(`pr:${repo}:${num}`,
    () => _ghFetch(`/repos/${repo}/pulls/${num}`));
}

function fetchReviewsDueForMe(repo = GH_REPO, login = '') {
  // Unauthenticated: best-effort by filtering open PRs to ones requesting
  // review from `login`. Returns null if PRs can't be fetched.
  return fetchOpenPRs(repo).then((prs) => {
    if (!prs) return null;
    return prs.filter((pr) =>
      (pr.requested_reviewers || []).some((r) => r.login === login));
  });
}

function fetchCIForBranch(repo = GH_REPO, branch = 'main') {
  return _withCache(`ci:${repo}:${branch}`,
    () => _ghFetch(`/repos/${repo}/actions/runs?branch=${encodeURIComponent(branch)}&per_page=1`));
}

function fetchCIForSha(repo, sha) {
  return _withCache(`ci-sha:${repo}:${sha}`,
    () => _ghFetch(`/repos/${repo}/commits/${sha}/check-runs?per_page=1`)
      .then((d) => {
        const run = d && d.check_runs && d.check_runs[0];
        return run ? (run.conclusion || run.status || null) : null;
      }));
}

// ─── Text parsing ─────────────────────────────────────────────────────

function parsePRRefs(text) {
  if (!text) return [];
  const refs = new Set();
  text.replace(/#(\d+)/g, (_, n) => { refs.add(Number(n)); return ''; });
  const urlRe = new RegExp(`https?://github\\.com/${GH_REPO.replace(/\//g, '\\/')}/(?:pull|issues)/(\\d+)`, 'g');
  text.replace(urlRe, (_, n) => { refs.add(Number(n)); return ''; });
  return Array.from(refs);
}

// Escape `text`, then turn #N refs into placeholder chip anchors. The
// placeholders render as plain links until enrichPRChips() hydrates them.
function renderPRChipsFor(text) {
  if (!text) return '';
  const escaped = (typeof escapeHTML === 'function') ? escapeHTML(text) : String(text);
  return escaped.replace(/#(\d+)/g, (_, n) =>
    `<a class="pr-chip pr-ref" data-pr="${n}" href="https://github.com/${GH_REPO}/pull/${n}" target="_blank" rel="noopener">#${n}</a>`);
}

// ─── DOM renderers ────────────────────────────────────────────────────

const _CI_GLYPH = { pass: '✓', fail: '✗', pending: '◌' };

function _ciClass(conclusion) {
  if (conclusion === 'success' || conclusion === 'completed') return 'pass';
  if (conclusion === 'failure' || conclusion === 'timed_out') return 'fail';
  if (conclusion === 'in_progress' || conclusion === 'queued' || conclusion === 'pending') return 'pending';
  return '';
}

async function enrichPRChips() {
  const anchors = document.querySelectorAll('.pr-ref[data-pr]');
  if (!anchors.length) return;
  const refs = [...new Set([...anchors].map((a) => Number(a.dataset.pr)))];

  for (const num of refs) {
    const pr = await fetchPR(GH_REPO, num);
    if (!pr) continue; // leave as plain #N link

    const stateClass = pr.merged_at ? 'merged'
      : pr.state === 'closed' ? 'closed'
      : pr.draft ? 'draft' : 'open';

    let ciClass = '';
    if (pr.head && pr.head.sha) {
      ciClass = _ciClass(await fetchCIForSha(GH_REPO, pr.head.sha));
    }

    const titleAttr = `${pr.title} · @${(pr.user && pr.user.login) || '?'}`;
    document.querySelectorAll(`.pr-ref[data-pr="${num}"]`).forEach((a) => {
      a.classList.add(stateClass);
      a.title = titleAttr;
      if (ciClass) {
        a.innerHTML = `#${num} <span class="ci ${ciClass}">${_CI_GLYPH[ciClass]}</span>`;
      }
    });
  }
}

function _setCount(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (value == null) { el.hidden = true; return; }
  el.textContent = String(value);
  el.hidden = false;
}

async function renderGHSidebarCounts() {
  const prs = await fetchOpenPRs();
  _setCount('nav-count-prs', prs ? prs.length : null);

  const ci = await fetchCIForBranch();
  const run = ci && ci.workflow_runs && ci.workflow_runs[0];
  const el = document.getElementById('nav-count-ci');
  if (el && run) {
    const cls = _ciClass(run.conclusion || run.status);
    if (cls) {
      el.textContent = _CI_GLYPH[cls];
      el.style.color = cls === 'pass' ? 'var(--green)' : cls === 'fail' ? 'var(--red)' : 'var(--yellow)';
      el.hidden = false;
    }
  }
}

function _timeAgo(date) {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

async function renderGHActivity() {
  const list = document.getElementById('activity-list');
  if (!list) return;
  const prs = await fetchOpenPRs();
  if (!prs || !prs.length) return;

  const recent = prs.slice()
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 3);

  const esc = (typeof escapeHTML === 'function') ? escapeHTML : (s) => s;
  for (const pr of recent) {
    const when = _timeAgo(new Date(pr.updated_at));
    const action = pr.merged_at ? 'merged'
      : pr.created_at === pr.updated_at ? 'opened' : 'updated';
    list.insertAdjacentHTML('beforeend', `
      <li class="activity-row">
        <span class="activity-time">${when}</span>
        <span class="activity-icon gh">PR</span>
        <span class="activity-text"><span class="who">@${esc((pr.user && pr.user.login) || '?')}</span> ${action} <a class="ref" href="${pr.html_url}" target="_blank" rel="noopener">#${pr.number} ${esc(pr.title)}</a></span>
      </li>`);
  }
}

// Run everything; degrade silently. Called by each page orchestrator.
async function initGHEmbeds() {
  await Promise.allSettled([
    renderGHSidebarCounts(),
    enrichPRChips(),
    renderGHActivity(),
  ]);
}

// ─── Exports ──────────────────────────────────────────────────────────
window.parsePRRefs = parsePRRefs;
window.renderPRChipsFor = renderPRChipsFor;
window.enrichPRChips = enrichPRChips;
window.renderGHSidebarCounts = renderGHSidebarCounts;
window.renderGHActivity = renderGHActivity;
window.fetchOpenPRs = fetchOpenPRs;
window.fetchReviewsDueForMe = fetchReviewsDueForMe;
window.fetchCIForBranch = fetchCIForBranch;
window.initGHEmbeds = initGHEmbeds;
