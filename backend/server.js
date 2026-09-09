// server.js — Nakshra backend entry point
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { apiLimiter } = require("./middleware/rateLimit");
const { reportError } = require("./services/errorReporter");
// Capture logs in memory for debugging
global.debugLogs = [];
const originalLog = console.log;
const originalError = console.error;

const safeStringify = (val) => {
  try {
    if (typeof val === "object" && val !== null) {
      return JSON.stringify(val);
    }
    return String(val);
  } catch (e) {
    return `[Unstringifiable: ${e.message}]`;
  }
};

console.log = (...args) => {
  global.debugLogs.push({ time: new Date().toISOString(), type: "log", msg: args.map(safeStringify).join(" ") });
  if (global.debugLogs.length > 200) global.debugLogs.shift();
  originalLog.apply(console, args);
};

console.error = (...args) => {
  global.debugLogs.push({ time: new Date().toISOString(), type: "error", msg: args.map(safeStringify).join(" ") });
  if (global.debugLogs.length > 200) global.debugLogs.shift();
  originalError.apply(console, args);
};

const app = express();

// Render / Vercel terminate TLS at a proxy — trust it so req.ip and the rate
// limiter see the real client address, not the proxy's.
app.set("trust proxy", 1);

// Security headers. CSP is left off here because this service only serves JSON
// (the SPA is on Vercel); enable a policy if HTML is ever served from here.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  frameguard: { action: "deny" },
}));

// CORS — allow the known frontends plus anything in CORS_ALLOWED_ORIGINS
// (comma-separated). If neither the env nor the defaults match, the request is
// rejected. Set CORS_ALLOW_ALL=true only for throwaway debugging.
const DEFAULT_ORIGINS = [
  "https://nakshra.in",
  "https://www.nakshra.in",
  "https://nakshra.onrender.com",
];
const envOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const allowedOrigins = new Set([...DEFAULT_ORIGINS, ...envOrigins]);
const allowVercelPreviews = /\.vercel\.app$/i; // *.vercel.app preview builds

app.use(
  cors({
    credentials: true,
    origin(origin, cb) {
      // Non-browser clients (curl, server-to-server, health checks) send no Origin.
      if (!origin) return cb(null, true);
      if (process.env.CORS_ALLOW_ALL === "true") return cb(null, true);
      if (allowedOrigins.has(origin) || allowVercelPreviews.test(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin not allowed: ${origin}`));
    },
  })
);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  next();
});

// Cache-Control — this API is never cacheable.
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  next();
});

// Body parsing. Default cap is small; the kundli route accepts base64 chart
// images so it gets its own generous parser mounted ahead of the global one.
app.use("/api/kundli", express.json({
  limit: "25mb",
  verify: (req, res, buf) => { req.rawBody = buf.toString(); },
}));
app.use(express.json({
  limit: "1mb",
  verify: (req, res, buf) => { req.rawBody = buf.toString(); },
}));
app.use(express.urlencoded({ limit: "1mb", extended: true }));

// Baseline flood protection for the whole API surface. Per-route stricter
// limiters (OTP, chat, kundli) are applied inside their routers.
app.use("/api", apiLimiter);

// ---- Routes ----
app.use("/api/products", require("./routes/products"));
app.use("/api/cart", require("./routes/cart"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/addresses", require("./routes/addresses"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/shiprocket", require("./routes/shiprocket"));
app.use("/api/telemetry", require("./routes/telemetry"));
app.use("/api/chat", require("./routes/chat"));
app.use("/api/recommendations", require("./routes/recommendations"));
app.use("/api/kundli", require("./routes/kundli"));


app.get("/api/health", (req, res) => res.json({ status: "ok", service: "Nakshra-backend" }));

// ---- Global error handling ----
// 404 for unknown /api routes (JSON instead of Express' HTML page)
app.use("/api", (req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
});

// Catch-all error middleware — any error thrown/next(err)'d in a handler lands here
// instead of taking down the process.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  // Rejected CORS origin → 403, not 500.
  if (err && typeof err.message === "string" && err.message.startsWith("CORS:")) {
    return res.status(403).json({ error: "Origin not allowed" });
  }
  // Malformed JSON / oversized body from body-parser → 400, not 500.
  if (err && (err.type === "entity.parse.failed" || err.type === "entity.too.large" || err.status === 400 || err.status === 413)) {
    return res.status(err.status === 413 ? 413 : 400).json({ error: "Invalid or oversized request body", details: err.message });
  }
  console.error("[Unhandled route error]:", err && err.stack ? err.stack : err);
  reportError(err, { path: req.originalUrl, method: req.method });
  res.status(err && err.status ? err.status : 500).json({
    error: "Internal server error",
    details: err && err.message ? err.message : String(err),
  });
});

// Last line of defence: a stray throw in an async callback must not kill the server.
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]:", err && err.stack ? err.stack : err);
  reportError(err, { kind: "uncaughtException" });
});
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]:", reason && reason.stack ? reason.stack : reason);
  reportError(reason, { kind: "unhandledRejection" });
});

const PORT = process.env.PORT || 5000;
// Start a normal HTTP listener everywhere except Vercel's serverless runtime.
// Vercel sets VERCEL=1 and imports the exported app instead of running a server;
// Render (and local dev) need an actual listener bound to process.env.PORT.
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`🕉️  Nakshra backend running on port ${PORT}`));
}

// Export the app for Vercel serverless deployment
module.exports = app;
