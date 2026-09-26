// Astrologer onboarding, as seen by the applicant.
//
// The website's partner wizard submits here and its status screen polls here.
// Both used to write/read `astrologer_applications` straight from the browser,
// which needed public read + write on a table that holds Aadhaar, PAN and bank
// account numbers. That access is gone: the applicant proves who they are with
// their astrologer session token and only ever sees their own application,
// with the identity and bank numbers masked. The review desk (admin portal)
// reads the same table with the service role.
//
// Mounted at /api/admin/onboarding because that is the path the website
// already calls (VITE_ADMIN_API_URL points at this backend in production).
const router = require("express").Router();
const supabase = require("../config/supabase");
const requireAuth = require("../middleware/auth");

const LIVE_STATUSES = new Set(["APPROVED", "ACTIVATED"]);
// Once a reviewer has touched an application, a resubmit must not wipe it.
const EDITABLE_STATUSES = new Set(["DRAFT", "SUBMITTED", "NEED_MORE_DOCUMENTS"]);
const LEARNED_FROM = new Set(["FAMILY_TRADITION", "GURU", "INSTITUTE", "UNIVERSITY", "CERTIFICATION", "SELF_LEARNING", "OTHER"]);

const str = (v, max = 2000) => {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : null;
};
const int = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};
const list = (v) => (Array.isArray(v) ? v.map((x) => str(x, 100)).filter(Boolean).slice(0, 20) : null);
const date = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? v : null);
const mask = (v) => {
  const s = String(v || "").replace(/\s/g, "");
  return s ? `••••${s.slice(-4)}` : "";
};

function requireAstrologer(req, res, next) {
  if (req.user?.appRole !== "astrologer") {
    return res.status(403).json({ error: "Please sign in to the astrologer portal first." });
  }
  next();
}

// The wizard's field names predate the table; map them onto real columns.
// Anything without a column (degree, requested rate…) goes into `achievements`
// so the reviewer still sees it.
function toRow(id, b) {
  const lineage = str(b.learned_from, 500);
  const education = [
    lineage && `Lineage: ${lineage}`,
    str(b.highest_degree, 200) && `Highest degree: ${str(b.highest_degree, 200)}`,
    str(b.institution_name, 200) && `Institution: ${str(b.institution_name, 200)}`,
    int(b.year_of_passing) && `Year of passing: ${int(b.year_of_passing)}`,
    Number(b.price_per_min) > 0 && `Requested rate: ₹${Number(b.price_per_min)}/min`,
    str(b.bank_name, 100) && `Bank: ${str(b.bank_name, 100)}`,
    str(b.sample_consultation_url, 500) && `Sample consultation: ${str(b.sample_consultation_url, 500)}`,
  ].filter(Boolean).join("\n");

  return {
    // id doubles as the astrologers.id. user_id is left empty: it references
    // auth.users, and astrologers have no Supabase auth account.
    id,
    astrologer_id: id,
    full_name: str(b.full_name, 200),
    display_name: str(b.display_name, 200) || str(b.full_name, 200),
    email: str(b.email, 200),
    mobile: str(b.mobile, 20),
    gender: str(b.gender, 20),
    dob: date(b.date_of_birth),
    address: { city: str(b.city, 100), state: str(b.state, 100), country: str(b.country, 100) || "India" },
    years_experience: int(b.years_experience),
    primary_expertise: list(b.primary_expertise),
    secondary_skills: list(b.secondary_expertise),
    languages: list(b.languages),
    daily_available_hours: int(b.daily_availability_hours),
    // The column only takes a category (GURU, INSTITUTE, …) and the wizard
    // asks in free text, which lives in `achievements` above.
    learned_from: LEARNED_FROM.has(String(b.learned_from || "").toUpperCase())
      ? String(b.learned_from).toUpperCase()
      : lineage ? "OTHER" : null,
    background_description: str(b.background_description),
    aadhaar_number: str(b.aadhaar_number, 20),
    pan_number: str(b.pan_number, 20),
    bank_account_holder_name: str(b.bank_account_holder_name, 200),
    bank_account_number: str(b.bank_account_number, 30),
    bank_ifsc: str(b.bank_ifsc, 20),
    profile_picture_url: str(b.profile_picture_url, 1000),
    intro_video_url: str(b.intro_video_url, 1000),
    bio: str(b.bio, 1000), // CHECK (char_length(bio) <= 1000)
    achievements: education || null,
    social_website: str(b.website_url, 500),
    social_youtube: str(b.youtube_url, 500),
    social_instagram: str(b.instagram_url, 500),
    agreement_terms_accepted: true,
    agreement_accepted_at: new Date().toISOString(),
    status: "SUBMITTED",
    submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// What the applicant's own screens get back: no full ID or bank numbers, and
// `is_live` derived from the status (the website gates the dashboard on it).
function forApplicant(app) {
  return {
    ...app,
    aadhaar_number: mask(app.aadhaar_number),
    pan_number: mask(app.pan_number),
    bank_account_number: mask(app.bank_account_number),
    is_live: LIVE_STATUSES.has(String(app.status).toUpperCase()),
  };
}

// POST /api/admin/onboarding/applications — submit (or resubmit) the wizard.
router.post("/applications", requireAuth, requireAstrologer, async (req, res) => {
  const id = req.user.id;
  try {
    const { data: existing } = await supabase
      .from("astrologer_applications").select("*").eq("id", id).maybeSingle();
    if (existing && !EDITABLE_STATUSES.has(String(existing.status).toUpperCase())) {
      return res.json({ success: true, application: forApplicant(existing) });
    }

    const row = toRow(id, req.body || {});
    if (!row.full_name) return res.status(400).json({ error: "Please enter your full name." });
    row.application_number = existing?.application_number
      || `ASTRO-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
    if (!existing) row.created_at = new Date().toISOString();

    const { data: saved, error } = await supabase
      .from("astrologer_applications").upsert(row).select().single();
    if (error) throw error;
    res.json({ success: true, application: forApplicant(saved) });
  } catch (e) {
    console.error("[onboarding] submit failed:", e.message);
    res.status(500).json({ error: "Could not submit your application. Please try again." });
  }
});

// GET /api/admin/onboarding/applications/:id — the applicant's own progress.
router.get("/applications/:id", requireAuth, requireAstrologer, async (req, res) => {
  if (req.params.id !== req.user.id) return res.status(404).json({ error: "Application not found" });
  try {
    const { data: app, error } = await supabase
      .from("astrologer_applications").select("*").eq("id", req.user.id).maybeSingle();
    if (error) throw error;
    if (!app) return res.status(404).json({ error: "Application not found" });

    const [{ data: interviews }, { data: docs }] = await Promise.all([
      supabase.from("astrologer_interviews")
        .select("id, round_number, round_type, scheduled_date, scheduled_time, meeting_link, interviewer_name, instructions, result, evaluated_at")
        .eq("application_id", app.id).order("round_number", { ascending: true }),
      // No file paths: those point at the ID scans themselves.
      supabase.from("astrologer_documents")
        .select("id, document_type, file_name, status, rejection_reason, uploaded_at")
        .eq("application_id", app.id),
    ]);
    res.json({ application: forApplicant(app), interviews: interviews || [], documents: docs || [] });
  } catch (e) {
    console.error("[onboarding] status failed:", e.message);
    res.status(500).json({ error: "Could not load your application." });
  }
});

module.exports = router;
