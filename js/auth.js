/**
 * Auth helpers for SE SitRep.
 *
 * Every function returns { data, error } where `error` is either
 * null or a normalized { code, message } object. The raw Supabase
 * error shape is mapped through mapAuthError() so callers can do
 * a single switch on `error.code`.
 *
 * Depends on window.sbClient (from supabaseClient.js).
 */
(function () {
  'use strict';

  /**
   * Normalize a Supabase error (or any thrown value) into the
   * shape the splash UI expects.
   *
   * @param {unknown} err - raw error from a Supabase call, or null.
   * @param {string} [origin] - which call produced it; used for
   *   origin-sensitive mappings (e.g. P0001 means different things
   *   from create_team vs join_team_by_code).
   * @returns {{code: string, message: string} | null}
   */
  function mapAuthError(err, origin) {
    if (!err) return null;

    const rawCode = err.code || '';
    const rawMsg = (err.message || '').toString();

    if (rawCode === 'invalid_credentials'
        || /invalid login credentials/i.test(rawMsg)) {
      return { code: 'invalid_credentials',
        message: 'Email or password is incorrect.' };
    }
    if (rawCode === 'weak_password'
        || /password should be at least/i.test(rawMsg)) {
      return { code: 'weak_password',
        message: 'Password must be at least 8 characters.' };
    }
    if (rawCode === 'over_email_send_rate_limit'
        || rawCode === 'over_request_rate_limit'
        || /rate limit/i.test(rawMsg)) {
      return { code: 'rate_limited',
        message: 'Too many attempts — try again in a minute.' };
    }

    if (rawCode === 'P0001' && origin === 'create_team') {
      if (/team_name_blank/.test(rawMsg)) {
        return { code: 'team_name_blank',
          message: 'Please enter a name for your circle.' };
      }
      if (/team_name_too_long/.test(rawMsg)) {
        return { code: 'team_name_too_long',
          message: 'Name must be 80 characters or fewer.' };
      }
    }
    if (rawCode === 'P0001' && origin === 'join_team_by_code') {
      return { code: 'invalid_join_code',
        message: "That code doesn't match a circle." };
    }

    if (/network|fetch|failed to fetch/i.test(rawMsg)) {
      return { code: 'network',
        message: 'Something went wrong. Please try again.' };
    }

    return { code: rawCode || 'unknown',
      message: rawMsg || 'Something went wrong. Please try again.' };
  }

  /**
   * Sign up a new user. The handle_new_user trigger auto-creates
   * a row in profiles with display_name pulled from the metadata.
   *
   * When the Supabase project still has "Confirm email" enabled,
   * a successful signUp returns user-but-no-session — we surface
   * that as needsConfirmation: true so the splash can show a
   * "check your inbox" message instead of advancing.
   *
   * When the same email is already registered, Supabase v2 returns
   * data.user with an empty identities array (enumeration
   * protection). We detect that and map to email_already_registered.
   *
   * @param {{email: string, password: string, displayName: string}} args
   * @returns {Promise<{
   *   data: {user: object|null, session: object|null, needsConfirmation: boolean} | null,
   *   error: {code: string, message: string} | null
   * }>}
   */
  async function signUp({ email, password, displayName }) {
    try {
      const { data, error } = await window.sbClient.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          // Confirmation link redirects back to the page they signed up
          // from. The exact origin must be in the project's allowlist
          // (Auth → URL Configuration → Redirect URLs).
          emailRedirectTo: `${window.location.origin}/splash.html`,
        },
      });
      if (error) return { data: null, error: mapAuthError(error, 'signUp') };

      const identities = data && data.user && data.user.identities;
      if (Array.isArray(identities) && identities.length === 0) {
        return {
          data: null,
          error: {
            code: 'email_already_registered',
            message: 'An account with that email already exists. Try logging in.',
          },
        };
      }

      const needsConfirmation = !!data.user && !data.session;
      if (needsConfirmation) {
        return {
          data: { user: data.user, session: null, needsConfirmation: true },
          error: {
            code: 'email_confirmation_required',
            message: 'Check your inbox to confirm your email, then log in.',
          },
        };
      }

      return {
        data: { user: data.user, session: data.session, needsConfirmation: false },
        error: null,
      };
    } catch (e) {
      return { data: null, error: mapAuthError(e, 'signUp') };
    }
  }

  /**
   * Sign in with email + password.
   *
   * @param {{email: string, password: string}} args
   * @returns {Promise<{
   *   data: {user: object, session: object} | null,
   *   error: {code: string, message: string} | null
   * }>}
   */
  async function signInWithPassword({ email, password }) {
    try {
      const { data, error } = await window.sbClient.auth
        .signInWithPassword({ email, password });
      if (error) return { data: null, error: mapAuthError(error, 'signIn') };
      return { data, error: null };
    } catch (e) {
      return { data: null, error: mapAuthError(e, 'signIn') };
    }
  }

  /**
   * Sign out the current user. Clears the localStorage session.
   *
   * @returns {Promise<{data: null, error: {code: string, message: string} | null}>}
   */
  async function signOut() {
    try {
      const { error } = await window.sbClient.auth.signOut();
      return { data: null, error: error ? mapAuthError(error, 'signOut') : null };
    } catch (e) {
      return { data: null, error: mapAuthError(e, 'signOut') };
    }
  }

  /**
   * Read the current session (from localStorage, no network call).
   *
   * @returns {Promise<{
   *   data: object | null,
   *   error: {code: string, message: string} | null
   * }>}
   */
  async function getSession() {
    try {
      const { data, error } = await window.sbClient.auth.getSession();
      if (error) return { data: null, error: mapAuthError(error, 'getSession') };
      return { data: data.session, error: null };
    } catch (e) {
      return { data: null, error: mapAuthError(e, 'getSession') };
    }
  }

  /**
   * Read the current user's memberships. RLS restricts to auth.uid()
   * automatically, so this returns only the caller's rows.
   *
   * @returns {Promise<{
   *   data: Array<{team_id: string, role: string}>,
   *   error: {code: string, message: string} | null
   * }>}
   */
  async function getUserMemberships() {
    try {
      const { data, error } = await window.sbClient
        .from('memberships')
        .select('team_id, role');
      if (error) return { data: [], error: mapAuthError(error, 'getMemberships') };
      return { data: data || [], error: null };
    } catch (e) {
      return { data: [], error: mapAuthError(e, 'getMemberships') };
    }
  }

  window.auth = {
    mapAuthError,
    signUp,
    signInWithPassword,
    signOut,
    getSession,
    getUserMemberships,
  };
})();
