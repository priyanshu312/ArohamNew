// middleware/auth.js — verifies the app session token (Twilio-OTP flow), plus
// Firebase / Supabase access tokens, sent by the frontend as `Authorization: Bearer`.
const supabase = require("../config/supabase");
const { verifyToken } = require("../services/session");
const ALLOW_MOCK = process.env.ALLOW_MOCK_AUTH === "true";

// Firebase Admin is only wired up when a service account is actually provided.
// Without one, `verifyIdToken` would reach out for Google's public certs on every
// unknown token and stall the request, so we skip the whole path unless
// credentials are present. `admin.apps` was also removed from newer SDK
// namespaces, hence the defensive access.
let admin = null;
let firebaseReady = false;
try {
  const hasCreds = !!(
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.env.FIREBASE_CONFIG
  );
  if (hasCreds) {
    admin = require("firebase-admin");
    const apps = Array.isArray(admin.apps)
      ? admin.apps
      : typeof admin.getApps === "function"
        ? admin.getApps()
        : [];
    if (!apps.length) admin.initializeApp();
    firebaseReady = true;
  }
} catch (e) {
  admin = null;
  firebaseReady = false;
  console.warn("[auth] Firebase Admin unavailable:", e.message);
}

// Reject anything that is not a well-formed JWT before spending a network round
// trip on it.
function looksLikeJwt(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
    return !!payload && typeof payload === "object";
  } catch {
    return false;
  }
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms)),
  ]);
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing auth token" });

  // 0. App session token (HS256, signed with SUPABASE_JWT_SECRET) — issued by
  //    /api/auth/otp/verify. This is the common case for real logins.
  const sess = verifyToken(token);
  if (sess) {
    try {
      const { data: user } = await supabase.from("users").select("*").eq("id", sess.id).maybeSingle();
      req.user = {
        id: sess.id,
        email: user?.email || null,
        user_metadata: { full_name: user?.full_name || "", phone: user?.phone || sess.phone || "" },
      };
      return next();
    } catch (e) {
      req.user = { id: sess.id, email: null, user_metadata: { phone: sess.phone || "" } };
      return next();
    }
  }

  // Legacy dev mock token — only honoured when ALLOW_MOCK_AUTH=true.
  if (token.startsWith("MOCK-USER-ID-")) {
    if (!ALLOW_MOCK) return res.status(401).json({ error: "Invalid or expired token" });
    const userId = token.replace("MOCK-USER-ID-", "");
    try {
      const { data: user } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();
      req.user = {
        id: userId,
        email: user?.email || "mockuser@example.com",
        user_metadata: {
          full_name: user?.full_name || "Mock Devotee",
          phone: user?.phone || "9999999999",
        },
      };
    } catch (e) {
      req.user = {
        id: userId,
        email: "mockuser@example.com",
        user_metadata: { full_name: "Mock Devotee", phone: "9999999999" },
      };
    }
    return next();
  }

  // Past here we need a real JWT to hand to Firebase / Supabase. Bail early on
  // anything malformed so a stale token fails fast instead of hanging.
  if (!looksLikeJwt(token)) return res.status(401).json({ error: "Invalid or expired token" });

  // 1. Firebase Admin token verification (only if a service account is configured)
  if (firebaseReady && admin) {
    try {
      const decodedToken = await withTimeout(admin.auth().verifyIdToken(token), 5000, "Firebase verify");
      req.user = {
        id: decodedToken.uid,
        email: decodedToken.email,
        user_metadata: {
          full_name: decodedToken.name || "",
          phone: decodedToken.phone_number || "",
        },
      };
      return next();
    } catch (e) {
      // Not a valid Firebase token — fall through to Supabase.
    }
  }

  // 2. Supabase access token verification
  try {
    const { data, error } = await withTimeout(supabase.auth.getUser(token), 8000, "Supabase getUser");
    if (error || !data.user) return res.status(401).json({ error: "Invalid or expired token" });
    req.user = data.user; // { id, email, ... }
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = requireAuth;
