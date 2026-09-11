const router = require("express").Router();
const supabase = require("../config/supabase");
const { sendOtp, checkOtp } = require("../services/otp");
const { issueToken } = require("../services/session");
const { otpSendLimiter, otpVerifyLimiter } = require("../middleware/rateLimit");

const normEmail = (v) => String(v || "").trim().toLowerCase();
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail(v));
const digits10 = (v) => {
  const d = String(v || "").replace(/\D/g, "").slice(-10);
  return d.length === 10 ? d : null;
};

// Find the users-table row for an EMAIL, creating a Supabase Auth user +
// profile row if none exists. Email is the account identifier; phone is
// optional profile/delivery data (captured in the shipping address at
// checkout). Returns the profile row, or throws {status, message}.
async function findOrCreateUser(email, fullName, extra = {}) {
  const e = normEmail(email);
  if (!isEmail(e)) throw Object.assign(new Error("A valid email address is required."), { status: 400 });
  const phone = digits10(extra.phone);

  const { data: matches } = await supabase
    .from("users").select("*").ilike("email", e).limit(1);
  const existing = (matches || [])[0] || null;

  if (existing) {
    if (String(existing.status).toUpperCase() === "BLOCKED") {
      throw Object.assign(new Error("Sorry, you are blocked. Can't login."), { status: 403 });
    }
    const patch = {};
    if (fullName && fullName !== existing.full_name) patch.full_name = fullName;
    // Adopt a phone if the account doesn't have one yet (e.g. first checkout).
    if (phone && !existing.phone) patch.phone = phone;
    if (Object.keys(patch).length) {
      const { data: upd } = await supabase.from("users").update(patch).eq("id", existing.id).select().single();
      return upd || existing;
    }
    return existing;
  }

  let userId;
  const { data, error: authErr } = await supabase.auth.admin.createUser({
    email: e,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone: phone || null },
  });
  if (authErr) {
    if (/already (registered|exists)/i.test(authErr.message)) {
      const { data: list } = await supabase.auth.admin.listUsers();
      const u = (list?.users || []).find((x) => normEmail(x.email) === e);
      if (!u) throw authErr;
      userId = u.id;
    } else {
      throw authErr;
    }
  } else {
    userId = data.user.id;
  }

  const { data: inserted, error: profErr } = await supabase
    .from("users")
    .upsert({
      id: userId,
      full_name: fullName || "Devotee",
      email: e,
      phone: phone || null,
      // Both columns are nullable. Never invent values here: a fabricated dob
      // (it used to default to "today") is indistinguishable from a real one
      // once written, and it silently poisons any horoscope/kundli feature that
      // reads it. Unknown stays unknown until the user tells us.
      gender: extra.gender || null,
      dob: extra.dob || null,
    })
    .select()
    .single();
  if (profErr) throw profErr;
  return inserted;
}

// POST /api/auth/otp/send  { email }
// Email is both the identifier and the delivery target.
router.post("/otp/send", otpSendLimiter, async (req, res) => {
  const email = normEmail(req.body.email);
  if (!isEmail(email)) return res.status(400).json({ error: "Enter a valid email address." });
  try {
    const r = await sendOtp(email);
    if (r && r.needEmail) return res.json({ sent: false, needEmail: true });
    res.json({ sent: true, dev: !!r.dev, via: r.channel || (r.dev ? "mock" : "email"), email: r.to || email });
  } catch (e) {
    console.error("[auth/otp/send]", e.status, e.message);
    res.status(e.status || 500).json({ error: e.message || "Could not send OTP" });
  }
});

// POST /api/auth/otp/verify  { email, code, fullName?, phone?, gender?, dob?, verifyOnly? }
// verifyOnly: just checks the code (used by the astrologer flow, which creates
// its own record); otherwise find-or-creates the users row + returns a token.
router.post("/otp/verify", otpVerifyLimiter, async (req, res) => {
  const { code, fullName, phone, gender, dob, verifyOnly } = req.body;
  const email = normEmail(req.body.email);
  if (!isEmail(email) || !code) return res.status(400).json({ error: "Email and code are required." });
  try {
    const { approved } = await checkOtp(email, code);
    if (!approved) return res.status(401).json({ error: "Invalid or expired code." });

    if (verifyOnly) return res.json({ success: true, approved: true });

    const user = await findOrCreateUser(email, fullName, { phone, gender, dob });
    const token = issueToken(user.id, user.email);
    res.json({ success: true, token, user });
  } catch (e) {
    console.error("[auth/otp/verify]", e.status, e.message);
    res.status(e.status || 500).json({ error: e.message || "Verification failed" });
  }
});

