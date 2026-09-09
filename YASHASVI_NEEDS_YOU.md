# Yashasvi — things that need YOU (manual action items)

_The **single** running list of things Claude Code cannot do autonomously.
Everything else is being tested + fixed automatically on the `Yashasvi` branch.
(`yashasvi_finalization.md` is the fuller status/promotion doc — this file is
just the "what needs a human" shortlist + the bug-hunt log.)
Last updated: 2026-09-09 ~23:40 IST_

---

## 🔴 Blocks a real, money-handling launch

| # | Item | What exactly you need to do | Status |
|---|------|------------------------------|--------|
| 1 | **Twilio Verify — real SMS** | `SUPABASE_JWT_SECRET` and the 3 `TWILIO_*` values are already set on the Render service (real signed JWTs are being issued, verified live). What's left: Twilio **can't deliver SMS to Indian numbers on a trial account** without an approved Primary Compliance Profile. Either (a) complete Twilio compliance + upgrade the Twilio account, then set `OTP_FORCE_MOCK=false`, or (b) switch to an Indian SMS provider (MSG91 / 2Factor). Until then staging stays on `OTP_FORCE_MOCK=true` (code `111111`). | ⏳ Twilio compliance / provider choice |
| 2 | **Razorpay live keys** | Current keys are `rzp_test_…`. Live keys (`rzp_live_…`) need Razorpay **business KYC** approved. Same code — only the prod env values change. | ⏳ KYC |
| 3 | **Email provider key** | Sign up for Resend (or Brevo/Postmark), verify a sending domain, give me `RESEND_API_KEY` + an `ORDER_EMAIL_FROM` address. Order-confirmation email code is done and no-ops until then. | ⏳ |
| 4 | **Shiprocket** | `SHIPROCKET_ENABLED=false`, no creds. Orders confirm but nothing ships. Give me a Shiprocket account's `SHIPROCKET_EMAIL` / `SHIPROCKET_PASSWORD` / `SHIPROCKET_PICKUP_PINCODE`, or confirm you'll fulfil manually. | ⏳ |
| 5 | **Keep-warm hosting** | Render free services (backend + Gorse) sleep after 15 min idle → first hit takes 30–50 s. Bump each to **Starter (~$7/mo)** before real traffic. The free Gorse Postgres also expires ~90 days after creation. | ⏳ |
| 6 | **Say "promote to main"** | The `Yashasvi → main` merge + setting prod env vars is your call and your gate. Nothing touches `main`, prod Render/Vercel, or the Namecheap DNS until you say so. | ⏳ |

## 🟡 Should-do, needs your hands (DB / dashboards)

| # | Item | What exactly you need to do | Status |
|---|------|------------------------------|--------|
| 7 | **Delete test users** | Run `infra/db/2026-09-09_cleanup_test_data.sql` in the Supabase SQL editor (Aroham project). Removes ~12 throwaway test users + the `98123456xx` numbers this bug-hunt created. Claude is blocked from running DELETEs. | ⏳ |
| 8 | **Apply the RLS-lockdown migration** | The hardening pass wrote `infra/db/2026-09-10_rls_lockdown.sql`. Review it, then run it in the Supabase SQL editor (Aroham). Claude is blocked from `apply_migration`. | ⏳ new |
| 9 | **Decide `ArohamNew`** | Empty Supabase project `iveltpgympaucqypfyxi`. Delete it, or tell me to migrate the real schema into it. Data currently lives in **Aroham** (`lzzdfsphevmzbkkoskxb`). | ⏳ |
| 10 | **Set `OTP_FORCE_MOCK` / `ALLOW_MOCK_AUTH` yourself if they need changing** | The Render env-var API is blocked for Claude by the auto-mode classifier — you (or an allow rule) have to touch these in the Render dashboard. Right now staging has mock auth ON, which is what we want for testing. | ℹ️ info |

---

