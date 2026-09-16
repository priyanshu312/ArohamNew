require("dotenv").config();
const supabase = require("../config/supabase");

async function syncCatalogToGorse() {
  const GORSE_URL = process.env.GORSE_URL || "http://localhost:8088";
  console.log("Fetching all products from Supabase...");

  const { data: products, error } = await supabase
    .from("products")
    .select("*");

  if (error || !products) {
    console.error("Failed to fetch products from Supabase:", error);
    process.exit(1);
  }

  console.log(`Found ${products.length} products. Syncing to Gorse at ${GORSE_URL}...`);

  const gorseItems = products.map(p => ({
    ItemId: String(p.id),
    IsHidden: p.stock <= 0 || !p.is_active,
    Categories: p.category ? [p.category] : ["general"],
    Timestamp: new Date().toISOString(),
    Comment: `${p.name} - ${p.short_desc || p.subtitle || ''}`
  }));

  try {
    const res = await fetch(`${GORSE_URL}/api/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(gorseItems)
    });

    const result = await res.text();
    console.log("✅ Sync to Gorse succeeded! Server response:", result);
  } catch (err) {
    console.error("❌ Error pushing items to Gorse:", err.message);
  }
}

syncCatalogToGorse();
