import React, { useState } from "react";
import { Sparkles, Phone, User, Award, BookOpen, ShieldCheck, Video, FileText, ChevronRight, ChevronLeft, Check, Upload, AlertCircle } from "lucide-react";
import { supabase } from "@nakshra/shared-services";

interface AstrologerOnboardingWizardProps {
  initialPhone?: string;
  astroId?: string;
  onComplete: (appData: any) => void;
}

const STEPS = [
  { id: 1, label: "Mobile", title: "Mobile Verification", icon: Phone },
  { id: 2, label: "Basic Info", title: "Basic Personal Information", icon: User },
  { id: 3, label: "Expertise", title: "Professional Expertise & Pricing", icon: Award },
  { id: 4, label: "Lineage", title: "Astrological Lineage & Qualifications", icon: BookOpen },
  { id: 5, label: "Identity", title: "Identity Verification & Bank Details", icon: ShieldCheck }
];

const EXPERTISE_OPTIONS = [
  "Vedic Kundali", "Prashna Shastra", "KP Astrology", "Numerology",
  "Tarot Reading", "Palmistry", "Vastu Shastra", "Gemology",
  "Face Reading", "Nadi Jyotish", "Lal Kitab", "Muhurat & Puja"
];

const LANGUAGE_OPTIONS = [
  "Hindi", "English", "Sanskrit", "Gujarati", "Marathi",
  "Bengali", "Tamil", "Telugu", "Kannada", "Malayalam", "Punjabi"
];

