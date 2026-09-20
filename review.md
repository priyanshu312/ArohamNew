# Nakshra — Production-Readiness Review

| | |
|---|---|
| **Date** | 2026-09-20 |
| **Repo state reviewed** | `main` @ `31fed96` (clean tree) |
| **Scope** | `backend/` (Express + Supabase + Razorpay), `apps/web`, `apps/mobile`, `packages/*`, `infra/db/*.sql`, CI / deploy configs, root status docs |
| **Method** | Manual code reading, `pnpm audit --prod` on the backend, git-history secret scan, cross-checking the repo's own status docs against the code |
| **Verdict** | **Not production-ready for real money or real customers.** The foundations are reasonable (helmet, rate limits, CORS allowlist, server-side pricing, versioned migrations, CI), but the payment and auth paths have exploitable holes, and COD is not actually implemented. |

## Read this first — limits of this review

- **Not done:** dependencies were not installed, so the web build, web typecheck and full test run were **not** executed. No live service, Render env var, Supabase database or Razorpay account was probed. Anything marked **VERIFY** depends on live state I could not see.
- The root status docs (`YASHASVI_NEEDS_YOU.md`, `MANUAL_TASKS_AND_BOTTLENECKS.md`) are dated Sept 9–10; some of what they describe may have changed since.
- Backend tests: 11/12 pass locally. The one failure (`tests/webhook.test.js`) is `MODULE_NOT_FOUND` from uninstalled dependencies — **not** a code defect.
- Exploit descriptions below come from reading the code, not from running them. Each issue has a **Verify** line so the fixer can prove the bug first and prove the fix after.

## How to use this document

- **Severity:** 🔴 Critical = exploitable now (money loss, account takeover, PII exposure, silent order loss). 🟠 High = will cause incidents or abuse under real traffic. 🟡 Medium = reliability / defence-in-depth / maintainability. ⚪ Low = hygiene.
- **Effort:** S < ½ day · M ½–2 days · L > 2 days (rough guesses).
- Tick the box when fixed **and** the Verify step passes. File references are `path:line` at the reviewed commit; lines will drift.

---

## 0. Do these checks first (they decide how urgent everything else is)

These are quick and read-only. Run them before touching code.

- [ ] **V-1 — Is mock login live on a public service?** In the Render dashboard, check every backend service (especially `nakshra-backend-yashasvi`) for `OTP_FORCE_MOCK=true` or `ALLOW_MOCK_AUTH=true`. The docs say staging has mock auth ON **and** shares the Supabase project (`Aroham`) with production. If both staging and prod use the same `SUPABASE_JWT_SECRET`, `111111` on staging yields a token that is valid on prod. **If any of this is true, treat it as an active incident:** turn mock off immediately and rotate the JWT secret. See C-4.
- [ ] **V-2 — Which RLS policies are actually live?** Run in the Supabase SQL editor:
  ```sql
  -- every permissive policy that lets everyone through
  select tablename, policyname, roles, cmd, qual, with_check
  from pg_policies
  where schemaname = 'public' and (qual = 'true' or with_check = 'true')
  order by tablename, policyname;

  -- tables with RLS switched off entirely
  select c.relname
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  ```
  Expect **zero** rows from the first query except intentional ones (e.g. public product read, newsletter insert). See C-10 / C-11.
- [ ] **V-3 — Were any payments abused (C-1)?**
  ```sql
  -- one Razorpay payment confirming more than one order
  select razorpay_payment_id, count(*) as orders_confirmed
  from payments where status = 'SUCCESS' and razorpay_payment_id is not null
  group by 1 having count(*) > 1;

  -- confirmed orders whose payment amount differs from the order amount
  select o.id, o.amount as order_amount, p.amount as payment_amount
  from orders o join payments p on p.order_id = o.id
  where o.status in ('CONFIRMED','SHIPPED','DELIVERED') and o.amount <> p.amount;
  ```
  Also reconcile the Razorpay dashboard's captured payments against `orders` — every confirmed order should map to exactly one captured payment of the same amount.
- [ ] **V-4 — Predictable-password accounts (C-5).**
  ```sql
  select count(*) from auth.users where email ilike '%@nakshra.in';
  ```
  Any hits were created by `/api/auth/signup` with password `NakshraPass<phone>!`. Also check whether email+password sign-in is enabled in Supabase → Authentication → Providers.
- [ ] **V-5 — Stuck orders (C-7, H-2).**
  ```sql
  select status, count(*), min(created_at) from orders group by status;
  select id, created_at from orders where status = 'PENDING' and created_at < now() - interval '1 day';
  ```
  Old `PENDING` rows are either abandoned checkouts holding stock or COD orders that were never fulfilled.
- [ ] **V-6 — Feature flags in prod.** Confirm `TEST_COUPON_ENABLED` is **unset** (the `Welcome1` coupon charges ₹1 for any cart; combined with C-1 it is severe), `ENABLE_DEBUG_ROUTES=false`, `SHIPROCKET_ENABLED` matches intent, and `SUPABASE_JWT_SECRET` is set.

---

## Summary table

| ID | Sev | Title | Effort |
|---|---|---|---|
| C-1 | 🔴 | Payment confirmation isn't bound to the order | M |
| C-2 | 🔴 | Any user can fail/cancel any order and inflate stock | S–M |
| C-3 | 🔴 | Confirm/fail not idempotent; verify vs webhook race | M |
| C-4 | 🔴 | Mock OTP `111111` logs in as any email; staging shares prod DB | S |
| C-5 | 🔴 | `/auth/signup`: predictable password + unauthenticated profile overwrite | S |
| C-6 | 🔴 | Mobile app has no real login (OTP checked on the client) | M |
| C-7 | 🔴 | COD is not implemented server-side; offline fallback fabricates orders | M |
| C-8 | 🔴 | Checkout shows "confirmed" and clears the cart even if verification fails | S |
| C-9 | 🔴 | Any user can read other users' orders by setting their profile phone | S |
| C-10 | 🔴 | RLS lockdown state unknown; lockdown SQL may miss existing policies | S |
| C-11 | 🔴 | Astrologer / chat / onboarding tables are world-readable and writable | M |
| H-1 | 🟠 | Order creation isn't transactional; partial reservations leak stock | M |
| H-2 | 🟠 | No expiry for PENDING orders; stock hoarding; no idempotency key | M |
| H-3 | 🟠 | `/payments/verify` wipes the whole cart; webhook path never clears it | S |
| H-4 | 🟠 | Coupons: no usage limits, `FIRST300` not enforced, two sources of truth | M |
| H-5 | 🟠 | No server-side address validation; fake defaults sent to Shiprocket | S |
| H-6 | 🟠 | HTML injection in the order-confirmation email | S |
| H-7 | 🟠 | Unauthenticated endpoints leak PII / burn quota | S–M |
| H-8 | 🟠 | Kundli endpoint: 25 MB pre-limiter body, unbounded memory, no timeouts | M |
| H-9 | 🟠 | Internal error messages returned to clients | S |
| H-10 | 🟠 | `uncaughtException` is swallowed; process keeps running | S |
| H-11 | 🟠 | Session tokens: 45 days, no revocation, blocked users keep access | M |
| H-12 | 🟠 | Fake delivery estimates shown to customers | S |
| H-13 | 🟠 | Chat: prompt injection, URL injection into Gorse, no auth | S–M |
| H-14 | 🟠 | Business logic still in the browser (direct Supabase writes) | L |
| H-15 | 🟠 | Cancelling a shipped/booked order doesn't cancel the Shiprocket shipment; no refund flow | M |
| M-1 | 🟡 | CORS allows every `*.vercel.app` site | S |
| M-2 | 🟡 | No fail-fast on missing config; placeholder clients; shallow `/health` | S |
| M-3 | 🟡 | Logging leaks PII; console monkey-patch; no request IDs; no frontend Sentry | M |
| M-4 | 🟡 | Webhook gaps: amount not checked, non-timing-safe compare, events missing | S–M |
| M-5 | 🟡 | Cart races / missing uniqueness / missing `is_active` check on update | S |
| M-6 | 🟡 | Rate limiting is per-instance, IP-only, no per-email limit | M |
| M-7 | 🟡 | Dependency hygiene (xlsx CVEs, qs, firebase-admin, lockfiles) | S |
| M-8 | 🟡 | Puppeteer: no concurrency cap, sandbox disabled, no PDF timeout | M |
| M-9 | 🟡 | Schema drift: base tables/columns aren't in the repo | M–L |
| M-10 | 🟡 | Staging and prod share one database; test data in prod | M |
| M-11 | 🟡 | Three different shapes for the same order data | M |
| M-12 | 🟡 | Single-instance in-memory state (`kundaliProfiles`, debug logs) | S |
| S-1..S-9 | 🟠 | Shiprocket fulfilment: orders never reach Shiprocket / junk data (section 8) | M |
| L-1..L-9 | ⚪ | Hygiene items (section 4) | S |
| T-1..T-5 | | Testing & CI gaps (section 5) | M–L |

