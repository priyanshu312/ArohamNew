import { MAROON, GOLD, SERIF } from "@nakshra/shared-config/theme";
import { Clock, ArrowRight } from "lucide-react";
import { BlogPost } from "@visual/data/blogData";
import { useTranslation } from "react-i18next";

interface BlogCardProps {
  post: BlogPost;
  onSelect: (post: BlogPost) => void;
  featured?: boolean;
}

export function BlogCard({ post, onSelect, featured = false }: BlogCardProps) {
  const { t } = useTranslation();

  if (featured) {
    return (
      <div 
        onClick={() => onSelect(post)}
        className="cursor-pointer bg-white rounded-3xl overflow-hidden border border-amber-900/10 shadow-sm hover:shadow-md transition-all duration-300 grid md:grid-cols-2 mb-12"
      >
        <div className="h-64 md:h-full relative overflow-hidden">
          <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
          <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold bg-[#5B1F24] text-white shadow-sm">
            {post.category}
          </span>
        </div>
        
        <div className="p-6 md:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4 text-xs text-stone-500 mb-3">
              <span>{post.date}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Clock size={12} /> {post.readTime}</span>
            </div>
            
            <h2 style={{ fontFamily: SERIF, color: MAROON }} className="text-2xl md:text-3xl font-semibold mb-3 leading-snug hover:text-amber-700 transition-colors">
              {post.title}
            </h2>
            
            <p className="text-sm text-[#7A6A58] line-clamp-3 mb-6 leading-relaxed">
              {post.excerpt}
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-stone-100">
            <div className="flex items-center gap-3">
              <img src={post.author.avatar} alt={post.author.name} className="w-9 h-9 rounded-full object-cover border border-amber-900/10" />
              <div>
                <div className="text-xs font-bold text-[#5B1F24]">{post.author.name}</div>
                <div className="text-[10px] text-stone-400">{post.author.role}</div>
              </div>
            </div>
            
            <button className="flex items-center gap-1.5 text-xs font-bold" style={{ color: GOLD }}>
              {t("blog.read_article", "Read Article")} <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={() => onSelect(post)}
      className="cursor-pointer bg-white rounded-3xl overflow-hidden border border-amber-900/10 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
    >
      <div>
        <div className="h-48 relative overflow-hidden">
          <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#5B1F24] text-white">
            {post.category}
          </span>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-3 text-[11px] text-stone-400 mb-2">
            <span>{post.date}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Clock size={10} /> {post.readTime}</span>
          </div>

          <h3 style={{ fontFamily: SERIF, color: MAROON }} className="text-lg font-semibold mb-2 line-clamp-2 leading-snug">
            {post.title}
          </h3>

          <p className="text-xs text-[#7A6A58] line-clamp-2 leading-relaxed mb-4">
            {post.excerpt}
          </p>
        </div>
      </div>

      <div className="px-5 pb-5 pt-3 border-t border-stone-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={post.author.avatar} alt={post.author.name} className="w-7 h-7 rounded-full object-cover" />
          <span className="text-xs font-medium text-stone-700">{post.author.name}</span>
        </div>
        <ArrowRight size={14} style={{ color: GOLD }} />
      </div>
    </div>
  );
}
