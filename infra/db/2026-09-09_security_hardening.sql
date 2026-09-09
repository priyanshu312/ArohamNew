-- Nakshra / Aroham (lzzdfsphevmzbkkoskxb) — security hardening
-- Run in: Supabase dashboard -> SQL Editor -> paste -> Run.
-- Safe to run once; every statement is idempotent or guarded.
-- Source: Supabase security advisor, 2026-09-09.

begin;

------------------------------------------------------------------------
-- P1 (CRITICAL): the two cascade-delete functions are SECURITY DEFINER
-- and were EXECUTE-able by `anon` / `authenticated` via /rest/v1/rpc/...
-- i.e. anyone with the public anon key could trigger a full cascade
-- delete. They are only meant to run from triggers. Revoke all API roles.
------------------------------------------------------------------------
revoke execute on function public.fn_cascade_delete_user()       from anon, authenticated, public;
revoke execute on function public.fn_cascade_delete_astrologer()  from anon, authenticated, public;

------------------------------------------------------------------------
-- P2 (ERROR): public.reviews has RLS DISABLED but carries 7 stale,
-- overlapping policies. Drop them, enable RLS, add two clean ones:
--   * anyone may READ reviews
--   * anyone may SUBMIT a review (moderation/edits happen server-side
--     with the service-role key, which bypasses RLS)
------------------------------------------------------------------------
drop policy if exists "Allow public access reviews"          on public.reviews;
drop policy if exists "Allow public insert for reviews"      on public.reviews;
drop policy if exists "Allow public insert to reviews"       on public.reviews;
drop policy if exists "Allow public read access to reviews"  on public.reviews;
drop policy if exists "Allow public read for approved reviews" on public.reviews;
drop policy if exists "Public insert reviews"                on public.reviews;
drop policy if exists "Public read reviews"                  on public.reviews;

alter table public.reviews enable row level security;

create policy "reviews_public_read"
  on public.reviews for select
  to anon, authenticated
  using (true);

create policy "reviews_public_insert"
  on public.reviews for insert
  to anon, authenticated
  with check (true);
-- no UPDATE / DELETE policy => anon cannot edit or remove reviews.
-- If you later add a moderation workflow, change reviews_public_read's
-- USING clause to  (status = 'approved').

------------------------------------------------------------------------
-- P3 (WARN): pin search_path on SECURITY DEFINER / helper functions so
-- a caller cannot shadow built-ins via their own search_path.
------------------------------------------------------------------------
alter function public.reserve_stock(p_product_id bigint, p_qty integer)  set search_path = public, pg_temp;
alter function public.commit_stock(p_product_id bigint, p_qty integer)    set search_path = public, pg_temp;
alter function public.release_stock(p_product_id bigint, p_qty integer)   set search_path = public, pg_temp;
alter function public.fn_cascade_delete_user()                            set search_path = public, pg_temp;
alter function public.fn_cascade_delete_astrologer()                      set search_path = public, pg_temp;
alter function public.next_astrologer_application_number()                set search_path = public, pg_temp;

commit;

-- Not SQL — do these in the dashboard:
--   Authentication -> Sign In / Providers -> enable "Leaked password protection"
--   (checks new passwords against HaveIBeenPwned).