---

## 1. 🔴 Critical

### C-1 · Payment confirmation isn't bound to the order  `M`
**Where:** `backend/routes/payments.js:11-23`, `backend/services/paymentService.js:34` (`confirmOrder`)

**Problem.** `POST /api/payments/verify` checks that the Razorpay signature is valid for `razorpay_order_id|razorpay_payment_id`, then calls `confirmOrder(req.body.orderId, …)`. Nothing ties `req.body.orderId` to `razorpay_order_id`, to the caller (`req.user.id`), or to the amount that was paid. `confirmOrder` then marks the payment `SUCCESS`, the order `CONFIRMED`, commits stock, sends the email and triggers Shiprocket.

**Exploit (from reading the code).** Pay for a cheap order A and keep its valid `(razorpay_order_id, payment_id, signature)`. Create an expensive pending order B (via `POST /api/orders`, unpaid). Call `/payments/verify` with `orderId = B` and A's Razorpay fields. The signature passes, B is confirmed and shipped. The same payment triple can be replayed against unlimited orders.

**Fix.**
1. Look up the payment row by `order_id`; 404 if missing. Load the order and require `order.user_id === req.user.id`.
2. Require `payment.razorpay_order_id === body.razorpay_order_id` (the value stored at order creation, `routes/orders.js:65-66`).
3. Verify the signature.
4. **Recommended:** fetch the payment from Razorpay (`razorpay.payments.fetch(id)`) and assert `status ∈ {captured, authorized}`, `order_id` matches, `currency === "INR"` and `amount === payment.amount`.
5. Move the state change into one atomic step (see C-3).

**Verify.** Add a test that pays order A (mock the signature helper) and calls verify with B's `orderId` → expect 400/409 and B unchanged. Add a test for a different user's `orderId` → 403. Re-run V-3 in prod to see if it already happened.

---

### C-2 · Any user can fail/cancel any order and inflate stock  `S–M`
**Where:** `backend/routes/payments.js:15` and `:27-34`; `backend/services/paymentService.js:129` (`failOrder`); `backend/supabase-schema.sql:64` (`release_stock`)

**Problem.**
- `POST /payments/failed` calls `failOrder(req.body.orderId)` with **no ownership check**. The bad-signature branch of `/verify` does the same.
- `failOrder` only skips orders already `CONFIRMED/SHIPPED/DELIVERED`. Calling it again on a `PAYMENT_FAILED` or `CANCELLED` order runs again.
- Each run calls `release_stock`, which does `stock = stock + p_qty` with **no clamp and no idempotency**. Repeating the request inflates stock without bound.
- A hostile user can also fail *someone else's* pending order while they are paying. When the webhook later confirms it, stock was already released → **overselling**.

**Fix.**
- Require order ownership (`orders.user_id = req.user.id`) on both endpoints.
- Make the transition conditional: `update orders set status='PAYMENT_FAILED' where id=$1 and status='PENDING' returning id`; release stock **only if a row was returned**.
- Better: replace per-item `release_stock` calls with one DB function `release_order_stock(order_id)` that reads `order_items` and is guarded by an `orders.stock_released boolean` (set in the same transaction). Same for reserve/commit.
- Consider not trusting client-reported "failed" at all — let the webhook and the expiry job (H-2) handle it, and use the client call only to update UI.
- Add a `check (stock >= 0)` constraint on `products`.

**Verify.** Test: call `/payments/failed` five times on one pending order → stock changes exactly once. Test: user B calling it on user A's order → 403.

---

### C-3 · Confirm/fail not idempotent; verify vs webhook race  `M`
**Where:** `backend/routes/payments.js:11-23, 38-62`; `backend/services/paymentService.js:34-126`

**Problem.** The webhook does read-then-act (`pay.status !== "SUCCESS"`), and `/verify` has **no** status check at all. Two concurrent deliveries (browser verify + Razorpay webhook, or a webhook retry) both run `confirmOrder`: duplicate confirmation emails, duplicate Shiprocket order creation (Shiprocket may or may not reject a duplicate `order_id` — test it), repeated `commit_stock` (skews the `reserved` counter).

**Fix.** Do the transition atomically in the database and act only on the winner:
```sql
-- sketch
update orders set status = 'CONFIRMED', paid_at = now()
where id = $1 and status in ('PENDING','PAYMENT_FAILED') returning *;
```
Only when a row comes back: mark the payment `SUCCESS`, commit stock, then send the email and create the shipment. Prefer a single Postgres function (`confirm_order(order_id, rzp_order_id, rzp_payment_id, amount)`) so it is one transaction. Make the email/shipment side effects idempotent too (store `confirmation_sent_at`, `shipment_id`; skip if set). Consider making the webhook the only writer and having `/verify` just poll/return current status.

**Verify.** Fire `/verify` and the webhook concurrently for one order (and each twice) → exactly one email, one shipment, one stock commit.

---

### C-4 · Mock OTP `111111` logs in as any email; staging shares the prod DB  `S`
**Where:** `backend/services/otp.js:179` (`useMock`), `:203` (`checkOtp`); `backend/routes/auth.js:113-127`; `backend/middleware/auth.js:80`; `backend/services/session.js:21`

**Problem.** With `OTP_FORCE_MOCK=true` (or provider unconfigured + `ALLOW_MOCK_AUTH=true`), `checkOtp` approves `111111` for **any** email, and `/otp/verify` then find-or-creates that user and returns a real signed token. Your docs say staging runs this way and that staging and prod share one Supabase project. Also, if `SUPABASE_JWT_SECRET` is missing, `issueToken` silently returns a `MOCK-USER-ID-<id>` token; if `ALLOW_MOCK_AUTH=true` is also set, that token authenticates as any user id. `render.yaml` does not list `SUPABASE_JWT_SECRET` at all, so a blueprint deploy starts in exactly that state.

**Fix.**
- Refuse to boot in production if either mock flag is set: at startup, `if (isProd && (OTP_FORCE_MOCK || ALLOW_MOCK_AUTH)) { console.error(...); process.exit(1); }`. Define `isProd` explicitly (`NODE_ENV=production` set in `render.yaml`).
- Give staging its **own** Supabase project (the empty `ArohamNew` project is the obvious candidate — decision D6 in the docs) and its own JWT secret, so a staging token can never be valid in prod.
- Make `issueToken` **throw** if `SUPABASE_JWT_SECRET` is unset instead of returning a mock string. Delete the `MOCK-USER-ID-` path from `middleware/auth.js` and `packages/shared-api/src/api.ts:57-64` once staging no longer needs it.
- Add `SUPABASE_JWT_SECRET` (and the other required vars) to `render.yaml`.
- If V-1 found this live in prod-reachable form: rotate the JWT secret, force re-login, and review `users`/`orders` for suspicious activity.

