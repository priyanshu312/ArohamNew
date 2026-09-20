import { useState, useEffect } from "react";
import { api } from "@nakshra/shared-api";
import { supabase } from "@nakshra/shared-services";
import { NakshraProduct } from "@nakshra/shared-types/product";
import { safeLocalStorage } from "@nakshra/shared-utils/storage";

// Bumped whenever cached products would show something wrong until the network
// answers: v2 dropped the test products (17 Sep 2026), v3 added variant groups.
const CACHE_KEY = "Nakshra_products_cache_v4";
const OLD_CACHE_KEYS = ["Nakshra_products_cache", "Nakshra_products_cache_v2", "Nakshra_products_cache_v3"];

// Only what the storefront shows.
const PRODUCT_COLUMNS =
  "id,slug,name,subtitle,category,purpose,price,original_price,rating,reviews,img,badges,short_desc,description,benefits,use_for,size,material,stock,variant_group,variant_label,display_order";

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
      // Shown as stored. Defaulting a missing rating to 5.0 with one review
      // invented social proof for products nobody has reviewed yet.
      rating: Number(p.rating) || 0,
      reviews: Number(p.reviews) || 0,
      img: formatImageUrl(p.img || p.image || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80"),
      badges: p.badges || ["Temple Energized"],
      shortDesc: p.short_desc || p.description || "",
      benefits: p.benefits || ["Temple Energized", "Authentic Vedic Product"],
      size: p.size || "NA",
      material: p.material || "NA",
      useFor: p.use_for || ["Pooja Ghar", "Daily Wear"],
      // 0 means sold out; `p.stock || 100` turned a sold-out item back into 100.
      stock: Number(p.stock) || 0,
      variantGroup: p.variant_group || undefined,
      variantLabel: p.variant_label || undefined,
      displayOrder: Number(p.display_order ?? 1000)
    };
  });
}

/** The options of `product`'s group, cheapest first, or [] if it has no group. */
export function variantOptions(products: NakshraProduct[], product: NakshraProduct): NakshraProduct[] {
  if (!product.variantGroup) return [];
  return products.filter(p => p.variantGroup === product.variantGroup).sort((a, b) => a.price - b.price);
}

/**
 * For listings: one card per variant group, like Amazon. The card is the
 * group's cheapest option under the group's name, so its price reads "from",
 * and the buyer picks the option on the product page. Order is kept.
 */
export function groupVariants(products: NakshraProduct[]): NakshraProduct[] {
  const seen = new Set<string>();
  const out: NakshraProduct[] = [];
  for (const p of products) {
    if (!p.variantGroup) {
      out.push(p);
      continue;
    }
    if (seen.has(p.variantGroup)) continue;
    seen.add(p.variantGroup);
    const options = variantOptions(products, p);
    out.push(options.length > 1 ? { ...options[0], name: p.variantGroup, variantCount: options.length } : p);
  }
  return out;
}

// localStorage, which every tab shares. This used to be sessionStorage, which
// is per tab, so each new tab started with no products and waited on the network.
function readCache(): NakshraProduct[] | null {
  const cached = safeLocalStorage.getItem(CACHE_KEY);
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
    // 1. Supabase directly. It never sleeps and returns the catalogue in about a
    //    second. The backend used to go first, but it sleeps on Render's free
    //    plan, so a visitor waited out the whole 5 s timeout below before this
    //    query even started.
    try {
      const { data: supaData, error } = await supabase
        .from("products")
        .select(PRODUCT_COLUMNS)
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("id", { ascending: true });
      if (!error && Array.isArray(supaData) && supaData.length > 0) {
        const mapped = mapSupaProducts(supaData);
        safeLocalStorage.setItem(CACHE_KEY, JSON.stringify(mapped));
        OLD_CACHE_KEYS.forEach(k => safeLocalStorage.removeItem(k));
        resolvedOnce = mapped;
        return mapped;
      }
    } catch (e) {
      console.warn("Supabase products query failed, trying the API...", e);
    }

    // 2. Backend API, capped at 5 s so a sleeping backend can't hold the page.
    try {
      const data = await api("/products", { timeoutMs: 5000 });
      if (Array.isArray(data) && data.length > 0) {
        safeLocalStorage.setItem(CACHE_KEY, JSON.stringify(data));
        resolvedOnce = data;
        return data;
      }
    } catch (err) {
      console.error("API products endpoint unavailable:", err);
    }

    // 3. Cached, else nothing. The bundled DEFAULT_PRODUCTS are the old test
    //    products, which can't be ordered any more, so they're no stopgap.
    //    Either way this is NOT an answer: deliberately do not set
    //    `resolvedOnce`. Memoising it here meant one unlucky first request
    //    pinned every component on the page to the fallback for the rest of
    //    the session, with no retry short of a full reload. Leaving it unset
    //    lets the next mount try the network again.
    return readCache() || [];
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

export function useProducts() {
  // Show what this browser loaded last time straight away, then refresh it.
  const [cached] = useState(() => readCache());
  const [products, setProducts] = useState<NakshraProduct[]>(cached || []);
  const [loading, setLoading] = useState(!cached);

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
