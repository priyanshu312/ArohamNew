-- Coupon codes are always upper case.
--
-- Matching was already case-insensitive (the API and the storefront upper-case
-- both sides, and coupons_code_upper_key is on upper(code)), but a code saved
-- as typed in the admin portal — "Welcome1" — showed up in mixed case on the
-- storefront and in payments.metadata. Normalise on write so whatever the
-- portal sends is stored trimmed and upper-cased, and fix the existing row.

create or replace function public.coupons_normalize_code()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.code := upper(btrim(new.code));
  return new;
end;
$$;

drop trigger if exists coupons_normalize_code on public.coupons;
create trigger coupons_normalize_code
  before insert or update of code on public.coupons
  for each row execute function public.coupons_normalize_code();

update public.coupons set code = upper(btrim(code)) where code <> upper(btrim(code));

alter table public.coupons drop constraint if exists coupons_code_upper_check;
alter table public.coupons add constraint coupons_code_upper_check
  check (code = upper(btrim(code)) and code <> '');

-- A trigger function has no business being callable over the RPC API.
revoke execute on function public.coupons_normalize_code() from public, anon, authenticated;
