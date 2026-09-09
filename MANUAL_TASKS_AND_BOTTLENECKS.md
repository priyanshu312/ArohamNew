# Nakshra — Manual Tasks & Launch Bottlenecks

_Last updated: 2026-09-09 · Branch: `Yashasvi` (staging) · Nothing here touches `main` / prod / DNS until you say "promote to main"._

This file lists **only what a human must do** and **what is blocked by third parties**
(payment KYC, provider approvals, paid plans, dashboard access). Everything else is
being built/tested on `Yashasvi` automatically.

Legend: 🔴 blocks a real money-handling launch · 🟠 should-fix before real traffic · 🟢 polish

---

## 1. Hard bottlenecks — blocked by an external party's approval / time

These have a **lead time you cannot compress**. Start them first.

| # | Bottleneck | Blocked by | Typical wait | What it blocks | Status |
|---|---|---|---|---|---|
| B1 | 🔴 **Razorpay live keys** (`rzp_live_…`) | Razorpay **business KYC** review (PAN, GST/registration, bank account, business proof) | 2–7 business days after full submission | Taking **real payments**. Test keys work end-to-end today; only the env values change at go-live. | Not started / in review — _you fill in_ |
| B2 | 🔴 **Razorpay account activation content check** | Razorpay compliance team reviews your **live site** for Terms, Privacy, Refund/Cancellation, Shipping, Contact (with business name + address + support contact) | Same review cycle as B1 | Same as B1 — activation is withheld if these pages are missing/thin | Pages exist in code (`/terms`, `/privacy`, `/return-policy`, `/shipping-policy`, `/contact`). **You must confirm the copy is real and complete.** |
| B3 | 🔴 **SMS OTP delivery to Indian numbers** | Twilio **India compliance** — trial accounts cannot deliver SMS to +91 without an approved **Primary Compliance Profile / Sender ID (DLT)**. Alternative: **MSG91** (India-native, faster). | Twilio: days–weeks for DLT/sender approval. MSG91: often 1–3 days. | Real login. Right now staging accepts the dev code `111111` (`OTP_FORCE_MOCK=true`). Code + endpoints are done and tested. | Decide provider → get it approved → give creds → flip the mock flags off |
| B4 | 🔴 **Razorpay production webhook** | Needs the **prod backend URL** to exist (i.e. after promotion to `main`) | Minutes, but can only happen at promotion | Server-side payment confirmation in prod. Staging webhook is already configured + tested. | Do during promotion (step P4 below) |
| B5 | 🟠 **Custom domain on the new stack** | Namecheap DNS is already pointed at the **existing prod** service. Promotion reuses that service, so DNS is untouched — but if you ever move hosting, DNS propagation is 30 min–48 h. | n/a if you follow the promotion plan | — | No action unless hosting moves |

---

## 2. External accounts you must create / upgrade

Each row = sign up, verify, hand over the credential. Then the corresponding
feature switches on (code is already written and no-ops until configured).

