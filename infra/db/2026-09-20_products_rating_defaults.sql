-- products.rating / products.reviews defaulted to 5.0 and 1, so every product
-- inserted without them arrived on the shop already showing five stars and one
-- review that nobody had written. Since 2026-09-19 those two columns are a
-- cache of product_reviews (see 2026-09-19_product_reviews.sql), so the only
-- correct default is zero.
alter table public.products alter column rating set default 0;
alter table public.products alter column reviews set default 0;

-- Clear the invented figures from every product nobody has reviewed.
update public.products p set rating = 0, reviews = 0
where (p.rating <> 0 or p.reviews <> 0)
  and not exists (
    select 1 from public.product_reviews r
     where r.product_id = p.id and r.status = 'published'
  );