**Verify.** Boot the server with `NODE_ENV=production OTP_FORCE_MOCK=true` → process exits non-zero. Unit test: `issueToken` without a secret throws.

---

### C-5 · `/auth/signup`: predictable password + unauthenticated profile overwrite  `S`
**Where:** `backend/routes/auth.js:183-283`; callers `apps/web/visual/components/auth/AuthPage.tsx:555`, `apps/mobile/src/components/AuthModal.tsx:132`

**Problem.**
1. The route is **unauthenticated**. It creates a Supabase auth user with password `NakshraPass${phone}!` (and email `<phone>@Nakshra.in`) when the caller doesn't supply one. `middleware/auth.js` accepts any valid **Supabase access token** (step 2, `supabase.auth.getUser`). Anyone who knows a phone number can request a password-grant token with the public anon key and act as that user. (Supabase password sign-in must be enabled — V-4.)
2. If the caller supplies an `email` that already exists in auth, `createUser` fails "already registered", the code finds the existing auth user and then `upsert`s a `users` row with **that user's id** and attacker-chosen `full_name/phone/gender/dob/address`. That overwrites (or wipes, since unspecified fields become `null`) an existing customer's profile, unauthenticated.
3. It relies on `listUsers()` (first page only, ~50 users), so the lookup silently stops working as users grow.
4. Unlimited account creation (spam), only covered by the generic 300/5min limiter.

**Fix.**
- Delete `/api/auth/signup` and its two callers (login already find-or-creates via `/otp/verify`).
- For existing accounts created this way: reset their passwords to random values via the admin API, and disable the email+password provider in Supabase if nothing else uses it.
- Restrict `requireAuth` to your own session tokens (see H-11) so Supabase-issued tokens minted via password/other grants aren't accepted.

**Verify.** `curl -X POST /api/auth/signup` → 404. Password grant for a former signup account → fails.

---

### C-6 · Mobile app has no real login  `M`
**Where:** `apps/mobile/src/components/AuthModal.tsx:268-272, 595-599`

**Problem.** The mobile OTP screen compares the typed code to the literals `111111` / `123456` **on the device** and displays "Test Code: 111111". It then looks up the account by phone (`/auth/email-by-phone`) or calls `/auth/signup` (C-5). There is no server-verified session.

**Fix.** Rebuild the mobile login on the same flow as web: `POST /auth/otp/send` → `POST /auth/otp/verify` → store the returned token; remove all hard-coded codes and the "test code" badge; remove use of `email-by-phone` for login (H-7).

**Verify.** Grep the mobile app for `111111`/`123456` → none. Manual: a wrong code is rejected by the server.

---

### C-7 · COD is not implemented server-side; the offline fallback fabricates orders  `M`
**Where:** `apps/web/visual/pages/PaymentPage.tsx` (`handlePlaceCodOrder`, ~line 335-395); `backend/routes/orders.js:47-49`

**Problem.**
- The client sends `paymentMode: "COD"`, but `POST /api/orders` destructures only `{ items, address, checkoutType, promoCode }` and **ignores it**. It always creates a Razorpay order and leaves the order `PENDING`. Nothing ever moves a COD order to `CONFIRMED` (only payments do), so COD orders are never confirmed, never emailed, never shipped, and keep their stock reserved forever.
- If that API call fails, the client `catch`es it ("Backend order creation offline, proceeding with COD order fallback"), invents an id `ORD-COD-<timestamp>`, **clears the cart and shows the confirmation page**. The customer believes they ordered; **no order exists anywhere**.

**Fix.** Pick one:
- **Remove COD** from the UI (and stop `codAvailable` defaults, H-12) until it is built; **or**
- Implement it: `paymentMode: "COD"` → validate, create the order with `status='CONFIRMED'`/`payment_method='COD'`/`payment_status='COD_PENDING'`, commit stock in the same transaction, skip Razorpay, send the confirmation email, pass the COD flag to Shiprocket, add order-value/pincode COD eligibility rules.
- In **both** cases: delete the client-side fabricated-id fallback. If the order call fails, show an error and keep the cart.

**Verify.** Test: COD order with backend down → user sees an error, cart intact, no confirmation page. Test: COD order with backend up → order is `CONFIRMED` and visible in history.

---

### C-8 · Checkout shows "confirmed" and clears the cart even if verification fails  `S`
**Where:** `apps/web/visual/pages/PaymentPage.tsx:199-302`

**Problem.** In the Razorpay `handler`, `await api("/payments/verify", …).catch(() => {})` (line 209) swallows every error, and even the outer `catch` (lines 297-301) clears the cart and `navigate("/checkout/confirm")`. A network blip, a 400 "Invalid signature" or a 500 all end on the success page with the cart emptied.

**Fix.** On verify error, do **not** show success or clear the cart. Show "We're confirming your payment…" and poll `GET /api/orders` (or a new `GET /api/orders/:id`) until the status is `CONFIRMED` (the webhook is the source of truth) or a timeout, then show a clear "payment received, confirmation pending — contact support with order #…" message. Clear the cart only after a confirmed status.

**Verify.** Manually force `/payments/verify` to return 500 → UI does not claim success; cart still present.

---

### C-9 · Any user can read other users' orders by setting their profile phone  `S`
**Where:** `backend/services/orderService.js:175-196` (`getUserOrders`); `backend/routes/auth.js:301` (`POST /profile`); `backend/routes/auth.js:358` (`claim-orders`)

**Problem.** `POST /auth/profile` lets a user set `phone` to any 10 digits with **no verification**. `GET /api/orders` then runs `orders … .or(user_id.eq.<me>, user_phone.eq.<phone>)` — which returns orders belonging to **other** users whose `user_phone` matches, including delivery addresses and items. The same function also *reassigns* unclaimed (`user_id IS NULL`) orders with that phone to the caller. `claim-orders`' comment says it only claims orders with "verified contact details", but phone is not verified anywhere now that login is by email.

**Fix.**
- Remove the `user_phone.eq` branch: history = `user_id = me` only.
- Only claim guest orders by **verified email** (email is proven by the OTP). Drop phone-based claiming, or require a phone-OTP first.
- Push the match into SQL (`address->>'email'` indexed, or a `user_email` column) instead of `select … limit 500` then filtering in JS (which silently stops claiming once >500 guest orders exist).
- Treat `users.phone` as unverified user-supplied data everywhere.

**Verify.** Test: user A sets phone = user B's phone → `GET /api/orders` returns none of B's orders.

---

### C-10 · RLS lockdown state unknown; the lockdown SQL may not drop existing policies  `S`
**Where:** `infra/db/2026-09-10_rls_lockdown.sql:63-68`, `backend/supabase-schema.sql:148-150`

**Problem.**
- Per your own docs, before the lockdown the anon key (shipped in the web bundle) could read/modify every user's phone, email, DOB, address and every order. The doc says "run at promotion"; I can't tell if it was run (V-2).
- The lockdown drops policies **by assumed names** (`"Allow public access users"`, `"Allow user select"`, …). The repo's own schema creates differently named ones — `"Allow public select users"` (`using (true)`) and `"Allow user select own"`. Postgres ORs permissive policies together, so **one leftover `using (true)` policy silently defeats the whole lockdown**. Whether it applies depends on the names in the live DB.
- The client currently upserts a `CONFIRMED / PAID` row straight into `orders` on an "offline fallback" path (`PaymentPage.tsx:231-247`). Before the lockdown that lets any visitor insert a paid order.

