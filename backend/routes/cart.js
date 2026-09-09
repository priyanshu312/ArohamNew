const router = require("express").Router();
const requireAuth = require("../middleware/auth");
const supabase = require("../config/supabase");
const { sendFeedback } = require("../services/gorseFeedback");

// GET /api/cart - Fetch cart items (temp=true for Buy Now)
router.get("/", requireAuth, async (req, res) => {
  const isTemp = req.query.temp === "true";
  try {
    const { data, error } = await supabase
      .from("cart_items")
      .select("qty, is_temporary, product:products(*)")
      .eq("user_id", req.user.id)
      .eq("is_temporary", isTemp);

    if (error) throw error;
    const items = data.map((item) => {
      const p = item.product || {};
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        subtitle: p.subtitle,
        category: p.category,
        purpose: p.purpose,
        price: (p.price || 0) / 100,
        original: (p.original_price || p.price || 0) / 100,
        rating: p.rating,
        reviews: p.reviews,
        img: p.img,
        badges: p.badges || [],
        shortDesc: p.short_desc,
        benefits: p.benefits || [],
        size: p.size,
        material: p.material,
        useFor: p.use_for || [],
        stock: p.stock,
        qty: item.qty,
        is_temporary: item.is_temporary,
        subtotal: ((p.price || 0) / 100) * item.qty
      };
    });
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/cart - Add or update cart item
router.post("/", requireAuth, async (req, res) => {
  const { productId, qty } = req.body;
  try {
    const { data: prod, error: pErr } = await supabase
      .from("products").select("stock").eq("id", productId).single();
    if (pErr || !prod) return res.status(404).json({ error: "Product not found" });
    if (prod.stock < qty) return res.status(400).json({ error: "Insufficient stock" });

    const { data: existing } = await supabase
      .from("cart_items")
      .select("id, qty")
      .eq("user_id", req.user.id)
      .eq("product_id", productId)
      .eq("is_temporary", false)
      .maybeSingle();

    let result;
    if (existing) {
      const newQty = existing.qty + qty;
      if (prod.stock < newQty) return res.status(400).json({ error: "Insufficient stock" });
      result = await supabase.from("cart_items").update({ qty: newQty }).eq("id", existing.id);
    } else {
      result = await supabase.from("cart_items")
        .insert({ user_id: req.user.id, product_id: productId, qty, is_temporary: false });
    }
    if (result.error) throw result.error;
    // "add to cart" is a strong positive signal for the recommender.
    sendFeedback("like", req.user.id, productId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/cart/buy-now - Create temporary cart for Buy Now flow
router.post("/buy-now", requireAuth, async (req, res) => {
  const { productId, qty } = req.body;
  try {
    const { data: prod, error: pErr } = await supabase
      .from("products").select("stock").eq("id", productId).single();
    if (pErr || !prod) return res.status(404).json({ error: "Product not found" });
    if (prod.stock < qty) return res.status(400).json({ error: "Insufficient stock" });

    await supabase.from("cart_items").delete().eq("user_id", req.user.id).eq("is_temporary", true);

    const { error } = await supabase.from("cart_items")
      .insert({ user_id: req.user.id, product_id: productId, qty, is_temporary: true });

    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/cart/:productId - Update quantity of a cart item
router.put("/:productId", requireAuth, async (req, res) => {
  const { qty } = req.body;
  const isTemp = req.query.temp === "true";
  try {
    const { data: prod } = await supabase
      .from("products").select("stock").eq("id", req.params.productId).single();
    if (prod && prod.stock < qty) return res.status(400).json({ error: "Insufficient stock" });

    const { error } = await supabase.from("cart_items")
      .update({ qty })
      .eq("user_id", req.user.id)
      .eq("product_id", req.params.productId)
      .eq("is_temporary", isTemp);

    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/cart/:productId - Remove item
router.delete("/:productId", requireAuth, async (req, res) => {
  const isTemp = req.query.temp === "true";
  try {
    const { error } = await supabase.from("cart_items")
      .delete()
      .eq("user_id", req.user.id)
      .eq("product_id", req.params.productId)
      .eq("is_temporary", isTemp);

    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
