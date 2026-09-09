// services/errorReporter.js — minimal error reporting to Sentry over raw HTTP.
// Zero-dependency, mirrors the notify.js / otp.js pattern: fully no-op until
// SENTRY_DSN is set, so nothing breaks when it's unconfigured.
//
// Env:
//   SENTRY_DSN            e.g. https://<publicKey>@o123.ingest.sentry.io/456
//   SENTRY_ENVIRONMENT    optional label (default: NODE_ENV || "production")
//   RENDER_GIT_COMMIT     picked up automatically as the release when present
//
// Not a replacement for the @sentry/node SDK (no tracing, no breadcrumbs,
// no automatic instrumentation) — just enough to see unhandled errors in prod.

let endpoint = null;
let authHeader = null;
try {
  const dsn = process.env.SENTRY_DSN;
  if (dsn) {
    const u = new URL(dsn);
    const publicKey = u.username;
    const projectId = u.pathname.replace(/^\/+/, "");
    endpoint = `${u.protocol}//${u.host}/api/${projectId}/store/`;
    authHeader =
      `Sentry sentry_version=7, sentry_client=nakshra-raw/1.0, sentry_key=${publicKey}`;
  }
} catch (e) {
  console.warn("[errorReporter] invalid SENTRY_DSN — error reporting disabled:", e.message);
  endpoint = null;
}

const isEnabled = () => !!endpoint;

/**
 * Fire-and-forget. `err` is an Error (or anything). `context` is a small plain
 * object merged into `extra`.
 */
function reportError(err, context = {}) {
  if (!endpoint) return;
  try {
    const e = err instanceof Error ? err : new Error(String(err));
    const payload = {
      event_id: cryptoRandomHex(),
      timestamp: new Date().toISOString(),
      platform: "node",
      level: "error",
      logger: "nakshra-backend",
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "production",
      release: process.env.RENDER_GIT_COMMIT || undefined,
      server_name: process.env.RENDER_SERVICE_NAME || undefined,
      exception: {
        values: [
          {
            type: e.name || "Error",
            value: e.message || String(e),
            stacktrace: { frames: parseStack(e.stack) },
          },
        ],
      },
      extra: context,
    };
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Sentry-Auth": authHeader },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch (_) {
    // never let the reporter throw
  }
}

function cryptoRandomHex() {
  return require("crypto").randomBytes(16).toString("hex");
}

// Sentry wants innermost frame last.
function parseStack(stack) {
  if (!stack) return [];
  return String(stack)
    .split("\n")
    .slice(1)
    .map((line) => {
      const m = line.match(/at (?:(.+?) )?\(?(.+?):(\d+):(\d+)\)?$/);
      if (!m) return null;
      return { function: m[1] || "?", filename: m[2], lineno: Number(m[3]), colno: Number(m[4]) };
    })
    .filter(Boolean)
    .reverse();
}

module.exports = { reportError, isEnabled };
