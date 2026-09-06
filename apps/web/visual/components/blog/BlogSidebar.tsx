import { MAROON, GOLD, SERIF } from "@nakshra/shared-config/theme";
import { LayoutGrid, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

interface BlogSidebarProps {
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
}

export function BlogSidebar({ categories, selectedCategory, setSelectedCategory }: BlogSidebarProps) {
  const { t } = useTranslation();

  return (
    <div className="w-full lg:w-64 shrink-0 bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs">
      {/* Category Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-stone-100">
        <div className="w-10 h-10 rounded-xl bg-[#5B1F24] flex items-center justify-center text-white shadow-xs">
          <LayoutGrid size={20} />
        </div>
        <div>
          <h3 style={{ fontFamily: SERIF, color: MAROON }} className="text-base font-bold">
            Categories
          </h3>
          <p className="text-[11px] text-stone-400">Select Topic</p>
        </div>
      </div>

      {/* Categories Vertical List */}
      <div className="space-y-1.5">
        {categories.map((cat) => {
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`w-full text-left px-4 py-3 rounded-2xl text-xs md:text-sm font-semibold transition-all flex items-center justify-between ${
                active
                  ? "bg-[#FAF7F2] text-[#5B1F24] border border-amber-900/15 shadow-2xs font-bold"
                  : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
              }`}
            >
              <span>{cat}</span>
              {active && <Sparkles size={14} style={{ color: GOLD }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
