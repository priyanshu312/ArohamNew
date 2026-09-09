// App session token — a Supabase-compatible HS256 JWT signed with the project's
// JWT secret, so the existing `supabase.auth.getUser(token)` path and our own
// verify both accept it. Zero-dependency.
//
// Env: SUPABASE_JWT_SECRET  (Supabase dashboard -> Project Settings -> API ->
//      JWT Settings -> JWT Secret)
// Dev fallback: if SUPABASE_JWT_SECRET is unset, issueToken() returns the legacy
//   "MOCK-USER-ID-<id>" string (only honoured by auth middleware when
//   ALLOW_MOCK_AUTH === "true").
const crypto = require("crypto");

const SECRET = () => process.env.SUPABASE_JWT_SECRET;
const TTL_SECONDS = 60 * 60 * 24 * 45; // 45 days

const b64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
const b64urlJson = (obj) => b64url(JSON.stringify(obj));

function issueToken(userId, phone) {
  const secret = SECRET();
  if (!secret) return `MOCK-USER-ID-${userId}`;

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: String(userId),
    role: "authenticated",
    aud: "authenticated",
    iss: "nakshra-otp",
    phone: phone || undefined,
    iat: now,
    exp: now + TTL_SECONDS,
  };
  const data = `${b64urlJson(header)}.${b64urlJson(payload)}`;
  const sig = b64url(crypto.createHmac("sha256", secret).update(data).digest());
  return `${data}.${sig}`;
}

// Returns { id, phone } for a valid token issued by issueToken(), else null.
function verifyToken(token) {
  const secret = SECRET();
  if (!secret || typeof token !== "string" || token.split(".").length !== 3) return null;
  const [h, p, s] = token.split(".");
  const expected = b64url(crypto.createHmac("sha256", secret).update(`${h}.${p}`).digest());
  // constant-time compare
  const a = Buffer.from(s);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(p.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
  } catch {
    return null;
  }
  if (!payload || !payload.sub) return null;
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
  return { id: payload.sub, phone: payload.phone || null };
}

module.exports = { issueToken, verifyToken };
