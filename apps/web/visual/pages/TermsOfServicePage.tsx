import { MAROON, GOLD, SERIF } from "@nakshra/shared-config/theme";
import { useTranslation } from "react-i18next";

export function TermsOfServicePage() {
  const { t } = useTranslation();

  const sections = [
    {
      title: "UPDATION",
      content:
        "The Website may update/amend/modify these Terms of Usage from time to time. The User is responsible to check and go through the Terms of Usage periodically to remain in compliance with these terms before you access the website or avail services made available on the website of Nakshra."
    },
    {
      title: "USER CONSENT",
      content:
        "By accessing or downloading the Website and using it, you ('Member', 'You', 'Your') indicate that you understand the terms and unconditionally & expressly consent to the Terms of Usage of this Website and agree to abide by them. If you do not agree with the Terms of Usage, please do not click on the 'I AGREE' button. Your use and continued usage of the Website shall signify your acceptance of the terms of usage and your agreement to be legally bound by the same."
    },
    {
      title: "GENERAL DESCRIPTION",
      content:
        "The Website is an internet-based portal providing a platform for obtaining astrological content, reports, telephone/chat consultations, and temple-energized Vedic products (including Rudraksha, Yantras, Gemstones, and Crystals). Services consist of either Free Services, Paid Services, or a combination of the two."
    },
    {
      title: "REGISTRATION AND ELIGIBILITY",
      content:
        "By using this website, you agree that you are over the age of 18 years and are allowed to enter into a legally binding contract under the Indian Contract Act, 1872. You agree to provide current, complete, and accurate registration data and maintain the secrecy and confidentiality of your account password."
    },
    {
      title: "ASTROLOGICAL CONSULTATIONS & SERVICE PROVIDERS",
      content:
        "Service providers listed on Nakshra operate in their personal capacity when offering predictions, advice, and consultations. Astrological consultations are intended solely for personal insight and reflection and do not constitute medical, legal, or financial advice."
    },
    {
      title: "WEBSITE CONTENT & SPIRITUAL PRODUCTS",
      content:
        "All sacred items sold on Nakshra undergo traditional Vedic energization (Pran Pratishtha) by qualified Pandits. Nakshra makes no warranties regarding specific medical, financial, or personal outcomes from spiritual advice or product usage."
    },
    {
      title: "PRIVACY POLICY",
      content:
        "By using Nakshra, you acknowledge and consent to the collection and use of your personal data as outlined in our Privacy Policy, in compliance with the Information Technology Act, 2000 and applicable data protection laws."
    },
    {
      title: "DELIVERY, CANCELLATION AND REFUND",
      content:
        "No refund shall be processed once an order reaches the processing or assigned stage. Please refer to our Return & Refund Policy for complete guidelines on eligible product returns and transit replacements."
    },
    {
      title: "USER OBLIGATIONS & PROHIBITED CONDUCT",
      content:
        "Users agree not to post, publish, or transmit any false, misleading, defamatory, offensive, or unlawful content. Commercial exploitation, reverse engineering, scraping, or interfering with system security is strictly prohibited."
    },
    {
      title: "BANK ACCOUNT & PAYMENT INFORMATION",
      content:
        "Payments on Nakshra are processed through authorized, secure third-party payment gateways. Users represent and warrant that they possess lawful authority to use the credit/debit card or banking credentials provided during payment."
    },
    {
      title: "DISCLAIMER / LIMITATION OF LIABILITY / WARRANTY",
      content:
        "The Website and all services are provided on an 'as is' basis. Nakshra's total cumulative liability to any user for any cause whatsoever will at all times be limited to the amount paid by the user to the Website for the specific service or product."
    },
    {
      title: "INDEMNIFICATION & PROPRIETARY RIGHTS",
      content:
        "You agree to indemnify, defend, and hold harmless Nakshra, its officers, directors, and partners from any third-party claims arising from your breach of these terms. All content, designs, and text are proprietary property of Nakshra."
    },
    {
      title: "GOVERNING LAW & JURISDICTION",
      content:
        "These Terms of Usage shall be governed by and construed in accordance with the laws of India. Any disputes arising hereunder shall be subject to the exclusive jurisdiction of the courts located in Varanasi, Uttar Pradesh, India."
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2] font-sans selection:bg-[#C8A044] selection:text-[#0D0508] pb-10">
      <div className="max-w-4xl mx-auto px-6 pt-32 pb-20">
        <div className="text-center mb-10">
          <h1 style={{ fontFamily: SERIF, color: MAROON }} className="text-3xl md:text-4xl font-bold tracking-tight mb-4 uppercase">
            TERMS AND CONDITIONS OF USAGE
          </h1>
          <div className="h-1 w-24 mx-auto" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
        </div>
        
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-[rgba(91,31,36,0.05)] space-y-8" style={{ color: "#4A3A2A", lineHeight: 1.8 }}>
          
          {/* Header Preamble matching Astrotalk format */}
          <div className="space-y-4 text-sm md:text-base text-[#4A3A2A]">
            <p>
              This website is owned and operated by Nakshra ("us", "We", "the Company" or "Nakshra" which also includes its affiliates) (<a href="mailto:priyanshubansal720@gmail.com" style={{ color: GOLD }} className="hover:underline">priyanshubansal720@gmail.com</a>). The Platform may be provided or be accessible via multiple websites or applications whether owned and/or operated by us or by third parties, including, without limitation, the website <a href="https://Nakshra.in" style={{ color: GOLD }} className="hover:underline font-semibold">Nakshra.in</a> and its related apps.
            </p>
            <p>
              Following Terms and Conditions (the "Agreement") govern your access and use of our online platform through which consulting, information related to Indian Astrology, temple-energized products and other allied spiritual sciences (collectively, the "Spiritual Advisory Services") are administered and accessible to any person.
            </p>
            <p>
              By accessing or using the Platform, you are entering into this Agreement. You should read this Agreement carefully before starting to use the Platform. If you do not agree to be bound to any term of this Agreement, you must not access the Platform.
            </p>
            <p>
              When the terms "we", "us", "our" or similar are used in this Agreement, they refer to any company that owns and operates the Platform (the "Company").
            </p>
          </div>

          {/* Emergency Disclaimer Box matching screenshot */}
          <div className="p-6 md:p-8 rounded-3xl bg-[#FAF7F2] border border-amber-900/10 space-y-4 text-xs md:text-sm font-semibold uppercase text-[#5B1F24] leading-relaxed shadow-2xs">
            <p>
              IF YOU ARE THINKING ABOUT HARMING YOURSELF OR OTHERS OR IF YOU FEEL THAT ANY OTHER PERSON MAY BE IN ANY DANGER OR IF YOU HAVE ANY MEDICAL EMERGENCY, YOU MUST IMMEDIATELY CALL THE POLICE OR A SUICIDE PREVENTION HELPLINE AND NOTIFY THEM. THE PLATFORM IS NOT DESIGNED FOR USE IN ANY OF THE AFOREMENTIONED CASES AND THE SERVICE PROVIDERS CANNOT PROVIDE THE ASSISTANCE REQUIRED IN ANY OF THE AFOREMENTIONED CASES. IF YOU PROCEED TO USE THE PLATFORM NOTWITHSTANDING THIS NOTICE, YOU DO SO ENTIRELY AT YOUR OWN RISK.
            </p>
            <p>
              THE PLATFORM IS NOT INTENDED FOR THE PROVISION OF CLINICAL DIAGNOSIS REQUIRING AN IN-PERSON EVALUATION. IT IS ALSO NOT INTENDED FOR ANY INFORMATION REGARDING WHICH DRUGS OR MEDICAL TREATMENT MAY BE APPROPRIATE FOR YOU, AND YOU SHOULD DISREGARD ANY SUCH ADVICE IF DELIVERED THROUGH THE PLATFORM.
            </p>
            <p>
              DO NOT DISREGARD, AVOID, OR DELAY IN OBTAINING IN-PERSON CARE FROM YOUR DOCTOR OR OTHER QUALIFIED PROFESSIONAL BECAUSE OF INFORMATION OR ADVICE YOU RECEIVED THROUGH THE PLATFORM.
            </p>
          </div>

          {/* Sections starting with UPDATION */}
          <div className="space-y-8 pt-4">
            {sections.map((sec) => (
              <section key={sec.title}>
                <h2 style={{ fontFamily: SERIF, color: MAROON }} className="text-lg md:text-xl font-bold mb-2 uppercase tracking-wide">
                  {sec.title}
                </h2>
                <p className="text-sm md:text-base leading-relaxed text-[#5A4A3A]">
                  {sec.content}
                </p>
              </section>
            ))}
          </div>

          {/* Section: Contact Information without number 16 */}
          <section className="pt-4 border-t border-amber-900/10">
            <h2 style={{ fontFamily: SERIF, color: MAROON }} className="text-lg md:text-xl font-bold mb-3 uppercase tracking-wide">
              Contact Information
            </h2>
            <p className="text-sm md:text-base text-[#5A4A3A] mb-4">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <div className="p-5 rounded-2xl border border-amber-900/10 bg-[#FAF7F2]/80 shadow-xs">
              <p className="font-bold text-[#5B1F24] text-base">Nakshra</p>
              <p className="text-sm mt-1 text-[#4A3A2A]">
                Email: <a href="mailto:priyanshubansal720@gmail.com" style={{ color: GOLD }} className="hover:underline font-semibold">priyanshubansal720@gmail.com</a>
              </p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