**Fix.**
- Run V-2 now. After running (or re-running) the lockdown, re-run V-2 and drop **every** remaining `true` policy on the affected tables. Rewrite the lockdown to drop *all* policies on each table via a `DO $$ … loop over pg_policies … $$` block, then create the intended ones — don't rely on guessed names.
- Remove the client-side `orders.upsert` fallback entirely (see also H-14).
- Run Supabase's security advisor (`get_advisors(..., 'security')`) and fix everything it reports.

**Verify.** With only the anon key: `select * from users`/`orders`/`addresses` returns nothing / 401; insert into `orders` is rejected.

---

### C-11 · Astrologer / chat / onboarding tables are world-readable and writable  `M`
**Where:** `backend/supabase-schema.sql:152-159`, `backend/onboarding-schema.sql:130-146`

**Problem.** Not covered by the lockdown at all:
- `astrologers`: `Allow astrologer update … using (true)` → anyone can change any astrologer's profile, status, rating, online flag.
- `chat_sessions`, `chat_messages`: `Public read … using (true)` → **anyone can read every consultation conversation** (personal problems, birth details).
- `astrologer_applications`, `_documents`, `_interviews`, `_notes`, `_history`: public read + insert + **update** → onboarding documents / interview notes exposed, and an applicant could approve their own application.
- `contact_messages`, `astrologer_transactions` (client-inserted earnings/payout records) and `coupons` are used by the client but **defined nowhere in the repo's SQL** (see M-9), so their policies are unknown.

**Fix.** Design ownership rules per table: chat rows readable/writable only by the participating user or assigned astrologer (`auth.uid()`), astrologer profile writes only by that astrologer (or service role), onboarding tables service-role only (route admin actions through the backend), transactions/earnings written **only** by the backend. Move the astrologer dashboard writes behind authenticated backend routes (H-14). Note astrologers currently have no distinct auth identity — the mobile/web astrologer login is phone-lookup based (C-6); fix that first or these policies can't be expressed.

**Verify.** V-2 shows no `true` policies on these tables; anon-key `select` on `chat_messages` returns nothing.

---

## 2. 🟠 High

### H-1 · Order creation isn't transactional; partial reservations leak stock  `M`
**Where:** `backend/services/orderService.js:70-135`; `backend/services/validationService.js`

`createPendingOrder` does: insert order → insert items → reserve stock **per item in a loop** → insert payment. If the 2nd item's `reserve_stock` fails (or the same product appears twice in `items`, each passing the stock check individually), items already reserved stay reserved and the order stays `PENDING` with no rollback. Any failure after the order insert leaves an orphan order.
**Fix.** One Postgres function `create_order(user_id, items jsonb, address jsonb, promo …)` that validates, prices, inserts, reserves and creates the payment row in a single transaction (all-or-nothing), merging duplicate product ids. Call it from the route.
**Verify.** Test with items `[A(qty ok), B(out of stock)]` → no order row, no stock change.

### H-2 · No expiry for PENDING orders; stock hoarding; no idempotency  `M`
**Where:** whole backend (no cleanup job exists — nothing in `services/` or `routes/` expires orders)

Abandoned checkouts (closed tab, COD orders — C-7) hold `reserved` stock forever. A user can create unlimited pending orders and lock all inventory. Double-clicking "Pay" creates two orders.
**Fix.** Scheduled job (pg_cron / Supabase scheduled function / Render cron) every ~5 min: orders `PENDING` older than ~30 min → check Razorpay for a captured payment first (webhook may be late) → else mark `EXPIRED` and release stock through the guarded function (C-2). Cap pending orders per user. Add an `Idempotency-Key` (or client order token) to `POST /orders`.
**Verify.** Create a pending order, wait past the TTL → status `EXPIRED`, stock restored exactly once.

### H-3 · `/payments/verify` wipes the whole cart; the webhook path never clears it  `S`
**Where:** `backend/routes/payments.js:20`

`delete().eq("user_id", …)` has no `is_temporary` filter and no link to the order: a **Buy Now** purchase deletes the user's regular cart, and a normal checkout also deletes any Buy-Now temp row. If the customer closes the tab after paying, only the webhook confirms the order and the cart is never cleared (the client side has its own swallowed-error problem — C-8).
**Fix.** Clear only the items that were in the paid order (order → items → matching `cart_items`), inside `confirmOrder` so both paths do it once; respect `is_temporary`.

### H-4 · Coupon abuse and duplicated coupon logic  `M`
**Where:** `backend/services/orderService.js:7-37, 70-95`; client `packages/shared-state/src/CartContext.tsx:158` reads a `coupons` table

No per-user or global usage limits: any code is reusable forever. `FIRST300` says "your first order" but nothing checks order history. The client keeps its own coupon list / a `coupons` DB table, separate from the server's hard-coded array, so they can drift (the docs already record this bug once). `FREEENERGIZATION` discounts ₹99 regardless of cart contents.
**Fix.** Single server-side source of truth (a `coupons` table: code, type, value, min_purchase, max_uses, per_user_limit, valid_from/to, first_order_only) plus a `coupon_redemptions` table written in the order transaction. The client just calls a `POST /orders/quote` endpoint to display server-computed totals. Keep `TEST_COUPON_ENABLED` off in prod (V-6) or delete the test coupon.

### H-5 · No server-side address validation; fake defaults sent to Shiprocket  `S`
**Where:** `backend/routes/orders.js:20-24` (address stored unvalidated), `backend/services/paymentService.js:94-97`

`address` is stored as raw JSON. At fulfilment, missing fields are replaced with fake data — pincode `"000000"`, phone `"0000000000"`, email `"noemail@example.com"`, city/state `"Unknown"` — and a shipment is booked anyway. `POST /addresses` validates only the phone.
**Fix.** Validate on the server at order creation and on save: name/line1/city/state required and length-capped, pincode `^\d{6}$`, phone `^\d{10}$`, email format; reject otherwise. Optionally check serviceability. Remove the fake fallbacks — fail the shipment step visibly (flag the order `NEEDS_ATTENTION`) instead of shipping to "Unknown". Also cap saved addresses per user.

### H-6 · HTML injection in the order-confirmation email  `S`
**Where:** `backend/services/notify.js:69-82`

`order.address.name`, `it.name` and the recipient (`order.address.email`, unvalidated) come from user input and are interpolated into the HTML unescaped. A user can make your domain (`no-reply@nakshra.in`) send arbitrary HTML/links to any address they choose after a confirmed order (C-1 makes "confirmed" cheap).
**Fix.** HTML-escape all interpolated values; validate `to` as an email; prefer the authenticated user's verified email over the free-text address email; add a per-order send guard (C-3).

### H-7 · Unauthenticated endpoints leak PII or burn quota  `S–M`
**Where:** `backend/routes/auth.js:134` (`user-by-email`), `:154` (`email-by-phone`), `backend/routes/recommendations.js:5`, `backend/routes/shiprocket.js:24, 59, 143`, `backend/routes/telemetry.js:10, 20`

