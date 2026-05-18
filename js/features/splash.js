/**
 * Splash page controller — auth view and circle view.
 *
 * State machine:
 *   view:        'auth' | 'circle'
 *   authTab:     'signup' | 'login'
 *   circleTab:   'create' | 'join'
 *   busy:        boolean (prevents double-submit)
 *
 * Routing on load:
 *   - no session                       → auth view
 *   - session + zero memberships       → circle view
 *   - session + at least one membership → redirect to index.html
 */
(function () {
  'use strict';

  const DASHBOARD_URL = 'index.html';

  const state = {
    view: 'auth',
    authTab: 'signup',
    circleTab: 'create',
    busy: false,
  };

  /** @returns {HTMLElement | null} */
  function $(id) { return document.getElementById(id); }

  /**
   * Show one of the two top-level views, hide the other.
   * @param {'auth' | 'circle'} name
   */
  function showView(name) {
    state.view = name;
    $('view-auth').hidden = name !== 'auth';
    $('view-circle').hidden = name !== 'circle';
  }

  /**
   * Toggle which tab inside a view is active.
   * @param {'auth' | 'circle'} group
   * @param {string} name - signup/login for auth, create/join for circle
   */
  function setTab(group, name) {
    if (group === 'auth') {
      state.authTab = name;
      $('signup-form').hidden = name !== 'signup';
      $('login-form').hidden = name !== 'login';
      document.querySelectorAll('[data-auth-tab]').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.authTab === name);
      });
      clearMessage('auth-message');
    } else {
      state.circleTab = name;
      $('create-form').hidden = name !== 'create';
      $('join-form').hidden = name !== 'join';
      document.querySelectorAll('[data-circle-tab]').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.circleTab === name);
      });
      clearMessage('circle-message');
    }
  }

  /**
   * Show an inline message (error or success) by id.
   * @param {string} elId
   * @param {{code: string, message: string} | null} normalized
   * @param {'error' | 'success'} [kind='error']
   */
  function showMessage(elId, normalized, kind) {
    const el = $(elId);
    if (!el || !normalized) return;
    el.textContent = normalized.message;
    el.classList.remove('splash-error', 'splash-success');
    el.classList.add(kind === 'success' ? 'splash-success' : 'splash-error');
    el.hidden = false;
  }

  /** @param {string} elId */
  function clearMessage(elId) {
    const el = $(elId);
    if (!el) return;
    el.hidden = true;
    el.textContent = '';
  }

  /** Field-level error: mark an input invalid and show its error span. */
  function setFieldError(inputId, message) {
    const input = $(inputId);
    const errEl = $(`${inputId}-error`);
    if (!input || !errEl) return;
    input.classList.add('splash-input--invalid');
    input.setAttribute('aria-invalid', 'true');
    errEl.textContent = message;
    errEl.hidden = false;
  }

  function clearFieldError(inputId) {
    const input = $(inputId);
    const errEl = $(`${inputId}-error`);
    if (!input || !errEl) return;
    input.classList.remove('splash-input--invalid');
    input.removeAttribute('aria-invalid');
    errEl.textContent = '';
    errEl.hidden = true;
  }

  const SIGNUP_FIELDS = [
    'signup-first-name', 'signup-last-name',
    'signup-email', 'signup-password',
  ];

  function clearAllSignupErrors() {
    SIGNUP_FIELDS.forEach(clearFieldError);
  }

  /**
   * Validate an email string and return a specific error for common
   * mistakes. Returns null when the address is well-formed enough to
   * hand off to Supabase.
   * @param {string} raw
   * @returns {{code: string, message: string} | null}
   */
  function validateEmail(raw) {
    const email = (raw || '').trim();
    if (!email) {
      return { code: 'email_blank', message: 'Please enter your email.' };
    }
    if (/\s/.test(email)) {
      return { code: 'email_whitespace', message: "Email can't contain spaces." };
    }
    const at = email.indexOf('@');
    if (at === -1) {
      return { code: 'email_missing_at', message: "Email is missing an '@'." };
    }
    if (email.indexOf('@', at + 1) !== -1) {
      return { code: 'email_multiple_at', message: "Email can only contain one '@'." };
    }
    const local = email.slice(0, at);
    const domain = email.slice(at + 1);
    if (!local) {
      return { code: 'email_no_local', message: "Add the part before the '@'." };
    }
    if (!domain) {
      return { code: 'email_no_domain', message: "Add the domain after the '@'." };
    }
    if (!domain.includes('.')) {
      return { code: 'email_no_tld', message: 'Domain needs a dot (like .com).' };
    }
    if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
      return { code: 'email_bad_dots', message: 'Email has a misplaced dot.' };
    }
    const tld = domain.slice(domain.lastIndexOf('.') + 1);
    if (tld.length < 2) {
      return { code: 'email_short_tld', message: 'Domain ending is too short.' };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { code: 'email_invalid', message: "That doesn't look like a valid email." };
    }
    return null;
  }

  const PASSWORD_REQS = [
    { key: 'length', test: (p) => p.length >= 8 },
    { key: 'letter', test: (p) => /[a-zA-Z]/.test(p) },
    { key: 'number', test: (p) => /\d/.test(p) },
    { key: 'strong', test: (p) =>
      (/[a-z]/.test(p) && /[A-Z]/.test(p)) || /[^a-zA-Z0-9]/.test(p) },
  ];
  const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  /**
   * Score a password 0–4 against the requirements list, update the
   * meter + checklist UI, and report whether the minimum bar to
   * submit (length + letter + number) has been cleared.
   * @param {string} password
   * @returns {{score: number, requiredMet: boolean}}
   */
  function updatePasswordStrength(password) {
    const wrap = $('signup-strength');
    const fill = $('signup-strength-fill');
    const text = $('signup-strength-text');
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
    return {
      score,
      requiredMet: !!(met.length && met.letter && met.number),
    };
  }

  /**
   * Disable / re-enable the submit button on a form during a request.
   * @param {HTMLFormElement} form
   * @param {boolean} isBusy
   */
  function setBusy(form, isBusy) {
    state.busy = isBusy;
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    if (isBusy) {
      btn.dataset.originalText = btn.textContent;
      btn.textContent = 'Working…';
      btn.disabled = true;
    } else {
      if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
      btn.disabled = false;
    }
  }

  /**
   * After a successful auth, decide where to go: dashboard if the
   * user already has a team, circle view otherwise.
   */
  async function routePostAuth() {
    const { data: memberships } = await window.auth.getUserMemberships();
    if (memberships && memberships.length > 0) {
      window.location.replace(DASHBOARD_URL);
    } else {
      const session = await window.auth.getSession();
      const email = session.data && session.data.user && session.data.user.email;
      if (email) $('signed-in-as').textContent = email;
      showView('circle');
    }
  }

  // ---- Form handlers ----------------------------------------------

  async function onSignupSubmit(e) {
    e.preventDefault();
    if (state.busy) return;
    clearMessage('auth-message');
    clearAllSignupErrors();
    const form = e.target;
    const firstName = $('signup-first-name').value.trim();
    const lastName = $('signup-last-name').value.trim();
    const email = $('signup-email').value.trim();
    const password = $('signup-password').value;

    // Validate every field and collect errors so the user sees them all at once.
    let firstInvalid = null;
    if (!firstName) {
      setFieldError('signup-first-name', 'First name is required.');
      firstInvalid = firstInvalid || 'signup-first-name';
    }
    if (!lastName) {
      setFieldError('signup-last-name', 'Last name is required.');
      firstInvalid = firstInvalid || 'signup-last-name';
    }
    const emailError = validateEmail(email);
    if (emailError) {
      setFieldError('signup-email', emailError.message);
      firstInvalid = firstInvalid || 'signup-email';
    }
    const strength = updatePasswordStrength(password);
    if (!strength.requiredMet) {
      setFieldError('signup-password',
        'Doesn’t meet the requirements above (8+ characters, a letter, and a number).');
      firstInvalid = firstInvalid || 'signup-password';
    }
    if (firstInvalid) {
      const el = $(firstInvalid);
      if (el) el.focus();
      return;
    }

    setBusy(form, true);
    const displayName = `${firstName} ${lastName}`;
    const { data, error } = await window.auth.signUp({ email, password, displayName });
    setBusy(form, false);
    if (error) {
      // Route server-side errors to the field they describe, when we can.
      if (error.code === 'email_already_registered') {
        setFieldError('signup-email',
          'An account with this email already exists. Try logging in.');
        $('signup-email').focus();
        return;
      }
      if (error.code === 'weak_password') {
        setFieldError('signup-password', error.message);
        $('signup-password').focus();
        return;
      }
      const kind = error.code === 'email_confirmation_required' ? 'success' : 'error';
      showMessage('auth-message', error, kind);
      return;
    }
    if (data && data.session) await routePostAuth();
  }

  async function onLoginSubmit(e) {
    e.preventDefault();
    if (state.busy) return;
    clearMessage('auth-message');
    const form = e.target;
    const email = $('login-email').value.trim();
    const password = $('login-password').value;
    if (!email || !password) {
      showMessage('auth-message',
        { code: 'missing_fields', message: 'Please enter your email and password.' });
      return;
    }
    setBusy(form, true);
    const { error } = await window.auth.signInWithPassword({ email, password });
    setBusy(form, false);
    if (error) {
      showMessage('auth-message', error);
      return;
    }
    await routePostAuth();
  }

  async function onCreateSubmit(e) {
    e.preventDefault();
    if (state.busy) return;
    clearMessage('circle-message');
    const form = e.target;
    const name = $('create-name').value.trim();
    if (!name) {
      showMessage('circle-message',
        { code: 'team_name_blank', message: 'Please enter a name for your circle.' });
      return;
    }
    setBusy(form, true);
    const { error } = await window.sbClient.rpc('create_team', { p_name: name })
      .then((r) => ({ data: r.data, error: r.error }))
      .catch((err) => ({ data: null, error: err }));
    setBusy(form, false);
    if (error) {
      showMessage('circle-message',
        window.auth.mapAuthError(error, 'create_team'));
      return;
    }
    window.location.replace(DASHBOARD_URL);
  }

  async function onJoinSubmit(e) {
    e.preventDefault();
    if (state.busy) return;
    clearMessage('circle-message');
    const form = e.target;
    const code = $('join-code').value.trim();
    if (!/^\d{6}$/.test(code)) {
      showMessage('circle-message',
        { code: 'invalid_join_code', message: 'Enter the 6-digit code your team lead sent.' });
      return;
    }
    setBusy(form, true);
    const { error } = await window.sbClient.rpc('join_team_by_code', { p_code: code })
      .then((r) => ({ data: r.data, error: r.error }))
      .catch((err) => ({ data: null, error: err }));
    setBusy(form, false);
    if (error) {
      showMessage('circle-message',
        window.auth.mapAuthError(error, 'join_team_by_code'));
      return;
    }
    window.location.replace(DASHBOARD_URL);
  }

  async function onSignoutClick() {
    if (state.busy) return;
    await window.auth.signOut();
    showView('auth');
    setTab('auth', 'signup');
    ['signup-first-name', 'signup-last-name', 'signup-email', 'signup-password',
      'login-email', 'login-password',
      'create-name', 'join-code'].forEach((id) => {
        const el = $(id);
        if (el) el.value = '';
      });
    clearAllSignupErrors();
    updatePasswordStrength('');
  }

  // ---- Boot --------------------------------------------------------

  async function init() {
    // Tab buttons
    document.querySelectorAll('[data-auth-tab]').forEach((btn) => {
      btn.addEventListener('click', () => setTab('auth', btn.dataset.authTab));
    });
    document.querySelectorAll('[data-circle-tab]').forEach((btn) => {
      btn.addEventListener('click', () => setTab('circle', btn.dataset.circleTab));
    });

    // Live signup field feedback — clear errors as the user fixes them,
    // re-validate email on blur once they've typed something.
    SIGNUP_FIELDS.forEach((id) => {
      $(id).addEventListener('input', () => clearFieldError(id));
    });
    $('signup-email').addEventListener('blur', () => {
      const v = $('signup-email').value.trim();
      if (!v) { clearFieldError('signup-email'); return; }
      const err = validateEmail(v);
      if (err) setFieldError('signup-email', err.message);
      else clearFieldError('signup-email');
    });
    $('signup-password').addEventListener('input', (ev) => {
      updatePasswordStrength(ev.target.value);
    });

    // Forms
    $('signup-form').addEventListener('submit', onSignupSubmit);
    $('login-form').addEventListener('submit', onLoginSubmit);
    $('create-form').addEventListener('submit', onCreateSubmit);
    $('join-form').addEventListener('submit', onJoinSubmit);
    $('signout-btn').addEventListener('click', onSignoutClick);

    // Route based on current session + memberships
    await routeBasedOnSession();
  }

  /**
   * Inspect the current session + memberships and put the user in the
   * right place: auth view if no session, dashboard if already on a
   * team, otherwise the circle view to create/join one.
   *
   * Called on first load AND on bfcache restore so that hitting Back
   * from the dashboard doesn't leave a teamed-up user staring at the
   * stale "create/join circle" view.
   */
  async function routeBasedOnSession() {
    const { data: session } = await window.auth.getSession();
    if (!session) {
      showView('auth');
      return;
    }
    const { data: memberships } = await window.auth.getUserMemberships();
    if (memberships && memberships.length > 0) {
      window.location.replace(DASHBOARD_URL);
      return;
    }
    if (session.user && session.user.email) {
      $('signed-in-as').textContent = session.user.email;
    }
    showView('circle');
  }

  document.addEventListener('DOMContentLoaded', init);

  // bfcache restore (e.g., user hits Back from the dashboard) doesn't
  // re-run init; pageshow with event.persisted does. Re-route so a
  // user already on a team gets bounced straight back to the dashboard.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) routeBasedOnSession();
  });
})();
