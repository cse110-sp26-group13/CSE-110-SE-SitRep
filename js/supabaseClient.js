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
window.sbClient = window.supabase.createClient(
  window.SUPABASE_CONFIG.url,
  window.SUPABASE_CONFIG.publishableKey
);
