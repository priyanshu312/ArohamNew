import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { MAROON, GOLD, IVORY, SANS, SERIF } from "@nakshra/shared-config/theme";
import { supabase } from "@nakshra/shared-services";
import { db } from "@nakshra/shared-services";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useTranslation } from "react-i18next";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;

    setLoading(true);

    try {
      // 1. Save subscriber email to Supabase 'subscribers' table
      try {
        await supabase.from("subscribers").upsert({
          email: email.trim(),
          created_at: new Date().toISOString()
        });
      } catch (err) {
        console.warn("Supabase subscriber sync warning:", err);
      }

      // 2. Save subscriber email to Firestore 'subscribers' collection
      try {
        await addDoc(collection(db, "subscribers"), {
          email: email.trim(),
          subscribedAt: serverTimestamp()
        });
      } catch (err) {
        console.warn("Firestore subscriber sync warning:", err);
      }

      // 3. Webhook / Email notification call (can be linked to your Webhook/Formspree/Resend API)
      const webhookUrl = import.meta.env.VITE_COMMUNITY_NOTIFY_WEBHOOK;
      if (webhookUrl) {
        fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            subject: "🎉 New Nakshra Community Signup!",
            message: `User with email ${email.trim()} has just joined India's Spiritual Community.`
          })
        }).catch(() => {});
      }

      setJoined(true);
    } catch (e) {
      setJoined(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="pt-2 sm:pt-6 pb-8 sm:pb-12 px-4 sm:px-6 lg:px-10" style={{ background: "#FAF7F2" }}>
      <div className="max-w-2xl mx-auto text-center">
        <div className="text-2xl sm:text-3xl mb-1.5 sm:mb-2">ॐ</div>
        <h2 className="mb-2 sm:mb-3" style={{ fontFamily: SERIF, fontSize: "clamp(1.4rem,4vw,2.2rem)", fontWeight: 500, color: MAROON, lineHeight: 1.2 }}>
          {t("newsletter.title", "Join India's Spiritual Community")}
        </h2>
        <p className="text-xs sm:text-sm mb-4 sm:mb-6" style={{ color: "#7A6A58" }}>{t("newsletter.subtitle", "Auspicious dates, Vedic wisdom, exclusive offers & early access to new products.")}</p>
        {joined ? (
          <div className="flex items-center justify-center gap-2 py-4 px-6 rounded-2xl" style={{ background: "rgba(200,160,68,0.1)", border: `1px solid rgba(200,160,68,0.3)` }}>
            <CheckCircle size={18} style={{ color: GOLD }} /><span className="text-sm font-medium" style={{ color: MAROON }}>Welcome to the Nakshra community!</span>
          </div>
        ) : (
          <form className="flex gap-3 flex-col sm:flex-row" onSubmit={handleSubmit}>
            <input type="email" placeholder={t("newsletter.placeholder", "Enter your email address")} value={email} onChange={e => setEmail(e.target.value)} required autoComplete="off"
              className="flex-1 px-5 py-3.5 rounded-full text-sm outline-none"
              style={{ background: "#FFFFFF", border: `1px solid rgba(91,31,36,0.15)`, color: MAROON, fontFamily: SANS }}
              onFocus={e => { e.target.style.borderColor = GOLD; }} onBlur={e => { e.target.style.borderColor = "rgba(91,31,36,0.15)"; }} />
            <button type="submit" disabled={loading} className="px-7 py-3.5 rounded-full text-sm font-semibold hover:opacity-90 whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: MAROON, color: IVORY }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : t("newsletter.button", "Join Community")}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

