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

## Should-fix soon (not launch-blocking, I can do most of these on your word)

- Move `users` / `orders` / `addresses` writes fully server-side, then tighten their RLS (the frontend currently writes them directly with the anon key — big-ish refactor).
- Real error monitoring (Sentry) on backend + frontend.
- Bump backend to 2 GB if kundli PDF is a launch feature.
- Run `infra/db/2026-09-09_cleanup_test_data.sql` in Supabase (removes ~12 throwaway test users — I'm blocked from running DELETEs).
- Decide `ArohamNew` (empty Supabase project) — delete it or migrate the schema if it was meant to be the real one.
- Gorse "popular" list needs a RediSearch Redis (nothing uses it directly today).
