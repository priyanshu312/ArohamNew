import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Search, X, ArrowRight } from "lucide-react";
import { MAROON, GOLD, IVORY, SANS, SERIF } from "@nakshra/shared-config/theme";
import { useProducts } from "@nakshra/shared-hooks/useProducts";
import { NakshraProduct } from "@nakshra/shared-types/product";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  setQuery: (q: string) => void;
  solid: boolean;
  isMobile: boolean;
}

export function SearchModal({ isOpen, onClose, query, setQuery, solid, isMobile }: SearchModalProps) {
  const { products } = useProducts();
  const navigate = useNavigate();
  useEffect(() => {
    // Scroll lock removed so page scrollbar doesn't disappear when expanding inline search
  }, [isOpen]);

  if (!isOpen) return null;

  const results = query.trim().length > 1
    ? products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || (Array.isArray(p.description) ? p.description.join(" ") : (p.description || "")).toLowerCase().includes(query.toLowerCase()))
    : [];

  const handleSelect = (slug: string) => {
    onClose();
    navigate(`/shop/${slug}`);
  };

  return (
    <>
      <div className={`absolute right-0 z-[100] flex flex-col rounded-2xl shadow-2xl overflow-hidden border transition-all ${isMobile ? 'top-[calc(100%+8px)] w-[calc(100vw-140px)]' : 'top-[calc(100%+16px)] w-[280px]'}`}
           style={{
             background: solid ? "rgba(255,255,255,0.98)" : "rgba(15,10,12,0.98)",
             backdropFilter: "blur(16px)",
             borderColor: solid ? "rgba(91,31,36,0.15)" : "rgba(200,160,68,0.2)",
             boxShadow: "0 10px 40px rgba(0,0,0,0.15)"
           }}>

        {/* Results */}
        <div className="flex-1 overflow-y-auto max-h-[60vh] p-4 w-full">
          {query.trim().length > 1 && (
            <div className="mb-3 text-[11px] font-medium tracking-wider uppercase" style={{ color: solid ? "rgba(91,31,36,0.5)" : "rgba(250,247,242,0.5)", fontFamily: SANS }}>
              {results.length} {results.length === 1 ? 'result' : 'results'}
            </div>
          )}

          {results.length > 0 ? (
            <div className="flex flex-col gap-2">
              {results.map(product => (
                <div 
                  key={product.id}
                  onClick={() => handleSelect(product.slug)}
                  className={`group cursor-pointer rounded-xl overflow-hidden relative flex items-center gap-4 p-2 transition-colors ${solid ? 'hover:bg-black/5' : 'hover:bg-white/5'}`}
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={product.img} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate" style={{ color: solid ? MAROON : IVORY, fontFamily: SERIF }}>{product.name}</h3>
                    <div className="font-medium text-xs mt-0.5" style={{ color: solid ? "#7A6A58" : GOLD, fontFamily: SANS }}>₹{product.price.toLocaleString("en-IN")}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : query.trim().length > 1 ? (
            <div className="text-center py-8">
              <p className="text-sm" style={{ color: solid ? "rgba(91,31,36,0.5)" : "rgba(250,247,242,0.5)" }}>No matches found for "{query}"</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: solid ? "rgba(91,31,36,0.4)" : "rgba(250,247,242,0.3)" }}>Popular:</span>
              {["Shree Yantra", "Rudraksha", "Navagraha", "Consultation"].map(term => (
                <button 
                  key={term} 
                  onClick={() => setQuery(term)}
                  className={`text-left text-sm px-3 py-2 rounded-lg transition-colors ${solid ? 'hover:bg-black/5' : 'hover:bg-white/5'}`}
                  style={{ color: solid ? MAROON : "rgba(250,247,242,0.7)" }}
                >
                  <Search size={14} className="inline mr-2 opacity-50" /> {term}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
