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

function flag(envKey: string, fallback: boolean): boolean {
  try {
    const v = (import.meta as any)?.env?.[envKey];
    if (v === undefined || v === null || v === "") return fallback;
    return String(v).toLowerCase() === "true";
  } catch {
    return fallback;
  }
}

/** AstroGuide AI chat widget (floating bubble on Home + all routes). */
export const FEATURE_CHAT = flag("VITE_FEATURE_CHAT", false);

/** "Make My Kundli" nav entry + the birth-chart PDF modal. */
export const FEATURE_KUNDLI = flag("VITE_FEATURE_KUNDLI", false);

/** Language translator dropdown (Nav + auth page). App stays in the default language. */
export const FEATURE_I18N = flag("VITE_FEATURE_I18N", false);
