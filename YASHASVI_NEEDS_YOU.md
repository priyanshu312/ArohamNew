# Yashasvi — things that need YOU (manual action items)

_The **single** running list of things Claude Code cannot do autonomously.
Everything else is being tested + fixed automatically on the `Yashasvi` branch.
(`yashasvi_finalization.md` / `MANUAL_TASKS_AND_BOTTLENECKS.md` are fuller status
docs from the hardening pass — this file is the "what needs a human" shortlist +
the bug-hunt log.)
Last updated: 2026-09-10 (OTP switched to email)_

> **Cost rule (your instruction):** free / open-source over paid unless
> unavoidable. The **only** unavoidable paid thing left is **Razorpay** (per-txn
> fee). Login OTP + order email both run on a free email provider (Brevo).

---

## 🔴 Blocks a real, money-handling launch

| # | Item | What you need to do | Cost | Status |
|---|------|---------------------|------|--------|
| 1 | **Brevo key** — powers **login OTP + order-confirmation email** | **1.** Sign up at brevo.com (free, no card). **2.** *Senders, Domains & Dedicated IPs* → add sender `no-reply@nakshra.in` (or an address you control) and verify it; for best delivery also authenticate the `nakshra.in` domain (DNS records → Namecheap). **3.** *SMTP & API → API Keys* → generate (`xkeysib-…`). **4.** On Render (`nakshra-backend-yashasvi`, prod at promotion): `BREVO_API_KEY=xkeysib-…`, `ORDER_EMAIL_FROM=Nakshra <no-reply@nakshra.in>`. **5.** `OTP_FORCE_MOCK=false`. Backend generates + hashes + stores the 6-digit code (`otp_codes` table, 10-min TTL, 5 tries) and emails it. Code done (`6d6f543`), staging on mock `111111` until the key is set. | **$0** (300/day free) | ⏳ get the key |
| 2 | **Razorpay live keys** | KYC done (colleague). Hand me: live **Key ID** + **Key Secret**. Then create a Live webhook → `https://nakshra.onrender.com/api/payments/webhook`, events `payment.captured` + `payment.failed`, with a secret. Vars: `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` (backend) + `VITE_RAZORPAY_KEY_ID` (Vercel prod). | per-txn fee | ⏳ hand me Key ID + Secret |
| 4 | **Shiprocket** *(or confirm manual fulfilment)* | Creds + `SHIPROCKET_ENABLED=true`, **or** just say "we'll ship manually" and this stops being a gap. | Shiprocket has a free plan. Manual fulfilment = $0. | ⏳ decide |
| 5 | **Keep the backend warm** | Free Render sleeps after 15 min → 30–50 s cold start. | **$0 — done:** `.github/workflows/keep-warm.yml` pings backend + Gorse every ~10 min (`0700a4a`/`93a8912`). Activates once it's on `main` (GitHub only runs cron from the default branch); `workflow_dispatch` works now. For a hard guarantee, add cron-job.org (free) at 5 min. Gorse free Postgres still expires ~2026-12-08. | ✅ free pinger committed |
| 6 | **Say "promote to main"** | The `Yashasvi → main` merge + prod env vars is your gate. Nothing touches `main` / prod / DNS until you say so. | — | ⏳ |

## 🟡 Should-do, needs your hands (DB / dashboards)

| # | Item | What you need to do | Free option | Status |
|---|------|---------------------|-------------|--------|
| 7 | **Delete test users** | Run `infra/db/2026-09-09_cleanup_test_data.sql` in the Supabase SQL editor (Aroham). Removes ~12 throwaway users + the `98123456xx` numbers testing created. | — (Claude is blocked from `DELETE`) | ⏳ |
| 8 | **RLS lockdown** | The **prerequisite is now done** (commit `fc81927` — the web client hands its login JWT to supabase-js so `auth.uid()` resolves; verified live). `infra/db/2026-09-10_rls_lockdown.sql` is ready. **Run it during promotion, right after the prod frontend redeploys** — not before (Aroham is shared with prod; running it against the un-rebuilt prod bundle logs everyone out). Rollback SQL is in the file header. | — | ⏳ at promotion |
| 9 | **Decide `ArohamNew`** | Empty project `iveltpgympaucqypfyxi` — delete it, or make it the real staging DB. Data is in **Aroham** (`lzzdfsphevmzbkkoskxb`). Supabase free tier covers a 2nd project. | — | ⏳ |
| 10 | **Render env vars** (`OTP_FORCE_MOCK`, and prod vars at promotion) | The Render env-var API is blocked for Claude by the auto-mode classifier — set these in the Render dashboard yourself (or add a permission allow-rule). Staging currently has mock auth ON, which is correct for testing. | — | ℹ️ info |

### $0 replacements for the "nice to have" services (I'll wire any of these on your word)
| Need | Instead of paid | Use (free / OSS) |
|---|---|---|
| Error monitoring | paid Sentry | **GlitchTip** (OSS, Sentry-API-compatible, self-host on Render free) or Sentry's own free tier (5 k errors/mo) |
| Web analytics | paid Plausible | **Umami** (OSS, self-host) or GA4 ($0) |
| Uptime / cron | paid monitors | **cron-job.org** free, or a GitHub Actions cron |
| Recommender | — | **Gorse** (already OSS + self-hosted) ✅ |

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

