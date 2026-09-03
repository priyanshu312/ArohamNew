const router = require("express").Router();
const supabase = require("../config/supabase");

// GET /api/auth/email-by-phone - Lookup email associated with a phone number
router.get("/email-by-phone", async (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: "Phone number is required" });
  const cleanPhone = phone.trim().replace(/\D/g, "");
  const last10 = cleanPhone.slice(-10);

  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, email, full_name, phone, status")
      .or(`phone.eq.${last10},phone.eq.+91${last10},phone.eq.91${last10},phone.ilike.%${last10}`)
      .limit(1);

    if (error) throw error;
    const userObj = data && data.length > 0 ? data[0] : null;
    if (!userObj) return res.status(404).json({ error: "No account found with this phone number" });
    res.json({
      id: userObj.id,
      email: userObj.email,
      fullName: userObj.full_name,
      phone: userObj.phone,
      status: userObj.status || "ACTIVE"
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/signup - Phone & Firebase OTP signup
router.post("/signup", async (req, res) => {
  const {
    email, password, fullName, phone, otp,
    address, gender, dob, tob, pobCity, pobState, pobCountry
  } = req.body;

  try {
    if (!phone || !/^\d{10}$/.test(phone.trim())) {
      return res.status(400).json({ error: "Phone number must be exactly 10 digits" });
    }
    const finalEmail = email || `${phone.trim()}@Nakshra.in`;
    const userPass = password || `NakshraPass${phone.trim()}!`;

    // Check if user already exists in public users table
    const { data: existingProfile } = await supabase
      .from("users")
      .select("*")
      .eq("phone", phone.trim())
      .maybeSingle();

    if (existingProfile) {
      if (existingProfile.status === "BLOCKED") {
        return res.status(403).json({ error: "Sorry, you are blocked. Can't login." });
      }

      // Update existing profile details
      const { data: updated, error: updateErr } = await supabase
        .from("users")
        .update({
          full_name: fullName || existingProfile.full_name,
          email: finalEmail
        })
        .eq("id", existingProfile.id)
        .select()
        .single();

      if (updateErr) throw updateErr;
      return res.json({ success: true, message: "Profile updated successfully", user: updated });
    }

    // Create user in Supabase auth
    let userId;
    const { data, error: authErr } = await supabase.auth.admin.createUser({
      email: finalEmail,
      password: userPass,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone: phone.trim() }
    });

    if (authErr) {
      if (authErr.message.includes("already registered") || authErr.message.includes("already exists")) {
        const { data: listData } = await supabase.auth.admin.listUsers();
        const users = listData?.users || [];
        const existingAuthUser = users.find(u => u.email === finalEmail || u.phone === phone.trim());
        if (existingAuthUser) {
          userId = existingAuthUser.id;
        } else {
          throw authErr;
        }
      } else {
        throw authErr;
      }
    } else {
      userId = data.user.id;
    }

    // Insert profile in public users table
    const { data: insertedUser, error: profErr } = await supabase
      .from("users")
      .upsert({
        id: userId,
        full_name: fullName || "Devotee",
        phone: phone.trim(),
        email: finalEmail,
        gender: gender || "Other",
        dob: dob || new Date().toISOString().split("T")[0],
        tob: tob || null,
        pob_city: pobCity || null,
        pob_state: pobState || null,
        pob_country: pobCountry || null,
        address: address || null
      })
      .select()
      .single();

    if (profErr) throw profErr;
    res.json({ success: true, message: "Account created successfully", user: insertedUser });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const requireAuth = require("../middleware/auth");

// GET /api/auth/profile - Fetch profile details
router.get("/profile", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", req.user.id)
      .maybeSingle();

    if (error) throw error;
    res.json(data || {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/profile - Update profile details
router.post("/profile", requireAuth, async (req, res) => {
  const { fullName, phone, gender, dob, tob, pobCity, pobState, pobCountry, address } = req.body;
  if (!phone || !/^\d{10}$/.test(phone.trim())) {
    return res.status(400).json({ error: "Phone number must be exactly 10 digits" });
  }
  try {
    const { data, error } = await supabase
      .from("users")
      .update({
        full_name: fullName,
        phone: phone ? phone.trim() : null,
        gender: gender || null,
        dob: dob || null,
        tob: tob || null,
        pob_city: pobCity || null,
        pob_state: pobState || null,
        pob_country: pobCountry || null,
        address: address || null
      })
      .eq("id", req.user.id)
      .select()
      .maybeSingle();

    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
