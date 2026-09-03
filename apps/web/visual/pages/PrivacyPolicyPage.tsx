import { MAROON, GOLD, SERIF, SANS } from "@nakshra/shared-config/theme";

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] font-sans selection:bg-[#C8A044] selection:text-[#0D0508] pb-10">
      <div className="max-w-4xl mx-auto px-6 pt-32 pb-20">
        <div className="text-center mb-12">
          <h1 style={{ fontFamily: SERIF, color: MAROON }} className="text-4xl md:text-5xl font-medium mb-4">Privacy Policy</h1>
          <div className="h-1 w-24 mx-auto" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
          <p className="mt-6 text-sm" style={{ color: "#7A6A58" }}>Last Updated: 22 July 2026</p>
        </div>
        
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-[rgba(91,31,36,0.05)] space-y-10" style={{ color: "#4A3A2A", lineHeight: 1.8 }}>

          <section>
            <h2 style={{ fontFamily: SERIF, color: MAROON }} className="text-2xl font-semibold mb-3">1. Introduction</h2>
            <p>
              This Privacy Policy explains how Nakshra ("we," "us," or "our") collects, uses, discloses, and safeguards your information when you visit our website <strong>Nakshra.in</strong> (the "Site") or purchase our products. By accessing or using the Site, you consent to the data practices described in this policy. If you do not agree with the terms of this policy, please do not access the Site.
            </p>
          </section>

          <section>
            <h2 style={{ fontFamily: SERIF, color: MAROON }} className="text-2xl font-semibold mb-3">2. Information We Collect</h2>
            <p className="mb-3">We may collect the following types of information:</p>
            
            <h3 className="font-semibold mt-4 mb-2" style={{ color: MAROON }}>2.1 Personal Information</h3>
            <p>Information you voluntarily provide when you register an account, place an order, or contact us, including:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Full name</li>
              <li>Email address</li>
              <li>Phone number</li>
              <li>Shipping and billing address</li>
              <li>Date of birth (optional, used for personalized energization rituals)</li>
              <li>Payment information (processed securely by third-party payment gateways; we do not store your credit/debit card details)</li>
            </ul>

            <h3 className="font-semibold mt-4 mb-2" style={{ color: MAROON }}>2.2 Automatically Collected Information</h3>
            <p>When you access the Site, we may automatically collect:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Operating system</li>
              <li>Pages visited, time spent on pages, and referring URL</li>
              <li>Device identifiers</li>
            </ul>

            <h3 className="font-semibold mt-4 mb-2" style={{ color: MAROON }}>2.3 Information from Third Parties</h3>
            <p>We may receive information about you from third-party services such as authentication providers (e.g., Google Sign-In) if you choose to link your account through them.</p>
          </section>

          <section>
            <h2 style={{ fontFamily: SERIF, color: MAROON }} className="text-2xl font-semibold mb-3">3. How We Use Your Information</h2>
            <p className="mb-3">We use the information we collect for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>To process and fulfill your orders, including energization and shipping</li>
              <li>To create and manage your user account</li>
              <li>To communicate with you regarding your orders, inquiries, and customer support</li>
              <li>To send promotional emails, newsletters, or offers (you may opt out at any time)</li>
              <li>To personalize your experience on the Site</li>
              <li>To improve our website, products, and services</li>
              <li>To detect and prevent fraud or unauthorized access</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontFamily: SERIF, color: MAROON }} className="text-2xl font-semibold mb-3">4. Cookies and Tracking Technologies</h2>
            <p>
              We use cookies and similar tracking technologies (such as pixels and local storage) to facilitate website functionality, remember your preferences, analyze site traffic, and improve marketing efforts. You may configure your browser to refuse cookies, but doing so may limit your ability to use certain features of the Site.
            </p>
          </section>

          <section>
            <h2 style={{ fontFamily: SERIF, color: MAROON }} className="text-2xl font-semibold mb-3">5. Disclosure of Your Information</h2>
            <p className="mb-3">We may share your information in the following situations:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Service Providers:</strong> With third-party vendors who perform services on our behalf, such as payment processing (e.g., Razorpay), shipping and logistics, email delivery, and analytics.</li>
              <li><strong>Legal Requirements:</strong> If required by law, regulation, legal process, or governmental request.</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of all or a portion of our assets.</li>
              <li><strong>With Your Consent:</strong> We may share your information for any other purpose with your explicit consent.</li>
            </ul>
            <p className="mt-3">We do <strong>not</strong> sell, rent, or trade your personal information to third parties for their marketing purposes.</p>
          </section>

          <section>
            <h2 style={{ fontFamily: SERIF, color: MAROON }} className="text-2xl font-semibold mb-3">6. Data Security</h2>
            <p>
              We implement industry-standard administrative, technical, and physical security measures to protect your personal information. However, no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to protect your data, we cannot guarantee its absolute security.
            </p>
          </section>

          <section>
            <h2 style={{ fontFamily: SERIF, color: MAROON }} className="text-2xl font-semibold mb-3">7. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is active or as needed to provide you services, comply with our legal obligations, resolve disputes, and enforce our agreements. If you wish to have your data deleted, you may contact us at the email address provided below.
            </p>
          </section>

          <section>
            <h2 style={{ fontFamily: SERIF, color: MAROON }} className="text-2xl font-semibold mb-3">8. Your Rights</h2>
            <p className="mb-3">Depending on your jurisdiction, you may have the following rights regarding your personal data:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data.</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data, subject to legal retention requirements.</li>
              <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications at any time by clicking the "unsubscribe" link in our emails or contacting us directly.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontFamily: SERIF, color: MAROON }} className="text-2xl font-semibold mb-3">9. Third-Party Links</h2>
            <p>
              The Site may contain links to third-party websites or services that are not owned or controlled by Nakshra. We are not responsible for the privacy practices or the content of such third-party sites. We encourage you to review the privacy policies of any third-party site you visit.
            </p>
          </section>

          <section>
            <h2 style={{ fontFamily: SERIF, color: MAROON }} className="text-2xl font-semibold mb-3">10. Children's Privacy</h2>
            <p>
              Our Site is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected data from a child without parental consent, we will take steps to delete that information promptly.
            </p>
          </section>

          <section>
            <h2 style={{ fontFamily: SERIF, color: MAROON }} className="text-2xl font-semibold mb-3">11. Changes to This Policy</h2>
            <p>
              We reserve the right to update or modify this Privacy Policy at any time. Any changes will be effective immediately upon posting the revised policy on the Site with an updated "Last Updated" date. Your continued use of the Site after any modifications constitutes your acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 style={{ fontFamily: SERIF, color: MAROON }} className="text-2xl font-semibold mb-3">12. Contact Us</h2>
            <p>
              If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at:
            </p>
            <div className="mt-3 p-4 rounded-xl" style={{ background: "#FAF7F2" }}>
              <p><strong>Nakshra</strong></p>
              <p>Email: <a href="mailto:priyanshubansal720@gmail.com" style={{ color: GOLD }} className="hover:underline">priyanshubansal720@gmail.com</a></p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
