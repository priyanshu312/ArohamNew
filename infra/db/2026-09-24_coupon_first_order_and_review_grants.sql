-- First-order-only coupons, and two review trigger functions taken off the public API.
--
-- FIRST300 says "₹300 OFF your first order" but nothing enforced it: any
-- signed-in shopper could use it on every order. first_order_only makes the
-- API refuse the code to anyone who already has an order they kept
-- (CONFIRMED, Processing, SHIPPED or DELIVERED — cancelled and failed orders
-- don't count). Admins can set it on any coupon from the portal.
--
-- The two product-review functions are trigger functions, but as SECURITY
-- DEFINER functions in the public schema PostgREST also exposes them at
-- /rest/v1/rpc/*. Postgres doesn't check EXECUTE when it fires a trigger, so
-- revoking it changes nothing for reviews and closes the RPC endpoint.

alter table public.coupons
  add column if not exists first_order_only boolean not null default false;

update public.coupons set first_order_only = true where upper(code) = 'FIRST300';

revoke execute on function public.product_reviews_normalize() from public, anon, authenticated;
revoke execute on function public.product_reviews_refresh_product() from public, anon, authenticated;
