-- Product reviews — real ratings, written by signed-in customers.
--
-- Everything a browser cannot be trusted with is decided here, in the database:
--   * verified_purchase is derived from the reviewer's own paid orders
--   * display_name falls back to the profile name and may not impersonate the shop
--   * products.rating / products.reviews are recomputed from the published rows
--
-- Ratings are aggregated across a variant group, so every option in one listing
-- carries the same score. A customer who buys the 4-inch silver Baglamukhi and
-- rates it is rating the listing the shopper is actually looking at.
--
-- The browser writes here directly over PostgREST with its own login JWT, so
-- posting a review never waits on the API server's cold start.

create table if not exists public.product_reviews (
  id                uuid primary key default gen_random_uuid(),
  product_id        bigint not null references public.products(id) on delete cascade,
  user_id           uuid not null default auth.uid(),
  display_name      text,
  rating            int not null check (rating between 1 and 5),
  title             text check (title is null or char_length(title) <= 120),
  body              text check (body is null or char_length(body) <= 2000),
  verified_purchase boolean not null default false,
  status            text not null default 'published' check (status in ('published', 'hidden')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- One review per person per option. Editing replaces it; there is no way to
  -- stack five ratings on the same product.
  unique (product_id, user_id)
);

create index if not exists product_reviews_product_idx
  on public.product_reviews (product_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Normalise every write: the client chooses the rating and the words, nothing
-- else. Runs as the definer so it can read orders/users past their own RLS.
-- ---------------------------------------------------------------------------
create or replace function public.product_reviews_normalize()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_name text;
  clean_name   text;
begin
  if tg_op = 'UPDATE' then
    -- A review cannot be moved to another product or another person.
    new.id         := old.id;
    new.product_id := old.product_id;
    new.user_id    := old.user_id;
    new.created_at := old.created_at;
  else
    new.user_id := coalesce(new.user_id, auth.uid());
  end if;

  select nullif(trim(u.full_name), '') into profile_name
    from public.users u where u.id = new.user_id::text;

  clean_name := nullif(trim(coalesce(new.display_name, '')), '');
  -- Nobody reviews as the shop, its staff, or a moderator.
  if clean_name ~* '(nakshra|aroham|admin|official|support|moderator)' then
    clean_name := null;
  end if;
  new.display_name := left(coalesce(clean_name, profile_name, 'Nakshra Devotee'), 40);

  -- The badge is earned, not claimed: the reviewer has an order for this exact
  -- product that was not left unpaid, failed or cancelled.
  new.verified_purchase := exists (
    select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
     where oi.product_id = new.product_id
       and o.user_id = new.user_id::text -- orders.user_id is text, not uuid
       and o.status not in ('PENDING', 'PAYMENT_FAILED', 'CANCELLED')
  );

  new.updated_at := now();
  return new;
end $$;

drop trigger if exists product_reviews_normalize_trg on public.product_reviews;
create trigger product_reviews_normalize_trg
  before insert or update on public.product_reviews
  for each row execute function public.product_reviews_normalize();

-- ---------------------------------------------------------------------------
-- Keep products.rating / products.reviews in step with the published reviews.
-- These two columns are what the shop cards, the search results and the product
-- header read, so they are a cache of this table and never hand-edited.
-- ---------------------------------------------------------------------------
create or replace function public.product_reviews_refresh_product()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pid bigint;
  grp text;
begin
  pid := coalesce(new.product_id, old.product_id);
  select p.variant_group into grp from public.products p where p.id = pid;

  if grp is null then
    update public.products p set
      rating  = coalesce((select round(avg(r.rating)::numeric, 1) from public.product_reviews r
                           where r.product_id = p.id and r.status = 'published'), 0),
      reviews = (select count(*) from public.product_reviews r
                  where r.product_id = p.id and r.status = 'published')
    where p.id = pid;
  else
    update public.products p set
      rating  = coalesce((select round(avg(r.rating)::numeric, 1)
                            from public.product_reviews r
                            join public.products p2 on p2.id = r.product_id
                           where p2.variant_group = grp and r.status = 'published'), 0),
      reviews = (select count(*)
                   from public.product_reviews r
                   join public.products p2 on p2.id = r.product_id
                  where p2.variant_group = grp and r.status = 'published')
    where p.variant_group = grp;
  end if;

  return null;
end $$;

drop trigger if exists product_reviews_refresh_trg on public.product_reviews;
create trigger product_reviews_refresh_trg
  after insert or update or delete on public.product_reviews
  for each row execute function public.product_reviews_refresh_product();

-- ---------------------------------------------------------------------------
-- Row-level security. Anyone may read published reviews; only the signed-in
-- author may write their own, and a hidden review is frozen — a customer cannot
-- edit it back into view. Moderation happens with the service role, which
-- bypasses these policies.
-- ---------------------------------------------------------------------------
alter table public.product_reviews enable row level security;

drop policy if exists product_reviews_read on public.product_reviews;
create policy product_reviews_read on public.product_reviews
  for select to anon, authenticated
  using (status = 'published');

drop policy if exists product_reviews_insert on public.product_reviews;
create policy product_reviews_insert on public.product_reviews
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'published');

drop policy if exists product_reviews_update on public.product_reviews;
create policy product_reviews_update on public.product_reviews
  for update to authenticated
  using (user_id = auth.uid() and status = 'published')
  with check (user_id = auth.uid() and status = 'published');

drop policy if exists product_reviews_delete on public.product_reviews;
create policy product_reviews_delete on public.product_reviews
  for delete to authenticated
  using (user_id = auth.uid());

grant select on public.product_reviews to anon, authenticated;
grant insert, update, delete on public.product_reviews to authenticated;
