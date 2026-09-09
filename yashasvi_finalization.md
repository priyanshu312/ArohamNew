# Yashasvi → main: finalization status

_Updated 2026-09-09_

## What runs end-to-end on Yashasvi right now

| Flow | State |
|---|---|
| Browse / product pages / search | ✅ 23 products from Aroham |
| **Personalized recommendations** | ✅ Gorse hosted (`nakshra-gorse.onrender.com`), model fitted, feedback loop live (cart→`like`, checkout→`buy`, view→`view_product`) |
| Signup / login | ✅ **mock OTP `111111`** (see "needs you" #1) |
| Add to cart / cart page | ✅ persists to DB |
| Checkout → shipping → payment | ✅ |
| **Razorpay** — order create, modal, verify, **webhook** | ✅ both confirmation paths tested; order → CONFIRMED/SUCCESS; webhook signature-verified; server no longer crashable |
| Order rollback on gateway failure | ✅ new — `failOrder()` releases stock instead of a stuck PENDING order |
| Order confirmation email | ⚙️ scaffolded — `services/notify.js`, no-op until `RESEND_API_KEY` + `ORDER_EMAIL_FROM` set |
| Chat (AstroGuide) | ✅ real Groq `qwen/qwen3.8-27b` |
| Kundli PDF | ✅ ~850 KB (fragile on 512 MB under load) |
| DB security | ✅ migration applied — `reviews` RLS, cascade-delete RPCs locked, `search_path` pinned |

## Deployed pieces (all preview infra — nothing touches prod)

- Backend: `nakshra-backend-yashasvi.onrender.com` (Render, free) — branch `Yashasvi`, DB = Supabase **Aroham** (`lzzdfsphevmzbkkoskxb`)
- Gorse: `nakshra-gorse.onrender.com` + `nakshra-gorse-db` (Render, free) — Postgres-only, no Redis
- Frontend: Vercel `aroham-new-web-hdkx` **preview** for branch `Yashasvi`, SSO off, 7 branch-scoped `VITE_*` vars

## Promotion plan (Yashasvi → main)

1. **PR `Yashasvi → main`**, review the diff (backend hardening, Gorse infra, payment integration, Firestore-stub fix, CI).
2. On merge, the existing **`Nakshra` prod Render service** (`nakshra.onrender.com`, branch `main`) and **prod Vercel** auto-build — no new services, the Namecheap domain is untouched.
3. **Set prod env vars** (the Yashasvi ones are branch-scoped and do not carry over):
   - Prod backend: `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET`, `GROQ_API_KEY`, `LLM_MODEL=qwen/qwen3.8-27b`, `GORSE_URL`, `PUPPETEER_CACHE_DIR=/opt/render/project/src/backend/.cache/puppeteer`, `ENABLE_DEBUG_ROUTES=false`, `NODE_VERSION=22`, (optional) `RESEND_API_KEY` + `ORDER_EMAIL_FROM`
   - Prod Vercel: production-scoped `VITE_API_BASE` / `VITE_API_BASE_URL` / `VITE_ADMIN_API_URL` / `VITE_RAZORPAY_KEY_ID` / `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
4. Re-create the **Razorpay webhook** pointed at the prod URL (`https://nakshra.onrender.com/api/payments/webhook`) with its own secret.
5. Deploy the Gorse blueprint for prod (or point prod `GORSE_URL` at the existing `nakshra-gorse` — decide shared vs separate).
6. Smoke-test the prod domain end-to-end.

---

## ⛔ What I need from you (blocks a real, money-handling launch)

| # | Item | Detail |
|---|---|---|
| 1 | **Real authentication** | Login is mock OTP. `requireAuth` trusts any `MOCK-USER-ID-<uuid>` token. Need a real SMS-OTP provider (MSG91 / Twilio Verify / Firebase Phone Auth) + real session tokens. This is an integration task, not a config toggle — decide the provider and I'll wire it. |
| 2 | **Razorpay live keys** | Current keys are `rzp_test_…`. Live keys (`rzp_live_…`) need Razorpay **business KYC** approved. Same code — just the prod env values change. |
| 3 | **Email provider key** | Sign up for Resend (or Brevo/Postmark), verify a sending domain, give me `RESEND_API_KEY` + a `ORDER_EMAIL_FROM` address. Then order confirmation emails go out. (Code is done.) |
| 4 | **Shiprocket** | `SHIPROCKET_ENABLED=false`, no creds. Orders confirm but nothing ships. Give me a Shiprocket account's `SHIPROCKET_EMAIL` / `SHIPROCKET_PASSWORD` / `SHIPROCKET_PICKUP_PINCODE`, or confirm you'll fulfil manually. |
| 5 | **Keep-warm hosting** | Render free services (backend + Gorse) sleep after 15 min idle → first hit takes 30–50 s. Bump each to **Starter (~$7/mo)** before real traffic. Also the free Gorse Postgres expires after 90 days. |
| 6 | **Say "promote to main"** | The merge itself + setting prod env vars is your call and your gate. |

## Hardening done 2026-09-09 (commits e3e450b, 81f3468)

- Rate limiting (express-rate-limit): OTP send 3/15m, OTP verify 12/15m, chat 20/5m, kundli 10/10m, 300/5m baseline on /api.
- helmet + trust proxy; CORS locked to an allowlist (prod domains + *.vercel.app) — was reflecting any origin.
- Body limit 50mb → 1mb global; kundli keeps a scoped 25mb parser.
- Sentry scaffold (services/errorReporter.js) — no-op until SENTRY_DSN set.
- Shiprocket test/cancel routes now behind auth + ENABLE_DEBUG_ROUTES.
- Removed hardcoded Supabase key fallbacks (config/supabase.js, gorse seed).
- 13 node:test unit tests (session tokens, OTP, Razorpay sigs) — wired into CI.
- Web: favicon, OG/Twitter/canonical meta, robots.txt, env-driven robots tag.
- Real OTP auth live on Yashasvi (OTP_FORCE_MOCK=true) — 15/15 e2e green.

## Still to do

### Needs the server-side-write refactor first, then me
- `infra/db/2026-09-10_rls_lockdown.sql` is written and ready. It closes the
  wide-open `USING (true)` policies on users/orders/addresses/user_carts/
  user_wishlists/subscribers. Prereq: move the ~35 direct `supabase.from(...)`
  writes in the web app server-side (users → /auth/profile, carts/wishlist →
  new routes, etc.), because the OTP login doesn't set a Supabase auth session
  so `auth.uid()` is NULL for those calls today. ~1–2 days.

### Needs you (see YASHASVI_NEEDS_YOU.md for the live list)
- OTP provider that delivers to Indian numbers (Twilio India compliance/paid, or MSG91) → flip OTP_FORCE_MOCK/ALLOW_MOCK_AUTH off.
- Razorpay live keys (KYC). Email provider key (Resend). Shiprocket creds or "manual fulfilment".
- Keep-warm Render Starter plans (backend + Gorse); free Gorse Postgres expires ~90 days.
- Run `infra/db/2026-09-09_cleanup_test_data.sql` (test users, now includes the OTP e2e users `9xxxxxxxxx@Nakshra.in`).
- Decide `ArohamNew` (empty Supabase project).
- Analytics (GA4/Plausible) — none installed. SEO sitemap.xml.
- Verify the 23-product catalog (images/prices/stock/copy) is launch-ready.
- Say "promote to main".

### Deferred (not launch-blocking)
- Bump backend to 2 GB if kundli PDF is a launch feature.
- Gorse "popular" list needs a RediSearch Redis (nothing uses it directly today).
- Frontend error monitoring (add @sentry/react once you have a DSN).
