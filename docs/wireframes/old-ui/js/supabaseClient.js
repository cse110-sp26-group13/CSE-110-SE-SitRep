/**
 * Single Supabase client instance for the app.
 *
 * The supabase-js CDN script (loaded immediately before this file)
 * exposes its namespace as `window.supabase` — we expose the
 * configured client as `window.sbClient` so we don't clobber it.
 *
 * Defaults we rely on (set automatically by supabase-js v2):
 * - persistSession: true        (session lives in localStorage)
 * - autoRefreshToken: true      (silent refresh before expiry)
 * - detectSessionInUrl: true    (oauth/magic-link redirects)
 */
(function () {
  'use strict';

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    throw new Error(
      'supabaseClient.js: window.supabase is missing — '
      + 'make sure the supabase-js CDN script tag loads before this file.'
    );
  }
  if (!window.SUPABASE_CONFIG || !window.SUPABASE_CONFIG.url
      || !window.SUPABASE_CONFIG.publishableKey) {
    throw new Error(
      'supabaseClient.js: window.SUPABASE_CONFIG is missing — '
      + 'make sure js/config.js loads before this file.'
    );
  }

  window.sbClient = window.supabase.createClient(
    window.SUPABASE_CONFIG.url,
    window.SUPABASE_CONFIG.publishableKey
  );
})();
