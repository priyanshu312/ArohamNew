import { MAROON, GOLD, SERIF, IVORY } from "@nakshra/shared-config/theme";
import { X, Clock, Share2, ShoppingBag, Sparkles } from "lucide-react";
import { BlogPost } from "@visual/data/blogData";
import { useCart } from "@nakshra/shared-state";
import { NakshraProduct } from "@nakshra/shared-types/product";
import { useTranslation } from "react-i18next";

interface BlogDetailModalProps {
  post: BlogPost | null;
  onClose: () => void;
}

export function BlogDetailModal({ post, onClose }: BlogDetailModalProps) {
  const { addToCart, openCart } = useCart();
  const { t } = useTranslation();

  if (!post) return null;

  const handleAddToCart = () => {
    if (!post.recommendedProduct) return;

    const prod: NakshraProduct = {
      id: typeof post.recommendedProduct.id === "number" ? post.recommendedProduct.id : Math.floor(Math.random() * 8000) + 1000,
      slug: post.recommendedProduct.slug,
      name: post.recommendedProduct.title,
      subtitle: post.recommendedProduct.badge || "Temple Energized",
      category: "Sacred Remedy",
      purpose: "Spiritual Benefits",
      price: post.recommendedProduct.price,
      original: post.recommendedProduct.originalPrice || Math.round(post.recommendedProduct.price * 1.2),
      rating: 4.9,
      reviews: 124,
      img: post.recommendedProduct.image,
      badges: [post.recommendedProduct.badge || "Temple Energized"],
      shortDesc: post.recommendedProduct.title,
      benefits: ["Temple Energized", "Lab Certified"],
      size: "Standard",
      material: "Sacred Material",
      useFor: ["Daily Wear", "Pooja Altar"],
      stock: 50
    };

    addToCart(prod, 1, true);
    openCart();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-[#FAF7F2] w-full max-w-3xl rounded-3xl max-h-[90vh] overflow-y-auto relative shadow-2xl border border-amber-900/10 my-8">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="sticky top-4 right-4 ml-auto flex items-center justify-center w-9 h-9 rounded-full bg-white/80 backdrop-blur-md shadow-sm border border-stone-200 text-stone-700 hover:bg-stone-100 transition-all z-20"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="px-6 md:px-10 pt-2 pb-6">
          <div className="flex items-center gap-3 text-xs text-stone-500 mb-3">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#5B1F24] text-white">
              {post.category}
            </span>
            <span>{post.date}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Clock size={12} /> {post.readTime}</span>
          </div>

          <h1 style={{ fontFamily: SERIF, color: MAROON }} className="text-2xl md:text-3xl font-semibold mb-4 leading-snug">
            {post.title}
          </h1>

          {/* Author info */}
          <div className="flex items-center justify-between pb-6 border-b border-stone-200/60">
            <div className="flex items-center gap-3">
              <img src={post.author.avatar} alt={post.author.name} className="w-10 h-10 rounded-full object-cover border border-amber-900/20" />
              <div>
                <div className="text-sm font-bold text-[#5B1F24]">{post.author.name}</div>
                <div className="text-xs text-stone-500">{post.author.role}</div>
              </div>
            </div>

            <button onClick={() => navigator.clipboard.writeText(window.location.href)} className="p-2.5 rounded-full bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors">
              <Share2 size={16} />
            </button>
          </div>
        </div>

        {/* Cover Image */}
        <div className="px-6 md:px-10 mb-8">
          <img src={post.coverImage} alt={post.title} className="w-full h-64 md:h-80 object-cover rounded-2xl border border-amber-900/10 shadow-xs" />
        </div>

        {/* Article Content */}
        <div className="px-6 md:px-10 pb-10 space-y-6 text-[#4A3A2A] leading-relaxed text-sm md:text-base">
          {post.content.map((p, idx) => (
            <p key={idx}>{p}</p>
          ))}

          {/* Key Takeaway */}
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-900/15 flex items-start gap-3">
            <Sparkles size={20} className="text-amber-700 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-1">Key Vedic Wisdom</div>
              <p className="text-xs md:text-sm font-medium text-amber-950">{post.keyTakeaway}</p>
            </div>
          </div>

          {/* Recommended Product Box matching Image 2 & Image 3 */}
          {post.recommendedProduct && (
            <div className="mt-8 pt-6 border-t border-stone-200/70">
              <div className="text-xs font-bold uppercase tracking-widest text-[#5B1F24] mb-3">
                {t("blog.related_remedy", "RECOMMENDED SACRED REMEDY")}
              </div>
              <div className="bg-white rounded-3xl p-5 md:p-6 border border-stone-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-5">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <img 
                    src={post.recommendedProduct.image} 
                    alt={post.recommendedProduct.title} 
                    className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover border border-stone-100 flex-shrink-0" 
                  />
                  <div>
                    <h4 style={{ fontFamily: SERIF, color: MAROON }} className="text-base md:text-lg font-bold leading-snug">
                      {post.recommendedProduct.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-base font-bold" style={{ color: GOLD }}>
                        ₹{post.recommendedProduct.price.toLocaleString("en-IN")}
                      </span>
                      {post.recommendedProduct.originalPrice && (
                        <span className="text-xs text-stone-400 line-through">
                          ₹{post.recommendedProduct.originalPrice.toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleAddToCart}
                  className="w-full sm:w-auto px-6 py-3 rounded-full text-xs font-bold flex items-center justify-center gap-2 shrink-0 transition-all hover:opacity-90 shadow-sm cursor-pointer"
                  style={{ background: "#6C2028", color: IVORY }}
                >
                  <ShoppingBag size={15} /> Add to Cart
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
