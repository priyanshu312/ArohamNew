// middleware/auth.js — verifies the app session token (Twilio-OTP flow), plus
// Firebase / Supabase access tokens, sent by the frontend as `Authorization: Bearer`.
const supabase = require("../config/supabase");
const { verifyToken } = require("../services/session");
const ALLOW_MOCK = process.env.ALLOW_MOCK_AUTH === "true";
let admin = null;
try {
  admin = require("firebase-admin");
  if (!admin.apps.length) {
    admin.initializeApp();
  }
} catch (e) {
  // Firebase Admin fallback if service account key is unconfigured
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
          phone: user?.phone || "9999999999"
        }
      };
    } catch (e) {
      req.user = {
        id: userId,
        email: "mockuser@example.com",
        user_metadata: {
          full_name: "Mock Devotee",
          phone: "9999999999"
        }
      };
    }
    return next();
  }

  // 1. Try Firebase Admin token verification
  if (admin && admin.apps.length) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = {
        id: decodedToken.uid,
        email: decodedToken.email,
        user_metadata: {
          full_name: decodedToken.name || "",
          phone: decodedToken.phone_number || ""
        }
      };
      return next();
    } catch (e) {
      // Token is not a valid Firebase token, fallback to Supabase
    }
  }

  // 2. Fallback to Supabase token verification
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: "Invalid or expired token" });

  req.user = data.user; // { id, email, ... }
  next();
}

module.exports = requireAuth;
