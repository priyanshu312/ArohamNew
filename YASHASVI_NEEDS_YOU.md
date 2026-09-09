# Yashasvi — things that need YOU (manual action items)

_This is the **single** running list of things Claude Code cannot do autonomously.
Everything else is being tested + fixed automatically on the `Yashasvi` branch.
Last updated: 2026-09-09_

---

## 🔴 Blocks a real, money-handling launch

| # | Item | What exactly you need to do | Status |
|---|------|------------------------------|--------|
| 1 | **Twilio Verify — real SMS** | The OTP code + endpoints are wired. To send **real** SMS instead of the dev `111111` code, set on the Render service `nakshra-backend-yashasvi`: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`, and `SUPABASE_JWT_SECRET` (Supabase → Project Settings → API → JWT Secret / "Legacy JWT secret"). Then set `OTP_FORCE_MOCK=false` (or remove it). Until you do, staging keeps accepting `111111`. | ⏳ waiting on you to paste the 4 values / set them |
| 2 | **Razorpay live keys** | Current keys are `rzp_test_…`. Live keys (`rzp_live_…`) need Razorpay **business KYC** approved. Same code — only the prod env values change. | ⏳ KYC |
| 3 | **Email provider key** | Sign up for Resend (or Brevo/Postmark), verify a sending domain, give me `RESEND_API_KEY` + an `ORDER_EMAIL_FROM` address. Order-confirmation email code is done and no-ops until then. | ⏳ |
| 4 | **Shiprocket** | `SHIPROCKET_ENABLED=false`, no creds. Orders confirm but nothing ships. Give me a Shiprocket account's `SHIPROCKET_EMAIL` / `SHIPROCKET_PASSWORD` / `SHIPROCKET_PICKUP_PINCODE`, or confirm you'll fulfil manually. | ⏳ |
| 5 | **Keep-warm hosting** | Render free services (backend + Gorse) sleep after 15 min idle → first hit takes 30–50 s. Bump each to **Starter (~$7/mo)** before real traffic. The free Gorse Postgres also expires ~90 days after creation. | ⏳ |
| 6 | **Say "promote to main"** | The `Yashasvi → main` merge + setting prod env vars is your call and your gate. Nothing touches `main`, prod Render/Vercel, or the Namecheap DNS until you say so. | ⏳ |

## 🟡 Should-do, needs your hands (DB / dashboards)

| # | Item | What exactly you need to do | Status |
|---|------|------------------------------|--------|
| 7 | **Delete test users** | Run `infra/db/2026-09-09_cleanup_test_data.sql` in the Supabase SQL editor (Aroham project). Removes ~12 throwaway test users. Claude is blocked from running DELETEs. | ⏳ |
| 8 | **Decide `ArohamNew`** | Empty Supabase project `iveltpgympaucqypfyxi`. Delete it, or tell me to migrate the real schema into it. Data currently lives in **Aroham** (`lzzdfsphevmzbkkoskxb`). | ⏳ |

---

## ✅ Done / no longer needs you
- Webhook DoS crash — fixed
- `getEnv()` env-var no-op — fixed
- Firestore stub crash on signup — fixed
- Groq model 404 — fixed (`qwen/qwen3.8-27b`)
- Kundli PDF Chrome-not-found — fixed
- Gorse hosted + trained + feedback loop live
- Razorpay order/verify/webhook hardening — done
- DB security-hardening migration — applied by you
- Real phone-OTP login via Twilio Verify + signed session tokens — code merged (needs #1 for real SMS)

---

## 🐞 Bug-hunt log (Claude is fixing these autonomously — no action from you)

_Session 2026-09-09, testing the live Yashasvi backend + web build._

### Fixed & deployed to Yashasvi
| Bug | Impact | Fix | Verified |
|-----|--------|-----|----------|
| `POST /api/orders/:id/cancel` did not exist | "Cancel order" in Profile faked success; order stayed active, stock stayed reserved | New route (ownership + status guard + stock release + REFUND_PENDING). ProfilePage surfaces real errors now. `94f768a` | ✅ live: 200 / idempotent / 404 / 401 |
| Recommendation endpoints returned raw DB rows | "Recommended for you" showed 100× price (paise) and no MRP; snake_case keys | `backend/services/productFormat.js` — one mapper for `/products` + all 3 recommendation maps. `94f768a` | ✅ live: `price:999`, `original`, `shortDesc` |
| `DELETE /api/cart` (clear cart) had no route | Cart not cleared server-side after checkout; bought items reappeared next load | Added `DELETE /api/cart` (all non-temp, or `?temp=true`). `13e9a3b` | ✅ live: cart → `[]` |
| `logout()` didn't clear `Nakshra_auth_token` | 45-day OTP JWT stayed in localStorage → user still authed to backend after logout (shared-device risk) | `logout()` now removes it. `13e9a3b` | ✅ typecheck |
| `/api/telemetry/click` sent numeric ids to Gorse | Gorse rejected (`cannot unmarshal number`); every product-card view dropped from recommender, but returned `{success:true}` | Both telemetry routes now use `gorseFeedback.sendFeedback()` which `String()`s ids. `1199482` | ⏳ deploying |

> **Note:** a separate autonomous hardening agent is also running against this
> tree (rate-limiting on OTP endpoints, an error reporter, an RLS-lockdown SQL
> migration, backend tests, `%VITE_ROBOTS%` fixed via a `vite.config.ts` plugin,
> SEO/OG meta tags, chat/kundli/shiprocket hardening). Its work is **uncommitted**
> in the working tree as of this writing — it will land in its own commits. This
> bug-hunt keeps to a separate set of files to avoid collisions.

### Observed, not a bug (no fix needed)
- `/api/admin/onboarding/applications` (astrologer onboarding) has no backend route, but every caller guards with `if (res.ok)` + falls back to a direct Supabase write. It's an optional sync to a separate admin service (port 5001) that isn't part of this deployment.
- `POST /api/cart` doesn't validate `qty` is a positive int — frontend always sends a valid `qty`, so low priority hardening only.
- Anonymous product-card views all collapse to one Gorse user `"anonymous_user"` (ShopPage uses a per-guest id). Minor personalization gap, not broken.

### Still checking
- Full checkout → Razorpay → `/payments/verify` → order CONFIRMED path with a real token
- Addresses CRUD (`/api/addresses/:id` PUT/DELETE)
- Shiprocket serviceability/track endpoints
- Kundli payload edge cases
