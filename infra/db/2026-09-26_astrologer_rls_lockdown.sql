-- Lock the astrologer / live-chat tables down to the people they belong to.
--
-- Before this, every one of these tables had `using (true)` / `with check
-- (true)` policies for the public role, so anyone holding the website's anon
-- key could:
--   * read every customer's consultation chat (chat_sessions, chat_messages);
--   * read and edit astrologer applications — Aadhaar, PAN, bank account —
--     and their documents;
--   * rewrite any astrologer's profile, price or online status;
--   * insert fake "earnings" for any astrologer.
--
-- Identity comes from the app session token (backend/services/session.js):
-- shoppers' tokens carry their users.id, astrologers' carry their
-- astrologers.id (issued by /api/auth/otp/verify since this change). So
-- auth.uid() is "the customer" or "the astrologer" in a chat.
--
-- The backend and the admin portal use the service role and are unaffected.

-- ── astrologers ─────────────────────────────────────────────────────────────
-- Public read stays (the /consult listing). Writes: only your own row.
-- is_premium / status remain admin-only through the column grants from
-- 2026-09-24_premium_slot_bookings.sql.
drop policy if exists "Allow astrologer update"  on public.astrologers;
drop policy if exists "Allow astrologer upsert"  on public.astrologers;
drop policy if exists "Astrologer status update" on public.astrologers;
drop policy if exists "Public read astrologers"  on public.astrologers;  -- duplicate of "Public astrologers read"

create policy astrologers_self_insert on public.astrologers
  for insert to authenticated with check (auth.uid() = id);
create policy astrologers_self_update on public.astrologers
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ── chat_sessions ───────────────────────────────────────────────────────────
-- user_id / astrologer_id are text columns.
drop policy if exists "Allow chat_sessions insert" on public.chat_sessions;
drop policy if exists "Allow chat_sessions update" on public.chat_sessions;
drop policy if exists "Public read chat_sessions"  on public.chat_sessions;

create policy chat_sessions_party_read on public.chat_sessions
  for select to authenticated
  using (auth.uid()::text in (user_id, astrologer_id));
-- Only a customer opens a chat, and only as themselves.
create policy chat_sessions_customer_insert on public.chat_sessions
  for insert to authenticated
  with check (auth.uid()::text = user_id);
-- Either side can accept / decline / end it.
create policy chat_sessions_party_update on public.chat_sessions
  for update to authenticated
  using (auth.uid()::text in (user_id, astrologer_id))
  with check (auth.uid()::text in (user_id, astrologer_id));

-- ── chat_messages ───────────────────────────────────────────────────────────
drop policy if exists "Allow chat_messages insert" on public.chat_messages;
drop policy if exists "Public read chat_messages"  on public.chat_messages;

create policy chat_messages_party_read on public.chat_messages
  for select to authenticated
  using (exists (
    select 1 from public.chat_sessions s
    where s.id = chat_messages.session_id
      and auth.uid()::text in (s.user_id, s.astrologer_id)
  ));
-- You can only speak as yourself: the customer as "user", the astrologer as
-- "astrologer".
create policy chat_messages_party_insert on public.chat_messages
  for insert to authenticated
  with check (exists (
    select 1 from public.chat_sessions s
    where s.id = chat_messages.session_id
      and (
        (auth.uid()::text = s.user_id       and coalesce(chat_messages.sender, chat_messages.sender_type) = 'user')
        or
        (auth.uid()::text = s.astrologer_id and coalesce(chat_messages.sender, chat_messages.sender_type) = 'astrologer')
      )
  ));

-- ── astrologer_transactions ────────────────────────────────────────────────
drop policy if exists "Allow transactions insert" on public.astrologer_transactions;
drop policy if exists "Public read transactions"  on public.astrologer_transactions;

create policy astrologer_transactions_self_read on public.astrologer_transactions
  for select to authenticated using (auth.uid() = astrologer_id);
create policy astrologer_transactions_self_insert on public.astrologer_transactions
  for insert to authenticated with check (auth.uid() = astrologer_id);

-- ── astrologer_applications / astrologer_documents ─────────────────────────
-- No browser access at all. Applicants go through
-- /api/admin/onboarding/applications (backend/routes/astrologerOnboarding.js),
-- reviewers through the admin portal; both use the service role.
drop policy if exists "Allow public insert applications" on public.astrologer_applications;
drop policy if exists "Allow public update applications" on public.astrologer_applications;
drop policy if exists "Public read applications"         on public.astrologer_applications;
drop policy if exists "Allow public insert documents"    on public.astrologer_documents;
drop policy if exists "Allow public update documents"    on public.astrologer_documents;
drop policy if exists "Public read documents"            on public.astrologer_documents;

-- The review desk's own records (reviewer notes, interview scores, status
-- history) were public too. Nothing in the website reads them; the applicant's
-- interview schedule comes back through the onboarding API.
drop policy if exists "Allow public insert history"    on public.astrologer_history;
drop policy if exists "Public read history"            on public.astrologer_history;
drop policy if exists "Allow public insert interviews" on public.astrologer_interviews;
drop policy if exists "Allow public update interviews" on public.astrologer_interviews;
drop policy if exists "Public read interviews"         on public.astrologer_interviews;
drop policy if exists "Allow public insert notes"      on public.astrologer_notes;
drop policy if exists "Public read notes"              on public.astrologer_notes;
