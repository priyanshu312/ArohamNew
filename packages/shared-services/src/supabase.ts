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
