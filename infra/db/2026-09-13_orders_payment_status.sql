-- ============================================================================
--  Orders: stop claiming every order was paid   —  Nakshra (lzzdfsphevmzbkkoskxb)
-- ============================================================================
--
--  WHY
--  `public.orders` carried two column defaults that nothing in the backend ever
--  overrode:
--
--      total_amount    DEFAULT 0
--      payment_status  DEFAULT 'PAID'
--
--  createPendingOrder() inserts only (user_id, amount, status, address), so
--  every order silently took those defaults. The result, before this file ran:
--
--      status           payment_status   rows
--      PENDING          PAID              16
--      CANCELLED        PAID              14
--      CONFIRMED        PAID              14
--      PAYMENT_FAILED   PAID               4
--      Processing       PAID               3
--
--  Every single order claimed to be paid — including cancelled and failed ones.
--  Any revenue figure read from payment_status would have counted abandoned
--  carts as sales.
--
--  `total_amount = 0` was the second half: ProfilePage renders
--  `total_amount ?? amount/100`, and because the default wrote a literal 0
--  rather than NULL, the fallback never kicked in and orders displayed as ₹0.
--  The real figure was in `amount` (paise) and is correct in every row.
--
--  STATUS
--    [x] step 1 — APPLIED 2026-09-13 (defaults dropped).
--    [ ] step 2 — NOT YET RUN (backfill; blocked by a permission guard).
-- ============================================================================

-- 1. Remove the misleading defaults.   ← ALREADY APPLIED
alter table public.orders alter column total_amount drop default;
alter table public.orders alter column payment_status drop default;

-- 2. Backfill the rows that took them. Derives payment_status from the order's
--    real status, and clears total_amount=0 so the UI falls back to `amount`.
--
--    Safe: it never touches `amount`, which is the authoritative figure and is
--    already correct everywhere. Preview first if you like:
--
--      select status, payment_status, count(*) from public.orders
--      group by 1,2 order by 3 desc;

update public.orders
set payment_status = case upper(status)
      when 'CONFIRMED'      then 'PAID'
      when 'PROCESSING'     then 'PAID'
      when 'PENDING'        then 'PENDING'
      when 'CANCELLED'      then 'CANCELLED'
      when 'PAYMENT_FAILED' then 'FAILED'
      else 'UNKNOWN'
    end,
    total_amount = case when total_amount = 0 then null else total_amount end;

-- 3. Verify: no CANCELLED/PAYMENT_FAILED row should read PAID any more.
select status, payment_status, count(*) as rows
from public.orders
group by 1, 2
order by 1, 2;
