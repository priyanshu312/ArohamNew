-- Coupons managed from the admin portal, and a record of which paid orders used one.
--
-- Until now the API honoured a list of codes hardcoded in orderService.js and
-- ignored this table, while the storefront offered whatever the table held.
-- The table now becomes the single source of truth for both, so:
--   * the codes the API honours today are seeded here, and the four legacy
--     Aroham codes it never honoured are switched off, so no price changes the
--     day this ships — an admin can turn any of them on from the portal
--   * the old "anyone may do anything" policy goes: with the anon key shipped in
--     every browser, it would have let a shopper write themselves a 100% code.
--     Browsers may now only read active rows; the API and the admin portal use
--     the service role.
--
-- A coupon used on an order is snapshotted into payments.metadata.coupon when
-- the order is created. It counts as redeemed once that payment has paid_at set
-- (confirmOrder, on a verified or webhook-captured payment).

alter table public.payments
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists payments_coupon_code_idx
  on public.payments ((upper(metadata->'coupon'->>'code')))
  where metadata ? 'coupon';

alter table public.coupons
  add column if not exists created_at timestamptz not null default now();

-- Every row today is null, so nothing is reinterpreted. Admins pick a date in
-- India, so read any naive value that way.
alter table public.coupons
  alter column expiry_date type timestamptz using expiry_date at time zone 'Asia/Kolkata';

alter table public.coupons alter column code set not null;
alter table public.coupons alter column type set not null;
alter table public.coupons alter column value set not null;

create unique index if not exists coupons_code_upper_key on public.coupons (upper(code));

alter table public.coupons drop constraint if exists coupons_type_check;
alter table public.coupons add constraint coupons_type_check
  check (type in ('percent', 'flat', 'fixed_total'));

alter table public.coupons drop constraint if exists coupons_value_check;
alter table public.coupons add constraint coupons_value_check
  check (value > 0 and (type <> 'percent' or value <= 100));

-- `value` for flat codes and `minimum_order` are in rupees, as the storefront
-- already reads them. The API converts to paise.
insert into public.coupons (code, type, value, minimum_order, label, is_active) values
  ('NAKSHRA10',        'percent', 10,  null, '10% OFF sacred items',               true),
  ('DEVOTION20',       'percent', 20,  3000, '20% OFF on orders above ₹3,000',     true),
  ('FESTIVE500',       'flat',    500, 2500, '₹500 OFF on orders above ₹2,500',    true),
  ('FREEENERGIZATION', 'flat',    99,  null, 'Free Temple Consecration (₹99 off)', true),
  ('FIRST300',         'flat',    300, null, '₹300 OFF your first order',          true)
on conflict ((upper(code))) do nothing;

update public.coupons set is_active = false
  where upper(code) in ('AROHAM10', 'SACRED15', 'FIRST100', 'DIVINE20');

drop policy if exists "Allow public access coupons" on public.coupons;
drop policy if exists coupons_public_read_active on public.coupons;
create policy coupons_public_read_active on public.coupons
  for select to anon, authenticated
  using (is_active);
