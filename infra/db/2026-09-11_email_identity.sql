-- ============================================================================
--  Email becomes the account identifier  —  Aroham (lzzdfsphevmzbkkoskxb)
-- ============================================================================
--
--  WHY
--  Signup/login moved from phone-OTP to email-OTP. Email is now the identity;
--  phone is optional profile/delivery data captured in the shipping address at
--  checkout. `public.users.phone` is currently NOT NULL, which blocks creating
--  an account from an email alone.
--
--  `public.astrologers` needs no change — its `email` and `phone` are already
--  nullable.
--
--  SAFE TO RUN ANY TIME. It only relaxes a constraint; it does not touch data
--  and cannot break the currently-deployed frontend (nothing depends on phone
--  being non-null). Run it BEFORE deploying the email-identity backend.
--
--  ROLLBACK:
--    -- only works if every row still has a phone:
--    alter table public.users alter column phone set not null;
-- ============================================================================

-- STATUS
--   [x] step 1 — APPLIED 2026-09-11 (phone is nullable, verified).
--   [ ] step 2 — still to run (optional; a performance nicety, not correctness).

-- 1. Phone is no longer required to have an account.   ← ALREADY APPLIED
alter table public.users alter column phone drop not null;

-- 2. Email is the lookup key now, so index it case-insensitively to match how
--    the backend queries it (ilike). A plain idx_users_email already exists on
--    the raw column, so lookups work without this — it just avoids a seq scan
--    once the table grows. Safe to run any time.
create index if not exists idx_users_email_lower on public.users (lower(email));

-- ---------------------------------------------------------------------------
-- NOT INCLUDED ON PURPOSE: a UNIQUE constraint on email.
--
-- Three addresses are currently duplicated across rows in this database:
--   astrologer_3210@aroham.com, acharya.vedic@aroham.com, heroicmortal84@gmail.com
-- so `create unique index ... on users (lower(email))` would FAIL today.
--
-- Most of those rows are throwaway test accounts. After running
-- infra/db/2026-09-09_cleanup_test_data.sql, re-check with:
--
--   select lower(email), count(*) from public.users
--   where email is not null group by 1 having count(*) > 1;
--
-- and once it returns no rows, add the constraint that makes email a real
-- identity key:
--
--   create unique index users_email_unique on public.users (lower(email))
--     where email is not null;
-- ---------------------------------------------------------------------------
