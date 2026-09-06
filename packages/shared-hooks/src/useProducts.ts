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
    const rawPrice = Number(p.price) || 0;
    const priceVal = rawPrice > 10000 ? rawPrice / 100 : rawPrice;
    const rawOrig = p.original_price ? Number(p.original_price) : 0;
    const origVal = rawOrig > 0 ? (rawOrig > 10000 ? rawOrig / 100 : rawOrig) : Math.round(priceVal * 1.25);

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

export function useProducts() {
  const [products, setProducts] = useState<NakshraProduct[]>(() => {
    const cached = safeSessionStorage.getItem("Nakshra_products_cache");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      // 1. Try fetching from backend API
      try {
        const data = await api("/products");
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data);
          safeSessionStorage.setItem("Nakshra_products_cache", JSON.stringify(data));
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn("API products endpoint unavailable, querying Supabase directly...", err);
      }

      // 2. Direct Supabase query as robust fallback (works live on Vercel deployment)
      try {
        const { data: supaData, error } = await supabase
          .from("products")
          .select("*")
          .order("id", { ascending: false });

        if (!error && Array.isArray(supaData) && supaData.length > 0) {
          const mapped = mapSupaProducts(supaData);
          setProducts(mapped);
          safeSessionStorage.setItem("Nakshra_products_cache", JSON.stringify(mapped));
          setLoading(false);
          return;
        }
      } catch (e) {
        console.error("Direct Supabase product query error:", e);
      }

      // 3. Fallback to cached or default items if database is unreachable
      const cached = safeSessionStorage.getItem("Nakshra_products_cache");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProducts(parsed);
          } else {
            setProducts(DEFAULT_PRODUCTS);
          }
        } catch (e) {
          setProducts(DEFAULT_PRODUCTS);
        }
      } else {
        setProducts(DEFAULT_PRODUCTS);
      }
      setLoading(false);
    }

    loadProducts();
  }, []);

  return { products, loading };
}
