-- Returning stock for an order whose reservation was ALREADY committed.
--
-- cancelOrder used release_stock for both PENDING and CONFIRMED orders, but
-- those are not the same operation. For a PENDING order the units are still
-- sitting in `reserved`, so release_stock is right: stock +qty, reserved -qty.
-- For a CONFIRMED order commit_stock has already consumed that reservation, so
-- the `reserved - qty` half runs a second time and silently steals a
-- reservation belonging to some other customer's pending order.
create or replace function public.restock_sold(p_product_id bigint, p_qty integer)
returns void
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
begin
  update products set stock = stock + p_qty where id = p_product_id;
end $function$;