// GET /api/auth/user-by-email?email=... — does an account already exist?
// Mirrors the old /email-by-phone lookup, keyed by the new identifier.
router.get("/user-by-email", async (req, res) => {
  const email = normEmail(req.query.email);
  if (!isEmail(email)) return res.status(400).json({ error: "A valid email is required" });
  try {
    const { data, error } = await supabase
      .from("users").select("id, email, full_name, phone, status").ilike("email", email).limit(1);
    if (error) throw error;
    const u = (data || [])[0];
    if (!u) return res.status(404).json({ error: "No account found with this email" });
    res.json({ id: u.id, email: u.email, fullName: u.full_name, phone: u.phone, status: u.status || "ACTIVE" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

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

      // SECURITY: this endpoint is unauthenticated, so it must never be able to
      // change an existing account's identity. It used to overwrite `email` with
      // whatever the caller passed — and since email is now the login
      // identifier, anyone who knew a phone number could point that account at
      // their own address and then sign in as that user via email OTP.
      // Only fill in a display name that is missing; touch nothing else.
      const patch = {};
      if (fullName && !existingProfile.full_name) patch.full_name = fullName;
      if (!Object.keys(patch).length) {
        return res.json({ success: true, message: "Account already exists", user: existingProfile });
      }
      const { data: updated, error: updateErr } = await supabase
        .from("users")
        .update(patch)
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
        gender: gender || null,
        dob: dob || null,
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

  // Phone is optional now (email is the identifier) — only validate it when the
  // caller actually sends one. Requiring it here locked every email-only account
  // out of editing its own profile.
  if (phone !== undefined && phone !== null && String(phone).trim() !== "") {
    if (!/^\d{10}$/.test(String(phone).trim())) {
      return res.status(400).json({ error: "Phone number must be exactly 10 digits" });
    }
  }

  // Build a PARTIAL patch: only touch the columns the caller actually sent.
  // The previous version wrote every column on every call, so a request that
  // omitted (say) dob silently erased it.
  const patch = {};
  const setIf = (key, val, transform = (v) => v) => {
    if (val !== undefined) patch[key] = val === null || val === "" ? null : transform(val);
  };
  setIf("full_name", fullName);
  setIf("phone", phone, (v) => String(v).trim());
  setIf("gender", gender);
  setIf("dob", dob);
  setIf("tob", tob);
  setIf("pob_city", pobCity);
  setIf("pob_state", pobState);
  setIf("pob_country", pobCountry);
  setIf("address", address);

  if (!Object.keys(patch).length) {
    return res.status(400).json({ error: "Nothing to update." });
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .update(patch)
      .eq("id", req.user.id)
      .select()
      .maybeSingle();

    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/claim-orders — attach this account's guest orders to it.
//
// Orders placed before signing in carry user_id = NULL and are identified only
// by the email/phone on the delivery address. The web app used to do this with a
// direct `orders.update({user_id})` from the browser, which row-level security
// now (correctly) refuses — so guest orders silently stopped appearing in order
// history. Matching has to happen somewhere trusted anyway: doing it here means
// the caller can only ever claim orders that carry their OWN verified contact
// details, instead of any unclaimed order whose id they happen to hold.
router.post("/claim-orders", requireAuth, async (req, res) => {
  try {
    const { data: me } = await supabase
      .from("users").select("email, phone").eq("id", req.user.id).maybeSingle();

    const myEmail = normEmail(me?.email || req.user.email);
    const myPhone = digits10(me?.phone || req.user.user_metadata?.phone);
    if (!myEmail && !myPhone) return res.json({ claimed: 0 });

    const { data: unclaimed, error } = await supabase
      .from("orders")
      .select("id, user_phone, address, shipping_address")
      .is("user_id", null)
      .limit(500);
    if (error) throw error;

    const mine = (unclaimed || []).filter((o) => {
      const addr = o.shipping_address || o.address || {};
      const orderEmail = normEmail(addr.email);
      const orderPhone = digits10(addr.phone || o.user_phone);
      return (
        (myEmail && orderEmail && orderEmail === myEmail) ||
        (myPhone && orderPhone && orderPhone === myPhone)
      );
    });
    if (!mine.length) return res.json({ claimed: 0 });

    const { error: updErr } = await supabase
      .from("orders")
      .update({ user_id: req.user.id })
      .in("id", mine.map((o) => o.id));
    if (updErr) throw updErr;

    res.json({ claimed: mine.length });
  } catch (e) {
    console.error("[auth/claim-orders]", e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
