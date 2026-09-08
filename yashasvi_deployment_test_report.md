# Yashasvi Branch — Deployment Test Report

**Date:** 2026-09-09
**Branch:** `Yashasvi` @ `0626a08` ("chore(web): split vendor bundles")
**Repo:** `priyanshu312/ArohamNew`

## Targets tested

| Layer | Deployment | URL | Reachable |
|---|---|---|---|
| Backend | Render — `nakshra-backend-yashasvi` (`srv-dag7m4pt0dsc73e8hap0`), **new preview service** created for this test, branch `Yashasvi` | https://nakshra-backend-yashasvi.onrender.com | ✅ public |
| Frontend | Vercel — `aroham-new-web-hdkx` preview `dpl_CC9LfHU6MSF8e2HUiNmgrvi9Y7Nh`, branch `Yashasvi` | https://aroham-new-web-hdkx-git-yashasvi-nakshra-learning.vercel.app | ⚠️ behind Vercel SSO (Hobby plan, no bypass) — tested via local build of the same commit instead |
| DB | Supabase `ArohamNew` (`iveltpgympaucqypfyxi`) — per your instruction | — | ✅ but **empty** |

---

## 🔴 P0 — Critical

### 1. `POST /api/payments/webhook` crashes the entire backend (unauthenticated DoS)
Any unauthenticated POST to `/api/payments/webhook` takes the whole Node process down; Render then restarts it (~15s outage per hit).

```
TypeError [ERR_INVALID_ARG_TYPE]: The "key" argument must be of type string... Received undefined
    at prepareSecretKey (node:internal/crypto/keys:684:11)
    at Object.createHmac (node:crypto:163:10)
    at verifyWebhookSignature (backend/services/paymentService.js:17:6)
    at backend/routes/payments.js:41:8
Node.js v22.23.2   ← process exits
```

- Root cause: `verifyWebhookSignature` calls `crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)` with the secret **undefined**. `createHmac` throws synchronously and nothing catches it.
- The route (`backend/routes/payments.js:39`) has **no `requireAuth`** (correct for a webhook) — so the crash is publicly triggerable.
- **Fix:** guard for a missing/instringable secret before `createHmac`, wrap the handler body in try/catch, return `503`/`400` instead of throwing. Also add a top-level `process.on('uncaughtException')` / Express error middleware so one bad handler can't kill the server.
- Affects production too if `nakshra.onrender.com` ever loses that env var — the code is unconditionally fragile.

---

## 🟠 P1 — Broken features / config

### 2. `getEnv()` never reads Vite/`import.meta.env` vars — frontend env config is a no-op
`packages/shared-utils/src/env.ts`:

```js
const metaEnv = new Function("try { return import.meta.env; } catch(e) { return undefined; }")();
```

`import.meta` is only legal inside an ES module; inside a `new Function` body it's a syntax error, so this always throws, is swallowed, and `getEnv` returns the fallback **every time**.

Consequences on the **deployed Vercel frontend**:
- `@nakshra/shared-api` `API_BASE` → ignores `VITE_API_BASE`, hardcodes `https://Nakshra.onrender.com/api`.
- `@nakshra/shared-services` Supabase client → ignores `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, hardcodes `https://lzzdfsphevmzbkkoskxb.supabase.co` (the **Aroham** project) + a baked-in publishable key.
- Any `VITE_*` you set in the Vercel dashboard has **no effect** on these paths.
- Split-brain: components that read `import.meta.env.VITE_API_BASE_URL` **directly** (`ShopPage`, `ProductCard`, `ProductDetailPage`, `KundliModal`, `AstroChatWidget`, astrologer pages) *do* respect env — so half the app can point at one backend and half at another.
- **Fix:** in a Vite/ESM build `import.meta.env` is safe to reference directly. Replace the `new Function` hack with a normal `typeof import.meta !== "undefined" ? import.meta.env : undefined` guard (or split web/native builds).

### 3. Kundli PDF generation is broken (`POST /api/kundli/generate`)
```
500 {"error":"Failed to generate Kundli PDF",
     "details":"planetData?.HousePlanetOccupiesBasedOnSign?.replace is not a function"}
```
Fails in ~5s (not a puppeteer/timeout issue) — a type bug in the astrology data mapping: `.replace()` called on something that isn't a string. Caught (returns 500, no crash) but the feature is dead. Payload contract also undocumented — requires `location`, `date` as **DD/MM/YYYY**, `time` as **HH:MM** (returns 400 otherwise).

### 4. Chat is dead — `GROQ_API_KEY` invalid/missing
```
POST /api/chat → 500  [Chat API Groq Error]: Groq API returned status 401
                      [Chat API Gorse Error]: fetch failed
```
No Groq key on the service; Gorse (`GORSE_URL`) unset so it dials `localhost:8087` → `ECONNREFUSED`.

