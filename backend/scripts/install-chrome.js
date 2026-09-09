#!/usr/bin/env node
// postinstall: make sure Puppeteer has a Chrome binary.
// pnpm blocks dependency build scripts, and Render's build skips the download,
// so /api/kundli/generate fails at runtime with "Could not find Chrome".
// Runs `puppeteer browsers install chrome` explicitly. Non-fatal, and skippable
// with SKIP_CHROME_INSTALL=1 (local dev / CI that doesn't need PDF generation).
const { execSync } = require("child_process");

if (process.env.SKIP_CHROME_INSTALL === "1") {
  console.log("[install-chrome] SKIP_CHROME_INSTALL=1 — skipping.");
  process.exit(0);
}

try {
  const bin = require.resolve("puppeteer/lib/cjs/puppeteer/node/cli.js", { paths: [__dirname] });
  execSync(`node "${bin}" browsers install chrome`, { stdio: "inherit" });
} catch (e1) {
  try {
    execSync("npx --yes puppeteer browsers install chrome", { stdio: "inherit" });
  } catch (e2) {
    console.warn("[install-chrome] Chrome install failed (kundli PDF will not work):", e2.message);
    // Non-fatal — don't break the whole install/deploy over the PDF feature.
  }
}
