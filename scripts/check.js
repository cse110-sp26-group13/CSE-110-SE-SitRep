#!/usr/bin/env node
/**
 * Vanilla project checks — no external dependencies.
 *
 * Runs in CI (and locally via `node scripts/check.js`). Bails non-zero
 * if anything fails.
 *
 * Checks:
 *   1. JS syntax — every .js file in js/, data.js, tests/, scripts/
 *      must parse cleanly (uses Node's built-in --check / vm parse).
 *   2. HTML asset references — every <script src> and <link href>
 *      pointing to a local path resolves to a file on disk. Catches
 *      typos in script tags before they 404 in the browser.
 *   3. CSS custom properties — any var(--x) referenced in css/*.css
 *      must be defined in some :root block under css/. Catches typos
 *      like var(--accentt).
 *
 * This isn't a stand-in for a real linter, but it catches the
 * most common dashboard regressions without adding any dependencies.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const failures = [];

// ---------- utilities ---------------------------------------------

/** @returns {string[]} relative file paths */
function walk(dir, exts, ignore = []) {
  const out = [];
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return out;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (ignore.some((p) => rel.startsWith(p))) continue;
    if (entry.isDirectory()) {
      out.push(...walk(rel, exts, ignore));
    } else if (exts.some((e) => entry.name.endsWith(e))) {
      out.push(rel);
    }
  }
  return out;
}

function fail(rule, file, msg) {
  failures.push({ rule, file, msg });
}

// ---------- 1. JS syntax ------------------------------------------

const jsFiles = [
  ...walk('js', ['.js']),
  ...walk('tests', ['.js']),
  ...walk('scripts', ['.js']),
];
if (fs.existsSync(path.join(ROOT, 'data.js'))) jsFiles.push('data.js');

process.stdout.write(`[1/3] JS syntax (${jsFiles.length} files)... `);
for (const rel of jsFiles) {
  try {
    execSync(`node --check ${JSON.stringify(rel)}`, {
      cwd: ROOT,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
  } catch (e) {
    fail('js-syntax', rel, (e.stderr || e.message || '').toString().trim());
  }
}
console.log(failures.filter((f) => f.rule === 'js-syntax').length === 0 ? 'ok' : 'FAIL');

// ---------- 2. HTML asset references ------------------------------

const htmlFiles = [
  ...walk('.', ['.html'], ['node_modules', '.git', '.agents', 'dist', 'build']),
];

process.stdout.write(`[2/3] HTML asset references (${htmlFiles.length} files)... `);
const SCRIPT_RE = /<script\s+[^>]*src=["']([^"']+)["']/gi;
const LINK_RE = /<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["']|<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi;

for (const rel of htmlFiles) {
  const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const refs = [];
  let m;
  while ((m = SCRIPT_RE.exec(html))) refs.push(m[1]);
  while ((m = LINK_RE.exec(html))) refs.push(m[1] || m[2]);

  for (const ref of refs) {
    // Skip absolute URLs (CDN) and protocol-relative
    if (/^(https?:)?\/\//i.test(ref)) continue;
    // Resolve against the HTML file's directory
    const resolved = path.join(ROOT, path.dirname(rel), ref);
    if (!fs.existsSync(resolved)) {
      fail('html-asset', rel, `${ref} → not found at ${path.relative(ROOT, resolved)}`);
    }
  }
}
console.log(failures.filter((f) => f.rule === 'html-asset').length === 0 ? 'ok' : 'FAIL');

// ---------- 3. CSS custom-property usage --------------------------

const cssFiles = walk('css', ['.css']);

process.stdout.write(`[3/3] CSS custom-property usage (${cssFiles.length} files)... `);
const defined = new Set();
const DEF_RE = /(--[a-zA-Z0-9_-]+)\s*:/g;
const USE_RE = /var\(\s*(--[a-zA-Z0-9_-]+)/g;

for (const rel of cssFiles) {
  const css = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  let m;
  while ((m = DEF_RE.exec(css))) defined.add(m[1]);
}
for (const rel of cssFiles) {
  const css = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  let m;
  while ((m = USE_RE.exec(css))) {
    if (!defined.has(m[1])) {
      fail('css-undef-var', rel, `var(${m[1]}) is not defined in any css/*.css :root block`);
    }
  }
}
console.log(failures.filter((f) => f.rule === 'css-undef-var').length === 0 ? 'ok' : 'FAIL');

// ---------- report -----------------------------------------------

if (failures.length === 0) {
  console.log('\nPASS — all checks green');
  process.exit(0);
}

console.error(`\nFAIL — ${failures.length} problem(s):\n`);
for (const f of failures) {
  console.error(`  [${f.rule}] ${f.file}\n      ${f.msg}`);
}
process.exit(1);
