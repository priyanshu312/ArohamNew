-- The shop read `order by id desc`, so the sequence products happened to be
-- added in was the sequence shoppers saw. After the catalogue grew from 13 to
-- 34 listings in a day, that put bhojpatra yantras, gemstone pendants and vastu
-- helixes at the top in no arrangement at all.
--
-- display_order is the curated sequence. Categories run in the order the brand
-- leads with — yantra, rudraksha, pendant, mala and bracelet, vastu, idols,
-- gemstone — and inside each, the products people come looking for sit ahead of
-- the long tail. Values are spaced by ten so a new listing can be slotted in
-- without renumbering. Every option of a listing shares its value, because the
-- listing is what gets placed on the page.
alter table public.products add column if not exists display_order int not null default 1000;

create index if not exists products_display_order_idx
  on public.products (display_order, id);

update public.products p set display_order = o.ord
from (values
  ('Meru Shree Yantra', 100), ('Baglamukhi Yantra', 110),
  ('Shree Yantra Plate – Copper (5 inch)', 120), ('Kuber Yantra in Frame', 130),
  ('Mahamrityunjay Bhojpatra Yantra', 140), ('Markandeya Bhojpatra Yantra', 141),
  ('Kanakdhara Bhojpatra Yantra', 142), ('Lakshmi Shree Bhojpatra Yantra', 143),
  ('Saraswati Bhojpatra Yantra', 144), ('Neel Saraswati Bhojpatra Yantra', 145),
  ('Hanuman Vijay Prapti Bhojpatra Yantra', 146),
  ('Badha Dosh Nivaran Bhojpatra Yantra', 147),
  ('Vahan Durghatna Nashak Bhojpatra Yantra', 148),
  ('Rudraksha', 200),
  ('Baglamukhi Yantra Pendant', 300), ('Silver Gemstone Pendant', 310),
  ('Navratna Pendant – Silver', 320), ('Red Jasper Heart Pendant', 330),
  ('Rashi Mala', 400), ('Pooja Bracelet', 410),
  ('Vastu Pyramid', 500), ('Vastu Grid – 9 x 9 inch', 510), ('Vastu Helix', 520),
  ('Trishakti Wall Hanging', 530), ('Swastik Wall Hanging – Brass', 540),
  ('Surya Wall Hanging – Brass', 550), ('Village Scenery Painting – Framed', 560),
  ('Kuber Statue – Brass', 600), ('Ganesh Carving in Gemstone', 610),
  ('Rashi Stone Idol', 620), ('Dhanvantri Statue – Brass', 630),
  ('Kamdhenu Cow with Calf – Brass', 640), ('Ashoka Stambh – Brass', 650),
  ('Loose Gemstone', 700)
) as o(listing, ord)
where coalesce(p.variant_group, p.name) = o.listing and p.is_active;
