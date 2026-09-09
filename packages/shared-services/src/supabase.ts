import { createClient } from "@supabase/supabase-js";
import { getEnv } from "@nakshra/shared-utils/env";

// Keys from connection_points.md (supporting environment overrides)
const supabaseUrl = getEnv("VITE_SUPABASE_URL", getEnv("EXPO_PUBLIC_SUPABASE_URL", "https://lzzdfsphevmzbkkoskxb.supabase.co"));
const supabaseAnonKey = getEnv("VITE_SUPABASE_ANON_KEY", getEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY", "sb_publishable_hXI5tCwU5jA3BQtdLxuXoQ_L69CcRaZ"));

// On native, use AsyncStorage so the session survives app restarts (web keeps the
// Supabase client's default localStorage-backed persistence). Without this, RN
// sessions were only ever held in memory and silently dropped on relaunch.
// Loaded dynamically (not a static import) since this package is also consumed by
// the web app, which never installs this native-only dependency.
let nativeAuthStorage: any;
const isReactNative = typeof navigator !== "undefined" && (navigator as any).product === "ReactNative";
if (isReactNative) {
  try {
    // @ts-ignore -- CJS `require` exists at runtime under Metro; not typed for the web build.
    nativeAuthStorage = require("@react-native-async-storage/async-storage").default;
  } catch (e) {
    nativeAuthStorage = undefined;
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(nativeAuthStorage ? { storage: nativeAuthStorage } : {}),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: "Nakshra_supabase_auth",
  },
});

// ---------------------------------------------------------------------------
// Phone-OTP session → supabase-js
//
// Our login (POST /api/auth/otp/verify) returns an HS256 JWT signed with the
// project's JWT secret, with sub=<user id>, role/aud="authenticated". Handing it
// to supabase-js as the access token makes `auth.uid()` resolve to the user id
// for every direct PostgREST call, which is the prerequisite for locking the
// row-level-security policies on users / orders / addresses / carts / wishlists
// down to "your own rows only". Without this, those tables can only be reached
// with `USING (true)` policies (i.e. wide open) or fully server-side.
//
// There is no refresh token (the JWT is long-lived, 45 days), so we pass the
// access token in that slot too; supabase-js only attempts a refresh once the
// access token is near expiry, at which point it fails cleanly and we fall back
// to the anon role. `AUTH_TOKEN_KEY` mirrors the key api.ts reads.
// ---------------------------------------------------------------------------
export const AUTH_TOKEN_KEY = "Nakshra_auth_token";

export async function applySupabaseAuth(token: string | null): Promise<boolean> {
  try {
    if (!token) {
      await supabase.auth.signOut();
      return false;
    }
    const { error } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: token,
    });
    if (error) {
      // Expired / secret rotated — drop the stale token so the app treats the
      // user as logged out rather than half-authenticated.
      try { localStorage.removeItem(AUTH_TOKEN_KEY); } catch {}
      await supabase.auth.signOut();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Call once on app start to restore the supabase session from a stored OTP JWT.
export async function initSupabaseAuthFromStorage(): Promise<boolean> {
  let token: string | null = null;
  try { token = localStorage.getItem(AUTH_TOKEN_KEY); } catch {}
  if (!token) return false;
  return applySupabaseAuth(token);
}
