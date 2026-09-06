import React, { useState, useEffect } from "react";
import { Sparkles, CheckCircle2, Clock, Calendar, Video, FileText, ArrowRight, AlertCircle, RefreshCw, PhoneCall, ShieldCheck, Award, ExternalLink } from "lucide-react";

interface AstrologerOnboardingStatusProps {
  application: any;
  onEnterDashboard: () => void;
}

export const AstrologerOnboardingStatus: React.FC<AstrologerOnboardingStatusProps> = ({
  application: initialApp,
  onEnterDashboard
}) => {
  const [app, setApp] = useState<any>(initialApp);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const appId = app?.id;

  const fetchLatestStatus = async () => {
    if (!appId) return;

    // 1. Try local storage sync first
    try {
      const localCurrent = localStorage.getItem("Nakshra_astro_onboarding_app_current");
      if (localCurrent) {
        const parsed = JSON.parse(localCurrent);
        if (parsed.id === appId || !appId) {
          setApp(parsed);
        }
      }
    } catch (e) {}

    // 2. Fetch from backend API
    try {
      const apiBase = (import.meta.env.VITE_ADMIN_API_URL as string) || (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:5001";
      const res = await fetch(`${apiBase}/api/admin/onboarding/applications/${appId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.application) {
          setApp(data.application);
          setInterviews(data.interviews || []);
          setDocuments(data.documents || []);

          // Sync back to local current
          localStorage.setItem("Nakshra_astro_onboarding_app_current", JSON.stringify(data.application));
        }
      } else if (res.status === 404 && app) {
        // Automatically sync the local application to the backend if the backend doesn't have it
        await fetch(`${apiBase}/api/admin/onboarding/applications`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(app)
        });
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchLatestStatus();

    const interval = setInterval(() => {
      fetchLatestStatus();
    }, 3000);

    const handleStorageChange = () => fetchLatestStatus();
    window.addEventListener("storage", handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [appId]);

  const currentStatus = (app?.status || "SUBMITTED").toUpperCase();
  const isApproved = currentStatus === "APPROVED";
  const isRejected = currentStatus === "REJECTED";

  const getStepProgress = () => {
    if (currentStatus === "SUBMITTED" || currentStatus === "PENDING_REVIEW") return 1;
    if (currentStatus === "INTERVIEW_ROUND_1") return 2;
    if (currentStatus === "INTERVIEW_ROUND_2") return 3;
    if (currentStatus === "DOCUMENTS_PENDING" || currentStatus === "NEED_MORE_DOCUMENTS") return 4;
    if (currentStatus === "APPROVED") return 5;
    return 1;
  };

  const activeStepNum = getStepProgress();

  const round1Iv = interviews.find(i => i.round_number === 1) || {
    scheduled_date: "Today",
    scheduled_time: "3:30 PM",
    meeting_link: "https://meet.google.com/Nakshra-round1",
    interviewer_name: "Senior Vedic Evaluator",
    instructions: "Please make sure you are in a quiet room with strong internet connection."
  };

  const round2Iv = interviews.find(i => i.round_number === 2) || {
    scheduled_date: "Tomorrow",
    scheduled_time: "4:00 PM",
    meeting_link: "https://meet.google.com/Nakshra-round2",
    interviewer_name: "Head of Astrology Network",
    instructions: "Evaluation on live Prashna reading & remedy recommendation."
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] py-12 px-4 font-sans text-[#3C3024]">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Badge & Welcome */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#FFFDF9] border border-[#C8A044]/40 shadow-xs text-[11px] font-bold tracking-wider text-[#5B1F24] uppercase">
            <Sparkles className="w-3.5 h-3.5 text-[#C8A044]" />
            Onboarding Progress Portal
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold font-serif text-[#4A151B] tracking-tight">
            Namaste, {app?.display_name || app?.full_name || "Acharya"}
          </h1>
          
          <p className="text-xs sm:text-sm text-amber-950/70 max-w-xl mx-auto font-medium">
            Application Reference: <span className="font-mono font-bold text-[#5B1F24]">{app?.application_number || "ASTRO-2026-0001"}</span>
          </p>
        </div>

        {/* Workflow Stepper Bar */}
        <div className="bg-white rounded-3xl p-6 shadow-md border border-[#5B1F24]/10">
          <div className="grid grid-cols-5 gap-2 text-center text-xs font-bold">
            {[
              { num: 1, label: "Application" },
              { num: 2, label: "Round 1" },
              { num: 3, label: "Round 2" },
              { num: 4, label: "Verification" },
              { num: 5, label: "Approved" }
            ].map((step) => {
              const isPassed = step.num < activeStepNum;
              const isCurrent = step.num === activeStepNum;

              return (
                <div key={step.num} className="space-y-2">
                  <div
                    className={`w-9 h-9 mx-auto rounded-full flex items-center justify-center text-xs font-extrabold transition-all ${
                      isCurrent
                        ? "bg-[#5B1F24] text-white shadow-md ring-4 ring-amber-100"
                        : isPassed
                        ? "bg-[#C8A044] text-white"
                        : "bg-[#FAF6F0] text-gray-400 border border-[#5B1F24]/10"
                    }`}
                  >
                    {isPassed ? <CheckCircle2 className="w-5 h-5" /> : step.num}
                  </div>
                  <span className={`block text-[11px] ${isCurrent ? "text-[#5B1F24] font-extrabold" : isPassed ? "text-amber-900 font-bold" : "text-gray-400"}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="w-full bg-[#FAF6F0] h-2 rounded-full mt-4 overflow-hidden">
            <div
              className="bg-[#5B1F24] h-full transition-all duration-500 rounded-full"
              style={{ width: `${(activeStepNum / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Stage Content Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-lg border border-[#5B1F24]/10 space-y-6">
          
          {/* STAGE: REJECTED */}
          {isRejected && (
            <div className="space-y-4 text-center py-6">
              <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold font-serif text-rose-900">Application Under Review / Not Selected</h2>
              <p className="text-xs text-rose-800/80 max-w-md mx-auto font-medium">
                {app?.rejection_reason || "Thank you for applying to Nakshra. Our team has reviewed your application. Currently we are unable to process your onboarding further."}
              </p>
            </div>
          )}

          {/* STAGE 1: APPLICATION SUBMITTED / UNDER REVIEW */}
          {currentStatus === "SUBMITTED" || currentStatus === "UNDER_REVIEW" || currentStatus === "PENDING_REVIEW" ? (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 text-[#5B1F24] flex items-center justify-center mx-auto border-2 border-[#C8A044]">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>

              <div>
                <span className="px-3 py-1 bg-amber-100 text-[#5B1F24] rounded-full text-xs font-bold font-mono">
                  Status: Application Received
                </span>
                <h2 className="text-2xl font-bold font-serif text-[#4A151B] mt-3">
                  Application Under Evaluation
                </h2>
                <p className="text-xs text-amber-950/70 max-w-lg mx-auto font-medium mt-2 leading-relaxed">
                  Thank you for applying to partner with Nakshra Astrology Network. Our senior evaluation team is reviewing your profile, qualifications, and background details. You will receive interview details shortly.
                </p>
              </div>

              <div className="p-4 bg-[#FAF6F0] rounded-2xl border border-[#5B1F24]/10 max-w-md mx-auto text-left text-xs space-y-2 font-medium">
                <p className="font-bold text-[#5B1F24]">Application Summary:</p>
                <p>• Experience: {app?.years_experience || 5}+ Years</p>
                <p>• Specializations: {(app?.primary_expertise || ["Vedic Kundali"]).join(", ")}</p>
                <p>• Consultation Rate: ₹{app?.price_per_min || 20}/min</p>
              </div>
            </div>
          ) : null}

          {/* STAGE 2: ROUND 1 INTERVIEW */}
          {currentStatus === "INTERVIEW_ROUND_1" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-[#5B1F24]/10 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-[#5B1F24] flex items-center justify-center flex-shrink-0">
                  <PhoneCall className="w-6 h-6" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-[#5B1F24] text-[10px] font-bold">
                    Round 1 Interview Scheduled
                  </span>
                  <h2 className="text-xl font-bold font-serif text-[#4A151B] mt-0.5">
                    Phone / Video Screening Round
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-[#FAF6F0] rounded-2xl border border-[#5B1F24]/10">
                  <p className="text-[10px] uppercase font-bold text-gray-500">Date</p>
                  <p className="text-sm font-bold text-[#5B1F24] mt-1">{round1Iv.scheduled_date}</p>
                </div>
                <div className="p-4 bg-[#FAF6F0] rounded-2xl border border-[#5B1F24]/10">
                  <p className="text-[10px] uppercase font-bold text-gray-500">Time Slot</p>
                  <p className="text-sm font-bold text-[#5B1F24] mt-1">{round1Iv.scheduled_time}</p>
                </div>
                <div className="p-4 bg-[#FAF6F0] rounded-2xl border border-[#5B1F24]/10">
                  <p className="text-[10px] uppercase font-bold text-gray-500">Evaluator</p>
                  <p className="text-sm font-bold text-[#5B1F24] mt-1">{round1Iv.interviewer_name}</p>
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-1">
                <p className="font-bold text-[#5B1F24]">Instructions for Round 1:</p>
                <p className="text-amber-950/80">{round1Iv.instructions}</p>
              </div>

              <a
                href={round1Iv.meeting_link}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 bg-[#5B1F24] hover:bg-[#7A2A30] text-white font-bold text-xs rounded-full shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Join Round 1 Interview Room</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* STAGE 3: ROUND 2 INTERVIEW */}
          {currentStatus === "INTERVIEW_ROUND_2" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-[#5B1F24]/10 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-[#5B1F24] flex items-center justify-center flex-shrink-0">
                  <Video className="w-6 h-6" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    ✔ Round 1 Cleared
                  </span>
                  <h2 className="text-xl font-bold font-serif text-[#4A151B] mt-0.5">
                    Round 2: Practical Astrological Reading Evaluation
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-[#FAF6F0] rounded-2xl border border-[#5B1F24]/10">
                  <p className="text-[10px] uppercase font-bold text-gray-500">Date</p>
                  <p className="text-sm font-bold text-[#5B1F24] mt-1">{round2Iv.scheduled_date}</p>
                </div>
                <div className="p-4 bg-[#FAF6F0] rounded-2xl border border-[#5B1F24]/10">
                  <p className="text-[10px] uppercase font-bold text-gray-500">Time Slot</p>
                  <p className="text-sm font-bold text-[#5B1F24] mt-1">{round2Iv.scheduled_time}</p>
                </div>
                <div className="p-4 bg-[#FAF6F0] rounded-2xl border border-[#5B1F24]/10">
                  <p className="text-[10px] uppercase font-bold text-gray-500">Evaluator</p>
                  <p className="text-sm font-bold text-[#5B1F24] mt-1">{round2Iv.interviewer_name}</p>
                </div>
              </div>

              <a
                href={round2Iv.meeting_link}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 bg-[#5B1F24] hover:bg-[#7A2A30] text-white font-bold text-xs rounded-full shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Join Round 2 Interview Room</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* STAGE 4: VERIFICATION */}
          {(currentStatus === "DOCUMENTS_PENDING" || currentStatus === "NEED_MORE_DOCUMENTS") && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-[#5B1F24]/10 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-[#5B1F24] flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#C8A044] text-white text-[10px] font-bold">
                    Document Checklist & Background Verification
                  </span>
                  <h2 className="text-xl font-bold font-serif text-[#4A151B] mt-0.5">
                    Verification in Progress
                  </h2>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                {[
                  { name: "Government ID (Aadhaar/PAN)", status: "APPROVED" },
                  { name: "Astrology Degree / Certificate", status: "APPROVED" },
                  { name: "Bank Account Passbook / Cancelled Cheque", status: "PENDING" },
                  { name: "Public Bio & Profile Photo", status: "APPROVED" }
                ].map((item, idx) => (
                  <div key={idx} className="p-3.5 bg-[#FAF6F0] rounded-2xl flex items-center justify-between font-semibold">
                    <span>{item.name}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${item.status === "APPROVED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STAGE 5: FINAL APPROVAL */}
          {isApproved && (
            <div className="space-y-6 text-center py-6">
              <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border-4 border-emerald-200">
                <Award className="w-10 h-10" />
              </div>

              <div>
                <span className="px-3.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
                  🎉 Final Approval Granted
                </span>
                <h2 className="text-3xl font-bold font-serif text-[#4A151B] mt-3">
                  Congratulations!
                </h2>
                <p className="text-xs sm:text-sm text-amber-950/80 max-w-md mx-auto font-medium mt-2 leading-relaxed">
                  You have successfully completed all onboarding stages. Your account has been verified & approved. You are now an official astrologer on Nakshra.
                </p>
              </div>

              <button
                type="button"
                onClick={onEnterDashboard}
                className="px-10 py-4 bg-[#5B1F24] hover:bg-[#7A2A30] text-white font-bold text-sm rounded-full shadow-xl transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <span>Go To Astrologer Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
