import { useState } from "react";
import { BlogHero } from "@visual/components/blog/BlogHero";
import { BlogSidebar } from "@visual/components/blog/BlogSidebar";
import { BlogCard } from "@visual/components/blog/BlogCard";
import { BlogDetailModal } from "@visual/components/blog/BlogDetailModal";
import { BLOG_POSTS, BlogPost } from "@visual/data/blogData";
import { MAROON, SERIF } from "@nakshra/shared-config/theme";

const CATEGORIES = ["All", "Vedic Astrology", "Rudraksha Remedies", "Gemstones", "Vastu Wisdom", "Rituals & Pujas"];

export function BlogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activePost, setActivePost] = useState<BlogPost | null>(null);

  const filteredPosts = BLOG_POSTS.filter((post) => {
    const matchesCategory = selectedCategory === "All" || post.category === selectedCategory;
    const matchesSearch = 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#FAF7F2] font-sans selection:bg-[#C8A044] selection:text-[#0D0508] pb-16">
      <div className="max-w-7xl mx-auto px-6 pt-32 pb-20">
        
        {/* Page Title Header */}
        <div className="mb-8 border-b border-stone-200/60 pb-6">
          <h1 style={{ fontFamily: SERIF, color: MAROON }} className="text-3xl md:text-4xl font-bold">
            Nakshra Astrology & Sacred Wisdom Blog
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Explore authentic Vedic insights, Rudraksha remedies, Gemstone recommendations, and Vastu principles.
          </p>
        </div>

        {/* Main 2-Column Layout */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Left Categories Sidebar */}
          <BlogSidebar 
            categories={CATEGORIES}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
          />

          {/* Right Main Content Area */}
          <div className="flex-1 w-full">
            
            {/* Top Search Bar */}
            <BlogHero 
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />

            {/* Articles Grid */}
            {filteredPosts.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPosts.map((post) => (
                  <BlogCard key={post.id} post={post} onSelect={setActivePost} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-3xl border border-stone-200">
                <div className="text-4xl mb-3">🕉️</div>
                <h3 style={{ fontFamily: SERIF, color: MAROON }} className="text-xl font-semibold mb-2">No Articles Found</h3>
                <p className="text-stone-500 text-sm">Try searching for different keywords or select another category.</p>
              </div>
            )}

          </div>
        </div>

        {/* Article Detail Modal */}
        <BlogDetailModal post={activePost} onClose={() => setActivePost(null)} />

      </div>
    </div>
  );
}
