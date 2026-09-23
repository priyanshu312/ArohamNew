-- The shop now opens on shelves of four, and lists the nine bhojpatra yantras
-- as one "Bhojpatra Yantra" card placed where the first of them sits (140).
-- At 130 the Kuber Yantra frame took the fourth place on the Yantras shelf and
-- pushed that card behind "View all". Moving Kuber after the bhojpatra range
-- puts Bhojpatra fourth and Kuber fifth; nothing else moves.
update public.products
set display_order = 150
where variant_group = 'Kuber Yantra in Frame' and display_order = 130 and is_active;
