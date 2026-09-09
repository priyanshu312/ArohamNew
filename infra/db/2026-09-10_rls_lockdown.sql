-- ============================================================================
--  RLS lockdown for user-owned tables  —  Aroham (lzzdfsphevmzbkkoskxb)
--  Status: NOT YET SAFE TO RUN.  Read the prerequisite section first.
-- ============================================================================
--
--  WHY THIS EXISTS
--  Every policy on users / orders / addresses / subscribers / user_carts /
--  user_wishlists is currently `USING (true) WITH CHECK (true)` for role
--  `public`. The anon key ships inside the web bundle, so today ANY visitor can
--  read, modify, or delete EVERY user's phone / email / DOB / address and every
--  order. `payments`, `order_items`, `cart_items` are already correct (RLS on,
--  zero anon policies — only the backend's service_role reaches them).
--
--  PREREQUISITE (must land before running this)
--  The web app writes these tables directly with the anon key in ~35 places
--  (AuthPage, ProfilePage, ShippingPage, PaymentPage, CartContext,
--  WishlistContext, AuthContext, Newsletter, …). The phone-OTP login does NOT
--  create a Supabase auth session, so `auth.uid()` is NULL for those calls and
--  every policy below would deny them — breaking signup, checkout, cart, etc.
--
--  So first move those writes server-side behind `requireAuth` (the backend
--  already holds the service_role key and knows `req.user.id`):
--    users        -> POST /api/auth/profile           (exists; make the client use it)
--    addresses    -> /api/addresses                    (exists; already auth'd)
--    orders       -> /api/orders + /api/payments/*      (exists; already auth'd)
--    user_carts   -> extend /api/cart                   (new)
--    user_wishlists -> new /api/wishlist                (new)
--    subscribers  -> new POST /api/newsletter           (new; keep public-insert-only if preferred)
--  Then delete the client-side `supabase.from(...).insert/update/delete` calls
--  for those tables (reads can stay if a read policy allows them).
--
--  Only after that refactor is deployed and verified: run this file in the
--  Supabase SQL editor.
--
--  ROLLBACK: re-create the permissive policies, e.g.
--    CREATE POLICY "tmp_open" ON public.<t> FOR ALL TO public USING (true) WITH CHECK (true);
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- users : a person may read + update ONLY their own row. No client insert or
--         delete (backend service_role handles creation via /auth/otp/verify).
-- ---------------------------------------------------------------------------
drop policy if exists "Allow public access users" on public.users;
drop policy if exists "Allow user select"        on public.users;
drop policy if exists "Allow user insert"        on public.users;
drop policy if exists "Allow user update"        on public.users;

create policy "users_self_read"   on public.users
  for select to authenticated using (auth.uid() = id);
create policy "users_self_update" on public.users
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
-- (service_role bypasses RLS entirely, so the backend can still create rows.)

-- ---------------------------------------------------------------------------
-- orders : read your own; no client writes at all (backend owns the lifecycle).
-- ---------------------------------------------------------------------------
drop policy if exists "Allow public access orders" on public.orders;
drop policy if exists "Allow orders select"        on public.orders;
drop policy if exists "Allow orders insert"        on public.orders;
drop policy if exists "Allow orders update"        on public.orders;

create policy "orders_self_read" on public.orders
  for select to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- addresses : full CRUD but only on rows you own.
-- ---------------------------------------------------------------------------
drop policy if exists "Allow addresses select" on public.addresses;
drop policy if exists "Allow addresses insert" on public.addresses;
drop policy if exists "Allow addresses update" on public.addresses;
drop policy if exists "Allow addresses delete" on public.addresses;

create policy "addresses_self_all" on public.addresses
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- user_carts / user_wishlists : one row per user, keyed by user_id.
-- ---------------------------------------------------------------------------
drop policy if exists "Allow public access user_carts" on public.user_carts;
create policy "user_carts_self_all" on public.user_carts
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Allow public access user_wishlists" on public.user_wishlists;
create policy "user_wishlists_self_all" on public.user_wishlists
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- subscribers : keep it insert-only for the public (newsletter signup form),
--               but no read/update/delete from the client.
-- ---------------------------------------------------------------------------
drop policy if exists "Allow public access subscribers"    on public.subscribers;
drop policy if exists "Allow public newsletter inserts"    on public.subscribers;
create policy "subscribers_public_insert" on public.subscribers
  for insert to anon, authenticated with check (true);

-- ---------------------------------------------------------------------------
-- NOTE on the OTP model: our session JWT is signed with the Supabase JWT
-- secret and carries sub=<user id>, role=authenticated, aud=authenticated, so
-- when the web client passes it to supabase-js as the access token,
-- `auth.uid()` resolves to the user id and every policy above works. Make sure
-- packages/shared-services/src/… sets that token on the supabase client after
-- login (supabase.auth.setSession / global headers), or keep those tables
-- fully server-side.
-- ---------------------------------------------------------------------------

commit;
