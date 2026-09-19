-- Aroham schema (run in Supabase SQL Editor). Matches the order-management architecture.
-- Prices/amounts in PAISE (₹499 = 49900).

create table if not exists products (
  id bigint generated always as identity primary key,
  name text not null,
  description text,
  price bigint not null,
  stock int not null default 100,
  reserved int not null default 0,
  is_active boolean not null default true, -- false = taken off the shop, kept for past orders
  variant_group text,                      -- products sharing this show as one listing, e.g. 'Baglamukhi Yantra'
  variant_label text,                      -- this product's option in that listing, e.g. 'Silver, 4 inch'
  emoji text default '🕉️'
);

create table if not exists orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  amount bigint not null,
  status text default 'PENDING',        -- PENDING | CONFIRMED | PAYMENT_FAILED
  address jsonb,
  shipment_id bigint,                   -- Shiprocket shipment ID
  awb_code text,                        -- Shiprocket Air Waybill code
  label_url text,                       -- Shiprocket printable label URL
  created_at timestamptz default now()
);

create table if not exists order_items (
  id bigint generated always as identity primary key,
  order_id uuid references orders on delete cascade,
  product_id bigint references products,
  name text, price bigint, qty int, emoji text
);

create table if not exists payments (
  id bigint generated always as identity primary key,
  order_id uuid references orders on delete cascade,
  user_id uuid references auth.users,
  amount bigint,
  status text default 'INITIATED',      -- INITIATED | SUCCESS | FAILED
  razorpay_order_id text,
  razorpay_payment_id text,
  method text, failure_reason text,
  paid_at timestamptz,
  created_at timestamptz default now()
);

-- Stock functions (reserve on order, commit on success, release on failure)
create or replace function reserve_stock(p_product_id bigint, p_qty int)
returns void language plpgsql as $$
begin
  update products set stock = stock - p_qty, reserved = reserved + p_qty
  where id = p_product_id and stock >= p_qty;
  if not found then raise exception 'Insufficient stock'; end if;
end $$;

create or replace function commit_stock(p_product_id bigint, p_qty int)
returns void language plpgsql as $$
begin
  update products set reserved = greatest(reserved - p_qty, 0) where id = p_product_id;
end $$;

create or replace function release_stock(p_product_id bigint, p_qty int)
returns void language plpgsql as $$
begin
  update products set stock = stock + p_qty, reserved = greatest(reserved - p_qty, 0)
  where id = p_product_id;
end $$;

-- RLS: backend uses service role (bypasses RLS); lock tables from anon access
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;
create policy "Public read products" on products for select using (true);

-- Sample products
insert into products (name, description, price, stock, emoji) values
('5 Mukhi Rudraksha', 'Nepali bead for peace & health', 49900, 50, '📿'),
('Shree Yantra', 'Brass, energised for prosperity', 89900, 30, '🔱'),
('Natural Pearl (Moti)', 'Certified, for Moon strength', 259900, 15, '🫧'),
('Yellow Sapphire', 'Pukhraj for Jupiter blessings', 799900, 10, '💛'),
('Pooja Thali Set', 'Complete brass thali, 7 items', 129900, 40, '🪔'),
('Gemstone Bracelet', '7-chakra healing bracelet', 39900, 60, '🧿');

create table if not exists cart_items (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users not null, product_id bigint references products not null,
  qty int not null default 1, is_temporary boolean not null default false, created_at timestamptz default now()
);
create table if not exists addresses (
  id bigint generated always as identity primary key, user_id uuid references auth.users not null,
  name text not null, phone text not null, email text, address text not null, city text not null, state text, pincode text not null, created_at timestamptz default now()
);
create table if not exists users (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null, phone text not null, email text, gender text not null, dob date not null,
  tob time, pob_city text, pob_state text, pob_country text, address text, created_at timestamptz default now()
);

-- Dedicated Astrologers Table (Separate from Customer Users Table)
create table if not exists astrologers (
  id text primary key,
  full_name text not null,
  email text,
  phone text,
  title text default 'Vedic Jyotish Acharya',
  experience_years int default 5,
  specialties text[] default array['Kundali', 'Gemstones', 'Vastu'],
  languages text[] default array['Hindi', 'English'],
  rating numeric(2,1) default 5.0,
  consultations_count int default 0,
  is_online boolean default true,
  bio text,
  avatar_url text,
  role text default 'astrologer',
  last_active_at timestamptz default now(),
  working_hours jsonb default '{"enabled": false, "start": "09:00", "end": "22:00"}'::jsonb,
  created_at timestamptz default now()
);

-- Real-time Consultation Chat Tables
create table if not exists chat_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  astrologer_id text not null,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists chat_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references chat_sessions on delete cascade,
  sender text not null,
  text text not null,
  recommended_product_slug text,
  created_at timestamptz default now()
);

alter table cart_items enable row level security;
alter table addresses enable row level security;
alter table users enable row level security;
alter table astrologers enable row level security;
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;

create policy "Allow user insert" on users for insert with check (true);
create policy "Allow user select own" on users for select using (auth.uid() = id);
create policy "Allow public select users" on users for select using (true);

create policy "Public read astrologers" on astrologers for select using (true);
create policy "Allow astrologer upsert" on astrologers for insert with check (true);
create policy "Allow astrologer update" on astrologers for update using (true);

create policy "Public read chat_sessions" on chat_sessions for select using (true);
create policy "Allow chat_sessions insert" on chat_sessions for insert with check (true);
create policy "Public read chat_messages" on chat_messages for select using (true);
create policy "Allow chat_messages insert" on chat_messages for insert with check (true);

-- Customer reviews. Created by infra/db/2026-09-19_product_reviews.sql, which
-- also carries the triggers and row-level security this table depends on: the
-- verified-purchase badge and the published name are derived server-side, and
-- products.rating / products.reviews are a cache recomputed from these rows
-- (aggregated across a variant group).
create table if not exists product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id bigint references products on delete cascade not null,
  user_id uuid not null default auth.uid(),
  display_name text,
  rating int not null check (rating between 1 and 5),
  title text, body text,
  verified_purchase boolean not null default false,
  status text not null default 'published',   -- published | hidden (moderation)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)                -- one review per person per option
);