### 5. Recommendations partially broken
- `GET /api/recommendations/:userId` → `500 {"error":"Failed to fetch recommendations","details":"fetch failed"}` (Gorse unreachable — not handled).
- `GET /api/recommendations/item/:itemId` → `200 {"recommendations":[]}` (same Gorse failure, but handled gracefully). Inconsistent error handling between the two.

---

## 🟡 P2 — Data layer / environment

### 6. `ArohamNew` Supabase project is empty
`iveltpgympaucqypfyxi` has **zero `public` tables**. With the backend pointed there:
- `GET /api/products` → `500 "Could not find the table 'public.products' in the schema cache"`
- `GET /api/auth/email-by-phone` → `500 "Could not find the table 'public.users'"`
- `GET /api/orders/debug-last` → `"Could not find the table 'public.orders'"`

The schema + data actually live in **`Aroham`** (`lzzdfsphevmzbkkoskxb`) — that's what the code's hardcoded fallbacks use and what `nakshra.onrender.com` (prod) talks to. **Decision needed:** point the backend at `Aroham`, or run `backend/supabase-schema.sql` + `onboarding-schema.sql` + `seed.sql` against `ArohamNew`.

### 7. No service-role key → all writes fail
Only the anon/publishable key is in play. `POST /api/auth/signup` → `500 "This endpoint requires a valid Bearer token"` (needs `supabase.auth.admin.*` = service role). With RLS on nearly every table, cart/orders/addresses writes will fail regardless of which project is used.

### 8. Missing env on the preview backend
Currently set: `NODE_VERSION`, `SHIPROCKET_ENABLED`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
Missing: `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `GROQ_API_KEY`, `LLM_MODEL`, `GORSE_URL`.

---

## 🟡 P2 — Security

### 9. Unauthenticated debug endpoints in `backend/routes/orders.js`
- `GET /api/orders/debug-last` — runs a live DB query, leaks raw DB/schema errors to the public.
- `GET /api/orders/debug-logs` — **dumps the server's recent console + HTTP request log** to anyone. Remove these or gate behind auth + an env flag before any real deployment.

### 10. `public.reviews` has RLS disabled (Supabase advisor, on the Aroham project)
Anyone with the anon key can read/write every row. Decide policies, then:
`ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;`

### 11. Hardcoded credentials in source
`backend/config/supabase.js` and `packages/shared-services/src/supabase.ts` ship a real Supabase URL + publishable key as literals; `PaymentPage.tsx` / ShopPage ship `rzp_test_...` fallbacks. Publishable/test keys, but they belong in env, not git.

---

## 🟢 P3 — Quality / tooling

### 12. `pnpm typecheck` and `pnpm lint` do nothing
```
turbo run typecheck →  WARNING  No tasks were executed as part of this run.
turbo run lint      →  WARNING  No tasks were executed as part of this run.
```
No package defines `typecheck` or `lint` tasks. There is **no CI** (`.github/workflows` absent) and **no test suite** anywhere. The only real check is `@nakshra/web:build`.

### 13. `pnpm build` passes but with large-bundle warnings
`@nakshra/web:build` ✅ (48s, 2670 modules). `dist/assets/index-*.js` 610 KB, `vendor-firebase-*.js` 486 KB — both over Vite's 500 KB warning. Matches the Vercel build log.

### 14. Frontend hammers a dead endpoint
When `/api/products` fails, `useProducts` retried it in a tight loop (dozens of identical `OPTIONS`+`GET` in seconds) before falling back to the static `DEFAULT_PRODUCTS` (7 items) / sessionStorage cache. Add backoff + a failure ceiling.

### 15. Render preview service caveats
- Created via MCP, which has no `rootDir` field → build/start use `cd backend && …` instead of `render.yaml`'s `rootDir: backend`. Works, non-standard.
- Repo isn't GitHub-linked to this service ("we don't have access to your repo, but we'll try anyway" — cloned OK because the repo is public).
- Free plan / 512 MB — puppeteer PDF path (bug #3 aside) is a latent OOM risk.

---

## What worked

- `GET /api/health` → `200 {"status":"ok","service":"Nakshra-backend"}`
- Auth gating: `/api/cart`, `/api/orders`, `/api/addresses`, `/api/auth/profile` → `401 "Missing auth token"` (correct)
- `GET /api/shiprocket/status` → `200` (correctly reports disabled)
- `GET /api/recommendations/item/:id` → `200` (graceful empty)
- CORS preflight from the Vercel preview origin → `204`
- Vercel build: READY, commit `0626a08`, ~17s, no build errors
- Frontend renders (home, shop, product cards) — using bundled static catalog when the API is unreachable

---

## Recommended order of fixes

1. **#1** webhook crash — add the guard + global error handler (prevents public DoS).
2. **#2** `getEnv` — unblocks all frontend env configuration.
3. **#6 / #7** decide the Supabase project and get a service-role key — unblocks every data-backed feature.
4. **#9** pull the debug endpoints.
5. **#3 #4 #5** kundli type bug, Groq key, recommendations error handling.
6. **#12** add real `lint` / `typecheck` tasks + minimal CI so this is catchable automatically.
