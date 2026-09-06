// routes/products.js — public product listing (DB READ: PRODUCT & INVENTORY)
const router = require("express").Router();
const supabase = require("../config/supabase");

function formatImageUrl(url) {
  if (!url || typeof url !== "string") return url;
  const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  }
  return url;
}

// GET /api/products
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("id");
  if (error) return res.status(500).json({ error: error.message });

  // Map to the frontend NakshraProduct format
  const mapped = data.map(p => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    subtitle: p.subtitle,
    category: p.category,
    purpose: p.purpose,
    price: p.price / 100,
    original: p.original_price / 100,
    rating: p.rating,
    reviews: p.reviews,
    img: formatImageUrl(p.img),
    badges: p.badges || [],
    shortDesc: p.short_desc,
    benefits: p.benefits || [],
    size: p.size,
    material: p.material,
    useFor: p.use_for || [],
    stock: p.stock
  }));
  res.json(mapped);
});

module.exports = router;
