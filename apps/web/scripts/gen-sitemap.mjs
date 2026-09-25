// Writes public/sitemap.xml before each build: the site's pages plus every
// active product. robots.txt has always pointed at /sitemap.xml, but the file
// never existed, so search engines were handed the home page instead.
//
// Products come from the same public, RLS-protected endpoint the storefront
// reads with its publishable key. If that fetch fails the sitemap still gets
// the static pages, and the build carries on.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SITE = "https://nakshra.in";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://lzzdfsphevmzbkkoskxb.supabase.co";
const KEY = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_hXI5tCwU5jA3BQtdLxuXoQ_L69CcRaZ";

const pages = [
  ["/", "daily", "1.0"],
  ["/shop", "daily", "0.9"],
  ["/consult", "daily", "0.8"],
  ["/blog", "weekly", "0.6"],
  ["/faq", "monthly", "0.5"],
  ["/contact", "monthly", "0.5"],
  ["/shipping", "yearly", "0.3"],
  ["/returns", "yearly", "0.3"],
  ["/terms", "yearly", "0.2"],
  ["/privacy", "yearly", "0.2"],
];

let slugs = [];
try {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=slug&is_active=eq.true&order=id`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  slugs = (await res.json()).map((p) => p.slug).filter(Boolean);
} catch (e) {
  console.warn(`[sitemap] product fetch failed (${e.message}); writing static pages only.`);
}

const today = new Date().toISOString().slice(0, 10);
const url = (loc, freq, prio) =>
  `  <url><loc>${SITE}${loc}</loc><lastmod>${today}</lastmod><changefreq>${freq}</changefreq><priority>${prio}</priority></url>`;
const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...pages.map(([p, f, r]) => url(p, f, r)),
  ...[...new Set(slugs)].map((s) => url(`/shop/${encodeURIComponent(s)}`, "weekly", "0.7")),
  "</urlset>",
  "",
].join("\n");

writeFileSync(fileURLToPath(new URL("../public/sitemap.xml", import.meta.url)), xml);
console.log(`[sitemap] ${pages.length} pages + ${slugs.length} products`);
