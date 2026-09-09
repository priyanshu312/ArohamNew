const { createClient } = require("@supabase/supabase-js");

// Supabase connection. Configuration MUST come from the environment:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   (preferred — privileged server operations)
//   SUPABASE_ANON_KEY           (fallback — RLS-limited)
// No project credentials are bundled here on purpose: a hardcoded fallback both
// leaks a real key into source control and hides misconfiguration in deploys.
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "[Supabase] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) are not set. " +
    "Every DB call will fail until these are configured in the environment."
  );
} else if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[Supabase] SUPABASE_SERVICE_ROLE_KEY is not set — privileged operations " +
    "(signup, order writes, RLS-protected reads) will fail."
  );
}

// Fall back to a syntactically valid but non-functional placeholder so
// createClient() doesn't throw at import time; calls then fail loudly at runtime.
const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseKey || "placeholder-key",
  { auth: { persistSession: false } }
);

module.exports = supabase;
