-- ============================================================================
--  RLS lockdown for user-owned tables  —  Aroham (lzzdfsphevmzbkkoskxb)
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
--  PREREQUISITE — now satisfied on `Yashasvi` (commit fc81927):
--  The web client hands the phone-OTP JWT to supabase-js
--  (packages/shared-services/src/supabase.ts → applySupabaseAuth /
--  initSupabaseAuthFromStorage). That JWT is signed with the project JWT secret
--  and carries sub=<user id>, role=authenticated, aud=authenticated, so after
--  login `auth.uid()` resolves to the user id for every direct
--  supabase.from(...) call. Verified live 2026-09-10: with the token set,
--  auth.uid() = the user id, auth.role() = 'authenticated', getUser() succeeds.
--
--  The few client-side WRITES that don't fit "your own row" were moved server-
--  side or are already .catch()-guarded:
--    - guest-order → user_id link-up: now in backend getUserOrders() (service role)
--    - orders status writes from the client: already fire-and-forget .catch(()=>{})
--    - users upsert (AuthContext.handleUserSupabaseSync): covered by
--      users_self_insert + users_self_update below
--
--  ⚠️  DO NOT run this against a database whose FRONTEND bundle predates
--      fc81927. Aroham is shared by staging AND production, so only run this
--      once `main` (prod Vercel) has also been rebuilt with that commit —
--      i.e. as part of the promotion, right after the prod frontend deploy.
--      Running it earlier logs every prod user out on the 4-second block-poll
--      and blanks their profile / addresses / order history.
--
--  ROLLBACK (paste in the SQL editor if the app misbehaves):
--    begin;
--    drop policy if exists users_self_read   on public.users;
--    drop policy if exists users_self_insert on public.users;
--    drop policy if exists users_self_update on public.users;
--    drop policy if exists orders_self_read  on public.orders;
--    drop policy if exists addresses_self_all on public.addresses;
--    drop policy if exists user_carts_self_all on public.user_carts;
--    drop policy if exists user_wishlists_self_all on public.user_wishlists;
--    drop policy if exists subscribers_public_insert on public.subscribers;
--    create policy "Allow public access users"        on public.users        for all to public using (true) with check (true);
--    create policy "Allow public access orders"       on public.orders       for all to public using (true) with check (true);
--    create policy "Allow addresses select" on public.addresses for select to public using (true);
--    create policy "Allow addresses insert" on public.addresses for insert to public with check (true);
--    create policy "Allow addresses update" on public.addresses for update to public using (true);
--    create policy "Allow addresses delete" on public.addresses for delete to public using (true);
--    create policy "Allow public access user_carts"    on public.user_carts    for all to public using (true) with check (true);
--    create policy "Allow public access user_wishlists" on public.user_wishlists for all to public using (true) with check (true);
--    create policy "Allow public access subscribers"   on public.subscribers   for all to public using (true) with check (true);
--    commit;
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- users : read + update ONLY your own row. Insert only your own row (covers
--         the client's upsert-on-sync); backend service_role still creates
--         rows on first login regardless of RLS.
-- ---------------------------------------------------------------------------
drop policy if exists "Allow public access users" on public.users;
drop policy if exists "Allow user select"        on public.users;
drop policy if exists "Allow user insert"        on public.users;
drop policy if exists "Allow user update"        on public.users;

create policy "users_self_read"   on public.users
  for select to authenticated using (auth.uid() = id);
create policy "users_self_insert" on public.users
  for insert to authenticated with check (auth.uid() = id);
create policy "users_self_update" on public.users
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
-- no DELETE policy -> clients cannot delete user rows.

-- ---------------------------------------------------------------------------
-- orders : read your own; NO client writes (backend owns the whole lifecycle
--          via service_role: create / confirm / fail / cancel).
-- ---------------------------------------------------------------------------
drop policy if exists "Allow public access orders" on public.orders;
drop policy if exists "Allow orders select"        on public.orders;
drop policy if exists "Allow orders insert"        on public.orders;
drop policy if exists "Allow orders update"        on public.orders;

create policy "orders_self_read" on public.orders
  for select to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- addresses : full CRUD, but only on rows you own.
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
-- subscribers : newsletter signup form stays public INSERT-only; no client
--               read / update / delete. (A repeat signup that used to UPSERT
--               will now just no-op on the DB — the form already treats any
--               2xx/!error as success.)
-- ---------------------------------------------------------------------------
drop policy if exists "Allow public access subscribers"    on public.subscribers;
drop policy if exists "Allow public newsletter inserts"    on public.subscribers;
create policy "subscribers_public_insert" on public.subscribers
  for insert to anon, authenticated with check (true);

commit;

-- After running: re-check the advisor
--   (MCP)  get_advisors(project_id, 'security')
-- and confirm the app: login → profile loads → add/edit/delete address →
-- add to cart → wishlist toggle → place + view an order → newsletter signup.
