const { createClient } = require("@supabase/supabase-js");

// Prefer environment configuration. The literals below are only a last-resort
// fallback for throwaway/local runs — set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
// (or SUPABASE_ANON_KEY) in every real deployment.
const FALLBACK_URL = "https://lzzdfsphevmzbkkoskxb.supabase.co";
const FALLBACK_KEY = "sb_publishable_hXI5tCwU5jA3BQtdLxuXoQ_L69CcRaZ";

const supabaseUrl = process.env.SUPABASE_URL || FALLBACK_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  FALLBACK_KEY;

if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY)) {
  console.warn(
    "[Supabase] Falling back to bundled project credentials — set SUPABASE_URL and " +
    "SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) for this environment."
  );
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[Supabase] SUPABASE_SERVICE_ROLE_KEY is not set — privileged operations " +
    "(signup, order writes, RLS-protected reads) will fail."
  );
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

module.exports = supabase;