- `email-by-phone` returns `{id, email, fullName, phone}` for any phone; `user-by-email` returns id/name/phone for any email → account enumeration and PII harvesting, limited only by the generic 300/5min limiter.
- `GET /api/shiprocket/track/:id` is anonymous, creates a fresh `ShiprocketService` (a new Shiprocket login) per call, and returns raw provider data/errors. Hammering it can rate-limit or lock the Shiprocket account. `/status` reveals which credentials are configured.
- `GET /api/recommendations/:userId` returns any user's personalised recommendations.
- Telemetry accepts arbitrary `userId`/`eventType`, so anyone can poison the recommender.
**Fix.** `user-by-email` → return only `{exists:boolean}` (or drop; OTP send doesn't need it). `email-by-phone` → drop, or return a masked email behind a strict per-IP limiter. Cache the Shiprocket token and add per-route limits; require auth (or the AWB + phone/email pair) for tracking; remove `/status` or make it debug-only. Require auth or an opaque anonymous id for recommendations/telemetry and whitelist `eventType`.

### H-8 · Kundli endpoint: pre-limiter 25 MB body, unbounded memory, no timeouts  `M`
**Where:** `backend/server.js:92` vs `:104`; `backend/routes/kundli.js:11-12, 208-210`

- The 25 MB JSON parser is mounted **before** `apiLimiter`, on an unauthenticated route, and every request also stores `req.rawBody = buf.toString()` (a second copy). A few concurrent 25 MB posts can exhaust a 512 MB instance before any rate limit applies. Nothing in the route reads a large image any more that I could see — confirm and lower the limit.
- `global.kundaliProfiles[name]` / `[req.body.userId]` is an unbounded map keyed by **unauthenticated user-supplied strings**: memory growth, cross-user overwrite of a recommendation profile, and `name="__proto__"` sets that object's prototype.
- The seven-plus `fetch` calls to `api.vedastro.org` have **no timeout/AbortController** (the docs already record hangs ~55 s tying up workers). User birth date/place/name are sent to a third-party public API with no notice in the privacy policy.
- `rawBody` is stored for all routes but only the webhook needs it.
**Fix.** Apply the rate limiter before body parsing on `/api/kundli`; lower the size limit; require auth or a captcha; use `Object.create(null)`/`Map` with size cap + TTL (or Redis) and take `userId` from the token, not the body; add `AbortSignal.timeout(10_000)` to all external fetches; store `rawBody` only for `/api/payments/webhook` (use `express.raw` on that route); disclose VedAstro in the privacy policy.

### H-9 · Internal error messages returned to clients  `S`
**Where:** `backend/server.js:139, 145`; most routes (`res.status(500).json({ error: e.message })`); `backend/routes/chat.js:148`; `backend/routes/shiprocket.js`

Supabase/PostgREST error text, Razorpay text, provider status codes and stack-ish messages reach the browser.
**Fix.** Log the detail server-side (with a request id), return a generic message + `requestId` to the client. Keep specific messages only for deliberate 4xx validation errors.

### H-10 · `uncaughtException` is swallowed  `S`
**Where:** `backend/server.js:150-157`

Logging and continuing after an uncaught exception leaves the process in an undefined state. **Fix.** Log + report to Sentry, flush, then `process.exit(1)` and let Render restart it. Keep `unhandledRejection` handling but treat it the same way.

### H-11 · Session tokens: 45 days, no revocation, blocked users keep access  `M`
**Where:** `backend/services/session.js`, `backend/middleware/auth.js:55-75`, `backend/routes/auth.js` (BLOCKED check only at login)

- TTL is 45 days; logout only deletes the client's copy (server can't revoke) — the docs already had a bug where the token survived logout.
- `requireAuth` never checks `users.status`, so a `BLOCKED` user with a valid token keeps full access for up to 45 days.
- If the `users` row is missing/deleted, `requireAuth` still sets `req.user` from the token instead of 401.
- `verifyToken` doesn't check `iss`/`aud`, and app tokens are signed with the **Supabase project JWT secret** (needed so `auth.uid()` works for direct client calls). That widens the blast radius of the secret and means any Supabase-issued JWT with a `sub` is accepted (C-5).
**Fix.** Short-lived access token (e.g. 1–24 h) + refresh, or a `token_version`/`jti` checked against the user row so you can revoke; check `status` and existence on every request; verify `iss === "nakshra-otp"` and `aud`; remove Firebase/Supabase-token fallbacks in `requireAuth` (H-14/L-3) so only your own tokens are accepted.

### H-12 · Fake delivery estimates shown to customers  `S`
**Where:** `packages/shared-api/src/shipping.ts` (fallbacks), `apps/web/visual/pages/ProductDetailPage.tsx:157-165`

When the serviceability call fails — or the pincode is short — the code invents a courier ("BlueDart Air Express", "Delhivery Direct", … chosen by hashing the pincode), a delivery date 2–5 days out, and `codAvailable: true`. Customers are shown carrier names and dates that are not real, and COD availability that isn't implemented (C-7). `/shiprocket/serviceability` is also unauthenticated (H-7).
**Fix.** On failure show "Couldn't check this pincode — try again" (or a clearly generic "usually 3–7 days"), never a specific courier/date, and default `codAvailable` to false. Also remove the client call to the nonexistent `/shiprocket/track?orderId=` (`packages/shared-api/src/astrology.ts:58-61`).

### H-13 · Chat: prompt injection, URL injection into Gorse, no auth  `S–M`
**Where:** `backend/routes/chat.js:15-27, 64-65, 111`; `backend/routes/recommendations.js:14`

- `pageContext` is interpolated straight into the **system prompt**; `history[].text` is passed through unchecked and unbounded (1 MB body cap). Users can rewrite the assistant's instructions or run up LLM cost.
- `userId` from the request is interpolated unencoded into `${GORSE_URL}/api/recommend/${userId}` (and `req.params.userId` in `recommendations.js`; Express decodes `%2F`). Path manipulation against your Gorse instance.
- The endpoint is unauthenticated; only an in-memory per-IP limiter (20/5min) protects your Groq spend. The fallback branch returns `error: err.message` to the client.
**Fix.** Cap message/history length and count; validate `pageContext` against a whitelist of routes (or drop it into a user message, not the system prompt); `encodeURIComponent(userId)`; require auth or a signed anonymous token; add a daily spend cap; stop returning `err.message`.

### H-14 · Business logic still in the browser (direct Supabase writes)  `L`
**Where:** ~35 direct table calls across the web app and shared packages, e.g. `PaymentPage.tsx:246` (orders), `ProfilePage.tsx:150-476`, `ShippingPage.tsx:98-588` (addresses/orders), `AstrologerDashboard.tsx:227-1010` (astrologers, chat, `astrologer_transactions`), `AuthPage.tsx:475-662`, `ConsultPage.tsx:191-311`, `packages/shared-auth/src/AuthContext.tsx:135` (users), `CartContext.tsx:129`, `WishlistContext.tsx:60-99`, `Newsletter.tsx:29`, `ContactUsPage.tsx:22`, plus 6 mobile screens.

This is the root cause of C-10/C-11: correctness and security depend on RLS policies being perfect. Money-adjacent writes (`orders`, `astrologer_transactions`) must never come from the client. Order history is also kept in `localStorage` (`Nakshra_user_orders_*`, `Nakshra_guest_orders`) and displayed as if authoritative, including orders the server never saw.
**Fix.** Migrate incrementally: orders, transactions, profile/address writes, astrologer/chat writes → authenticated backend routes; keep direct Supabase only for genuinely public reads (products, published reviews) and the review author's own rows. Delete localStorage order caches or mark them clearly as "unconfirmed".

### H-15 · Cancelling a booked/shipped order doesn't cancel the shipment; no refund flow  `M`
**Where:** `backend/services/orderService.js:140-172` (`cancelOrder`), `backend/services/paymentService.js` (shipment fields)

Cancel is allowed while `CONFIRMED`, but a Shiprocket order/AWB may already exist (the confirm step stores `shipment_id`/`awb_code`). `cancelOrder` sets `CANCELLED` and restocks but never calls Shiprocket's cancel — the parcel can still ship and the stock is double-counted. Paid orders are only flagged `REFUND_PENDING`; there is no refund execution, no `refund.*` webhook handling, no admin view.
**Fix.** If `shipment_id` is set, cancel via Shiprocket first (and refuse cancellation once picked up); call `razorpay.payments.refund` (or provide an admin action) and handle `refund.processed/failed` webhooks; add an audit trail table for order state changes.

