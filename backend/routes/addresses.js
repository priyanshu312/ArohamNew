const router = require("express").Router();
const requireAuth = require("../middleware/auth");
const supabase = require("../config/supabase");


// GET /api/addresses - Fetch saved addresses for the user
router.get("/", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/addresses - Save a shipping address
router.post("/", requireAuth, async (req, res) => {
  const { name, phone, email, address, city, state, pincode, address_type } = req.body;
  if (!phone || !/^\d{10}$/.test(phone.trim())) {
    return res.status(400).json({ error: "Phone number must be exactly 10 digits" });
  }
  try {
    // Check if the exact address already exists to avoid duplication
    const { data: existing, error: findErr } = await supabase
      .from("addresses")
      .select("id")
      .eq("user_id", req.user.id)
      .eq("name", name)
      .eq("phone", phone)
      .eq("address", address)
      .eq("city", city)
      .eq("pincode", pincode)
      .maybeSingle();

    if (findErr) throw findErr;
    if (existing) {
      return res.json({ success: true, message: "Address already saved", data: existing });
    }

    const { data, error } = await supabase
      .from("addresses")
      .insert({ user_id: req.user.id, name, phone, email, address, city, state, pincode })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/addresses/:id - Update an existing address
router.put("/:id", requireAuth, async (req, res) => {
  const { name, phone, email, address, city, state, pincode } = req.body;
  try {
    const { data, error } = await supabase
      .from("addresses")
      .update({ name, phone, email, address, city, state, pincode })
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .select()
      .maybeSingle();

    if (error) throw error;
    // No row updated → the id doesn't exist or isn't this user's. Previously
    // .single() turned that into a confusing 500 ("Cannot coerce the result...").
    if (!data) return res.status(404).json({ error: "Address not found" });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/addresses/:id - Delete a saved address
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from("addresses")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);

    if (error) throw error;
    res.json({ success: true, message: "Address deleted" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
