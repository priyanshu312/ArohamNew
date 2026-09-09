// Unit tests for the app session token (services/session.js).
// Run: pnpm test   (node --test)
const { test } = require("node:test");
const assert = require("node:assert/strict");

process.env.SUPABASE_JWT_SECRET = "test-secret-value-for-unit-tests-only-000";
const { issueToken, verifyToken } = require("../services/session");

test("issueToken → verifyToken round trip", () => {
  const token = issueToken("user-123", "9876543210");
  assert.equal(token.split(".").length, 3, "is a 3-segment JWT");
  const claims = verifyToken(token);
  assert.ok(claims, "verifies");
  assert.equal(claims.id, "user-123");
  assert.equal(claims.phone, "9876543210");
});

test("verifyToken rejects a tampered payload", () => {
  const token = issueToken("user-123");
  const [h, , s] = token.split(".");
  const forged = Buffer.from(JSON.stringify({ sub: "attacker", role: "authenticated", exp: 9999999999 }))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  assert.equal(verifyToken(`${h}.${forged}.${s}`), null);
});

test("verifyToken rejects a token signed with a different secret", () => {
  const crypto = require("node:crypto");
  const b64 = (b) => Buffer.from(b).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const h = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const p = b64(JSON.stringify({ sub: "x", exp: Math.floor(Date.now() / 1000) + 60 }));
  const sig = b64(crypto.createHmac("sha256", "the-wrong-secret").update(`${h}.${p}`).digest());
  assert.equal(verifyToken(`${h}.${p}.${sig}`), null);
});

test("verifyToken rejects an expired token", () => {
  const crypto = require("node:crypto");
  const b64 = (b) => Buffer.from(b).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const h = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const p = b64(JSON.stringify({ sub: "x", exp: Math.floor(Date.now() / 1000) - 10 }));
  const sig = b64(crypto.createHmac("sha256", process.env.SUPABASE_JWT_SECRET).update(`${h}.${p}`).digest());
  assert.equal(verifyToken(`${h}.${p}.${sig}`), null);
});

test("verifyToken rejects junk", () => {
  assert.equal(verifyToken("not.a.jwt"), null);
  assert.equal(verifyToken("only-one-segment"), null);
  assert.equal(verifyToken(""), null);
  assert.equal(verifyToken(null), null);
});