---

## 3. 🟡 Medium

### M-1 · CORS allows every `*.vercel.app` site  `S`
`backend/server.js:63, 72` — `/\.vercel\.app$/` matches *any* attacker-deployed Vercel site, with `credentials: true`. Auth is a Bearer header rather than cookies, so impact is limited, but the allowlist is effectively meaningless. **Fix.** Allow only your project's preview pattern (e.g. `^https://nakshra-[a-z0-9-]+-<team>\.vercel\.app$`) and only when not in production.

### M-2 · No fail-fast on missing config; placeholder clients; shallow `/health`  `S`
- `backend/config/supabase.js:27-32` builds a client against `https://placeholder.supabase.co` if env is missing, and silently falls back to the **anon** key if the service key is missing.
- `backend/config/razorpay.js:5` uses `rzp_test_dummykeyid`.
- `packages`/apps hard-code Razorpay test key fallbacks: `apps/web/visual/pages/PaymentPage.tsx:21`, `apps/mobile/src/screens/CheckoutScreens.tsx:24`. A missing `VITE_RAZORPAY_KEY_ID` in a prod build would open checkout with a test key against a live backend.
- `/api/health` (`server.js:120`) always returns ok, so Render reports healthy while every DB call fails.
**Fix.** A `config.js` that validates required env at boot (fail fast in production), no fallbacks; health check pings Supabase (cheap `select 1`) and reports degraded state; remove hard-coded key fallbacks.

### M-3 · Logging leaks PII; console monkey-patch; no request IDs; no frontend error tracking  `M`
`backend/server.js:9-34, 80` — every request URL is logged, including `?email=`/`?phone=` lookups (PII in Render logs). `console.log/error` are globally replaced to keep 200 lines in memory for the debug route. No structured logging or request/correlation ids. Sentry is backend-only and a no-op without a DSN; the frontend has none (docs item R2), so production browser errors are invisible.
**Fix.** Use `pino` + `pino-http` (redact query strings/authorization), drop the console patch, add a request id middleware, wire `@sentry/react`/`sentry-expo`, and alert on 5xx rate + failed webhooks.

### M-4 · Webhook gaps  `S–M`
`backend/routes/payments.js:38-62`, `backend/services/paymentService.js:21-31`
- Amount/currency in the webhook payload aren't compared with `payments.amount`.
- Signature comparison uses `===` (use `crypto.timingSafeEqual` on equal-length buffers).
- `.single()` on a missing payment row errors and is treated as a generic 500 → Razorpay retries forever; return 200 + log for unknown orders.
- Only `payment.captured` / `payment.failed` are handled; add `order.paid`, `refund.*`. Prefer `order.paid` as the confirmation trigger.
- Webhook is behind `apiLimiter` — fine now, but make sure a burst of retries can't trip it.

### M-5 · Cart races / missing uniqueness / missing checks  `S`
`backend/routes/cart.js:56-90, 114-135` — read-then-write on quantity (lost updates); `PUT` doesn't check `is_active` or product existence (`if (prod && …)` lets a missing product through); `POST` uses `.maybeSingle()` which errors if duplicate rows already exist. The schema has no visible unique constraint on `(user_id, product_id, is_temporary)`. **Fix.** Add that unique index and use `upsert`/`on conflict do update`; `productId` should be validated as a positive integer.

### M-6 · Rate limiting is per-instance, IP-only, no per-email limit  `M`
`backend/middleware/rateLimit.js` — in-memory store (resets on restart, not shared across instances), keyed only by IP. An attacker rotating IPs can spam a victim's inbox with OTP emails and hammer verify attempts per email. **Fix.** Add per-email (and per-phone) limiters on `/otp/send` and `/otp/verify` with a shared store (Redis/Upstash or a Postgres table); keep Supabase's own limits as backup.

### M-7 · Dependency hygiene  `S`
`pnpm audit --prod` (backend): `xlsx` 0.18.5 — 2 **high** (prototype pollution, ReDoS; no patched version on npm) but only used by `generate_seed.js`/`seed_supabase.js` → move to devDependencies or replace (`exceljs`/CSV); `qs` via express — 2 moderate → update express/body-parser; `uuid` via `firebase-admin` — moderate → remove `firebase-admin` (auth.js middleware Firebase path, `packages/shared-services/src/firebase.ts`, web `package.json`). Also: two lockfiles (root + `backend/pnpm-lock.yaml` installed with `--ignore-workspace`), `.npmrc` `shamefully-hoist=true` + `strict-peer-dependencies=false` (hides phantom deps), `postinstall` downloads Chrome for every install, Node version drift (`engines >=20`, Render 22, local dev on 26). **Fix.** Pin `engines`/`.nvmrc` to 22, drop unused deps, run `pnpm audit` in CI and fail on high.

