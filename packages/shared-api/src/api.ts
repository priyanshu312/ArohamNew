import { supabase, firebaseAuth } from "@nakshra/shared-services";
import { getEnv } from "@nakshra/shared-utils/env";

const isLocal = typeof window !== "undefined" && window.location && (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname.startsWith("192.168.")
);
// EXPO_PUBLIC_API_BASE covers mobile (Expo only inlines env vars with this prefix),
// VITE_API_BASE covers web. Falls back to the deployed backend everywhere except
// local web dev, where the previous code always fell back to localhost regardless
// of environment — a latent bug that made the deployed web app silently target
// localhost whenever no env var was set.
export const API_BASE = getEnv("VITE_API_BASE", getEnv("EXPO_PUBLIC_API_BASE", isLocal ? "http://localhost:5000/api" : "https://Nakshra.onrender.com/api"));

// `timeoutMs` aborts the request instead of waiting on it indefinitely.
//
// This matters because the backend is on a free Render plan that sleeps after
// ~15 min idle. A cold start ACCEPTS the connection and then holds it open for
// 30-50 s while the container boots, so a plain fetch() neither returns nor
// throws — it just hangs. Callers that have a perfectly good fallback (see
// useProducts, which can read the catalogue straight from Supabase) never got
// to use it, because nothing ever rejected. Visitors saw an empty page until
// they reloaded a few times.
//
// No default timeout: checkout and payment calls are legitimately slow and
// must not be cut off. Opt in per call where a fast failure is better than a
// long wait.
export type ApiOptions = RequestInit & { timeoutMs?: number };

export async function api(endpoint: string, options: ApiOptions = {}) {
  const { timeoutMs, ...fetchOptions } = options;
  // Get token from Firebase Auth first, fallback to Supabase
  let token: string | null = null;
  if (firebaseAuth.currentUser) {
    try {
      token = await firebaseAuth.currentUser.getIdToken();
    } catch (e) {
      console.error("Firebase token fetch error:", e);
    }
  }

  // App session token from the phone-OTP flow (POST /api/auth/otp/verify).
  if (!token && typeof window !== "undefined") {
    try {
      const t = localStorage.getItem("Nakshra_auth_token");
      if (t) token = t;
    } catch (e) {}
  }

  if (!token) {
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token || null;
  }

  // Legacy dev fallback: mock session id (backend only honours this when
  // ALLOW_MOCK_AUTH=true).
  if (!token && typeof window !== "undefined") {
    try {
      const mockSession = localStorage.getItem("Nakshra_mock_session");
      if (mockSession) {
        const parsed = JSON.parse(mockSession);
        if (parsed?.id) {
          token = `MOCK-USER-ID-${parsed.id}`;
        }
      }
    } catch (e) {}
  }
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Respect a caller-supplied signal as well as our own timeout.
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer =
    timeoutMs && controller
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;
  if (controller && fetchOptions.signal) {
    const caller = fetchOptions.signal;
    if (caller.aborted) controller.abort();
    else caller.addEventListener("abort", () => controller.abort(), { once: true });
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...fetchOptions,
      headers,
      ...(controller ? { signal: controller.signal } : {}),
    });
  } catch (e: any) {
    if (e?.name === "AbortError" && timer) {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw e;
  } finally {
    if (timer) clearTimeout(timer);
  }

  const body = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    const errorMsg = body.error || (body.errors || []).join(", ") || response.statusText;
    throw new Error(errorMsg);
  }
  
  return body;
}
