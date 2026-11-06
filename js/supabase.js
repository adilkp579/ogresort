/* Supabase client factory. The site and the admin dashboard use different storage keys,
   so logging in to one never logs you in to the other. */
const CFG = window.VERDANE_CONFIG;
const supabaseReady = () =>
  !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && !/YOUR-/.test(CFG.SUPABASE_URL + CFG.SUPABASE_ANON_KEY) && window.supabase);
function makeClient(storageKey) {
  return window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
    auth: { storageKey, persistSession: true, autoRefreshToken: true }
  });
}
