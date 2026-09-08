import { useNavigate } from "react-router";
import { Home, ArrowLeft } from "lucide-react";
import { MAROON, GOLD, IVORY, SERIF } from "@nakshra/shared-config/theme";
import { useTranslation } from "react-i18next";

export function NotFoundPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center px-6 py-32">
      <div className="max-w-md w-full text-center">
        <div
          className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl"
          style={{ background: `linear-gradient(135deg, ${MAROON}, ${GOLD})`, color: IVORY, fontFamily: SERIF }}
        >
          ॐ
        </div>
        <h1 className="text-6xl font-medium mb-2" style={{ fontFamily: SERIF, color: MAROON }}>404</h1>
        <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: SERIF, color: MAROON }}>
          {t("notfound.title", "This path leads nowhere")}
        </h2>
        <p className="text-sm mb-8 text-amber-900/70 font-medium">
          {t("notfound.subtitle", "The page you are looking for has moved or never existed. Let us guide you back.")}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold tracking-wider uppercase border transition-all hover:bg-amber-50"
            style={{ borderColor: "rgba(91,31,36,0.2)", color: MAROON }}
          >
            <ArrowLeft size={15} /> {t("notfound.back", "Go Back")}
          </button>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold tracking-wider uppercase transition-all shadow-md hover:shadow-lg active:scale-95"
            style={{ background: MAROON, color: IVORY }}
          >
            <Home size={15} /> {t("notfound.home", "Home")}
          </button>
        </div>
      </div>
    </div>
  );
}
