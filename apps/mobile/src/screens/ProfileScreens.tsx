import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Linking, Alert } from 'react-native';
import { MAROON, GOLD } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { trackOrder as apiTrackOrder, api } from '@nakshra/shared-api';
import { supabase } from '../services/supabase';

interface ProfileMainProps {
  onTrackOrder: () => void;
  onPolicies: () => void;
  onWishlistPress?: () => void;
  onOrders: () => void;
  onEditProfile: () => void;
  onAddresses: () => void;
}

export const ProfileScreens: React.FC<ProfileMainProps> = ({ onTrackOrder, onPolicies, onWishlistPress, onOrders, onEditProfile, onAddresses }) => {
  const { user, logout, isLoggedIn, openAuth } = useAuth();
  const { wishlist } = useWishlist();

  const userName = user?.user_metadata?.full_name || (user as any)?.name || 'Devotee';
  const userPhone = user?.user_metadata?.phone || (user as any)?.phone || '';
  const userEmail = user?.email || '';

  if (!isLoggedIn) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.centerScroll}>
        <View style={styles.authCard}>
          <Text style={styles.authTitle}>🕉️ Welcome to Nakshra</Text>
          <Text style={styles.authDesc}>Join India's most trusted ecosystem for authentic Vedic solutions & remedies.</Text>

          <TouchableOpacity style={styles.loginBtn} onPress={() => openAuth()}>
            <Text style={styles.loginBtnText}>SIGN IN / CREATE ACCOUNT</Text>
          </TouchableOpacity>

          <View style={styles.guestLinksRow}>
            <TouchableOpacity style={styles.guestLinkItem} onPress={onTrackOrder}>
              <Text style={styles.guestLinkIcon}>📦</Text>
              <Text style={styles.guestLinkText}>Track Order</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.guestLinkItem} onPress={onPolicies}>
              <Text style={styles.guestLinkIcon}>📜</Text>
              <Text style={styles.guestLinkText}>Policies & FAQs</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarBox}>
          <Text style={styles.avatarEmoji}>{user?.role === 'astrologer' ? '🔮' : '👤'}</Text>
        </View>
        <Text style={styles.profileGreeting}>Namaste, {userName}!</Text>
        {userPhone ? <Text style={styles.profileContact}>📱 +91 {userPhone}</Text> : null}
        {userEmail ? <Text style={styles.profileContact}>✉️ {userEmail}</Text> : null}
        <Text style={styles.profileRole}>
          Account Type: {user?.role === 'astrologer' ? 'Certified Astrologer' : 'Sacred Seeker'}
        </Text>
      </View>

      {/* Profile Navigation Links */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Account</Text>
        
        {onWishlistPress && (
          <TouchableOpacity style={styles.menuItem} onPress={onWishlistPress}>
            <Text style={styles.menuIcon}>❤️</Text>
            <View style={styles.menuInfo}>
              <Text style={styles.menuLabel}>My Saved Wishlist ({wishlist.length})</Text>
              <Text style={styles.menuDesc}>View your saved sacred remedies</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.menuItem} onPress={onOrders}>
          <Text style={styles.menuIcon}>🧾</Text>
          <View style={styles.menuInfo}>
            <Text style={styles.menuLabel}>My Orders</Text>
            <Text style={styles.menuDesc}>View order history & cancel orders</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={onEditProfile}>
          <Text style={styles.menuIcon}>✏️</Text>
          <View style={styles.menuInfo}>
            <Text style={styles.menuLabel}>Edit Profile</Text>
            <Text style={styles.menuDesc}>Name, DOB, gender & birth details</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={onAddresses}>
          <Text style={styles.menuIcon}>📍</Text>
          <View style={styles.menuInfo}>
            <Text style={styles.menuLabel}>Saved Addresses</Text>
            <Text style={styles.menuDesc}>Manage your delivery addresses</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={onTrackOrder}>
          <Text style={styles.menuIcon}>📦</Text>
          <View style={styles.menuInfo}>
            <Text style={styles.menuLabel}>Track Order & Shipments</Text>
            <Text style={styles.menuDesc}>Monitor Shiprocket package shipment</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={onPolicies}>
          <Text style={styles.menuIcon}>📜</Text>
          <View style={styles.menuInfo}>
            <Text style={styles.menuLabel}>Policies & Help Center</Text>
            <Text style={styles.menuDesc}>FAQs, shipping policies, returns</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => { logout(); openAuth(); }}>
          <Text style={styles.menuIcon}>🚪</Text>
          <View style={styles.menuInfo}>
            <Text style={styles.menuLabel}>Sign Out</Text>
            <Text style={styles.menuDesc}>Logout from your account</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

// ── TRACK ORDER SCREEN ──────────────────────────────────────────────────
export const TrackOrderScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);

  const handleTrack = async () => {
    if (!orderId.trim()) return;
    setLoading(true);
    const data = await apiTrackOrder(orderId.trim());
    setStatus(data);
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Track Shiprocket Order</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Enter Shiprocket / Order ID</Text>
          <TextInput
            style={styles.input}
            placeholder="E.g., ARH-81395"
            placeholderTextColor="#9a8c7a"
            value={orderId}
            onChangeText={setOrderId}
          />
          <TouchableOpacity style={styles.trackBtn} onPress={handleTrack} disabled={loading}>
            <Text style={styles.trackBtnText}>{loading ? 'FETCHING...' : 'TRACK STATUS'}</Text>
          </TouchableOpacity>
        </View>

        {status && (
          <View style={styles.statusCard}>
            {status.isEstimate && (
              <Text style={styles.estimateNotice}>ℹ️ Live courier tracking isn't connected yet — showing a typical delivery estimate.</Text>
            )}
            <Text style={styles.statusHeading}>Shipment Status: <Text style={styles.statusHighlight}>{status.status}</Text></Text>
            <Text style={styles.statusLabel}>Courier: {status.courier}</Text>
            <Text style={styles.statusLabel}>Estimated Delivery: {status.eta}</Text>

            <Text style={styles.timelineHeader}>Tracking Updates</Text>
            {(status.updates || []).map((u: any, idx: number) => (
              <View key={idx} style={styles.timelineItem}>
                <Text style={styles.timelineTime}>{u.time}</Text>
                <Text style={styles.timelineMsg}>{u.status || u.msg}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// ── FAQ / POLICY / LEGAL CONTENT (ported verbatim from the web pages so mobile carries
// the same compliance-relevant text — FAQPage.tsx, ShippingPolicyPage.tsx, ReturnPolicyPage.tsx,
// PrivacyPolicyPage.tsx, TermsOfServicePage.tsx) ─────────────────────────────────────────
const FAQS = [
  {
    q: "How are the products energized before shipping?",
    a: "Every sacred item undergoes 'Pran Pratishtha'—an authentic Vedic ritual performed by expert Pandits. We use your name, gotra, and birth details during the mantra chanting to align the item's frequency with your aura. This process takes 2-3 days before dispatch."
  },
  {
    q: "Are the Rudrakshas and Gemstones certified authentic?",
    a: "Yes. 100% of our premium Rudrakshas and Gemstones are shipped with a physical Lab Certificate of Authenticity proving their origin, natural state, and un-tampered quality."
  },
  {
    q: "How long will it take to receive my order?",
    a: "After the 2-3 day energization process, delivery takes 3-5 business days for Metro cities, and 7-10 business days for the rest of India."
  },
  {
    q: "Do you ship internationally?",
    a: "Currently, we focus on pan-India delivery to ensure the sacred items reach you safely and within predictable timelines. International shipping will be launched soon."
  },
  {
    q: "What should I do if my Rudraksha cracks or breaks?",
    a: "A cracked Rudraksha should not be worn, as it loses its geometric energy structure. If it arrives cracked in transit, please send us an unboxing video within 24 hours for a free replacement. If it cracks later due to mishandling or extreme temperature changes, it is considered physically damaged by the user."
  },
  {
    q: "Can I return a product if I change my mind?",
    a: "Yes, we have a 7-day return policy for unused items in their original condition with all certificates. However, highly customized ritual items may be exempt. Please refer to our Return Policy page for exact details."
  }
];

const SHIPPING_SECTIONS = [
  { h: '1. The Energization Process (Pran Pratishtha)', b: 'Unlike standard e-commerce products, our sacred items (Rudraksha, Yantras, Gemstones) are not simply pulled from a shelf and shipped. Every physical product undergoes a strict Vedic energization process (Pran Pratishtha) tailored to your name and birth details before dispatch.\n\nPlease allow 2 to 3 business days for our expert Pandits to perform these authentic rituals. This step is non-negotiable, as it is what breathes life and efficacy into your sacred items.' },
  { h: '2. Estimated Delivery Timelines', b: 'Once the energization process is complete and the product is dispatched from our spiritual center, delivery within India generally takes 7 to 10 business days depending on your location.\n\n• Metro Cities: 3-5 days post-dispatch.\n• Tier 2/3 Cities: 5-8 days post-dispatch.\n• Remote Areas: Up to 10 days post-dispatch.' },
  { h: '3. Delivery Coverage & Logistics', b: 'We offer comprehensive pan-India delivery through our trusted courier partners. Our packaging is meticulously designed to ensure your sacred items arrive in pristine, untampered condition.' },
  { h: '4. Cash on Delivery (COD) Rules', b: 'We offer Cash on Delivery (COD) to make your experience seamless. However, please note that if a COD order is placed and subsequently rejected at the doorstep, or returned without valid reason, future orders placed by the same user account or phone number will be restricted to prepaid only. In some cases of abuse, the user may be held liable for the two-way courier charges incurred.' },
  { h: '5. Tracking Your Order', b: 'As soon as your package is handed over to our courier partner, you will receive an SMS and Email containing your tracking link and Order ID. You can also track your shipment live from the Track Order screen.' },
];

const RETURN_SECTIONS = [
  { h: '1. 7-Day Return Window', b: 'We stand by the authenticity and quality of our sacred products. If you are not completely satisfied, you may initiate a return within 7 days of receiving your delivery.' },
  { h: '2. Conditions for Return', b: 'To be eligible for a return or replacement, the following conditions must be strictly met:\n\n• The item must be unused and in the exact condition you received it.\n• All original tags, packaging, and the Certificate of Authenticity (Lab Certificate) must be intact and returned with the product.\n• The sacred item must not have been physically altered, broken, or improperly handled by the user.' },
  { h: '3. Damaged or Defective Goods', b: 'If your product arrives damaged or defective due to transit, we require a continuous unboxing video as proof. Because our items are high-value and uniquely energized, this standard practice helps us process your replacement immediately without dispute. Please email the video to priyanshubansal720@gmail.com within 24 hours of delivery.' },
  { h: '4. Custom Energized Products', b: 'Some specific products that undergo highly personalized, multi-day rituals based on your exact Kundali (birth chart) may be exempt from standard returns unless they arrive physically damaged. This will be explicitly stated on the product page if applicable.' },
  { h: '5. Refund Processing', b: 'Once your returned item is received and inspected at our spiritual center, we will send you an email to notify you of the approval or rejection of your refund. If approved, the refund will be processed and credited back to your original method of payment within 5-7 business days.' },
];

const PRIVACY_SECTIONS = [
  { h: '1. Introduction', b: 'This Privacy Policy explains how Nakshra ("we," "us," or "our") collects, uses, discloses, and safeguards your information when you visit Nakshra.in or purchase our products. By accessing or using the Site, you consent to the data practices described in this policy.' },
  { h: '2. Information We Collect', b: 'Personal Information: full name, email, phone number, shipping/billing address, date of birth (optional, used for personalized energization rituals), payment information (processed securely by third-party gateways; we do not store your card details).\n\nAutomatically Collected: IP address, browser type/version, operating system, pages visited, device identifiers.\n\nFrom Third Parties: information from authentication providers if you link your account through them.' },
  { h: '3. How We Use Your Information', b: 'To process/fulfill orders (including energization and shipping), manage your account, communicate about orders/support, send promotional communications (opt-out anytime), personalize your experience, improve our products/services, detect and prevent fraud, and comply with legal obligations.' },
  { h: '4. Cookies and Tracking Technologies', b: 'We use cookies and similar tracking technologies to facilitate site functionality, remember preferences, analyze traffic, and improve marketing. You may configure your browser to refuse cookies, which may limit some features.' },
  { h: '5. Disclosure of Your Information', b: 'Service Providers: payment processing (e.g. Razorpay), shipping/logistics, email delivery, analytics.\nLegal Requirements: if required by law or governmental request.\nBusiness Transfers: in connection with a merger, acquisition, or asset sale.\nWith Your Consent: for any other purpose with your explicit consent.\n\nWe do not sell, rent, or trade your personal information for third parties\' marketing purposes.' },
  { h: '6. Data Security', b: 'We implement industry-standard administrative, technical, and physical security measures to protect your personal information. No method of transmission or storage is 100% secure.' },
  { h: '7. Data Retention', b: 'We retain your personal information for as long as your account is active or as needed to provide services, comply with legal obligations, resolve disputes, and enforce agreements. Contact us to request deletion.' },
  { h: '8. Your Rights', b: 'Access: request a copy of the data we hold about you.\nCorrection: request correction of inaccurate/incomplete data.\nDeletion: request deletion, subject to legal retention requirements.\nOpt-Out: unsubscribe from marketing communications at any time.' },
  { h: '9. Third-Party Links', b: 'The Site may link to third-party websites not owned or controlled by Nakshra. We are not responsible for their privacy practices.' },
  { h: "10. Children's Privacy", b: 'Our Site is not intended for individuals under 18. We do not knowingly collect data from children; if we become aware we have, we will delete it promptly.' },
  { h: '11. Changes to This Policy', b: 'We may update this Privacy Policy at any time. Changes are effective immediately upon posting with an updated "Last Updated" date. Continued use constitutes acceptance.' },
  { h: '12. Contact Us', b: 'Questions about this Privacy Policy: Nakshra, priyanshubansal720@gmail.com' },
];

const TERMS_SECTIONS = [
  { h: '1. Acceptance of Terms', b: 'By accessing or using Nakshra.in (the "Services"), you agree to be bound by these Terms of Service. If you do not agree, you must not use the Site. We may modify these Terms at any time; continued use constitutes acceptance.' },
  { h: '2. Eligibility', b: 'You must be at least 18 years of age to use this Site or make a purchase, and represent that you have the legal capacity to enter a binding agreement.' },
  { h: '3. User Accounts', b: "You are responsible for maintaining the confidentiality of your account credentials and all activity under your account, and for providing accurate, current, complete information. We may suspend or terminate accounts with inaccurate information." },
  { h: '4. Products and Services', b: "Product Descriptions: colours/dimensions may vary from your device's display; descriptions are subject to change.\n\nEnergization & Spiritual Claims: our products are energized through traditional Vedic rituals (Pran Pratishtha), but outcomes are based on traditional belief and individual faith — we make no guarantees of specific spiritual, health, financial, or astrological outcomes. Products are not a substitute for medical, legal, or financial advice.\n\nPricing & Availability: prices are in INR, inclusive of applicable taxes unless stated otherwise. We may modify prices, discontinue products, or cancel orders placed at an incorrect price." },
  { h: '5. Orders and Payment', b: 'Placing an order is an offer to purchase, subject to acceptance and availability. We may refuse or cancel any order. Payments are processed via secure third-party gateways (e.g. Razorpay) — we do not store your card details.' },
  { h: '6. Shipping and Delivery', b: 'See our Shipping Policy for energization timelines and delivery windows. Nakshra is not responsible for delays caused by courier services, customs, natural disasters, or other circumstances beyond our reasonable control.' },
  { h: '7. Returns, Refunds, and Cancellations', b: 'See our Return & Refund Policy. In summary: returns accepted within 7 days for unused items in original condition; refunds processed within 5-7 business days; custom-energized products may be exempt unless damaged in transit; cancellations permitted before dispatch.' },
  { h: '8. Intellectual Property', b: 'All Site content (text, graphics, logos, images, product photography, UI design, software) is the property of Nakshra or its suppliers and protected by Indian and international IP law. No reproduction/distribution without prior written consent.' },
  { h: '9. Prohibited Conduct', b: 'You agree not to: use the Site unlawfully; attempt unauthorized access to accounts or systems; use bots/scrapers; submit false or fraudulent orders/reviews; disrupt Site integrity; impersonate any person or entity.' },
  { h: '10. Limitation of Liability', b: 'To the fullest extent permitted by law, Nakshra is not liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the Site, third-party conduct, unauthorized access to your content, or reliance on spiritual/astrological claims. Our total liability for any claim will not exceed the amount you paid for the specific product giving rise to the claim.' },
  { h: '11. Disclaimer of Warranties', b: 'The Site and all products are provided "as is" and "as available" without warranties of any kind, including merchantability, fitness for a particular purpose, and non-infringement.' },
  { h: '12. Indemnification', b: 'You agree to indemnify and hold harmless Nakshra and its officers, directors, employees, and affiliates from claims arising from your use of the Site or violation of these Terms or third-party rights.' },
  { h: '13. Governing Law and Jurisdiction', b: 'These Terms are governed by the laws of India. Disputes are subject to the exclusive jurisdiction of the courts in Varanasi, Uttar Pradesh, India.' },
  { h: '14. Severability', b: 'If any provision of these Terms is found unlawful or unenforceable, that provision is severable and does not affect the remaining provisions.' },
  { h: '15. Entire Agreement', b: 'These Terms, together with our Privacy Policy, Shipping Policy, and Return Policy, constitute the entire agreement between you and Nakshra regarding use of the Site.' },
  { h: '16. Contact Information', b: 'Questions about these Terms: Nakshra, priyanshubansal720@gmail.com' },
];

type PolicyTab = 'faq' | 'shipping' | 'returns' | 'contact' | 'privacy' | 'terms';
const POLICY_TABS: { key: PolicyTab; label: string }[] = [
  { key: 'faq', label: 'FAQ' },
  { key: 'shipping', label: 'Shipping' },
  { key: 'returns', label: 'Returns' },
  { key: 'contact', label: 'Contact' },
  { key: 'privacy', label: 'Privacy' },
  { key: 'terms', label: 'Terms' },
];

function PolicySectionList({ sections }: { sections: { h: string; b: string }[] }) {
  return (
    <>
      {sections.map((s, i) => (
        <View key={i} style={styles.policyTextCard}>
          <Text style={styles.policyTitle}>{s.h}</Text>
          <Text style={styles.policyBody}>{s.b}</Text>
        </View>
      ))}
    </>
  );
}

// ── POLICIES & HELP SCREEN (FAQ, Shipping, Returns, Contact, Privacy, Terms) ────────────
export const PoliciesScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [tab, setTab] = useState<PolicyTab>('faq');
  const [faqIndex, setFaqIndex] = useState<number | null>(0);

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSendContact = async () => {
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.from('contact_messages').insert([{ name: contactName, email: contactEmail, message: contactMessage }]);
      if (error) throw error;
      setSent(true);
    } catch (e: any) {
      Alert.alert('Failed to send message', e?.message || 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Policies</Text>
      </View>

      <View style={styles.policyTabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {POLICY_TABS.map((t) => (
            <TouchableOpacity key={t.key} style={[styles.policyTabChip, tab === t.key && styles.policyTabChipActive]} onPress={() => setTab(t.key)}>
              <Text style={[styles.policyTabText, tab === t.key && styles.policyTabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {tab === 'faq' && (
          <>
            <Text style={styles.secHeading}>Frequently Asked Questions</Text>
            {FAQS.map((faq, i) => (
              <View key={i} style={styles.faqBlock}>
                <TouchableOpacity style={styles.faqHeader} onPress={() => setFaqIndex(faqIndex === i ? null : i)}>
                  <Text style={styles.faqQuestion}>{faq.q}</Text>
                  <Text style={styles.faqArrow}>{faqIndex === i ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {faqIndex === i && (
                  <View style={styles.faqAnswerBox}>
                    <Text style={styles.faqAnswer}>{faq.a}</Text>
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        {tab === 'shipping' && (
          <>
            <Text style={styles.secHeading}>Shipping Policy</Text>
            <PolicySectionList sections={SHIPPING_SECTIONS} />
          </>
        )}

        {tab === 'returns' && (
          <>
            <Text style={styles.secHeading}>Return & Refund Policy</Text>
            <PolicySectionList sections={RETURN_SECTIONS} />
          </>
        )}

        {tab === 'contact' && (
          <>
            <Text style={styles.secHeading}>Get in Touch</Text>
            <View style={styles.contactInfoCard}>
              <TouchableOpacity onPress={() => Linking.openURL('mailto:priyanshubansal720@gmail.com')}>
                <Text style={styles.contactLabel}>✉️ Email Support</Text>
                <Text style={styles.contactValue}>priyanshubansal720@gmail.com</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Linking.openURL('tel:+918000153840')} style={{ marginTop: 14 }}>
                <Text style={styles.contactLabel}>📞 Call Us</Text>
                <Text style={styles.contactValue}>+91 80001 53840 · Mon-Sat, 10 AM to 6 PM</Text>
              </TouchableOpacity>
              <View style={{ marginTop: 14 }}>
                <Text style={styles.contactLabel}>📍 Spiritual Center</Text>
                <Text style={styles.contactValue}>Nakshra Vedic Center, Varanasi, Uttar Pradesh, India</Text>
              </View>
            </View>

            <Text style={[styles.secHeading, { marginTop: 20 }]}>Send us a Message</Text>
            {sent ? (
              <View style={styles.policyTextCard}>
                <Text style={styles.policyTitle}>✨ Message Sent Successfully</Text>
                <Text style={styles.policyBody}>Thank you for reaching out to Nakshra. Our support team will get back to you shortly.</Text>
                <TouchableOpacity onPress={() => { setSent(false); setContactName(''); setContactEmail(''); setContactMessage(''); }} style={{ marginTop: 10 }}>
                  <Text style={styles.addNewBtnTextLike}>Send Another Message</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.card}>
                <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#9a8c7a" value={contactName} onChangeText={setContactName} />
                <TextInput style={styles.input} placeholder="Email Address" placeholderTextColor="#9a8c7a" keyboardType="email-address" value={contactEmail} onChangeText={setContactEmail} />
                <TextInput style={[styles.input, styles.textArea]} placeholder="How can we help you?" placeholderTextColor="#9a8c7a" multiline numberOfLines={4} value={contactMessage} onChangeText={setContactMessage} />
                <TouchableOpacity style={styles.trackBtn} onPress={handleSendContact} disabled={sending || !contactName || !contactEmail || !contactMessage}>
                  {sending ? <ActivityIndicator color={GOLD} /> : <Text style={styles.trackBtnText}>SEND MESSAGE</Text>}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {tab === 'privacy' && (
          <>
            <Text style={styles.secHeading}>Privacy Policy</Text>
            <Text style={styles.lastUpdated}>Last Updated: 22 July 2026</Text>
            <PolicySectionList sections={PRIVACY_SECTIONS} />
          </>
        )}

        {tab === 'terms' && (
          <>
            <Text style={styles.secHeading}>Terms of Service</Text>
            <Text style={styles.lastUpdated}>Last Updated: 22 July 2026</Text>
            <PolicySectionList sections={TERMS_SECTIONS} />
          </>
        )}
      </ScrollView>
    </View>
  );
};

// ── ORDER HISTORY SCREEN ────────────────────────────────────────────────
const ORDER_STEPS = [
  { label: 'Ordered', icon: '✓' },
  { label: 'Processing', icon: '🪔' },
  { label: 'Shipped', icon: '🚚' },
  { label: 'Delivered', icon: '🏠' },
];

function getOrderStep(status: string, awbCode?: string) {
  if (status === 'CANCELLED' || status === 'Cancelled') return -1;
  if (status === 'Delivered' || status === 'DELIVERED') return 3;
  if (awbCode || status === 'SHIPPED' || status === 'Shipped') return 2;
  if (status === 'CONFIRMED' || status === 'Processing') return 1;
  return 0;
}

export const OrdersScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const userPhone = user?.user_metadata?.phone ? String(user.user_metadata.phone).replace(/\D/g, '').slice(-10) : '';
      let fetched: any[] = [];
      try {
        const query = supabase.from('orders').select('*').order('created_at', { ascending: false });
        if (user?.id && userPhone) query.or(`user_id.eq.${user.id},user_phone.eq.${userPhone}`);
        else if (user?.id) query.eq('user_id', user.id);
        else if (userPhone) query.eq('user_phone', userPhone);
        const { data } = await query;
        if (data) fetched = data;
      } catch (e) {}
      setOrders(fetched);
      setLoading(false);
    })();
  }, [user?.id]);

  const handleCancelOrder = (orderId: string | number) => {
    Alert.alert('Cancel Order', `Are you sure you want to cancel Order #${orderId}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.from('orders').update({ status: 'CANCELLED' }).eq('id', orderId);
          } catch (e) {}
          // Backend has no cancel endpoint today — best-effort call so this starts working
          // automatically if one is added later, matching web's same fallback pattern.
          await api(`/orders/${orderId}/cancel`, { method: 'POST' }).catch(() => {});
          setOrders((prev) => prev.map((o) => String(o.id) === String(orderId) ? { ...o, status: 'CANCELLED' } : o));
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {loading && <ActivityIndicator size="large" color={MAROON} style={{ marginTop: 30 }} />}
        {!loading && orders.length === 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📦 No orders yet</Text>
            <Text style={styles.policyBody}>Your purchased sacred items will appear here.</Text>
          </View>
        )}
        {orders.map((order) => {
          const itemsList = order.order_items || order.items || [];
          const isExpanded = !!expanded[order.id];
          const stepIdx = getOrderStep(order.status, order.awb_code);
          const isCancelled = order.status === 'CANCELLED' || order.status === 'Cancelled';
          return (
            <TouchableOpacity key={order.id} style={styles.orderCard} onPress={() => setExpanded((p) => ({ ...p, [order.id]: !p[order.id] }))} activeOpacity={0.8}>
              <View style={styles.orderCardTop}>
                <View>
                  <Text style={styles.orderCardId}>Order #{order.id}</Text>
                  <Text style={styles.orderCardDate}>{new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.orderCardAmount}>₹{((order.total_amount || order.amount || 0) / 100).toLocaleString('en-IN')}</Text>
                  <Text style={[styles.orderStatusBadge, isCancelled ? styles.orderStatusCancelled : styles.orderStatusActive]}>
                    {order.status || 'CONFIRMED'}
                  </Text>
                </View>
              </View>

              {isExpanded && (
                <View style={styles.orderExpanded}>
                  {!isCancelled && (
                    <View style={styles.orderTimeline}>
                      {ORDER_STEPS.map((s, idx) => (
                        <View key={s.label} style={styles.orderTimelineStep}>
                          <View style={[styles.orderTimelineDot, idx <= stepIdx && styles.orderTimelineDotActive]}>
                            <Text style={styles.orderTimelineIcon}>{s.icon}</Text>
                          </View>
                          <Text style={[styles.orderTimelineLabel, idx <= stepIdx && styles.orderTimelineLabelActive]}>{s.label}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {itemsList.map((it: any, i: number) => (
                    <View key={i} style={styles.orderItemRow}>
                      <Text style={styles.orderItemName}>{it.product_name || it.name || 'Sacred Item'} × {it.quantity || it.qty}</Text>
                      <Text style={styles.orderItemPrice}>₹{(((it.unit_price ?? it.price ?? 0) * (it.quantity || it.qty || 1)) / (it.unit_price ? 100 : 1)).toLocaleString('en-IN')}</Text>
                    </View>
                  ))}

                  {!isCancelled && stepIdx <= 1 && (
                    <TouchableOpacity style={styles.cancelOrderBtn} onPress={() => handleCancelOrder(order.id)}>
                      <Text style={styles.cancelOrderBtnText}>Cancel Order</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

// ── EDIT PROFILE SCREEN ─────────────────────────────────────────────────
export const EditProfileScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [pobCity, setPobCity] = useState('');

  React.useEffect(() => {
    (async () => {
      let profile: any = null;
      try {
        profile = await api('/auth/profile').catch(() => null);
      } catch (e) {}
      if (!profile && user?.id) {
        try {
          const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
          profile = data;
        } catch (e) {}
      }
      setFullName(profile?.full_name || profile?.fullName || user?.user_metadata?.full_name || '');
      setEmail(profile?.email || user?.email || '');
      setPhone(profile?.phone || user?.user_metadata?.phone || '');
      setGender(profile?.gender || '');
      setDob(profile?.dob ? new Date(profile.dob).toISOString().split('T')[0] : '');
      setPobCity(profile?.pob_city || profile?.pobCity || '');
      setLoading(false);
    })();
  }, [user?.id]);

  const handleSave = async () => {
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      Alert.alert('Invalid phone', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    setSaving(true);
    try {
      await api('/auth/profile', {
        method: 'POST',
        body: JSON.stringify({ fullName, phone: phoneDigits, gender, dob, pob_city: pobCity }),
      }).catch(() => {});
      if (user?.id) {
        try {
          await supabase.from('users').upsert({
            id: user.id,
            full_name: fullName,
            email: email || null,
            phone: phoneDigits || null,
            gender: gender || 'Other',
            dob: dob || null,
            pob_city: pobCity || null,
          });
        } catch (e) {}
      }
      Alert.alert('Profile updated', 'Your profile has been saved successfully.', [{ text: 'OK', onPress: onBack }]);
    } catch (e: any) {
      Alert.alert('Failed to save', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
        </View>
        <ActivityIndicator size="large" color={MAROON} style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.form}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholderTextColor="#9a8c7a" />

          <Text style={styles.label}>Email Address</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" placeholderTextColor="#9a8c7a" />

          <Text style={styles.label}>Mobile Phone Number</Text>
          <TextInput style={styles.input} value={phone} onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))} keyboardType="phone-pad" maxLength={10} placeholderTextColor="#9a8c7a" />

          <Text style={styles.label}>Gender</Text>
          <View style={styles.row}>
            {['Male', 'Female', 'Other'].map((g) => (
              <TouchableOpacity key={g} style={[styles.genderChip, gender === g && styles.genderChipActive]} onPress={() => setGender(g)}>
                <Text style={[styles.genderChipText, gender === g && styles.genderChipTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Date of Birth (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={dob} onChangeText={setDob} placeholder="2000-01-01" placeholderTextColor="#9a8c7a" />

          <Text style={styles.label}>City of Birth</Text>
          <TextInput style={styles.input} value={pobCity} onChangeText={setPobCity} placeholderTextColor="#9a8c7a" />

          <TouchableOpacity style={styles.proceedBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={GOLD} /> : <Text style={styles.proceedText}>SAVE PROFILE</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

// ── SAVED ADDRESSES SCREEN ──────────────────────────────────────────────
export const AddressesScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [addr, setAddr] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [saving, setSaving] = useState(false);

  const loadAddresses = async () => {
    setLoading(true);
    const res: any = await api('/addresses').catch(() => null);
    setAddresses(Array.isArray(res) ? res : (res?.addresses || []));
    setLoading(false);
  };

  React.useEffect(() => { loadAddresses(); }, []);

  const resetForm = () => {
    setEditingId(null);
    setName(''); setPhone(''); setAddr(''); setCity(''); setState(''); setPincode('');
  };

  const handleSaveAddress = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!name.trim() || cleanPhone.length !== 10 || !addr.trim() || !city.trim() || pincode.length !== 6) {
      Alert.alert('Missing details', 'Please fill in name, a 10-digit phone, address, city, and 6-digit pincode.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api(`/addresses/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify({ name, phone: cleanPhone, address: addr, city, state, pincode }),
        });
      } else {
        await api('/addresses', {
          method: 'POST',
          body: JSON.stringify({ name, phone: cleanPhone, address: addr, city, state, pincode }),
        });
      }
      setShowForm(false);
      resetForm();
      await loadAddresses();
    } catch (e: any) {
      Alert.alert('Failed to save address', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (a: any) => {
    setEditingId(a.id);
    setName(a.name || '');
    setPhone(a.phone || '');
    setAddr(a.address || '');
    setCity(a.city || '');
    setState(a.state || '');
    setPincode(String(a.pincode || ''));
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    Alert.alert('Remove address', 'Remove this saved address?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await api(`/addresses/${id}`, { method: 'DELETE' }).catch(() => {});
        await loadAddresses();
      }},
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Addresses</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {loading && <ActivityIndicator size="large" color={MAROON} style={{ marginTop: 30 }} />}

        {!loading && !showForm && (
          <>
            <TouchableOpacity style={styles.addNewAddrBtn} onPress={() => { resetForm(); setShowForm(true); }}>
              <Text style={styles.addNewAddrBtnText}>+ Add New Address</Text>
            </TouchableOpacity>

            {addresses.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>📍 No saved addresses</Text>
                <Text style={styles.policyBody}>Add an address to make your checkout faster.</Text>
              </View>
            ) : (
              addresses.map((a) => (
                <View key={a.id} style={styles.savedCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.savedName}>{a.name} • {a.phone}</Text>
                    <Text style={styles.savedAddr}>{a.address}, {a.city}, {a.state} - {a.pincode}</Text>
                  </View>
                  <View style={{ gap: 8 }}>
                    <TouchableOpacity onPress={() => handleEdit(a)}><Text style={styles.addrActionText}>Edit</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(a.id)}><Text style={[styles.addrActionText, styles.addrActionDelete]}>Delete</Text></TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {showForm && (
          <View style={styles.form}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor="#9a8c7a" />
            <Text style={styles.label}>Phone Number</Text>
            <TextInput style={styles.input} value={phone} onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))} keyboardType="phone-pad" maxLength={10} placeholderTextColor="#9a8c7a" />
            <Text style={styles.label}>Address</Text>
            <TextInput style={styles.input} value={addr} onChangeText={setAddr} placeholderTextColor="#9a8c7a" />
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>City</Text>
                <TextInput style={styles.input} value={city} onChangeText={setCity} placeholderTextColor="#9a8c7a" />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>State</Text>
                <TextInput style={styles.input} value={state} onChangeText={setState} placeholderTextColor="#9a8c7a" />
              </View>
            </View>
            <Text style={styles.label}>Pincode</Text>
            <TextInput style={styles.input} value={pincode} onChangeText={(t) => setPincode(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} placeholderTextColor="#9a8c7a" />

            <View style={styles.row}>
              <TouchableOpacity style={[styles.proceedBtn, styles.cancelFormBtn, { flex: 1 }]} onPress={() => { setShowForm(false); resetForm(); }}>
                <Text style={[styles.proceedText, styles.cancelFormBtnText]}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.proceedBtn, { flex: 1 }]} onPress={handleSaveAddress} disabled={saving}>
                {saving ? <ActivityIndicator color={GOLD} /> : <Text style={styles.proceedText}>SAVE</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCFAF7',
  },
  centerScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  authCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(200, 160, 68, 0.16)',
    alignItems: 'center',
    gap: 12,
  },
  authTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: MAROON,
  },
  authDesc: {
    fontSize: 12,
    color: '#8B7355',
    textAlign: 'center',
    lineHeight: 18,
  },
  loginBtn: {
    backgroundColor: MAROON,
    width: '100%',
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  loginBtnText: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  guestLinksRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    width: '100%',
  },
  guestLinkItem: {
    flex: 1,
    backgroundColor: '#FAF8F5',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5D7C3',
    gap: 4,
  },
  guestLinkIcon: {
    fontSize: 20,
  },
  guestLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3E3125',
  },
  profileHeader: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#FAF3E8',
    gap: 4,
  },
  avatarBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: MAROON,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarEmoji: {
    fontSize: 28,
  },
  profileGreeting: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3E3125',
  },
  profileContact: {
    fontSize: 11,
    color: '#8B7355',
    fontWeight: '600',
  },
  profileRole: {
    fontSize: 11,
    color: MAROON,
    fontWeight: '800',
    marginTop: 4,
  },
  section: {
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8B7355',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(200, 160, 68, 0.12)',
    gap: 12,
  },
  menuIcon: {
    fontSize: 20,
  },
  menuInfo: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#3E3125',
  },
  menuDesc: {
    fontSize: 10,
    color: '#8B7355',
  },
  menuArrow: {
    fontSize: 18,
    color: '#C8A044',
  },
  header: {
    height: 56,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FAF3E8',
    gap: 12,
  },
  backBtn: {
    paddingVertical: 6,
  },
  backText: {
    fontSize: 12,
    fontWeight: '700',
    color: MAROON,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3E3125',
  },
  scroll: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(200, 160, 68, 0.12)',
    gap: 10,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3E3125',
  },
  input: {
    height: 42,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#E5D7C3',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 13,
    color: '#3E3125',
  },
  trackBtn: {
    backgroundColor: MAROON,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackBtnText: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '800',
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(200, 160, 68, 0.12)',
    gap: 8,
  },
  estimateNotice: {
    fontSize: 10,
    color: '#8B6914',
    backgroundColor: 'rgba(217, 164, 6, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(217, 164, 6, 0.3)',
    borderRadius: 10,
    padding: 8,
    fontWeight: '600',
  },
  statusHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3E3125',
  },
  statusHighlight: {
    color: MAROON,
    fontWeight: '800',
  },
  statusLabel: {
    fontSize: 11,
    color: '#8B7355',
  },
  timelineHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3E3125',
    marginTop: 10,
  },
  timelineItem: {
    backgroundColor: '#FAF8F5',
    padding: 10,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: MAROON,
  },
  timelineTime: {
    fontSize: 10,
    fontWeight: '700',
    color: MAROON,
  },
  timelineMsg: {
    fontSize: 11,
    color: '#3E3125',
  },
  secHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: MAROON,
    textTransform: 'uppercase',
  },
  faqBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(200, 160, 68, 0.12)',
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  faqQuestion: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3E3125',
    flex: 1,
    paddingRight: 10,
  },
  faqArrow: {
    fontSize: 10,
    color: '#8B7355',
  },
  faqAnswerBox: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#FAF3E8',
    paddingTop: 10,
  },
  faqAnswer: {
    fontSize: 11,
    color: '#8B7355',
    lineHeight: 16,
  },
  policyTextCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(200, 160, 68, 0.12)',
    gap: 4,
  },
  policyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: MAROON,
  },
  policyBody: {
    fontSize: 11,
    color: '#8B7355',
    lineHeight: 16,
  },
  policyTabBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#FAF3E8',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  policyTabChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#E5D7C3',
    marginHorizontal: 4,
  },
  policyTabChipActive: {
    backgroundColor: MAROON,
    borderColor: MAROON,
  },
  policyTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5B4A32',
  },
  policyTabTextActive: {
    color: GOLD,
  },
  lastUpdated: {
    fontSize: 10,
    color: '#9a8c7a',
    marginBottom: 4,
  },
  contactInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(200, 160, 68, 0.12)',
  },
  contactLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8B7355',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  contactValue: {
    fontSize: 13,
    fontWeight: '700',
    color: MAROON,
  },
  textArea: {
    height: 90,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  addNewBtnTextLike: {
    fontSize: 12,
    fontWeight: '700',
    color: MAROON,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(200, 160, 68, 0.12)',
    padding: 14,
    marginBottom: 10,
  },
  orderCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderCardId: {
    fontSize: 12,
    fontWeight: '800',
    color: MAROON,
  },
  orderCardDate: {
    fontSize: 9,
    color: '#9a8c7a',
    marginTop: 2,
  },
  orderCardAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: MAROON,
  },
  orderStatusBadge: {
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
  },
  orderStatusActive: {
    backgroundColor: 'rgba(74,138,74,0.12)',
    color: '#2E6B2E',
  },
  orderStatusCancelled: {
    backgroundColor: 'rgba(220,38,38,0.12)',
    color: '#DC2626',
  },
  orderExpanded: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FAF3E8',
    gap: 8,
  },
  orderTimeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  orderTimelineStep: {
    alignItems: 'center',
    flex: 1,
  },
  orderTimelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EEE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  orderTimelineDotActive: {
    backgroundColor: MAROON,
  },
  orderTimelineIcon: {
    fontSize: 10,
  },
  orderTimelineLabel: {
    fontSize: 8,
    color: '#999',
  },
  orderTimelineLabelActive: {
    color: MAROON,
    fontWeight: '700',
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderItemName: {
    fontSize: 11,
    color: '#3E3125',
    flex: 1,
  },
  orderItemPrice: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3E3125',
  },
  cancelOrderBtn: {
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.3)',
    backgroundColor: 'rgba(220,38,38,0.05)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 6,
  },
  cancelOrderBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  genderChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5D7C3',
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
  },
  genderChipActive: {
    backgroundColor: MAROON,
    borderColor: MAROON,
  },
  genderChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5B4A32',
  },
  genderChipTextActive: {
    color: GOLD,
  },
  addNewAddrBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 12,
  },
  addNewAddrBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: MAROON,
  },
  addrActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: MAROON,
  },
  addrActionDelete: {
    color: '#DC2626',
  },
  cancelFormBtn: {
    backgroundColor: 'rgba(91, 31, 36, 0.07)',
  },
  cancelFormBtnText: {
    color: MAROON,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(200, 160, 68, 0.12)',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5B4A32',
    marginBottom: 6,
    marginTop: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  col: {
    flex: 1,
  },
  proceedBtn: {
    backgroundColor: MAROON,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  proceedText: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  savedCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5D7C3',
    padding: 14,
    gap: 12,
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  savedName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3E3125',
  },
  savedAddr: {
    fontSize: 11,
    color: '#8B7355',
    marginTop: 4,
    lineHeight: 15,
  },
});
