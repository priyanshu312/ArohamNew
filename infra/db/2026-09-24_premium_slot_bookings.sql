-- Premium astrologers and paid 30-minute slot bookings.
--
-- A premium astrologer is not "chat now": the user picks a half-hour slot from
-- the astrologer's weekly availability, pays the astrologer's fee, and can only
-- open the chat during that slot.
--
-- astrologers.is_premium       set by admins only (admin portal, service role)
-- astrologers.consultation_fee rupees per 30-minute slot, set by the astrologer
-- astrologers.weekly_slots     {"mon": ["10:00", "10:30"], ...} — IST start times
--                              of the half-hour slots the astrologer offers
--
-- slot_bookings is written only by the backend (service role). Its partial
-- unique index is what stops two people booking the same slot: a slot is taken
-- while a booking for it is PENDING_PAYMENT (a short hold while the user pays)
-- or CONFIRMED, and Postgres rejects the second insert however close together
-- the two requests are.

alter table public.astrologers
  add column if not exists is_premium boolean not null default false,
  add column if not exists consultation_fee integer not null default 500,
  add column if not exists weekly_slots jsonb not null default '{}'::jsonb;

-- The astrologer portal writes this table with the public anon key, so these
-- bounds are all that stop a ₹1 fee being set on someone's profile.
alter table public.astrologers drop constraint if exists astrologers_consultation_fee_range;
alter table public.astrologers
  add constraint astrologers_consultation_fee_range check (consultation_fee between 100 and 100000);

-- The anon/authenticated roles could write every column. Take is_premium (and
-- status, which is how admins block an astrologer) out of what they can write.
-- NOTE: a column added to astrologers later must be added to these grants too,
-- or the astrologer portal will get "permission denied" writing it.
revoke insert, update on public.astrologers from anon, authenticated;
grant insert (id, title, experience_years, specialties, languages, rating, consultations_count,
              is_online, bio, price_per_min, avatar_url, updated_at, full_name, email, phone, role,
              last_active_at, working_hours, consultation_fee, weekly_slots)
  on public.astrologers to anon, authenticated;
grant update (id, title, experience_years, specialties, languages, rating, consultations_count,
              is_online, bio, price_per_min, avatar_url, updated_at, full_name, email, phone, role,
              last_active_at, working_hours, consultation_fee, weekly_slots)
  on public.astrologers to anon, authenticated;

create table if not exists public.slot_bookings (
  id uuid primary key default gen_random_uuid(),
  -- No cascade: deleting an astrologer must not silently delete paid bookings.
  astrologer_id uuid not null references public.astrologers(id),
  user_id text not null,
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  amount integer not null check (amount >= 100),          -- paise
  status text not null default 'PENDING_PAYMENT' check (status in (
    'PENDING_PAYMENT',  -- held while the user is in the Razorpay window
    'CONFIRMED',        -- paid; the slot is theirs
    'EXPIRED',          -- hold ran out, or the user closed the payment window
    'CANCELLED',
    'REFUNDED',
    'PAID_SLOT_LOST'    -- paid after the hold expired and someone else took the slot: refund by hand
  )),
  hold_expires_at timestamptz not null,
  razorpay_order_id text unique,
  razorpay_payment_id text,
  paid_at timestamptz,
  chat_session_id uuid,
  created_at timestamptz not null default now(),
  constraint slot_bookings_half_hour check (
    -- On the half hour. IST is UTC+5:30, so its half hours are UTC's too.
    slot_end = slot_start + interval '30 minutes'
    and extract(epoch from slot_start)::bigint % 1800 = 0
  )
);

create unique index if not exists slot_bookings_one_live_booking_per_slot
  on public.slot_bookings (astrologer_id, slot_start)
  where status in ('PENDING_PAYMENT', 'CONFIRMED');

create index if not exists slot_bookings_user_idx on public.slot_bookings (user_id, slot_end);

-- Backend only. RLS on with no policies, and no grants to the public roles.
alter table public.slot_bookings enable row level security;
revoke all on public.slot_bookings from anon, authenticated;