## 🐞 Bug-hunt round 2 — 2026-09-10 (deeper pass; all fixed + verified live)

| Bug | Impact | Fix (commit) | Verified live |
|-----|--------|--------------|---------------|
| Cart quantity had no lower bound | `PUT /api/cart/:id {qty:-3}` → 200, persisted a **negative qty**; `GET` returned it, it flowed into checkout, `reserve_stock(-3)` **inflated stock**. Exploitable. | 400 on non-positive / non-integer qty for `POST /cart`, `/cart/buy-now`, `PUT /cart/:id`. `6e7a7bd` | ✅ `-3`/`0`/`2.5`/`-1` → 400 |
| **Coupons were cosmetic — customer overcharged** | PaymentPage showed a discounted total but its `POST /api/orders` body never sent `promoCode`; the backend charged full price and the client adopted the backend amount. User sees "−₹60", pays full. Client & server coupon lists were also disjoint. | PaymentPage sends `promoCode` (card + COD); backend returns a `pricing` block (`promoApplied`, `promoReason`); PaymentPage stops + clears + tells the user if the server didn't apply it. Coupon lists realigned + `minPurchase` enforced client-side. `6e7a7bd` | ✅ `Nakshra10`→applied ₹539.10; `DEVOTION20`→"add ₹2401 more"; bogus→"not valid" |
| `POST /api/kundli/generate` 502'd on bad date/time | `"45/13/2000"` / `"31/02/2000"` / `"25:99"` passed the presence check, then hung VedAstro/puppeteer → 502 after ~55s (ties up a worker on the free box). | Strict-parse date (real calendar date, ≥1900, not future) + 24h `HH:MM` up front → 400. `64b9e96` | ✅ all invalid → 400; valid still works |
| Kundli PDF intermittently 500'd | `puppeteer.launch({headless:true})` had **no args** → on Render's 512 MB container Chrome failed to start under memory pressure ("Timed out waiting for the WS endpoint"). A failed render also leaked the Chrome process. | Container-safe flags (`--no-sandbox --disable-dev-shm-usage --single-process …`), 60s launch timeout, `try/finally` to always close. `2b1f4a7` | ✅ 200, 858 KB / 8-page PDF, ~17s, two calls back-to-back |
| Wishlist removals resurrected | Load merged remote into local **additively** (never removed) and the persist effect raced ahead of the remote fetch → a stale local cache got re-uploaded, so items removed on another device / tab came back. | `hydrated` ref gates the Supabase upsert until the remote copy loads; remote is authoritative for a device that has synced before. `5f17506` | ✅ typecheck + build |

## 🔧 Bigger changes this session (also on Yashasvi, verified)

| Change | Why | Commit | Verified |
|---|---|---|---|
| **OTP JWT → supabase-js** | Prereq for RLS lockdown — makes `auth.uid()` resolve for the client's direct Supabase calls | `fc81927` | ✅ live: `auth.uid()`, `auth.role()='authenticated'`, `getUser()`, + all 6 frontend call patterns |
| **RLS lockdown SQL finalised** | `users`/`orders`/`addresses`/carts/wishlists were `USING(true)` to `public` — anon key = full read/write to all PII | `dafeaeb` (`infra/db/2026-09-10_rls_lockdown.sql`) | ready; **run at promotion** (shared prod DB) |
| **Login OTP: SMS → email** | Kill per-SMS cost. Backend generates + hashes + stores the code (`otp_codes` table), emails it. Phone stays the account id. | `0700a4a` | ✅ staging (mock `111111`) + email-adopt onto user row verified; real email needs the free key (item 1+3) |
| **Free keep-warm pinger** | $0 alternative to Render Starter | `93a8912` | committed; runs from `main` |
| **`getUserOrders` phone-aware** | guest→user order link-up moved server-side (client write breaks under locked RLS) | `fc81927` | ✅ |

### Observed, not a bug (no fix)
- `/api/admin/onboarding/applications` (astrologer onboarding) has **no backend route**, but every caller guards with `if (res.ok)` and falls back to a direct Supabase write. It's an optional sync to a separate admin service (port 5001) not in this deployment.
- `POST /api/cart` doesn't validate `qty` is a positive int — the frontend always sends a valid `qty`; low-priority hardening only.
- Anonymous product-card views all collapse to one Gorse user `"anonymous_user"` (ShopPage uses a per-guest id instead). Minor personalization gap.
- `AuthPage.tsx` has a now-unreachable "account creation" branch (backend `/otp/verify` already find-or-creates the user). Dead code, not harmful.
- `/api/shiprocket/track/:id` 500s with a raw Shiprocket "email required" body when creds are absent. Cosmetic (Shiprocket is item #4; frontend has a fallback). Left alone — `shiprocket.js` is owned by the hardening pass.

### Not testable from here
- The Vercel `Yashasvi` **preview** is behind Vercel SSO (Hobby plan, no bypass) → can't black-box the deployed frontend. Local `pnpm --filter @nakshra/web build` passes (5.8 s, largest chunk 558 KB). Fix = Vercel Pro or an SSO bypass token (part of item #5-ish infra).