| # | Service | Why | Credentials needed | Unblocks | Status |
|---|---|---|---|---|---|
| A1 | 🔴 **Twilio (paid) or MSG91** | Real SMS OTP — see B3 | Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` (already given for the trial). MSG91: API key + template/sender IDs (would need a small adapter — ~2 h). | Login without the `111111` shortcut | Trial creds in hand; **needs paid upgrade + India compliance** |
| A2 | 🔴 **Razorpay** (live mode) | See B1/B2 | `RAZORPAY_KEY_ID` (`rzp_live_…`), `RAZORPAY_KEY_SECRET`, a fresh `RAZORPAY_WEBHOOK_SECRET` for prod | Real payments | Test mode working; **KYC pending** |
| A3 | 🔴 **Resend** (or Brevo / Postmark / SES) | Order-confirmation emails | `RESEND_API_KEY` + a **verified sending domain** → `ORDER_EMAIL_FROM` (e.g. `orders@nakshra.in`) | Customers get order receipts. Until then the send is a logged no-op. | Not started |
| A4 | 🔴 **Shiprocket** (or confirm manual fulfilment) | Actually shipping orders | `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD`, `SHIPROCKET_PICKUP_PINCODE`, then set `SHIPROCKET_ENABLED=true` | Auto-dispatch on payment confirmation. Orders confirm but **nothing ships** today. | `SHIPROCKET_ENABLED=false`, no creds |
| A5 | 🟠 **Sentry** | Error monitoring (backend live, frontend after a 30-min wiring task) | `SENTRY_DSN` (+ optional `SENTRY_ENVIRONMENT`) | Visibility into prod errors. Currently flying blind. | Backend scaffold in place, no-op until DSN |
| A6 | 🟠 **Google Analytics 4** or **Plausible** | Funnel / traffic data | GA4 Measurement ID **or** Plausible domain | Knowing what users do. Zero analytics installed. | Not started (I wire it once you pick + provide the ID) |
| A7 | 🟢 **Razorpay** — decide UPI/cards/wallets/netbanking mix | Payment method availability | Toggle in Razorpay dashboard | Which methods show at checkout | Default set is fine to launch |

---

## 3. Manual dashboard / database actions (you have the access, I don't)

| # | Action | Where | Why I can't do it | Status |
|---|---|---|---|---|
| D1 | 🟠 Run `infra/db/2026-09-09_cleanup_test_data.sql` | Supabase SQL editor — **Aroham** project (`lzzdfsphevmzbkkoskxb`) | `DELETE` via the tool is blocked by the auto-mode classifier | ~12 throwaway users + the OTP e2e users (`9xxxxxxxxx@Nakshra.in`) still in the DB |
| D2 | 🔴 Run `infra/db/2026-09-10_rls_lockdown.sql` | Supabase SQL editor — Aroham | DDL blocked by classifier **AND** it's not safe yet — see §5 R1 | File written and ready; **do not run until the write-refactor lands** |
| D3 | 🟠 Set prod backend env vars (at promotion) | Render dashboard → prod `Nakshra` service | Prod service is off-limits until you say so; Yashasvi vars are branch-scoped and don't carry over | Pending promotion |
| D4 | 🟠 Set prod frontend env vars (at promotion) | Vercel → production scope | Same | Pending promotion |
| D5 | 🟠 Add `VITE_ROBOTS=noindex, nofollow` to the **preview/Yashasvi** Vercel scope | Vercel → project → Environment Variables (Preview) | So staging stays out of Google. Prod default is `index, follow`. | Not set |
| D6 | 🟢 Decide the empty **`ArohamNew`** Supabase project (`iveltpgympaucqypfyxi`) | Supabase dashboard | It's empty; delete it or make it the real DB. Data currently lives in **Aroham**. | Undecided |
| D7 | 🟢 Point `GORSE_URL` for prod (shared vs separate Gorse) | Render, at promotion | Decision: reuse `nakshra-gorse` or deploy a second instance for prod | Undecided |

---

## 4. Cost decisions (money, not technical)

| # | Item | Cost | Why it matters | Status |
|---|---|---|---|---|
| C1 | 🟠 Render **Starter** plan for the backend | ~$7/mo | Free tier sleeps after 15 min idle → first request 30–50 s; already caused one Razorpay cold-start failure | Free |
| C2 | 🟠 Render **Starter** plan for Gorse | ~$7/mo | Same cold-start problem for recommendations | Free |
| C3 | 🔴 **Gorse Postgres** (free) expires ~90 days after creation | Upgrade cost TBD | Recommendations DB disappears when it expires | Free, created ~2026-09-09 → expires ~2026-12-08 |
| C4 | 🟢 Backend RAM bump to 2 GB | Render plan delta | Only if Kundli PDF (headless Chrome) is a launch feature under load — it's fragile on 512 MB | 512 MB |
| C5 | 🟢 Twilio / MSG91 SMS spend | ~₹0.12–0.20 per OTP | Ongoing per-login cost | n/a until A1 |
| C6 | 🟢 Razorpay fees | ~2% + GST per transaction | Standard | n/a |

---

## 5. Work that is on me, but gated on your decision

| # | Task | Why it's blocked | Effort | Trigger |
|---|---|---|---|---|
| R1 | 🔴 **Move ~35 direct DB writes server-side + apply RLS lockdown** | The web app writes `users` / `orders` / `addresses` / `user_carts` / `user_wishlists` / `subscribers` directly with the **anon key** (which ships in the JS bundle). Every RLS policy on those tables is currently `USING (true)` — so **anyone can read every user's phone, email, DOB, address and every order**. Locking RLS breaks the app until the writes move behind the authed backend, because the OTP login doesn't create a Supabase auth session (`auth.uid()` is NULL). | ~1–2 days | You say "do the RLS refactor" |
| R2 | 🟠 Frontend Sentry wiring (`@sentry/react`) | Needs the DSN from A5 | ~30 min | A5 done |
| R3 | 🟠 Analytics wiring | Needs the ID from A6 | ~30 min | A6 done |
| R4 | 🟢 `sitemap.xml` (build-time from product list) | Low priority, needs final domain | ~30 min | On request |
| R5 | 🟢 MSG91 adapter (if you pick MSG91 over Twilio) | Provider decision | ~2 h | A1 decision = MSG91 |

---

## 6. Product / content sign-off (only you can judge)

| # | Item | Status |
|---|---|---|
| S1 | 🔴 Verify the **23-product catalog** — images load, prices correct (₹, not paise), stock counts real, descriptions final | Needs your review |
| S2 | 🔴 Legal page **copy** is real & complete (Terms, Privacy, Refund/Cancellation, Shipping, Contact — with business name, address, support email/phone) | Pages exist; copy unverified |
| S3 | 🟠 Support contact that actually reaches you (email/phone/WhatsApp on the site) | Unverified |
| S4 | 🟢 Favicon / OG image — placeholder Om mark added; swap for final brand art if you have it | Placeholder in place |

---

## 7. The promotion gate (`Yashasvi → main`) — your call, do these in order

1. **You say "promote to main."**
2. Open a **PR `Yashasvi → main`**, review the full diff.
3. Merge → the existing prod `Nakshra` Render service + prod Vercel auto-build. **No new services. Namecheap DNS untouched.**
4. Set **prod backend env vars** (branch-scoped Yashasvi vars do NOT carry over):
   `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_JWT_SECRET`,
   `TWILIO_*` (live), `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` (live + fresh webhook secret),
   `GROQ_API_KEY`, `LLM_MODEL=qwen/qwen3.8-27b`, `GORSE_URL`,
   `PUPPETEER_CACHE_DIR=/opt/render/project/src/backend/.cache/puppeteer`,
   `NODE_VERSION=22`, `ENABLE_DEBUG_ROUTES=false`,
   `CORS_ALLOWED_ORIGINS=https://nakshra.in,https://www.nakshra.in`,
   **and REMOVE** `ALLOW_MOCK_AUTH` and `OTP_FORCE_MOCK` (or set them to `false`),
   optional: `RESEND_API_KEY` / `ORDER_EMAIL_FROM`, `SENTRY_DSN`.
5. Set **prod Vercel env vars** (production scope): `VITE_API_BASE` / `VITE_API_BASE_URL` / `VITE_ADMIN_API_URL` / `VITE_RAZORPAY_KEY_ID` / `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. Leave `VITE_ROBOTS` unset (defaults to `index, follow`).
6. Re-create the **Razorpay webhook** → `https://nakshra.onrender.com/api/payments/webhook` with its own secret (B4).
7. Decide prod Gorse (D7); deploy the blueprint or point `GORSE_URL` at the shared instance.
8. Smoke-test the live domain end-to-end: browse → add to cart → login (real OTP) → checkout → pay (live ₹1 test) → order confirmed → email received → (fulfilment).

---

## Quick "critical path" ordering

1. **Today:** start Razorpay KYC (B1/B2), sign up Resend (A3), decide Twilio-vs-MSG91 and start that approval (B3/A1). These have the longest external waits.
2. **This week:** verify catalog + legal copy (S1/S2), pick analytics (A6), decide Shiprocket vs manual (A4), tell me to start the RLS refactor (R1).
3. **When KYC + OTP provider clear:** flip mock flags off, upgrade Render plans (C1/C2), run test-data cleanup (D1).
4. **Then:** say "promote to main" and follow §7.
