// server.js — Nakshra backend entry point
require("dotenv").config();
const express = require("express");
const cors = require("cors");
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

app.use(cors({ origin: true, credentials: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  next();
});

// Standard Security & Cache-Control Headers Middleware
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  next();
});

// Keep raw body for Razorpay webhook signature verification & allow large image payloads
app.use(express.json({
  limit: "50mb",
  verify: (req, res, buf) => { req.rawBody = buf.toString(); },
}));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

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
  // Malformed JSON / oversized body from body-parser → 400, not 500.
  if (err && (err.type === "entity.parse.failed" || err.status === 400)) {
    return res.status(400).json({ error: "Invalid request body", details: err.message });
  }
  console.error("[Unhandled route error]:", err && err.stack ? err.stack : err);
  res.status(err && err.status ? err.status : 500).json({
    error: "Internal server error",
    details: err && err.message ? err.message : String(err),
  });
});

// Last line of defence: a stray throw in an async callback must not kill the server.
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]:", err && err.stack ? err.stack : err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]:", reason && reason.stack ? reason.stack : reason);
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
