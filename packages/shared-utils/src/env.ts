// Cross-platform environment variable accessor (Vite Web & React Native / Metro / Node)
//
// Reads, in order:
//   1. process.env[key]            — Node, and Metro/Expo which statically inline it
//   2. import.meta.env[key]        — Vite web build (statically replaced at build time)
// then falls back to the provided default.

// Vite replaces `import.meta.env.X` at build time only when it appears as a literal
// member expression in real module source — never inside a `new Function` string,
// where `import.meta` is also a hard syntax error. Reference it directly and guard
// the whole expression so bundlers that don't define `import.meta` (Metro) don't throw.
function readImportMetaEnv(key: string): string | undefined {
  try {
    // @ts-ignore - import.meta is valid in every ESM target we build for
    const env = typeof import.meta !== "undefined" ? (import.meta as any).env : undefined;
    const val = env ? env[key] : undefined;
    return val == null ? undefined : String(val);
  } catch {
    return undefined;
  }
}

export function getEnv(key: string, fallback: string = ""): string {
  try {
    const g: any =
      typeof globalThis !== "undefined"
        ? globalThis
        : typeof window !== "undefined"
        ? window
        : {};
    if (g.process && g.process.env && g.process.env[key]) {
      return String(g.process.env[key]).replace(/["']/g, "").trim();
    }
  } catch {}

  const metaVal = readImportMetaEnv(key);
  if (metaVal) {
    return metaVal.replace(/["']/g, "").trim();
  }

  return fallback;
}
