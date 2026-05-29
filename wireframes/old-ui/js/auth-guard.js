/**
 * Bounce unauthenticated or team-less visitors to splash.html.
 *
 * Loaded at the top of index.html (after supabaseClient.js, before
 * the dashboard's own scripts). Runs async — the rest of the page
 * keeps loading and the redirect tears it down before users
 * meaningfully interact with the unauthenticated dashboard.
 *
 * Per ADR-0004: this is a deliberately tiny client-side guard.
 * Brief flicker is acceptable for v0.2; if it becomes a UX
 * complaint we'll wrap <body> in a hidden div and unhide only
 * after the check passes.
 */
(async function () {
  'use strict';

  const SPLASH_URL = 'splash.html';

  try {
    const { data: { session } } = await window.sbClient.auth.getSession();
    if (!session) {
      window.location.replace(SPLASH_URL);
      return;
    }
    const { data: memberships, error } = await window.sbClient
      .from('memberships')
      .select('team_id');
    if (error || !memberships || memberships.length === 0) {
      window.location.replace(SPLASH_URL);
    }
  } catch (e) {
    // Network failure or missing client — fail closed and send to splash.
    console.error('[auth-guard] error checking session, redirecting:', e);
    window.location.replace(SPLASH_URL);
  }
})();
