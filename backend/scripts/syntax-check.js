#!/usr/bin/env node
// Lightweight "typecheck" for the plain-CommonJS backend: byte-compile every
// source .js file with `node --check` so syntax errors and bad requires are
// caught in CI without pulling in a TypeScript toolchain.
const { execFileSync } = require("child_process");
const { readdirSync, statSync } = require("fs");
const { join, relative } = require("path");

const ROOT = join(__dirname, "..");
const SKIP = new Set(["node_modules", ".git", "scripts"]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (entry.endsWith(".js")) out.push(full);
  }
  return out;
}

const files = walk(ROOT);
let failed = 0;

for (const file of files) {
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: ["ignore", "ignore", "pipe"] });
  } catch (err) {
    failed++;
    console.error(`✗ ${relative(ROOT, file)}`);
    console.error(String(err.stderr || err.message).trim());
  }
}

console.log(`${files.length - failed}/${files.length} backend files parsed cleanly.`);
process.exit(failed ? 1 : 0);
