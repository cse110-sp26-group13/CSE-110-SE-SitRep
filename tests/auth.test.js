/**
 * Unit tests for js/auth.js.
 *
 * Runs in two contexts:
 *   - Node (CI / CLI):  loads js/auth.js into a vm sandbox, exits 0 on
 *                       PASS, 1 on FAIL.
 *   - Browser (manual): loaded by tests/auth.test.html after js/auth.js,
 *                       writes results into <pre id="results"> and sets
 *                       document.title to PASS / FAIL.
 *
 * Tests cover the error-mapping table from auth.js (which is the
 * single source of truth for user-facing auth/RPC error messages) and
 * the 6-digit join-code regex used by splash.js.
 */
(function () {
  'use strict';

  // ---- Wire-up: get a reference to mapAuthError ---------------------
  let mapAuthError;
  const isNode = typeof window === 'undefined'
    && typeof process !== 'undefined'
    && process.versions && process.versions.node;

  if (isNode) {
    const fs = require('fs');
    const path = require('path');
    const vm = require('vm');
    const code = fs.readFileSync(
      path.join(__dirname, '..', 'js', 'auth.js'),
      'utf8'
    );
    // auth.js attaches its public API to window.auth — give it one.
    // No network or DOM is touched at module load, so a bare object
    // suffices.
    const sandbox = { window: {}, console: { error: () => {}, log: () => {} } };
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox, { filename: 'js/auth.js' });
    mapAuthError = sandbox.window.auth.mapAuthError;
  } else {
    if (!window.auth || !window.auth.mapAuthError) {
      throw new Error('tests/auth.test.js: window.auth.mapAuthError missing — load js/auth.js first.');
    }
    mapAuthError = window.auth.mapAuthError;
  }

  // ---- Tiny assertion helpers --------------------------------------

  const failures = [];
  let pass = 0;
  let total = 0;

  /**
   * @param {string} name
   * @param {() => void} fn
   */
  function test(name, fn) {
    total += 1;
    try {
      fn();
      pass += 1;
    } catch (err) {
      failures.push({ name, message: err.message });
    }
  }

  function eq(actual, expected, label) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) {
      throw new Error(`${label || 'eq'}: expected ${e}, got ${a}`);
    }
  }

  // ---- mapAuthError cases ------------------------------------------

  test('null in → null out', () => {
    eq(mapAuthError(null), null);
    eq(mapAuthError(undefined), null);
  });

  test('invalid_credentials by code', () => {
    eq(mapAuthError({ code: 'invalid_credentials' }, 'signIn'), {
      code: 'invalid_credentials',
      message: 'Email or password is incorrect.',
    });
  });

  test('invalid_credentials by message (Supabase v1 shape)', () => {
    eq(mapAuthError({ message: 'Invalid login credentials' }, 'signIn'), {
      code: 'invalid_credentials',
      message: 'Email or password is incorrect.',
    });
  });

  test('weak_password by code', () => {
    eq(mapAuthError({ code: 'weak_password' }, 'signUp'), {
      code: 'weak_password',
      message: 'Password must be at least 8 characters.',
    });
  });

  test('weak_password by message', () => {
    eq(
      mapAuthError({ message: 'Password should be at least 8 characters' }, 'signUp'),
      { code: 'weak_password', message: 'Password must be at least 8 characters.' }
    );
  });

  test('rate_limited by code (email send)', () => {
    eq(mapAuthError({ code: 'over_email_send_rate_limit' }, 'signUp'), {
      code: 'rate_limited',
      message: 'Too many attempts — try again in a minute.',
    });
  });

  test('rate_limited by code (request)', () => {
    eq(mapAuthError({ code: 'over_request_rate_limit' }, 'signIn'), {
      code: 'rate_limited',
      message: 'Too many attempts — try again in a minute.',
    });
  });

  test('P0001 → team_name_blank (create_team origin)', () => {
    eq(
      mapAuthError({ code: 'P0001', message: 'team_name_blank' }, 'create_team'),
      { code: 'team_name_blank', message: 'Please enter a name for your circle.' }
    );
  });

  test('P0001 → team_name_too_long (create_team origin)', () => {
    eq(
      mapAuthError({ code: 'P0001', message: 'team_name_too_long' }, 'create_team'),
      { code: 'team_name_too_long', message: 'Name must be 80 characters or fewer.' }
    );
  });

  test('P0001 → invalid_join_code (join_team_by_code origin)', () => {
    eq(
      mapAuthError({ code: 'P0001', message: 'invalid_join_code' }, 'join_team_by_code'),
      { code: 'invalid_join_code', message: "That code doesn't match a circle." }
    );
  });

  test('P0001 with no matching origin falls through (not silently mapped)', () => {
    const got = mapAuthError({ code: 'P0001', message: 'something_else' }, 'unknown');
    // Should pass through with the raw code/message rather than claiming
    // it's an invalid_join_code or team_name issue.
    eq(got.code, 'P0001');
    eq(got.message, 'something_else');
  });

  test('network error from "Failed to fetch"', () => {
    eq(mapAuthError(new TypeError('Failed to fetch')), {
      code: 'network',
      message: 'Something went wrong. Please try again.',
    });
  });

  test('unknown shape → fallthrough preserves code/message', () => {
    eq(
      mapAuthError({ code: 'something_new', message: 'some text' }),
      { code: 'something_new', message: 'some text' }
    );
  });

  test('empty error object → unknown', () => {
    eq(mapAuthError({}), { code: 'unknown', message: 'Something went wrong. Please try again.' });
  });

  // ---- Join-code regex cases ---------------------------------------
  // splash.js uses /^\d{6}$/ as the client-side validation before the
  // RPC call. Lock that contract down.

  const joinCodeRe = /^\d{6}$/;

  test("regex accepts '123456'", () => { eq(joinCodeRe.test('123456'), true); });
  test("regex accepts '000000'", () => { eq(joinCodeRe.test('000000'), true); });
  test("regex rejects '12345' (5 digits)",   () => { eq(joinCodeRe.test('12345'),   false); });
  test("regex rejects '1234567' (7 digits)", () => { eq(joinCodeRe.test('1234567'), false); });
  test("regex rejects '12345a' (letter)",    () => { eq(joinCodeRe.test('12345a'),  false); });
  test("regex rejects '' (empty)",           () => { eq(joinCodeRe.test(''),        false); });
  test("regex rejects ' 123456' (leading space)", () => { eq(joinCodeRe.test(' 123456'), false); });
  test("regex rejects '12-345' (separator)", () => { eq(joinCodeRe.test('12-345'),  false); });

  // ---- Reporting ---------------------------------------------------

  const fail = total - pass;
  const summary = `${pass}/${total} passed`
    + (fail ? `, ${fail} failed` : '');

  if (isNode) {
    /* eslint-disable no-console */
    if (fail) {
      console.log('FAIL — ' + summary);
      for (const f of failures) {
        console.log('  ✗ ' + f.name + '\n      ' + f.message);
      }
      process.exit(1);
    }
    console.log('PASS — ' + summary);
    /* eslint-enable no-console */
  } else {
    const el = document.getElementById('results');
    let body = (fail ? 'FAIL — ' : 'PASS — ') + summary + '\n';
    if (fail) {
      body += '\nFailures:\n';
      for (const f of failures) {
        body += '  ✗ ' + f.name + '\n      ' + f.message + '\n';
      }
    }
    if (el) el.textContent = body;
    document.title = fail ? 'FAIL — auth.js tests' : 'PASS — auth.js tests';
    document.body.dataset.testResult = fail ? 'fail' : 'pass';
  }
})();
