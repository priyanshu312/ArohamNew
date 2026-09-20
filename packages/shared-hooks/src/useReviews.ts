import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@nakshra/shared-services";
import { NakshraProduct } from "@nakshra/shared-types/product";
import { variantOptions } from "./useProducts";

export interface ProductReview {
  id: string;
  productId: number;
  userId: string;
  name: string;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
  createdAt: string;
}

export interface ReviewSummary {
  /** Mean of the ratings on screen, one decimal. 0 when nobody has reviewed. */
  average: number;
  count: number;
  /** How many gave 1..5 stars, indexed [0] = 1 star. */
  histogram: number[];
}

export interface ReviewDraft {
  rating: number;
  title?: string;
  body?: string;
  /** Optional public name. Left blank, the database uses "First L." from the profile. */
  name?: string;
}

const ROW = "id,product_id,user_id,display_name,rating,title,body,verified_purchase,created_at";

function mapRow(r: any): ProductReview {
  return {
    id: String(r.id),
    productId: Number(r.product_id),
    userId: String(r.user_id || ""),
    name: r.display_name || "Nakshra Devotee",
    rating: Number(r.rating) || 0,
    title: r.title || "",
    body: r.body || "",
    verified: !!r.verified_purchase,
    createdAt: r.created_at,
  };
}

/** "3 days ago" — reviews read better with an age than with a date. */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!then) return "";
  const days = Math.floor((Date.now() - then) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return w === 1 ? "1 week ago" : `${w} weeks ago`;
  }
  if (days < 365) {
    const m = Math.floor(days / 30);
    return m === 1 ? "1 month ago" : `${m} months ago`;
  }
  const y = Math.floor(days / 365);
  return y === 1 ? "1 year ago" : `${y} years ago`;
}

export function summarise(reviews: ProductReview[]): ReviewSummary {
  const histogram = [0, 0, 0, 0, 0];
  let total = 0;
  for (const r of reviews) {
    const n = Math.min(5, Math.max(1, Math.round(r.rating)));
    histogram[n - 1]++;
    total += r.rating;
  }
  return {
    average: reviews.length ? Math.round((total / reviews.length) * 10) / 10 : 0,
    count: reviews.length,
    histogram,
  };
}

/**
 * Reviews for one listing. A product with options (Silver 3 g, Brass 3 g …)
 * shows the whole group's reviews, because that is the listing the shopper is
 * reading — the same way its rating is aggregated across the group in the
 * database. A review is still written against the exact option bought.
 *
 * Reads and writes go straight to Supabase with the shopper's own login token,
 * so neither waits on the API server waking up. What a browser must not decide
 * — the verified-purchase badge, the published name, the star average stored on
 * the product — is settled by triggers and row-level security, not here.
 */
export function useReviews(
  product: NakshraProduct | null,
  products: NakshraProduct[],
  userId?: string | null,
) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ids = useMemo(() => {
    if (!product) return [];
    const options = variantOptions(products, product);
    return (options.length ? options : [product]).map(p => p.id);
  }, [product, products]);

  // A stable dependency: the id list is rebuilt on every products refetch.
  const idKey = ids.join(",");

  const load = useCallback(async () => {
    if (!idKey) {
      setReviews([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from("product_reviews")
        .select(ROW)
        .in("product_id", idKey.split(",").map(Number))
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (err) throw err;
      setReviews((data || []).map(mapRow));
      setError(null);
    } catch (e: any) {
      // An unreachable database must not blank out the product page.
      setError(e?.message || "Could not load reviews");
    } finally {
      setLoading(false);
    }
  }, [idKey]);

  useEffect(() => {
    load();
  }, [load]);

  const myReview = useMemo(
    () => (userId ? reviews.find(r => r.userId === userId) || null : null),
    [reviews, userId],
  );

  /** Post or replace this shopper's review of `product`. Requires a login. */
  const submit = useCallback(
    async (draft: ReviewDraft): Promise<{ ok: boolean; error?: string }> => {
      if (!product) return { ok: false, error: "No product" };
      const rating = Math.min(5, Math.max(1, Math.round(draft.rating)));
      if (!rating) return { ok: false, error: "Please choose a star rating" };

      setSaving(true);
      try {
        // user_id is deliberately absent: the column defaults to auth.uid(), so
        // a review is always filed under the account that is actually signed in.
        const { error: err } = await supabase
          .from("product_reviews")
          .upsert(
            {
              product_id: product.id,
              rating,
              title: draft.title?.trim() || null,
              body: draft.body?.trim() || null,
              display_name: draft.name?.trim() || null,
            },
            { onConflict: "product_id,user_id" },
          );
        if (err) throw err;
        await load();
        return { ok: true };
      } catch (e: any) {
        const msg = String(e?.message || "");
        // RLS refuses the row when the login token has expired or never applied.
        const friendly = /row-level security|JWT|permission/i.test(msg)
          ? "Your session has expired — please sign in again to post your review."
          : msg || "Could not post your review";
        return { ok: false, error: friendly };
      } finally {
        setSaving(false);
      }
    },
    [product, load],
  );

  const remove = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (!product || !myReview) return { ok: false, error: "Nothing to remove" };
    setSaving(true);
    try {
      const { error: err } = await supabase.from("product_reviews").delete().eq("id", myReview.id);
      if (err) throw err;
      await load();
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || "Could not remove your review" };
    } finally {
      setSaving(false);
    }
  }, [product, myReview, load]);

  const summary = useMemo(() => summarise(reviews), [reviews]);

  return { reviews, summary, myReview, loading, saving, error, submit, remove, reload: load };
}

export interface LatestReview extends ProductReview {
  /** The listing the review belongs to, for the card's label and link. */
  productName: string;
  productSlug: string;
  productImg: string;
}

/**
 * The newest published reviews across the whole shop, for the home page.
 * Only reviews that were actually written out are returned — a bare star
 * rating with no words makes a poor card.
 *
 * Returns an empty list until somebody reviews something. Every section built
 * on this renders nothing rather than filling the gap with invented stories.
 */
export function useLatestReviews(limit = 12) {
  const [reviews, setReviews] = useState<LatestReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve(
      supabase
        .from("product_reviews")
        .select(`${ROW},products(name,slug,variant_group,img)`)
        .eq("status", "published")
        .not("body", "is", null)
        .order("created_at", { ascending: false })
        .limit(limit),
    )
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) {
          setReviews(
            data.map((r: any) => ({
              ...mapRow(r),
              // The listing name, so a review of "Silver, 3 g" reads as the product.
              productName: r.products?.variant_group || r.products?.name || "",
              productSlug: r.products?.slug || "",
              productImg: r.products?.img || "",
            })),
          );
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { reviews, loading };
}
