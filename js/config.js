/**
 * Public client configuration for SE SitRep.
 *
 * The Supabase publishable (anon) key is safe to expose in client code —
 * security is enforced by Row-Level Security policies on the database
 * (see supabase/schema.sql). Never put the service_role key in this file.
 *
 * @type {{url: string, publishableKey: string}}
 */
window.SUPABASE_CONFIG = {
  url: "https://vbimsbasupcbdxzsazif.supabase.co",
  publishableKey: "sb_publishable_Tw0rAkh-hU1STUekdqibpw_Kfy_tATQ",
};
