// middleware/rateLimit.js — shared express-rate-limit configs.
// Render/Vercel sit behind a proxy, so server.js sets `trust proxy` and these
// limiters key on the real client IP. Every limiter returns JSON (never HTML)
// and is a no-op in the test env so unit tests aren't throttled.
const rateLimit = require("express-rate-limit");

const isTest = process.env.NODE_ENV === "test";

function make({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max: isTest ? 0 : max, // max:0 disables limiting entirely under `node --test`
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isTest,
    handler: (req, res) =>
      res.status(429).json({ error: message || "Too many requests. Please slow down and try again shortly." }),
  });
}

// OTP send: each one costs an SMS once Twilio is live — keep this tight.
// 3 sends / 15 min / IP.
const otpSendLimiter = make({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: "Too many OTP requests. Wait a few minutes before requesting another code.",
});

// OTP verify: no SMS cost, but throttle brute-forcing the 6-digit code.
// 12 attempts / 15 min / IP.
const otpVerifyLimiter = make({
  windowMs: 15 * 60 * 1000,
  max: 12,
  message: "Too many attempts. Wait a few minutes before trying again.",
});

// Chat: burns LLM quota. 20 / 5 min / IP.
const chatLimiter = make({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: "You're sending messages too quickly. Please wait a moment.",
});

// Kundli PDF: heavy (headless Chrome). 10 / 10 min / IP.
const kundliLimiter = make({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: "Too many chart requests. Please wait a few minutes.",
});

// Everything else under /api — a generous ceiling to blunt scrapers/floods
// without affecting normal browsing. 300 / 5 min / IP.
const apiLimiter = make({
  windowMs: 5 * 60 * 1000,
  max: 300,
  message: "Too many requests. Please slow down.",
});

module.exports = { otpSendLimiter, otpVerifyLimiter, chatLimiter, kundliLimiter, apiLimiter };
