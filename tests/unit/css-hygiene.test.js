/**
 * CSS hygiene tests for the css/ directory.
 *
 * These are static-analysis guards, not behavioural tests — they parse the
 * stylesheets as text and assert the housekeeping rules we cleaned the
 * codebase up to. The point is to keep the cleanup from rotting: if someone
 * reintroduces a dead selector, an empty rule, a hardcoded named colour, or
 * a redundant element-scoped `[hidden]`, this file fails in CI.
 *
 * Scope: only the live css/ directory. The archived wireframes under
 * docs/wireframes/ are intentionally excluded.
 *
 * Reads files straight off disk (vitest runs from the repo root), the same
 * inline pattern selectors.test.js uses.
 */

import { readFileSync, readdirSync } from 'fs'

const CSS_DIR = './css'

// -- file collection ---------------------------------------------------------

const cssFiles = readdirSync(CSS_DIR)
  .filter((f) => f.endsWith('.css'))
  .map((f) => `${CSS_DIR}/${f}`)

/** Recursively collect files under `dir` whose name ends with one of `exts`. */
function walk(dir, exts) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}/${entry.name}`
    if (entry.isDirectory()) {
      out.push(...walk(full, exts))
    } else if (exts.some((e) => entry.name.endsWith(e))) {
      out.push(full)
    }
  }
  return out
}

// Root-level HTML pages (not the archived wireframes under docs/).
const htmlFiles = readdirSync('.')
  .filter((f) => f.endsWith('.html'))
  .map((f) => `./${f}`)

const jsFiles = walk('./js', ['.js'])

/** Combined text of every place a class/id could be referenced. */
const referenceCorpus = [...htmlFiles, ...jsFiles]
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n')

const cssByFile = Object.fromEntries(
  cssFiles.map((f) => [f, readFileSync(f, 'utf8')]),
)

/** Strip /* ... *​/ comments so they don't pollute selector/value scans. */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

// -- tests -------------------------------------------------------------------

test('css/ directory has stylesheets to check', () => {
  expect(cssFiles.length).toBeGreaterThan(0)
})

describe('brace balance', () => {
  for (const file of cssFiles) {
    test(`${file} has matching { and }`, () => {
      const css = cssByFile[file]
      const open = (css.match(/{/g) || []).length
      const close = (css.match(/}/g) || []).length
      expect(open).toBe(close)
    })
  }
})

describe('no empty rules', () => {
  for (const file of cssFiles) {
    test(`${file} has no empty {} rule bodies`, () => {
      const css = stripComments(cssByFile[file])
      // selector(s) followed by an empty body, e.g. `.foo {}` or `.foo {   }`
      const matches = css.match(/[^{};]+\{\s*\}/g) || []
      expect(matches).toEqual([])
    })
  }
})

describe('no bare named colours (use theme vars instead)', () => {
  // Saturated CSS named colours that always have a semantic --var equivalent
  // in base.css (--good/--bad/--warn/...). `transparent`, `inherit`, `none`,
  // `currentColor`, `white`, `black` are allowed.
  const BANNED = [
    'red', 'green', 'blue', 'yellow', 'orange', 'purple',
    'pink', 'cyan', 'magenta', 'lime', 'navy', 'teal', 'maroon',
  ]
  const valueProps = '(?:background|background-color|color|border-color|fill|stroke|outline-color)'
  for (const file of cssFiles) {
    test(`${file} uses no bare named colours`, () => {
      const css = stripComments(cssByFile[file])
      const re = new RegExp(`${valueProps}\\s*:\\s*([a-z]+)\\b`, 'gi')
      const offenders = []
      let m
      while ((m = re.exec(css)) !== null) {
        if (BANNED.includes(m[1].toLowerCase())) offenders.push(m[0].trim())
      }
      expect(offenders).toEqual([])
    })
  }
})

describe('no redundant element-scoped [hidden] rules', () => {
  // base.css declares a global `[hidden] { display: none !important; }`, so any
  // `selector[hidden] { display: none }` is dead weight and can't win anyway.
  for (const file of cssFiles) {
    test(`${file} declares no <selector>[hidden] { display: none } rule`, () => {
      const css = stripComments(cssByFile[file])
      // match a NON-bare [hidden] selector (something before the bracket) whose
      // body only sets display:none
      const re = /([.#][\w-]+)\[hidden\]\s*\{\s*display\s*:\s*none\s*;?\s*\}/gi
      const matches = css.match(re) || []
      expect(matches).toEqual([])
    })
  }

  test('the global [hidden] rule still exists in base.css', () => {
    const css = stripComments(cssByFile['./css/base.css'])
    expect(/\[hidden\]\s*\{\s*display\s*:\s*none\s*!important/.test(css)).toBe(true)
  })
})

describe('no dead class/id selectors', () => {
  // Every class/id defined in a stylesheet must be referenced somewhere in the
  // HTML pages or JS. Three ways a name can legitimately be "used":
  //   1. it appears verbatim as a whole token (static markup / classList);
  //   2. it is template-composed — a hyphen-prefix of the name appears right
  //      before `${`, e.g. `bar-${group}` covers .bar-global/.bar-risk, and
  //      `sev-${severity}` covers .sev-critical (see blockers.js / calendar.js);
  //   3. it is a value-derived modifier applied from a JS variable's *value*
  //      (e.g. calendar.js does `["cal-bar", event.group].join(" ")`, so the
  //      group string lands as a class with no literal anchor in the source).
  //      These can't be proven statically, so they live in an explicit
  //      allowlist below — keep it small and documented.
  const VALUE_DERIVED = new Set([
    // calendar event.group values applied as `.cal-bar.<group>` modifiers
    'global', 'team', 'personal', 'risk', 'blocked',
  ])

  const selectorRe = /[.#]([a-zA-Z_][\w-]*)/g

  /** True when `#hex` was a colour literal, not an id selector. */
  const isHexColour = (name) => /^[0-9a-fA-F]{3,8}$/.test(name)

  /** True when some `prefix-` of the name is template-composed (`prefix-${`). */
  function isTemplateComposed(name) {
    const parts = name.split('-')
    for (let i = 1; i < parts.length; i++) {
      const prefix = parts.slice(0, i).join('-') + '-'
      if (referenceCorpus.includes(prefix + '${')) return true
    }
    return false
  }

  for (const file of cssFiles) {
    test(`${file} defines no selector that is unused in HTML/JS`, () => {
      const css = stripComments(cssByFile[file])
      const names = new Set()
      let m
      while ((m = selectorRe.exec(css)) !== null) {
        if (!isHexColour(m[1])) names.add(m[1])
      }

      const dead = [...names].filter((name) => {
        if (VALUE_DERIVED.has(name)) return false
        const tokenRe = new RegExp(`(?<![\\w-])${name}(?![\\w-])`)
        if (tokenRe.test(referenceCorpus)) return false
        return !isTemplateComposed(name)
      })
      expect(dead).toEqual([])
    })
  }
})
