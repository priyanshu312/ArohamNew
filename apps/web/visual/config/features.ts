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

/** Home: "From Earth to Sacred Artifact" — the 5-step craftsmanship section.
 *  On. Its photos are served from nakshra.in now, not another shop's store. */
export const FEATURE_CRAFTSMANSHIP = flag(import.meta.env.VITE_FEATURE_CRAFTSMANSHIP, true);

/** Home: the carousel of the newest customer reviews. On, because it now reads
 *  real reviews from product_reviews and renders nothing until there are some —
 *  the version that was off mixed in a hard-coded list of made-up testimonials. */
export const FEATURE_REVIEWS = flag(import.meta.env.VITE_FEATURE_REVIEWS, true);

/** Home: "Customer Stories" video testimonials. Still off — and this one cannot
 *  be fixed by swapping photos. Every story in it is invented: eight named
 *  people, their cities, their star ratings and their quotes, for products the
 *  shop does not sell, with durations for videos that do not exist. Turn this on
 *  when there are real customer videos to put in it; until then the real reviews
 *  carousel (FEATURE_REVIEWS) is the honest version of the same idea. */
export const FEATURE_CUSTOMER_STORIES = flag(import.meta.env.VITE_FEATURE_CUSTOMER_STORIES, false);

/** Home: "Not just products. Sacred instruments."
 *  On. Its photos are served from nakshra.in now, not another shop's store. */
export const FEATURE_WHY_NAKSHRA = flag(import.meta.env.VITE_FEATURE_WHY_NAKSHRA, true);
