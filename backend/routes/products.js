// routes/products.js — public product listing (DB READ: PRODUCT & INVENTORY)
const router = require("express").Router();
const supabase = require("../config/supabase");
const { formatProduct } = require("../services/productFormat");

// GET /api/products
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("id");
  if (error) return res.status(500).json({ error: error.message });

  // Map to the frontend NakshraProduct format
  res.json(data.map((p) => formatProduct(p)));
});

module.exports = router;
