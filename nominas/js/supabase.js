let sb = null;
if (window.CFG && CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY)
  sb = supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
