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

export async function api(endpoint: string, options: RequestInit = {}) {
  // Get token from Firebase Auth first, fallback to Supabase
  let token: string | null = null;
  if (firebaseAuth.currentUser) {
    try {
      token = await firebaseAuth.currentUser.getIdToken();
    } catch (e) {
      console.error("Firebase token fetch error:", e);
    }
  }

  if (!token) {
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token || null;
  }

  // Local development fallback: if no real auth token exists, use mock session ID
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
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const body = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    const errorMsg = body.error || (body.errors || []).join(", ") || response.statusText;
    throw new Error(errorMsg);
  }
  
  return body;
}