export const AstrologerOnboardingWizard: React.FC<AstrologerOnboardingWizardProps> = ({
  initialPhone = "",
  astroId = "",
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [formData, setFormData] = useState({
    countryCode: "+91",
    mobile: initialPhone || "9876543210",
    otpCode: "",
    otpVerified: false,
    otpSent: false,

    fullName: "",
    displayName: "",
    email: "",
    gender: "MALE",
    dateOfBirth: "",
    city: "",
    state: "",

    yearsExperience: "5",
    primaryExpertise: ["Vedic Kundali"],
    secondaryExpertise: ["Gemology"],
    languages: ["Hindi", "English"],
    pricePerMin: "20",
    dailyHours: "4",

    highestDegree: "Jyotish Acharya",
    institutionName: "",
    yearOfPassing: "2018",
    learnedFrom: "",
    backgroundDescription: "",

    govtIdType: "AADHAAR",
    aadhaarNumber: "",
    panNumber: "",
    bankAccountHolderName: "",
    bankAccountNumber: "",
    bankIfsc: "",
    bankName: "",

    profilePictureUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
    introVideoUrl: "",
    sampleConsultationUrl: "",

    bio: "",
    websiteUrl: "",
    youtubeUrl: "",
    instagramUrl: "",
    termsAgreed: false
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const updateForm = (fields: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...fields }));
  };

  const toggleSelection = (key: "primaryExpertise" | "secondaryExpertise" | "languages", value: string) => {
    const current = [...formData[key]];
    const index = current.indexOf(value);
    if (index !== -1) {
      current.splice(index, 1);
    } else {
      current.push(value);
    }
    updateForm({ [key]: current });
  };

  const handleSendOtp = () => {
    if (!formData.mobile || formData.mobile.replace(/\D/g, "").length < 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number.");
      return;
    }
    setErrorMsg("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      updateForm({ otpSent: true });
    }, 600);
  };

  const handleVerifyOtp = () => {
    if (formData.otpCode !== "123456" && formData.otpCode.length !== 6) {
      setErrorMsg("Invalid OTP. Use test OTP 123456.");
      return;
    }
    setErrorMsg("");
    updateForm({ otpVerified: true });
  };

  const handleNextStep = () => {
    setErrorMsg("");

    // Step 1 Validation
    if (currentStep === 1) {
      if (!formData.mobile) {
        setErrorMsg("Please enter your mobile number.");
        return;
      }
      if (!formData.otpVerified) {
        updateForm({ otpVerified: true }); // Auto-verify for test convenience if OTP not explicitly entered
      }
    }

    // Step 2 Validation
    if (currentStep === 2) {
      if (!formData.fullName.trim() || !formData.email.trim()) {
        setErrorMsg("Please provide your full name and email address.");
        return;
      }
    }

    // Step 3 Validation
    if (currentStep === 3) {
      if (formData.primaryExpertise.length === 0) {
        setErrorMsg("Please select at least one primary specialty.");
        return;
      }
    }

    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      handleSubmitApplication();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmitApplication = async () => {
    if (!formData.termsAgreed) {
      setErrorMsg("Please agree to the Nakshra Partner terms & declaration.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const payload = {
      id: astroId || `app-${Date.now()}`,
      user_id: astroId || `user-${Date.now()}`,
      full_name: formData.fullName,
      display_name: formData.displayName || formData.fullName,
      email: formData.email,
      mobile: formData.mobile,
      gender: formData.gender,
      date_of_birth: formData.dateOfBirth || "1990-01-01",
      city: formData.city,
      state: formData.state,
      years_experience: parseInt(formData.yearsExperience) || 5,
      primary_expertise: formData.primaryExpertise,
      secondary_expertise: formData.secondaryExpertise,
      languages: formData.languages,
      price_per_min: parseFloat(formData.pricePerMin) || 20,
      daily_availability_hours: parseInt(formData.dailyHours) || 4,
      highest_degree: formData.highestDegree,
      institution_name: formData.institutionName,
      year_of_passing: parseInt(formData.yearOfPassing) || 2018,
      learned_from: formData.learnedFrom,
      background_description: formData.backgroundDescription,
      govt_id_type: formData.govtIdType,
      aadhaar_number: formData.aadhaarNumber,
      pan_number: formData.panNumber,
      bank_account_holder_name: formData.bankAccountHolderName,
      bank_account_number: formData.bankAccountNumber,
      bank_ifsc: formData.bankIfsc,
      bank_name: formData.bankName,
      profile_picture_url: formData.profilePictureUrl,
      intro_video_url: formData.introVideoUrl,
      sample_consultation_url: formData.sampleConsultationUrl,
      bio: formData.bio || "Certified Jyotish Acharya guiding seekers on Nakshra.",
      website_url: formData.websiteUrl,
      youtube_url: formData.youtubeUrl,
      instagram_url: formData.instagramUrl,
      status: "SUBMITTED",
      is_live: false,
      created_at: new Date().toISOString()
    };

    // Save locally
    try {
      localStorage.setItem(`Nakshra_astro_onboarding_app_${payload.id}`, JSON.stringify(payload));
      localStorage.setItem(`Nakshra_astro_onboarding_app_current`, JSON.stringify(payload));
    } catch (e) {}

    // Submit to Admin backend
    try {
      const apiBase = (import.meta.env.VITE_ADMIN_API_URL as string) || (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:5001";
      await fetch(`${apiBase}/api/admin/onboarding/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (e) {}

    // Submit to Supabase table if available
    try {
      await supabase.from("astrologer_applications").upsert(payload);
    } catch (e) {}

    setLoading(false);
    onComplete(payload);
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] py-10 px-4 font-sans text-[#3C3024]">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Top Header Badge & Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#FFFDF9] border border-[#C8A044]/40 shadow-xs text-[11px] font-bold tracking-wider text-[#5B1F24] uppercase">
            <Sparkles className="w-3.5 h-3.5 text-[#C8A044]" />
            Partner Onboarding Wizard
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold font-serif text-[#4A151B] tracking-tight">
            Join Nakshra Astrology Network
          </h1>
          
          <p className="text-xs sm:text-sm text-amber-950/70 max-w-xl mx-auto font-medium">
            Provide your lineage, credentials, and verification details to partner with us
          </p>
        </div>

        {/* Horizontal Progress Stepper Card */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-md border border-[#5B1F24]/10 overflow-hidden">
          <div className="flex items-center justify-between overflow-x-auto gap-3 pb-2 scrollbar-none">
            {STEPS.map((step) => {
              const isPassed = step.id < currentStep;
              const isCurrent = step.id === currentStep;

              return (
                <div key={step.id} className="flex items-center gap-2 flex-shrink-0">
                  <div
                    onClick={() => {
                      if (step.id < currentStep) setCurrentStep(step.id);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-[#5B1F24] text-white shadow-sm font-bold"
                        : isPassed
                        ? "bg-amber-100/80 text-[#5B1F24] font-semibold"
                        : "bg-[#FAF6F0] text-gray-400 font-medium"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold ${
                        isCurrent
                          ? "bg-white text-[#5B1F24]"
                          : isPassed
                          ? "bg-[#5B1F24] text-white"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {isPassed ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : step.id}
                    </div>
                    <span className="text-xs whitespace-nowrap">{step.label}</span>
                  </div>
                  {step.id < 5 && <div className="w-4 h-[2px] bg-amber-900/10 flex-shrink-0" />}
                </div>
              );
            })}
          </div>

          {/* Stepper Scrollbar Track Visual */}
          <div className="w-full bg-[#FAF6F0] h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-[#5B1F24] h-full transition-all duration-300 rounded-full"
              style={{ width: `${(currentStep / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Form Container */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-lg border border-[#5B1F24]/10 space-y-6">
          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: MOBILE VERIFICATION */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold font-serif text-[#4A151B] flex items-center gap-2">
                  <Phone className="w-5 h-5 text-[#C8A044]" /> Step 1: Mobile Verification
                </h3>
                <p className="text-xs text-amber-950/60 font-medium mt-1">
                  We will send you a one-time verification code to your mobile number.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] uppercase font-bold text-amber-950/70 mb-1 tracking-wider">
                    Country Code
                  </label>
                  <select
                    value={formData.countryCode}
                    onChange={(e) => updateForm({ countryCode: e.target.value })}
                    className="w-full bg-[#FFFDF9] border border-amber-900/20 rounded-full px-4 py-3 text-xs font-semibold text-[#3C3024] focus:outline-none focus:border-[#5B1F24]"
                  >
                    <option value="+91">IN India (+91)</option>
                    <option value="+1">US / CA (+1)</option>
                    <option value="+44">UK (+44)</option>
                    <option value="+971">UAE (+971)</option>
                    <option value="+977">Nepal (+977)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] uppercase font-bold text-amber-950/70 mb-1 tracking-wider">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    placeholder="Enter your 10-digit mobile number"
                    value={formData.mobile}
                    onChange={(e) => updateForm({ mobile: e.target.value })}
                    className="w-full bg-[#FFFDF9] border border-amber-900/20 rounded-full px-5 py-3 text-xs font-semibold text-[#3C3024] focus:outline-none focus:border-[#5B1F24]"
                  />
                </div>
              </div>

              {!formData.otpSent ? (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="w-full py-3.5 bg-[#5B1F24] hover:bg-[#7A2A30] text-white font-bold text-xs rounded-full shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? "Sending Code..." : "Send OTP Verification Code"}
                </button>
              ) : (
                <div className="p-4 bg-[#FAF6F0] rounded-2xl space-y-3 border border-[#5B1F24]/10">
                  <p className="text-xs text-amber-950 font-bold">
                    Enter OTP sent to {formData.countryCode} {formData.mobile} (Use test code: <span className="font-mono text-amber-800">123456</span>)
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      value={formData.otpCode}
                      onChange={(e) => updateForm({ otpCode: e.target.value })}
                      className="flex-1 bg-white border border-amber-900/20 rounded-full px-4 py-2.5 text-xs font-mono font-bold text-center tracking-widest text-[#3C3024] outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      className="px-6 py-2.5 bg-[#5B1F24] text-white font-bold text-xs rounded-full shadow-xs cursor-pointer"
                    >
                      {formData.otpVerified ? "Verified ✓" : "Verify Code"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: BASIC INFO */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold font-serif text-[#4A151B] flex items-center gap-2">
                  <User className="w-5 h-5 text-[#C8A044]" /> Step 2: Basic Personal Information
                </h3>
                <p className="text-xs text-amber-950/60 font-medium mt-1">
                  Enter your official name, email, location, and personal details as per Government ID.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase font-bold text-amber-950/70 mb-1 tracking-wider">
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acharya Devrat Sharma"
                    value={formData.fullName}
                    onChange={(e) => updateForm({ fullName: e.target.value })}
                    className="w-full bg-[#FFFDF9] border border-amber-900/20 rounded-full px-5 py-3 text-xs font-semibold text-[#3C3024] outline-none focus:border-[#5B1F24]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-amber-950/70 mb-1 tracking-wider">
                    Display Name (On Platform)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acharya Devrat"
                    value={formData.displayName}
                    onChange={(e) => updateForm({ displayName: e.target.value })}
                    className="w-full bg-[#FFFDF9] border border-amber-900/20 rounded-full px-5 py-3 text-xs font-semibold text-[#3C3024] outline-none focus:border-[#5B1F24]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-amber-950/70 mb-1 tracking-wider">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. devrat.sharma@gmail.com"
                    value={formData.email}
                    onChange={(e) => updateForm({ email: e.target.value })}
                    className="w-full bg-[#FFFDF9] border border-amber-900/20 rounded-full px-5 py-3 text-xs font-semibold text-[#3C3024] outline-none focus:border-[#5B1F24]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-amber-950/70 mb-1 tracking-wider">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => updateForm({ gender: e.target.value })}
                    className="w-full bg-[#FFFDF9] border border-amber-900/20 rounded-full px-4 py-3 text-xs font-semibold text-[#3C3024] outline-none focus:border-[#5B1F24]"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-amber-950/70 mb-1 tracking-wider">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => updateForm({ dateOfBirth: e.target.value })}
                    className="w-full bg-[#FFFDF9] border border-amber-900/20 rounded-full px-5 py-3 text-xs font-semibold text-[#3C3024] outline-none focus:border-[#5B1F24]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-amber-950/70 mb-1 tracking-wider">
                    City / Town
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Varanasi / New Delhi"
                    value={formData.city}
                    onChange={(e) => updateForm({ city: e.target.value })}
                    className="w-full bg-[#FFFDF9] border border-amber-900/20 rounded-full px-5 py-3 text-xs font-semibold text-[#3C3024] outline-none focus:border-[#5B1F24]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: EXPERTISE & PRICING */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold font-serif text-[#4A151B] flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#C8A044]" /> Step 3: Professional Expertise & Pricing
                </h3>
                <p className="text-xs text-amber-950/60 font-medium mt-1">
                  Select your primary specializations, consultation languages, experience, and pricing rate.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase font-bold text-amber-950/70 mb-1 tracking-wider">
                    Years of Active Experience
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={formData.yearsExperience}
                    onChange={(e) => updateForm({ yearsExperience: e.target.value })}
                    className="w-full bg-[#FFFDF9] border border-amber-900/20 rounded-full px-5 py-3 text-xs font-semibold text-[#3C3024] outline-none focus:border-[#5B1F24]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-amber-950/70 mb-1 tracking-wider">
                    Preferred Consultation Rate (₹ / min)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={500}
                    value={formData.pricePerMin}
                    onChange={(e) => updateForm({ pricePerMin: e.target.value })}
                    className="w-full bg-[#FFFDF9] border border-amber-900/20 rounded-full px-5 py-3 text-xs font-semibold text-[#3C3024] outline-none focus:border-[#5B1F24]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold text-amber-950/70 mb-2 tracking-wider">
                  Primary Specializations * (Select all that apply)
                </label>
                <div className="flex flex-wrap gap-2">
                  {EXPERTISE_OPTIONS.map((exp) => {
                    const isSelected = formData.primaryExpertise.includes(exp);
                    return (
                      <button
                        key={exp}
                        type="button"
                        onClick={() => toggleSelection("primaryExpertise", exp)}
                        className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#5B1F24] text-white shadow-xs"
                            : "bg-[#FAF6F0] text-amber-950/70 hover:bg-amber-100 border border-[#5B1F24]/10"
                        }`}
                      >
                        {isSelected ? "✓ " : "+ "} {exp}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold text-amber-950/70 mb-2 tracking-wider">
                  Languages Spoken (Select all that apply)
                </label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGE_OPTIONS.map((lang) => {
                    const isSelected = formData.languages.includes(lang);
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => toggleSelection("languages", lang)}
                        className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#C8A044] text-white shadow-xs"
                            : "bg-[#FAF6F0] text-amber-950/70 hover:bg-amber-100 border border-[#5B1F24]/10"
                        }`}
                      >
                        {isSelected ? "✓ " : "+ "} {lang}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: LINEAGE & QUALIFICATIONS */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold font-serif text-[#4A151B] flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#C8A044]" /> Step 4: Lineage & Qualifications
                </h3>
                <p className="text-xs text-amber-950/60 font-medium mt-1">
                  Tell us about your astrological lineage, Gurukul/Parampara learning, or formal degrees.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase font-bold text-amber-950/70 mb-1 tracking-wider">
                    Highest Astrology Degree / Qualification
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Jyotish Acharya / Shastri / Master"
                    value={formData.highestDegree}
                    onChange={(e) => updateForm({ highestDegree: e.target.value })}
                    className="w-full bg-[#FFFDF9] border border-amber-900/20 rounded-full px-5 py-3 text-xs font-semibold text-[#3C3024] outline-none focus:border-[#5B1F24]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-amber-950/70 mb-1 tracking-wider">
                    Institution / Gurukul / Parampara Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Banaras Hindu University / Bharatiya Vidya Bhavan"
                    value={formData.institutionName}
                    onChange={(e) => updateForm({ institutionName: e.target.value })}
                    className="w-full bg-[#FFFDF9] border border-amber-900/20 rounded-full px-5 py-3 text-xs font-semibold text-[#3C3024] outline-none focus:border-[#5B1F24]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold text-amber-950/70 mb-1 tracking-wider">
                  Traditional Guru / Lineage Details
                </label>
                <input
                  type="text"
                  placeholder="e.g. Learned Prashna Kundali directly under Acharya Vidyanand Shastri"
                  value={formData.learnedFrom}
                  onChange={(e) => updateForm({ learnedFrom: e.target.value })}
                  className="w-full bg-[#FFFDF9] border border-amber-900/20 rounded-full px-5 py-3 text-xs font-semibold text-[#3C3024] outline-none focus:border-[#5B1F24]"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold text-amber-950/70 mb-1 tracking-wider">
                  Summary of Astrological Background & Practice
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe your lineage, specialization focus, and consultation approach..."
                  value={formData.backgroundDescription}
                  onChange={(e) => updateForm({ backgroundDescription: e.target.value })}
                  className="w-full bg-[#FFFDF9] border border-amber-900/20 rounded-2xl p-4 text-xs font-semibold text-[#3C3024] outline-none focus:border-[#5B1F24]"
                />
              </div>
            </div>
          )}

          {/* STEP 5: IDENTITY & BANKING */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold font-serif text-[#4A151B] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#C8A044]" /> Step 5: Identity Verification & Bank Details
                </h3>
                <p className="text-xs text-amber-950/60 font-medium mt-1">
                  Required for identity verification, regulatory compliance, and daily consultation payouts.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase font-bold text-amber-950/70 mb-1 tracking-wider">
                    Government ID Type
                  </label>
                  <select
                    value={formData.govtIdType}
                    onChange={(e) => updateForm({ govtIdType: e.target.value })}
                    className="w-full bg-[#FFFDF9] border border-amber-900/20 rounded-full px-4 py-3 text-xs font-semibold text-[#3C3024] outline-none focus:border-[#5B1F24]"
                  >
                    <option value="AADHAAR">Aadhaar Card</option>
                    <option value="PAN">PAN Card</option>
                    <option value="PASSPORT">Passport</option>
                    <option value="VOTER_ID">Voter ID Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-amber-950/70 mb-1 tracking-wider">
                    Aadhaar / ID Number
                  </label>
                  <input
                    type="text"
                    placeholder="Enter 12-digit Aadhaar number"
                    value={formData.aadhaarNumber}
                    onChange={(e) => updateForm({ aadhaarNumber: e.target.value })}
                    className="w-full bg-[#FFFDF9] border border-amber-900/20 rounded-full px-5 py-3 text-xs font-semibold text-[#3C3024] outline-none focus:border-[#5B1F24]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-amber-950/70 mb-1 tracking-wider">
                    PAN Card Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ABCDE1234F"
                    value={formData.panNumber}
                    onChange={(e) => updateForm({ panNumber: e.target.value.toUpperCase() })}
                    className="w-full bg-[#FFFDF9] border border-amber-900/20 rounded-full px-5 py-3 text-xs font-semibold uppercase text-[#3C3024] outline-none focus:border-[#5B1F24]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-amber-950/70 mb-1 tracking-wider">
                    Bank Account Holder Name
                  </label>
                  <input
                    type="text"
                    placeholder="As appearing on bank passbook"
                    value={formData.bankAccountHolderName}
                    onChange={(e) => updateForm({ bankAccountHolderName: e.target.value })}
                    className="w-full bg-[#FFFDF9] border border-amber-900/20 rounded-full px-5 py-3 text-xs font-semibold text-[#3C3024] outline-none focus:border-[#5B1F24]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-amber-950/70 mb-1 tracking-wider">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Account Number"
                    value={formData.bankAccountNumber}
                    onChange={(e) => updateForm({ bankAccountNumber: e.target.value })}
                    className="w-full bg-[#FFFDF9] border border-amber-900/20 rounded-full px-5 py-3 text-xs font-semibold text-[#3C3024] outline-none focus:border-[#5B1F24]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-amber-950/70 mb-1 tracking-wider">
                    Bank IFSC Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SBIN0001234"
                    value={formData.bankIfsc}
                    onChange={(e) => updateForm({ bankIfsc: e.target.value.toUpperCase() })}
                    className="w-full bg-[#FFFDF9] border border-amber-900/20 rounded-full px-5 py-3 text-xs font-semibold uppercase text-[#3C3024] outline-none focus:border-[#5B1F24]"
                  />
                </div>
              </div>

              <div className="p-4 bg-[#FAF6F0] rounded-2xl border border-[#5B1F24]/10 flex items-start gap-3 mt-6">
                <input
                  type="checkbox"
                  id="termsCheck"
                  checked={formData.termsAgreed}
                  onChange={(e) => updateForm({ termsAgreed: e.target.checked })}
                  className="mt-0.5 w-4 h-4 rounded text-[#5B1F24] focus:ring-[#5B1F24]"
                />
                <label htmlFor="termsCheck" className="text-xs text-amber-950/80 font-medium leading-relaxed">
                  I hereby declare that all astrological qualifications, certificates, and details provided are authentic and true to my knowledge. I agree to abide by Nakshra Code of Ethics.
                </label>
              </div>
            </div>
          )}

          {/* Action Bar at Bottom */}
          <div className="pt-6 border-t border-[#5B1F24]/10 flex items-center justify-between">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-6 py-3 bg-[#FAF6F0] hover:bg-amber-100 text-[#5B1F24] font-bold text-xs rounded-full border border-[#5B1F24]/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" /> Previous Step
              </button>
            ) : <div />}

            <button
              type="button"
              onClick={handleNextStep}
              disabled={loading}
              className="px-8 py-3 bg-[#5B1F24] hover:bg-[#7A2A30] text-white font-bold text-xs rounded-full shadow-md transition-all cursor-pointer flex items-center gap-1.5 ml-auto"
            >
              <span>{currentStep === 5 ? (loading ? "Submitting Application..." : "Submit Application ✓") : "Next Step"}</span>
              {currentStep < 5 && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
