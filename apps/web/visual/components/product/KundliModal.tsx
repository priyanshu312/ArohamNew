import React, { useState } from "react";
import { X, Sparkles, Calendar, Clock, MapPin, User, Download, CheckCircle, AlertCircle } from "lucide-react";
import { MAROON, GOLD, IVORY, SANS, SERIF } from "@nakshra/shared-config/theme";

interface KundliModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KundliModal({ isOpen, onClose }: KundliModalProps) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState("Male");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !date || !time || !location) {
      setError("Please fill in all birth detail fields.");
      return;
    }

    setError(null);
    setLoading(true);
    setStatusText("Connecting to VedAstro API & aligning planetary positions...");

    try {
      // Format date from YYYY-MM-DD to DD/MM/YYYY if selected via HTML date picker
      let formattedDate = date;
      if (date.includes("-")) {
        const [y, m, d] = date.split("-");
        formattedDate = `${d}/${m}/${y}`;
      }

      const apiBase = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:5000";
      
      const timer = setTimeout(() => {
        setStatusText("Rendering 16 divisional charts, Ashtakvarga & Vimshottari dasha...");
      }, 4000);

      const res = await fetch(`${apiBase}/api/kundli/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          gender,
          date: formattedDate,
          time,
          location,
        }),
      });

      clearTimeout(timer);

      if (!res.ok) {
        throw new Error("Failed to generate Kundli PDF. Please verify your details and try again.");
      }

      const arrayBuffer = await res.arrayBuffer();
      const pdfBlob = new Blob([arrayBuffer], { type: "application/pdf" });
      const fileName = `Kundli_${name.trim().replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;

      const downloadUrl = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", fileName);
      link.setAttribute("target", "_blank");
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }, 500);

      setLoading(false);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" style={{ fontFamily: SANS }}>
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-amber-900/20 flex flex-col relative">
        {/* Modal Header */}
        <div
          className="px-6 py-5 flex items-center justify-between shadow-md shrink-0"
          style={{ background: `linear-gradient(135deg, ${MAROON} 0%, #3C1014 100%)` }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-400/30">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white" style={{ fontFamily: SERIF }}>
                Make My Kundli (Vedic Report)
              </h3>
              <span className="text-[10px] text-amber-200/80 font-medium block">
                Free 16+ Page Report with Divisional Charts &amp; Dasha Timelines
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[80vh]">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full border-4 border-amber-200 border-t-amber-700 animate-spin mb-6" />
              <h4 className="font-bold text-lg text-[#3C3024] mb-2" style={{ fontFamily: SERIF }}>
                Aligning Planetary Houses...
              </h4>
              <p className="text-xs text-amber-900/70 max-w-xs font-medium animate-pulse">
                {statusText}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-[#3C3024] mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-amber-900/40 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-amber-900/20 text-sm focus:border-amber-700 focus:outline-none bg-amber-50/20"
                  />
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-bold text-[#3C3024] mb-1">Gender</label>
                <div className="grid grid-cols-2 gap-3">
                  {["Male", "Female"].map((g) => (
                    <button
                      type="button"
                      key={g}
                      onClick={() => setGender(g)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        gender === g
                          ? "bg-[#5B1F24] text-white border-[#5B1F24]"
                          : "bg-white text-amber-900/80 border-amber-900/20 hover:bg-amber-50"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date of Birth & Time of Birth */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#3C3024] mb-1">Date of Birth</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-amber-900/40 absolute left-3 top-3" />
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-amber-900/20 text-xs focus:border-amber-700 focus:outline-none bg-amber-50/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#3C3024] mb-1">Time of Birth (24hr)</label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-amber-900/40 absolute left-3 top-3" />
                    <input
                      type="time"
                      required
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-amber-900/20 text-xs focus:border-amber-700 focus:outline-none bg-amber-50/20"
                    />
                  </div>
                </div>
              </div>

              {/* Place of Birth */}
              <div>
                <label className="block text-xs font-bold text-[#3C3024] mb-1">Place of Birth (City, Country)</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-amber-900/40 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Delhi, India"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-amber-900/20 text-sm focus:border-amber-700 focus:outline-none bg-amber-50/20"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full mt-4 py-3 rounded-xl text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 hover:from-amber-600 hover:to-amber-800 active:scale-[0.98]"
              >
                <Download className="w-4 h-4" />
                Generate Free Kundli PDF
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