## ✅ Done / no longer needs you
- Webhook DoS crash — fixed
- `getEnv()` env-var no-op — fixed
- Firestore stub crash on signup — fixed
- Groq model 404 — fixed (`qwen/qwen3.8-27b`)
- Kundli PDF Chrome-not-found — fixed
- Gorse hosted + trained + feedback loop live
- Razorpay order/verify/webhook hardening — done
- DB security-hardening migration (`2026-09-09`) — applied by you
- Real phone-OTP login via Twilio Verify + signed session tokens — merged & live (JWT secret set; needs #1 only for real SMS)
- Stale/foreign bearer tokens hung the request (~70 s) — fixed (`c23355e`)
- Production hardening: rate limits on OTP, helmet, CORS allowlist (`*.vercel.app` + `nakshra.in` allowed, others 403), error reporter — merged (`e3e450b`)
- Favicon / social-meta / `robots.txt` / env-driven robots tag — merged (`81f3468`)

---

## 🐞 Bug-hunt log — 2026-09-09 (Claude, autonomous — no action from you)

Black-box testing the **live** Yashasvi backend (`nakshra-backend-yashasvi.onrender.com`)
+ the local web build. Every fix below is committed, deployed, and re-tested against
the live service.

| Bug | Impact | Fix (commit) | Verified live |
|-----|--------|--------------|---------------|
| `POST /api/orders/:id/cancel` did not exist | "Cancel order" in Profile faked success (`.catch(()=>{})` swallowed the 404); order stayed active, reserved stock never released | New route: ownership + status guard (409 once SHIPPED/DELIVERED), releases reserved/sold stock, flags paid payment `REFUND_PENDING`, idempotent. ProfilePage now shows real errors + dropped the anon-key `supabase.orders` write. `94f768a` | ✅ 200 / idempotent / 404 / 401; stuck test order cleaned |
| Recommendation endpoints returned raw DB rows | "Recommended for you" (ShopPage, ProductDetailPage) showed **100× price** (paise) and no MRP; `original_price`/`short_desc` snake_case keys | `backend/services/productFormat.js` — one mapper for `GET /api/products` + all 3 recommendation maps | `94f768a` | ✅ `price:999`, `original:1198.8`, `shortDesc` set |
| `DELETE /api/cart` (clear whole cart) had no route | Only `DELETE /api/cart/:productId` existed. `clearCart()` after checkout hit a swallowed 404, so `cart_items` stayed in the DB and purchased items reappeared on next load | Added `DELETE /api/cart` (all non-temp items, or `?temp=true`) | `13e9a3b` | ✅ cart → `[]` |
| `logout()` didn't clear `Nakshra_auth_token` | The 45-day phone-OTP JWT stayed in `localStorage`; `api.ts` kept sending it as Bearer → user still authenticated to the backend after "logging out" (shared-device risk) | `logout()` in `shared-auth/AuthContext.tsx` now removes it | `13e9a3b` | ✅ typecheck (client-side) |
| `/api/telemetry/click` sent numeric ids to Gorse | Gorse replied `cannot unmarshal number into ... ItemId of type string`; every product-**card** view was silently dropped from the recommender while the route returned `{success:true}` | Both telemetry routes now use `gorseFeedback.sendFeedback()`, which `String()`s the ids | `1199482` | ✅ clean `{success:true}`, no Gorse error |
| `PUT /api/addresses/:id` for an unknown id → 500 | `.select().single()` on 0 rows → PostgREST "Cannot coerce the result to a single JSON object" → confusing 500 instead of 404 | `.maybeSingle()` + explicit 404. Ownership check unchanged | `6ed481c` | ✅ 404; full CRUD passes |

### Regression sweep after every deploy: **25/25 endpoints green**, `/api/health` stays up through webhook abuse, CORS allowlist correct (`*.vercel.app` + `nakshra.in` ok, `evil.example.com` → 403).

### Observed, not a bug (no fix)
- `/api/admin/onboarding/applications` (astrologer onboarding) has **no backend route**, but every caller guards with `if (res.ok)` and falls back to a direct Supabase write. It's an optional sync to a separate admin service (port 5001) not in this deployment.
- `POST /api/cart` doesn't validate `qty` is a positive int — the frontend always sends a valid `qty`; low-priority hardening only.
- Anonymous product-card views all collapse to one Gorse user `"anonymous_user"` (ShopPage uses a per-guest id instead). Minor personalization gap.
- `AuthPage.tsx` has a now-unreachable "account creation" branch (backend `/otp/verify` already find-or-creates the user). Dead code, not harmful.
- `/api/shiprocket/track/:id` 500s with a raw Shiprocket "email required" body when creds are absent. Cosmetic (Shiprocket is item #4; frontend has a fallback). Left alone — `shiprocket.js` is owned by the hardening pass.

### Not testable from here
- The Vercel `Yashasvi` **preview** is behind Vercel SSO (Hobby plan, no bypass) → can't black-box the deployed frontend. Local `pnpm --filter @nakshra/web build` passes (5.8 s, largest chunk 558 KB). Fix = Vercel Pro or an SSO bypass token (part of item #5-ish infra).
