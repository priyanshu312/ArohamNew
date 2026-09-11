-- ============================================================================
--  Clear fabricated dates of birth / genders  —  Nakshra (lzzdfsphevmzbkkoskxb)
-- ============================================================================
--
--  WHY
--  Signup never asked for a date of birth, but the backend wrote one anyway:
--
--    backend/routes/auth.js
--      dob:    extra.dob || new Date().toISOString().split("T")[0]   <- today
--      gender: extra.gender || "Other"
--
--    apps/web/visual/pages/ProfilePage.tsx
--      dob: editForm.dob || "2000-01-01"
--
--  So every account got a birthday equal to the day it signed up (or the
--  2000-01-01 placeholder), and a gender nobody chose. Both columns are
--  nullable, so those defaults were never needed — they just produced data that
--  is indistinguishable from real answers once stored, and would silently feed
--  wrong results into any horoscope/kundli feature that reads them.
--
--  All three code paths now store NULL. This file cleans up what they already
--  wrote. 21 rows matched at the time of writing (19 test accounts + 2 real).
--
--  WHY IT IS SAFE TO MATCH ON dob = created_at::date
--  A real birth date equalling the exact day the account was created is not a
--  thing. Rows with a genuine birthday (e.g. 1990-05-15) do not match and are
--  left untouched.
--
--  GENDER: the web signup had no gender input at all until 2026-09-12, so every
--  'Other' on a fabricated row came from the same default. Only rows that also
--  have a fabricated dob are cleared, so a value somebody deliberately chose in
--  their profile is preserved.
--
--  ROLLBACK: none needed — this only removes values that were never real. Take
--  a snapshot first if you want the option:
--    create table users_dob_backup_20260912 as
--      select id, dob, gender from public.users;
-- ============================================================================

-- STATUS
--   [ ] not yet run in production.

-- Preview first — confirm the row list looks like fabricated data only.
select id, email, full_name, dob, gender, created_at::date as signup_date
from public.users
where dob is not null and (dob = created_at::date or dob = '2000-01-01')
order by created_at desc;

-- Then apply.
update public.users
set dob = null,
    gender = case when gender = 'Other' then null else gender end
where dob is not null
  and (dob = created_at::date or dob = '2000-01-01');

-- Verify: expect dob_is_signup_date = 0 and dob_is_2000_placeholder = 0.
select
  count(*) as total_users,
  count(*) filter (where dob = created_at::date)  as dob_is_signup_date,
  count(*) filter (where dob = '2000-01-01')      as dob_is_2000_placeholder,
  count(*) filter (where dob is null)             as dob_null
from public.users;
