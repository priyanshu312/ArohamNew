const router = require("express").Router();
const supabase = require("../config/supabase");

// Helper to format google drive image URLs if present
function formatImageUrl(url) {
  if (!url || typeof url !== "string") return url;
  const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  }
  return url;
}

router.get("/:userId", async (req, res) => {
  const { userId } = req.params;
  const GORSE_URL = process.env.GORSE_URL || "http://localhost:8088";

  try {
    let itemIds = [];
    // Gorse is optional — if it's unreachable, fall through to the Supabase
    // top-selling fallback below rather than 500ing the whole request.
    try {
      const gorseRes = await fetch(`${GORSE_URL}/api/recommend/${userId}?n=4`);
      if (gorseRes.ok) {
        itemIds = await gorseRes.json();
      }

      // Fallback to popular if user has no recommendations yet
      if (!itemIds || itemIds.length === 0) {
        const popRes = await fetch(`${GORSE_URL}/api/popular?n=4`);
        if (popRes.ok) {
          const popData = await popRes.json();
          itemIds = popData.map((item) => item.Id || item.ItemId || item);
        }
      }
    } catch (gorseErr) {
      console.warn("[Recommendations API] Gorse unavailable, using Supabase top-selling fallback:", gorseErr.message);
      itemIds = [];
    }

    let products = [];
    if (itemIds && itemIds.length > 0) {
      // String or integer ID match
      const numericIds = itemIds.map(id => Number(id)).filter(id => !isNaN(id));
      const { data: dbProducts } = await supabase
        .from("products")
        .select("*")
        .in("id", numericIds.length > 0 ? numericIds : itemIds);

      if (dbProducts) {
        products = dbProducts.map(p => ({
          ...p,
          img: formatImageUrl(p.img),
          image: formatImageUrl(p.img),
          reasonBadge: p.reasonBadge || "✨ Curated For You"
        }));
      }
    }

    // If still empty (new account / cold start), fallback to Top Selling products from Supabase
    if (products.length === 0) {
      const { data: topSellingProducts } = await supabase
        .from("products")
        .select("*")
        .order("reviews", { ascending: false })
        .order("rating", { ascending: false })
        .limit(4);
      
      if (topSellingProducts) {
        products = topSellingProducts.map(p => ({
          ...p,
          img: formatImageUrl(p.img),
          image: formatImageUrl(p.img),
          reasonBadge: "🔥 Top Selling Bestseller"
        }));
      }
    }

    // Astrological Recommendation Boosting: Check if derived Kundali profile exists
    const { scoreAndRankProducts } = require("../services/kundliScoring");
    const userProfile = global.kundaliProfiles ? global.kundaliProfiles[userId] : null;

    if (userProfile && products.length > 0) {
      console.log(`[Recommendations API] Applying Astrological Boosting for ${userId} (Dasha: ${userProfile.mahadasha})`);
      products = scoreAndRankProducts(products, userProfile);
    }

    res.json({ success: true, recommendations: products, astro_boosted: !!userProfile });
  } catch (err) {
    // Recommendations are a non-critical enhancement — degrade to an empty list
    // instead of surfacing a 500 to the storefront.
    console.error("[Recommendations API Error]:", err.message);
    res.json({ success: true, recommendations: [], astro_boosted: false, degraded: true });
  }
});

// Item-to-item similarity
router.get("/item/:itemId", async (req, res) => {
  const { itemId } = req.params;
  const GORSE_URL = process.env.GORSE_URL || "http://localhost:8088";

  try {
    const gorseRes = await fetch(`${GORSE_URL}/api/item/${itemId}/neighbors?n=4`);
    let itemIds = [];
    if (gorseRes.ok) {
      const data = await gorseRes.json();
      itemIds = data.map(i => i.Id || i.ItemId || i);
    }

    let products = [];
    if (itemIds.length > 0) {
      const numericIds = itemIds.map(id => Number(id)).filter(id => !isNaN(id));
      const { data: dbProducts } = await supabase
        .from("products")
        .select("*")
        .in("id", numericIds.length > 0 ? numericIds : itemIds);

      if (dbProducts) {
        products = dbProducts.map(p => ({
          ...p,
          img: formatImageUrl(p.img),
          image: formatImageUrl(p.img),
          reasonBadge: "💎 Frequently Bought Together"
        }));
      }
    }

    res.json({ recommendations: products });
  } catch (err) {
    console.error("[Recommendations] Item-to-item error:", err);
    res.json({ recommendations: [] });
  }
});

module.exports = router;
