// Single source of truth for turning a raw `products` DB row into the shape the
// web/mobile clients expect (NakshraProduct). Used by GET /api/products and the
// recommendations routes so "Recommended for you" renders the same as the shop
// grid — before this, the recommendations routes spread the raw row and leaked
// paise prices (`price` ×100) and snake_case keys (`original_price`, `short_desc`).

function formatImageUrl(url) {
  if (!url || typeof url !== "string") return url;
  const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  }
  return url;
}

function formatProduct(p, extra = {}) {
  const img = formatImageUrl(p.img);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    subtitle: p.subtitle,
    category: p.category,
    purpose: p.purpose,
    price: p.price != null ? p.price / 100 : p.price,
    original: p.original_price != null ? p.original_price / 100 : undefined,
    rating: p.rating,
    reviews: p.reviews,
    img,
    image: img,
    badges: p.badges || [],
    shortDesc: p.short_desc,
    benefits: p.benefits || [],
    size: p.size,
    material: p.material,
    useFor: p.use_for || [],
    stock: p.stock,
    ...extra,
  };
}

module.exports = { formatImageUrl, formatProduct };
