import { useState, useEffect } from "react";
import { api } from "@nakshra/shared-api";
import { supabase } from "@nakshra/shared-services";
import { NakshraProduct } from "@nakshra/shared-types/product";
import { DEFAULT_PRODUCTS } from "@nakshra/shared-config/products";
import { safeSessionStorage } from "@nakshra/shared-utils/storage";

function formatImageUrl(url: any) {
  if (!url || typeof url !== "string") return url;
  const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  }
  return url;
}

function mapSupaProducts(data: any[]): NakshraProduct[] {
  return data.map((p: any) => {
    // Supabase stores price/original_price in paise (same as the backend's
    // /api/products, which always does `/ 100`). Convert unconditionally — the
    // old `> 10000` magnitude guess mis-priced any item at or under ₹100.
    const rawPrice = Number(p.price) || 0;
    const priceVal = rawPrice / 100;
    const rawOrig = p.original_price ? Number(p.original_price) : 0;
    const origVal = rawOrig > 0 ? rawOrig / 100 : Math.round(priceVal * 1.25);

    return {
      id: p.id,
      slug: p.slug || `product-${p.id}`,
      name: p.name || "Sacred Item",
      subtitle: p.subtitle || p.short_desc || "Temple Energized",
      category: p.category || "Other",
      purpose: p.purpose || "Sacred Harmony",
      price: priceVal,
      original: origVal,
      rating: Number(p.rating) || 5.0,
      reviews: Number(p.reviews) || 1,
      img: formatImageUrl(p.img || p.image || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80"),
      badges: p.badges || ["Temple Energized"],
      shortDesc: p.short_desc || p.description || "",
      benefits: p.benefits || ["Temple Energized", "Authentic Vedic Product"],
      size: p.size || "NA",
      material: p.material || "NA",
      useFor: p.use_for || ["Pooja Ghar", "Daily Wear"],
      stock: p.stock || 100
    };
  });
}

function readCache(): NakshraProduct[] | null {
  const cached = safeSessionStorage.getItem("Nakshra_products_cache");
  if (!cached) return null;
  try {
    const parsed = JSON.parse(cached);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

// Shared across every useProducts() consumer on the page so N components mounting
// at once trigger ONE network attempt, not N (and never a retry storm on failure).
let inFlight: Promise<NakshraProduct[]> | null = null;
let resolvedOnce: NakshraProduct[] | null = null;

async function fetchProductsOnce(): Promise<NakshraProduct[]> {
  if (resolvedOnce) return resolvedOnce;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    // 1. Backend API
    try {
      const data = await api("/products");
      if (Array.isArray(data) && data.length > 0) {
        safeSessionStorage.setItem("Nakshra_products_cache", JSON.stringify(data));
        resolvedOnce = data;
        return data;
      }
    } catch (err) {
      console.warn("API products endpoint unavailable, querying Supabase directly...", err);
    }

    // 2. Direct Supabase query (works on the deployed site if the API is down)
    try {
      const { data: supaData, error } = await supabase
        .from("products")
        .select("*")
        .order("id", { ascending: false });
      if (!error && Array.isArray(supaData) && supaData.length > 0) {
        const mapped = mapSupaProducts(supaData);
        safeSessionStorage.setItem("Nakshra_products_cache", JSON.stringify(mapped));
        resolvedOnce = mapped;
        return mapped;
      }
    } catch (e) {
      console.error("Direct Supabase product query error:", e);
    }

    // 3. Cached, then bundled defaults
    const cached = readCache();
    const result = cached || DEFAULT_PRODUCTS;
    resolvedOnce = result;
    return result;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

export function useProducts() {
  const [products, setProducts] = useState<NakshraProduct[]>(() => readCache() || []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchProductsOnce().then((list) => {
      if (!alive) return;
      setProducts(list);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { products, loading };
}
