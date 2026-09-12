// Feature flags — temporarily hide finished-but-not-launching features.
//
// NOTHING IS DELETED. Every component, route, backend endpoint and translation
// file behind these flags is still in the codebase and still works; the flag
// only controls whether the entry point is rendered. Flip a flag back to `true`
// (and redeploy) to bring the feature back exactly as it was.
//
// A flag can also be forced on per-environment without a code change, via a
// Vite env var — handy for showing a hidden feature on staging only:
//   VITE_FEATURE_CHAT=true  VITE_FEATURE_KUNDLI=true  VITE_FEATURE_I18N=true

// Each flag must read `import.meta.env.VITE_...` as a literal member expression.
// Vite substitutes these at build time by matching that exact shape, so a
// dynamic lookup — `(import.meta as any)?.env?.[key]` — is never substituted and
// leaves `import.meta.env` as an empty object. That is what the first version of
// this file did, which meant the env override below silently did nothing and
// every flag always took its fallback. It went unnoticed only because the
// fallback happened to be the value we wanted.
function flag(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value).toLowerCase() === "true";
}

/** AstroGuide AI chat widget (floating bubble on Home + all routes). */
export const FEATURE_CHAT = flag(import.meta.env.VITE_FEATURE_CHAT, false);

/** "Make My Kundli" nav entry + the birth-chart PDF modal. */
export const FEATURE_KUNDLI = flag(import.meta.env.VITE_FEATURE_KUNDLI, false);

/** Language translator dropdown (Nav + auth page). App stays in the default language. */
export const FEATURE_I18N = flag(import.meta.env.VITE_FEATURE_I18N, false);

/** Home: "From Earth to Sacred Artifact" — the 5-step craftsmanship section. */
export const FEATURE_CRAFTSMANSHIP = flag(import.meta.env.VITE_FEATURE_CRAFTSMANSHIP, false);

/** Home: the community section where visitors post reviews/comments. */
export const FEATURE_REVIEWS = flag(import.meta.env.VITE_FEATURE_REVIEWS, false);