### M-8 · Puppeteer: no concurrency cap, sandbox disabled, no PDF timeout  `M`
`backend/services/kundli/pdfService.js:355-372` — `--no-sandbox --single-process --no-zygote` on a user-input pipeline; every request launches a new Chrome (the 10/10min/IP limiter doesn't bound global concurrency); `page.pdf()` has no timeout. On 512 MB, two concurrent renders can OOM the whole API. (The EJS template output is escaped — `<%=` throughout — so template injection is **not** an issue.) **Fix.** A global semaphore of 1–2 with a queue and 429/503 when full; reuse a single browser; timeouts on `setContent`/`pdf`; ideally move PDF generation to a separate worker/service (or a hosted PDF API) so it can't take down checkout.

### M-9 · Schema drift: base tables and columns aren't in the repo  `M–L`
Tables/columns used by code but **not defined in any SQL in the repo**: `orders.user_phone`, `orders.shipping_address`, `otp_codes` (the docs mention it; likely obsolete), `astrologer_transactions`, `contact_messages`, `coupons`; `user_carts`, `user_wishlists`, `subscribers` appear only inside the lockdown SQL. `supabase-schema.sql` and `seed.sql` are stale relative to production, so a new environment cannot be recreated (this also blocks the staging-DB fix in M-10).
**Fix.** Dump the real schema (`supabase db dump --schema public`), commit it as a baseline migration, adopt the Supabase CLI (`supabase/migrations/`) as the only way to change the DB, and make CI apply migrations to a throwaway database.

### M-10 · Staging and production share one database; test data in prod  `M`
Per docs, staging and prod both use `Aroham` (`lzzdfsphevmzbkkoskxb`); `ArohamNew` (`iveltpgympaucqypfyxi`) is empty; ~12 throwaway users + e2e users are still in the DB (cleanup SQL not run); staging tests can create real-looking orders. **Fix.** Make `ArohamNew` the staging DB (needs M-9's baseline), separate JWT secrets/keys per environment, run the cleanup SQL on prod, and never point staging at prod data.

### M-11 · Three different shapes for the same order data  `M`
The backend writes `orders.address` as a JSON object and `amount` in paise; the client fallback writes `address` as a **string**, plus `total_amount`, `shipping_address`, `payment_status: "PAID"`, and status `"Processing"`/`"CONFIRMED"`; `claim-orders` reads `shipping_address || address`. **Fix.** One documented order schema (status enum as a DB type, `amount_paise`, `shipping_address jsonb`), enforced by check constraints; delete the client writers (H-14).

### M-12 · Single-instance in-memory state  `S`
`global.kundaliProfiles` (`services/kundliScoring.js:5`) and `global.debugLogs` are lost on restart and don't work with more than one instance. The recommendation/chat personalisation silently depends on the first. **Fix.** Persist the derived profile (e.g. a `kundli_profiles` table keyed by user id) or drop the feature; remove `debugLogs` once real logging exists (M-3).

---

## 4. ⚪ Low / hygiene

- **L-1 · Files that don't belong in the repo.** Root contains `Kundli_Yashasvi_Solanki.pdf` and `…_Updated.pdf` (a real person's birth details — PII), `astrotalk_20_products.xlsx`, and several personal-named status docs (`YASHASVI_NEEDS_YOU.md`, `yashasvi_*`). Remove them; if the PDFs are a real individual's data, consider purging them from git history (`git filter-repo`) and get that person's consent regardless. There is **no README**.
- **L-2 · Historic `.env` committed.** `Aroham-/finalFrontend/.env` exists in early history (commits `41527ca`, `20aa580`). The version I inspected held only `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (publishable by design) and `VITE_API_BASE` — no service key. Confirm the other version(s) the same way (`git log --all -p -- '*.env*'`); nothing needs rotating unless a non-publishable key shows up.
- **L-3 · Dead / legacy code.** Firebase/Firestore remnants (`middleware/auth.js` Firebase path, `packages/shared-services/src/firebase.ts`, `AuthPage.tsx`, `Newsletter.tsx`, `ProfilePage.tsx`, `vite.config.ts`); an unreachable "account creation" branch in `AuthPage.tsx`; unused `address_type` in `routes/addresses.js:24`; root-level scripts `backend/check-orders.js`, `generate_seed.js`, `seed_supabase.js`, `seed.sql`; `docker-compose.yml` with the obsolete `version:` key.
- **L-4 · Conflicting deploy configs.** `netlify.toml` points at a `Nakshra/` directory that doesn't exist; `backend/vercel.json` exists while the backend deploys to Render; only `render.yaml` looks current. Keep one target per component and delete the rest. `render.yaml` also omits several required vars (`SUPABASE_JWT_SECRET`, `BREVO_API_KEY`/`ORDER_EMAIL_FROM`, `CORS_ALLOWED_ORIGINS`, `PUPPETEER_CACHE_DIR`, `NODE_ENV`).
- **L-5 · Docs contradict each other** on the OTP provider (Twilio → Brevo → Supabase-email across `.env.example`, `YASHASVI_NEEDS_YOU.md`, `MANUAL_TASKS_AND_BOTTLENECKS.md`). Replace the status docs with one accurate `README.md` + `docs/runbook.md` (env vars, deploy, rollback, incident steps).
- **L-6 · Frontend size/structure.** Largest chunk ≈ 558 KB; very large page components (`AstrologerDashboard.tsx` > 1000 lines, `AuthPage.tsx`, `PaymentPage.tsx`) mix UI, data access and business rules. Route-level code splitting and splitting these files will make the H-14 migration easier.
- **L-7 · Blanket `Cache-Control: no-store`** on every API response (`server.js:85-88`), including public `/api/products`. Let the public catalogue be cacheable (short `s-maxage`) to cut load and cold-start pain.
- **L-8 · Free-tier / cron workarounds.** The keep-warm GitHub cron (`.github/workflows/keep-warm.yml`) is best-effort and pings a staging service too; the Gorse free Postgres **expires ≈ 2026-12-08** (docs C3) — put a calendar reminder or upgrade before then.
- **L-9 · Recommender signal.** `sendFeedback("buy", …)` fires when the order is *created*, before payment (`orderService.js`), so abandoned checkouts count as purchases. Send it on confirmation instead. Anonymous product-card views all collapse to one `anonymous_user`.

---

## 5. Testing & CI gaps

- **T-1 · Almost no tests.** Three backend files (~150 lines: OTP, session, webhook signature). **Nothing** covers orders, payments/verify, stock, coupons, cart, addresses, auth routes, or any web/mobile code.
- **T-2 · CI is shallow.** Backend "typecheck" is only `node scripts/syntax-check.js`; there is no linter, no `pnpm audit` gate, no migration check, no secret scanning, and `keep-warm` only runs from `main`.
- **T-3 · Add these tests before/with the fixes above** (use a Supabase test project or a local Postgres, and mock Razorpay/Shiprocket):
  - verify: valid signature for a *different* order → rejected (C-1); other user's order → 403
  - `/payments/failed` idempotent + owner-only; stock changes at most once (C-2)
  - verify + webhook concurrent/replayed → one email, one shipment, one stock commit (C-3)
  - boot refuses mock flags / missing JWT secret in production (C-4)
  - `/auth/signup` gone (C-5); wrong OTP rejected by server on mobile flow (C-6)
  - COD happy path and backend-down path (C-7); client doesn't show success on verify failure (C-8)
  - `GET /orders` never returns another user's order (C-9)
  - create-order all-or-nothing under partial stock (H-1); expiry job (H-2)
  - coupon limits (H-4); address validation (H-5); email escaping (H-6)
- **T-4 · Security regression tests.** A small script that hits the anon Supabase endpoint (read-only) and asserts sensitive tables return nothing (guards C-10/C-11 after every migration).
- **T-5 · Pre-launch end-to-end run.** Full purchase on live keys with a real ₹1-equivalent order, cancel/refund, COD, failed payment, closed-popup, and double-click — plus a load test on `/api/orders` and `/api/kundli/generate` against the target instance size.

---

## 6. What's already good (don't regress these)

- `helmet`, JSON-only 404/error handlers, CORS allowlist with clean 403s, per-route rate limits on OTP / chat / kundli.
- Prices and stock are always read from the DB at checkout; quantities are validated as positive integers; negative-qty and price-tampering paths are closed.
- Constant-time HMAC compare for session tokens; webhook signature check exists; OTP verification is delegated to Supabase Auth with the service-role client deliberately kept separate.
- Ownership checks on addresses and on `cancelOrder`; debug/diagnostic routes are gated behind `ENABLE_DEBUG_ROUTES`.
- SQL migrations are dated and carefully commented; the lockdown SQL includes a rollback.
- Chat widget escapes HTML before formatting; kundli EJS output is escaped; the `.gitignore` covers env files.
- CI exists and the team keeps candid status docs — the risks in this review are largely already named there.

---

## 7. Suggested order of work

**Phase 0 — today (no code):** V-1 … V-6. If V-1 or V-3 finds anything, contain first (turn off mock, rotate secret, reconcile payments).

**Phase 1 — before any real payment (≈ 1–2 weeks):** C-1, C-2, C-3 (one payment-state-machine refactor, best done together as an atomic DB function) · C-4, C-5, C-6 (auth) · C-7, C-8 (COD + honest checkout UI) · C-9 · C-10, C-11 (RLS) · tests T-3 for all of these.

**Phase 2 — before public launch:** H-1, H-2, H-3, H-5, H-6, H-9, H-10, H-11, H-12 · M-2, M-3 (config fail-fast, logging, Sentry) · M-4 (webhook) · M-10 (staging DB).

**Phase 3 — hardening:** H-4, H-7, H-8, H-13, H-14 (incremental), H-15 · M-1, M-5 … M-9, M-11, M-12 · L-1 … L-9 · T-2, T-4, T-5.

**Definition of done for "production-ready":** all 🔴 closed and verified; V-2 returns no unintended permissive policies; a full live-keys purchase/cancel/refund/COD walk-through passes; error tracking and alerting are live on both web and backend; staging is isolated from prod data; a README/runbook exists.

---

## 8. 🟠 Shiprocket fulfilment — why orders may not appear in Shiprocket

**Symptom reported:** the delivery estimate for a pincode works, but orders don't show up in the Shiprocket panel.

**Key point: a working estimate is not proof the integration works.** The estimate comes from `GET /api/shiprocket/serviceability`, but `packages/shared-api/src/shipping.ts` swallows any failure of that call and **invents** a courier ("BlueDart Air Express", "Delhivery Direct", "DTDC Premium", "Xpressbees Surface", "Shadowfax Express", picked by hashing the pincode) and a 2–5 day date; an empty courier list yields the generic "Shiprocket Express". If the courier names you see come from that list, Shiprocket credentials are probably not working at all (see H-12). Order creation is a completely separate code path from the estimate.

**How fulfilment is triggered:** only inside `confirmOrder` (`backend/services/paymentService.js:34-126`), i.e. after a successful online payment (`/payments/verify` or the webhook). It runs `createAdhocOrder → assignCourierAndAWB → generateLabel` (`backend/services/shiprocket/ShiprocketService.js`). Every failure branch logs a line and leaves the order `CONFIRMED` — **nothing is surfaced or retried**.

### Likely causes, most probable first

- [ ] **S-1 · Fulfilment is switched off or unconfigured.** `confirmOrder` returns early unless `SHIPROCKET_ENABLED === "true"` **and** `SHIPROCKET_EMAIL` + `SHIPROCKET_PASSWORD` are set (`paymentService.js:59-72`). Your docs (Sept 9–10) record `SHIPROCKET_ENABLED=false` and no credentials, and `render.yaml:37-38` hard-codes `SHIPROCKET_ENABLED` to `"false"` as a plain value, so a Blueprint sync can reset it. It must be set on the **exact service that receives the payment/webhook** (prod vs the Yashasvi staging service are separate). **Fix:** set the three vars on the right service; make `SHIPROCKET_ENABLED` `sync: false` in `render.yaml`.
- [ ] **S-2 · Credentials may not be a valid *API user*.** Per Shiprocket's docs the API needs a dedicated API user (Panel → Settings → API → Configure → *Create an API User*, using an email different from your normal login). The main account login typically fails. Confirm in the panel and re-check via `/api/shiprocket/test-auth`.
- [ ] **S-3 · `pickup_location` is hard-coded to `"warehouse"`.** `ShiprocketService.js:40` uses `orderData.pickup_location || 'warehouse'`, and `paymentService.js` never passes one. Shiprocket requires the value to match a pickup-address **nickname** in your panel exactly (Settings → Pickup Addresses); if yours is e.g. "Primary" the create call fails with a "wrong pickup location" 4xx. There is no env var for it (`SHIPROCKET_PICKUP_PINCODE` is only used for the estimate). **Fix:** add `SHIPROCKET_PICKUP_LOCATION`, pass it through, and validate it at boot against `GET /settings/company/pickup`.
- [ ] **S-4 · Address keys don't match, so junk data is sent.** The web checkout builds a **new** address as `{name, full_name, phone, email, address_line1, line1, city, state, pincode, pin, …}` (`ShippingPage.tsx:550-565`) and posts it to `/api/orders` unvalidated; the backend then reads `addr.address` (`paymentService.js:88-97`) — which does not exist on that object — and substitutes `"No address provided"`. Also: `state` isn't required by the form (falls back to the city name, which Shiprocket rejects as a state), an empty email becomes `noemail@example.com`, and missing phone/pincode become `0000000000` / `000000`. The validator accepts all of these, so a shipment is either rejected by Shiprocket (4xx) or created with a junk address. Addresses saved via the backend (`addresses` table, key `address`) do map correctly, which is probably why earlier tests looked fine. **Fix:** one server-side `normalizeAddress()` (accept `address|address_line1|line1`, `pincode|pin`, `name|full_name`), strict validation (H-5), and **refuse to book a shipment from fallback values** — mark the order `NEEDS_ATTENTION` instead.
- [ ] **S-5 · Failures are invisible and partial progress is lost.** All error branches end in `update orders set status='CONFIRMED'` plus a `console` line; no `fulfilment_status`/`fulfilment_error` column, no retry, no alert. If the order is created in Shiprocket but AWB assignment fails (very common when the Shiprocket **wallet balance is low**), `processFulfillment` returns `success:false` and the `shipment_id` is discarded, so the DB shows nothing and a naive retry could duplicate. The 5xx retry loop in `lib/api-client.js` also re-POSTs the non-idempotent create call. **Fix:** persist `shipment_id` immediately after create; separate steps into a retryable job keyed by `order_id` (look the order up in Shiprocket before creating); store `fulfilment_status/error`; alert on failures; check wallet balance.
- [ ] **S-6 · Only online-paid orders can ever reach Shiprocket.** COD/pending orders never call `confirmOrder` (C-7), so they are never shipped. `POST /api/shiprocket/test-order` (the only manual trigger) needs `ENABLE_DEBUG_ROUTES=true` plus a valid session.
- [ ] **S-7 · Hard-coded parcel data.** Weight 0.5 kg and 10×10×10 cm for every order (`ShiprocketService.js:69-72`), no per-product weight/dimensions, `sub_total = order.amount/100` even when a coupon made it smaller than the item total, `order_date` sent as `YYYY-MM-DD` only (Shiprocket examples use `YYYY-MM-DD HH:mm` — verify). Wrong weights cause courier weight-discrepancy charges. **Fix:** add weight/dimensions to `products`, compute per order, send discount explicitly, send full timestamp.
- [ ] **S-8 · Estimate logic quirks.** `checkServiceability` hard-codes `cod=1` and `weight=0.5` (`ShiprocketService.js:151`) and the UI takes `available_courier_companies[0]` rather than Shiprocket's recommended courier or the cheapest/fastest, so prepaid-only pincodes can look unserviceable and dates can be off. Verify against a real response and use `cod=0` for prepaid, `recommended_courier_company_id`, and real weights.
- [ ] **S-9 · No status sync or working customer tracking.** There's no Shiprocket webhook, so orders never move to `SHIPPED`/`DELIVERED` (statuses the cancel logic assumes exist). `TrackOrderPage` sends the customer's **internal order id** to `/shiprocket/track/:id`, which expects a Shiprocket shipment id or AWB, and that route is unauthenticated (H-7). **Fix:** `GET /api/orders/:id/tracking` that checks ownership, reads `awb_code` from the DB and tracks by it; add a Shiprocket webhook (Panel → Settings → API → Webhooks) to update status and notify customers.

### 10-minute diagnosis (in order)

1. **Render logs:** after one paid test order, search the backend service's logs for `[Shiprocket]`. You will see exactly one of: `Integration DISABLED` (S-1) · `ENABLED but credentials missing` (S-1) · `Triggering fulfillment…` followed by `Fulfillment FAILED … <reason>` (the reason names the cause: pickup location, address, wallet, credentials) · `Fulfillment SUCCESS` (then look in the panel under Orders → search the order id).
2. `curl https://<backend>/api/shiprocket/status` → shows `enabled`, `emailConfigured`, `passwordConfigured`.
3. `curl "https://<backend>/api/shiprocket/serviceability?delivery_pincode=110001"` → `success:true` with a real `available_courier_companies` list = credentials valid; `success:false` = credentials bad **and the UI is showing fake estimates**.
4. **DB:** `select id, status, shipment_id, awb_code, created_at from orders order by created_at desc limit 10;` — confirmed orders with `shipment_id is null` were never booked.
5. **Staging only:** set `ENABLE_DEBUG_ROUTES=true`, call `POST /api/shiprocket/test-auth`, then `POST /api/shiprocket/test-order` with a real `orderId` to get the raw Shiprocket error. Warning: this creates a **real** order in your Shiprocket account and may debit the wallet when the AWB is assigned — cancel it afterwards with `/api/shiprocket/cancel` and turn debug routes off again.

### Definition of done for Shiprocket

A paid order (with a *new* address, and with a saved address) appears in Shiprocket with the correct pickup location, address, phone, pincode and weight; `orders.shipment_id`/`awb_code` are populated; a deliberately broken setup (bad pickup name, empty wallet) produces a visible `NEEDS_ATTENTION` order and an alert instead of silence; tracking works from the customer's order page; the estimate never shows a courier or date that Shiprocket didn't return.
