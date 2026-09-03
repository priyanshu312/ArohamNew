import { MAROON, GOLD, SERIF, SANS, IVORY } from "@nakshra/shared-config/theme";
import { FloatingInput } from "@visual/components/auth/FloatingInput";
import { useState } from "react";
import { Mail, MapPin, Phone, Loader2 } from "lucide-react";
import { supabase } from "@nakshra/shared-services";
import { useTranslation } from "react-i18next";

export function ContactUsPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.message) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      alert("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('contact_messages').insert([{
        name: form.name,
        email: form.email,
        message: form.message
      }]);
      
      if (error) throw error;
      setSubmitted(true);
    } catch (e: any) {
      console.error("Error sending message:", e);
      alert(`Failed to send message: ${e?.message || JSON.stringify(e)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] font-sans selection:bg-[#C8A044] selection:text-[#0D0508] pb-10">
      <div className="max-w-5xl mx-auto px-6 pt-32 pb-20">
        <div className="text-center mb-12">
          <h1 style={{ fontFamily: SERIF, color: MAROON }} className="text-4xl md:text-5xl font-medium mb-4">
            {t("contact.title", "Contact & Spiritual Support")}
          </h1>
          <div className="h-1 w-24 mx-auto" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
          <p className="mt-6 text-[#7A6A58]">
            {t("contact.subtitle", "We are here to guide your spiritual journey. Reach out anytime.")}
          </p>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-8 items-stretch">
          <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-[rgba(91,31,36,0.05)] relative overflow-hidden flex flex-col justify-center">
            <h3 style={{ fontFamily: SERIF, color: MAROON }} className="text-2xl font-semibold mb-8 relative z-10">Get in Touch</h3>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(200,160,68,0.1)", color: GOLD }}>
                    <Mail size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#9A8A78" }}>Email Support</div>
                    <a href="mailto:priyanshubansal720@gmail.com" className="text-sm font-medium hover:underline" style={{ color: MAROON }}>priyanshubansal720@gmail.com</a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(200,160,68,0.1)", color: GOLD }}>
                    <Phone size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#9A8A78" }}>Call Us</div>
                    <div className="text-sm font-medium" style={{ color: MAROON }}>+91 80001 53840</div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(200,160,68,0.1)", color: GOLD }}>
                    <MapPin size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#9A8A78" }}>Spiritual Center</div>
                    <div className="text-sm font-medium leading-relaxed" style={{ color: MAROON }}>
                      Nakshra Vedic Center<br/>
                      Varanasi, Uttar Pradesh, India
                    </div>
                  </div>
                </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-[rgba(91,31,36,0.05)] relative overflow-hidden">
            <div className="relative z-10">
              {submitted ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">✨</div>
                  <h3 style={{ fontFamily: SERIF, color: MAROON }} className="text-2xl font-semibold mb-2">Message Sent</h3>
                  <button onClick={() => { setSubmitted(false); setForm({name: "", email: "", message: ""}); }} className="mt-8 px-6 py-2 rounded-full border text-sm font-medium" style={{ borderColor: GOLD, color: MAROON }}>
                    Send Another Message
                  </button>
                </div>
              ) : (
                <>
                  <h3 style={{ fontFamily: SERIF, color: MAROON }} className="text-xl font-semibold mb-6">
                    {t("contact.form_title", "Send Us a Message")}
                  </h3>
                  <div className="space-y-4">
                    <FloatingInput label={t("contact.name_placeholder", "Full Name")} value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required />
                    <FloatingInput label={t("contact.email_placeholder", "Email Address")} type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} required />
                    
                    <div className="pt-2">
                      <textarea 
                        value={form.message} 
                        onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                        placeholder={t("contact.message_placeholder", "How can we assist you?")} 
                        rows={4}
                        className="w-full px-4 py-3.5 rounded-xl text-sm outline-none resize-none transition-all"
                        style={{ border: "1px solid rgba(91,31,36,0.15)", background: "#FAF7F2", color: MAROON, fontFamily: SANS }}
                      />
                    </div>

                    <button onClick={handleSubmit} disabled={loading || !form.name || !form.email || !form.message}
                      className="w-full py-4 rounded-xl mt-2 text-sm font-bold transition-all hover:opacity-90 shadow-md flex items-center justify-center gap-2"
                      style={{ background: `linear-gradient(135deg,${MAROON},#7A2A30)`, color: IVORY, opacity: (loading || !form.name || !form.email || !form.message) ? 0.7 : 1 }}>
                      {loading ? <Loader2 size={18} className="animate-spin" /> : t("contact.send_button", "Send Message")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
