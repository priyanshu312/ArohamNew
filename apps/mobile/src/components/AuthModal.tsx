import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, ScrollView, SafeAreaView,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { MAROON, GOLD } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '@nakshra/shared-services';
import { api } from '@nakshra/shared-api';
import { generateUUID } from '@nakshra/shared-utils/uuid';
import { safeLocalStorage, safeSessionStorage } from '@nakshra/shared-utils/storage';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  initialRole?: 'user' | 'astrologer';
}

type AuthStep = 'signin' | 'signup' | 'otp' | 'profile-setup';

const RESEND_SECONDS = 30;
const ASTRO_SPECIALTIES = ['Vedic Kundali', 'Astro-Gemology', 'Vastu Shastra', 'Rudraksha Remedy', 'Numerology'];

export const AuthModal: React.FC<AuthModalProps> = ({
  visible,
  onClose,
  initialRole = 'user'
}) => {
  const { login } = useAuth();

  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [isAstrologerMode, setIsAstrologerMode] = useState(initialRole === 'astrologer');
  const [step, setStep] = useState<AuthStep>('signin');

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  const [astroSpecialty, setAstroSpecialty] = useState('Vedic Kundali');
  const [astroExperience, setAstroExperience] = useState('5');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Resend OTP cooldown — matches web's 30s countdown before "Resend OTP" becomes active.
  const [canResend, setCanResend] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(RESEND_SECONDS);

  // Shown when AuthContext's background watcher force-logs-out a blocked/deleted account
  // (writes this key to session storage before redirecting here) — same banner web shows.
  const [authNotice, setAuthNotice] = useState(() => {
    try {
      return safeSessionStorage.getItem('Nakshra_auth_notice') || '';
    } catch (e) {
      return '';
    }
  });

  useEffect(() => {
    if (step !== 'otp') return;
    setCanResend(false);
    setResendSeconds(RESEND_SECONDS);
    const interval = setInterval(() => {
      setResendSeconds((s) => {
        if (s <= 1) {
          setCanResend(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  const switchTab = (tab: 'signin' | 'signup') => {
    setActiveTab(tab);
    setStep(tab);
    setErrorMsg('');
    setOtp('');
  };

  const dismissAuthNotice = () => {
    setAuthNotice('');
    safeSessionStorage.removeItem('Nakshra_auth_notice');
  };

  // Backend lookup first (service-role key, bypasses RLS), Supabase fallback — same dual-path
  // web's AuthPage.tsx uses, so mobile sees the same account state the website would.
  const lookupExistingUser = async (cleanPhone: string, last10: string) => {
    try {
      const apiRes: any = await api(`/auth/email-by-phone?phone=${cleanPhone}`).catch(() => null);
      if (apiRes && (apiRes.id || apiRes.fullName || apiRes.email)) {
        return {
          id: apiRes.id,
          fullName: apiRes.fullName || 'Devotee',
          email: apiRes.email,
          phone: apiRes.phone || cleanPhone,
          status: apiRes.status || 'ACTIVE',
        };
      }
    } catch (e) {}

    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .or(`phone.eq.${last10},phone.eq.+91${last10},phone.eq.91${last10},phone.ilike.%${last10}`)
        .limit(1);
      const userObj = data && data.length > 0 ? data[0] : null;
      if (userObj && (userObj.full_name || userObj.fullName || userObj.id)) {
        return {
          id: userObj.id,
          fullName: userObj.full_name || userObj.fullName || 'Devotee',
          email: userObj.email,
          phone: userObj.phone || cleanPhone,
          status: userObj.status || 'ACTIVE',
        };
      }
    } catch (e) {}

    return null;
  };

  // Calls the backend signup endpoint so a real Supabase Auth identity gets created (the
  // synthesized-email/password user the backend's requireAuth middleware expects) — without
  // this, every backend-authenticated route (cart, orders, addresses) fails for this account.
  const createUserAccount = async (cleanPhone: string, fullName: string) => {
    let finalUserId = generateUUID();
    try {
      const signupRes: any = await api('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ phone: cleanPhone, fullName, email: email.trim() || undefined }),
      }).catch(() => null);
      if (signupRes?.user?.id) finalUserId = signupRes.user.id;
    } catch (e) {}

    const userProfile = { id: finalUserId, fullName, email: email.trim() || null, phone: cleanPhone };
    safeLocalStorage.setItem(`Nakshra_registered_user_phone_${cleanPhone}`, JSON.stringify(userProfile));

    try {
      await supabase.from('users').upsert({
        id: finalUserId,
        full_name: fullName,
        email: email.trim() || null,
        phone: cleanPhone,
      });
    } catch (e) {}

    return finalUserId;
  };

  const createAstrologerAccount = async (cleanPhone: string) => {
    const astroId = generateUUID();
    const astroFullName = name.trim() || 'Acharya ' + (cleanPhone.slice(-4) || 'Ji');
    const newAstro = {
      id: astroId,
      full_name: astroFullName,
      email: email.trim() || null,
      phone: cleanPhone,
      title: `Vedic Jyotish & ${astroSpecialty} Specialist`,
      experience_years: parseInt(astroExperience) || 5,
      specialties: [astroSpecialty, 'Vedic Kundali', 'Sacred Remedies'],
      languages: ['Hindi', 'English'],
      rating: 5.0,
      is_online: true,
      avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
      price_per_min: 20,
      role: 'astrologer',
    };

    try {
      await supabase.from('astrologers').upsert(newAstro);
    } catch (e) {}

    setLoading(false);
    login({
      id: astroId,
      email: email.trim() || null,
      user_metadata: { full_name: astroFullName, phone: cleanPhone, role: 'astrologer' },
      role: 'astrologer',
    });
    onClose();
  };

  const handleSendOtp = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (activeTab === 'signup' && !isAstrologerMode && !name.trim()) {
      setErrorMsg('Please enter your full name to create an account.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const last10 = cleanPhone.slice(-10);

    if (isAstrologerMode) {
      try {
        const { data } = await supabase
          .from('astrologers')
          .select('status')
          .or(`phone.eq.${last10},phone.eq.+91${last10},phone.eq.91${last10},phone.ilike.%${last10}`)
          .limit(1);

        const astroObj = data && data.length > 0 ? data[0] : null;
        if (astroObj && String(astroObj.status).toUpperCase() === 'BLOCKED') {
          setLoading(false);
          setErrorMsg("Sorry, you are blocked. Can't login.");
          return;
        }
      } catch (e) {}

      setTimeout(() => {
        setLoading(false);
        setStep('otp');
      }, 400);
      return;
    }

    // Normal user mode
    const existingUser = await lookupExistingUser(cleanPhone, last10);

    if (existingUser) {
      safeLocalStorage.setItem(`Nakshra_registered_user_phone_${last10}`, JSON.stringify(existingUser));
      safeLocalStorage.setItem(`Nakshra_registered_user_phone_${cleanPhone}`, JSON.stringify(existingUser));
    } else {
      safeLocalStorage.removeItem(`Nakshra_registered_user_phone_${last10}`);
      safeLocalStorage.removeItem(`Nakshra_registered_user_phone_${cleanPhone}`);
    }

    if (existingUser && String(existingUser.status).toUpperCase() === 'BLOCKED') {
      setLoading(false);
      setErrorMsg("Sorry, you are blocked. Can't login.");
      return;
    }

    if (activeTab === 'signin' && !existingUser) {
      setLoading(false);
      setActiveTab('signup');
      setStep('signup');
      setErrorMsg('Mobile number not registered. Please enter your name to create an account.');
      return;
    }

    setTimeout(() => {
      setLoading(false);
      setStep('otp');
    }, 400);
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) {
      setErrorMsg('Please enter the full 6-digit OTP code.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    setTimeout(async () => {
      if (otp !== '111111' && otp !== '123456') {
        setLoading(false);
        setErrorMsg('Invalid OTP code. Use code 111111.');
        return;
      }

      const cleanPhone = phone.replace(/\D/g, '');
      const last10 = cleanPhone.slice(-10);

      try {
        if (isAstrologerMode) {
          const { data } = await supabase
            .from('astrologers')
            .select('*')
            .or(`phone.eq.${last10},phone.eq.+91${last10},phone.eq.91${last10},phone.ilike.%${last10}`)
            .limit(1);

          const astroData = data && data.length > 0 ? data[0] : null;

          if (astroData && String(astroData.status).toUpperCase() === 'BLOCKED') {
            setLoading(false);
            setErrorMsg("Sorry, you are blocked. Can't login.");
            return;
          }

          if (astroData && astroData.id) {
            const astroProfile = {
              id: astroData.id,
              name: astroData.full_name || astroData.name || 'Acharya Astrologer',
              title: astroData.title || 'Senior Vedic Jyotish Master',
              experience: `${astroData.experience_years || 5}+ Years Exp`,
              rating: Number(astroData.rating) || 5.0,
              consultations: astroData.consultations_count || 0,
              specialties: astroData.specialties || ['Vedic Kundali'],
              languages: astroData.languages || ['Hindi', 'English'],
              avatar: astroData.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
              status: astroData.is_online ? 'online' : 'offline',
              pricePerMin: Number(astroData.price_per_min) || 20,
              bio: astroData.bio || '',
            };

            setLoading(false);
            login({
              id: astroData.id,
              email: astroData.email || null,
              user_metadata: { full_name: astroProfile.name, phone: cleanPhone, role: 'astrologer' },
              role: 'astrologer',
              astrologerProfile: astroProfile,
            });
            onClose();
            return;
          }

          await createAstrologerAccount(cleanPhone);
          return;
        }

        // Normal user mode — same backend-first lookup as handleSendOtp
        const existingUser = await lookupExistingUser(cleanPhone, last10);

        if (existingUser) {
          if (String(existingUser.status).toUpperCase() === 'BLOCKED') {
            setLoading(false);
            setErrorMsg("Sorry, you are blocked. Can't login.");
            return;
          }
          setLoading(false);
          login({
            id: existingUser.id,
            email: existingUser.email,
            user_metadata: { full_name: existingUser.fullName, phone: cleanPhone },
          });
          onClose();
          return;
        }

        if (name.trim()) {
          const finalUserId = await createUserAccount(cleanPhone, name.trim());
          setLoading(false);
          login({
            id: finalUserId,
            email: email.trim() || null,
            user_metadata: { full_name: name.trim(), phone: cleanPhone },
          });
          onClose();
        } else {
          // Edge case: OTP verified but no existing account and no name captured yet
          // (mirrors web falling through to its profile-setup step).
          setLoading(false);
          setStep('profile-setup');
        }
      } catch (err) {
        setLoading(false);
        setErrorMsg('Authentication failed. Please try again.');
      }
    }, 600);
  };

  const handleCompleteProfile = async () => {
    if (!name.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    setLoading(true);
    setErrorMsg('');

    const cleanPhone = phone.replace(/\D/g, '');

    try {
      if (isAstrologerMode) {
        await createAstrologerAccount(cleanPhone);
        return;
      }
      const finalUserId = await createUserAccount(cleanPhone, name.trim());
      setLoading(false);
      login({
        id: finalUserId,
        email: email.trim() || null,
        user_metadata: { full_name: name.trim(), phone: cleanPhone },
      });
      onClose();
    } catch (e) {
      setLoading(false);
      setErrorMsg('Failed to complete profile.');
    }
  };

  const astroFieldsJsx = (
    <>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Primary Specialty</Text>
        <View style={styles.chipRow}>
          {ASTRO_SPECIALTIES.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, astroSpecialty === s && styles.chipActive]}
              onPress={() => setAstroSpecialty(s)}
            >
              <Text style={[styles.chipText, astroSpecialty === s && styles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Experience (Years)</Text>
        <TextInput
          style={styles.input}
          placeholder="5"
          placeholderTextColor="#8B7355"
          keyboardType="number-pad"
          value={astroExperience}
          onChangeText={setAstroExperience}
        />
      </View>
    </>
  );

  const screenTitle = isAstrologerMode
    ? (activeTab === 'signin' ? 'Astrologer Sign In' : 'Register as Astrologer')
    : (activeTab === 'signin' ? 'Welcome Back' : 'Create Account');

  const screenSub = isAstrologerMode
    ? (activeTab === 'signin' ? 'Access your live consultation workstation' : 'Register your profile as a certified Vedic Astrologer')
    : (activeTab === 'signin' ? 'Enter your mobile number to sign in to your account' : 'Enter your full name and mobile number to get started');

  return (
    <Modal visible={visible} animationType="none" onRequestClose={onClose} presentationStyle="fullScreen">
      <SafeAreaView style={styles.screen}>
        {/* Full-screen top bar — brand mark on the left, skip on the right */}
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <View style={styles.brandLogoDisc}>
              <Text style={styles.brandLogoOm}>ॐ</Text>
            </View>
            <Text style={styles.brandName}>Nakshra</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Skip</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scrollBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {step !== 'otp' && step !== 'profile-setup' && (
              <View style={styles.heroWrap}>
                <View style={styles.heroLogoDisc}>
                  <Text style={styles.heroLogoOm}>ॐ</Text>
                </View>
                {isAstrologerMode && (
                  <View style={styles.astroBadge}>
                    <Text style={styles.astroBadgeText}>✨ Certified Astrologer Portal</Text>
                  </View>
                )}
                <Text style={styles.heroTitle}>{screenTitle}</Text>
                <Text style={styles.heroSub}>{screenSub}</Text>
              </View>
            )}

            {step !== 'profile-setup' && (
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'signin' && styles.activeTab]}
                  onPress={() => switchTab('signin')}
                >
                  <Text style={[styles.tabText, activeTab === 'signin' && styles.activeTabText]}>
                    SIGN IN
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'signup' && styles.activeTab]}
                  onPress={() => switchTab('signup')}
                >
                  <Text style={[styles.tabText, activeTab === 'signup' && styles.activeTabText]}>
                    CREATE ACCOUNT
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'signin' && authNotice ? (
              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>🔒 {authNotice}</Text>
                <TouchableOpacity onPress={dismissAuthNotice} style={styles.noticeCloseBtn}>
                  <Text style={styles.noticeCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
              </View>
            ) : null}

            {step !== 'otp' && step !== 'profile-setup' && (
              <View style={styles.formGroup}>
                {activeTab === 'signup' && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>
                      {isAstrologerMode ? 'Astrologer Full Name' : 'Full Name *'}
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Rahul Sharma"
                      placeholderTextColor="#8B7355"
                      value={name}
                      onChangeText={setName}
                    />
                  </View>
                )}

                {activeTab === 'signup' && isAstrologerMode && astroFieldsJsx}

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Mobile Number *</Text>
                  <View style={styles.phoneInputRow}>
                    <View style={styles.flagPrefix}>
                      <Text style={styles.flagText}>🇮🇳 +91</Text>
                    </View>
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="10-digit mobile number"
                      placeholderTextColor="#8B7355"
                      keyboardType="number-pad"
                      maxLength={10}
                      value={phone}
                      onChangeText={(t) => setPhone(t.replace(/\D/g, ''))}
                    />
                  </View>
                </View>

                {activeTab === 'signup' && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Email (Optional)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="name@example.com"
                      placeholderTextColor="#8B7355"
                      keyboardType="email-address"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>
                )}

                <Text style={styles.termsText}>
                  By continuing, you agree to Nakshra's Terms of Service and Privacy Policy
                </Text>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleSendOtp}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={GOLD} />
                  ) : (
                    <Text style={styles.actionBtnText}>
                      {isAstrologerMode
                        ? (activeTab === 'signin' ? 'SIGN IN TO ASTROLOGER PORTAL' : 'CREATE ASTROLOGER ACCOUNT')
                        : (activeTab === 'signin' ? 'SIGN IN WITH OTP' : 'GET OTP & CREATE ACCOUNT')}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modeBtn}
                  onPress={() => setIsAstrologerMode(!isAstrologerMode)}
                >
                  <Text style={styles.modeBtnText}>
                    {isAstrologerMode ? '← Looking for Devotee Login? Tap here' : '✨ Are you a Certified Astrologer? Tap here'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'otp' && (
              <View style={styles.formGroup}>
                <View style={styles.stepIconWrap}>
                  <Text style={styles.stepIconText}>🔒</Text>
                </View>
                <Text style={styles.otpHeaderTitle}>Verify Your Number</Text>
                <Text style={styles.otpSub}>Sent via SMS to +91 {phone}</Text>
                <Text style={styles.testOtpBadge}>Test Code: 111111</Text>

                <TextInput
                  style={styles.otpInput}
                  placeholder="111111"
                  placeholderTextColor="#8B7355"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                />

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleVerifyOtp}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={GOLD} />
                  ) : (
                    <Text style={styles.actionBtnText}>VERIFY & CONTINUE</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.resendRow}>
                  {canResend ? (
                    <TouchableOpacity onPress={() => { setCanResend(false); handleSendOtp(); }}>
                      <Text style={styles.resendActiveText}>Resend OTP →</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.resendText}>Resend code in {resendSeconds}s</Text>
                  )}
                </View>

                <TouchableOpacity onPress={() => setStep(activeTab)} style={styles.backBtn}>
                  <Text style={styles.backBtnText}>← Edit Mobile Number</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'profile-setup' && (
              <View style={styles.formGroup}>
                <View style={styles.stepIconWrap}>
                  <Text style={styles.stepIconText}>👤</Text>
                </View>
                <Text style={styles.otpHeaderTitle}>Complete Your Profile</Text>
                <Text style={styles.otpSub}>Help us personalize your cosmic journey</Text>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>
                    {isAstrologerMode ? 'Astrologer Full Name' : 'Full Name *'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Rahul Sharma"
                    placeholderTextColor="#8B7355"
                    value={name}
                    onChangeText={setName}
                  />
                </View>

                {isAstrologerMode && astroFieldsJsx}

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="name@example.com"
                    placeholderTextColor="#8B7355"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleCompleteProfile}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={GOLD} />
                  ) : (
                    <Text style={styles.actionBtnText}>COMPLETE PROFILE</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FCFAF7',
  },
  topBar: {
    height: 56,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#FAF3E8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandLogoDisc: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogoOm: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A0D0E',
  },
  brandName: {
    fontSize: 17,
    fontWeight: '800',
    color: MAROON,
  },
  closeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  closeText: {
    fontSize: 13,
    color: MAROON,
    fontWeight: '800',
  },
  scrollBody: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  heroWrap: {
    alignItems: 'center',
    marginBottom: 8,
  },
  heroLogoDisc: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: MAROON,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: 'rgba(200, 160, 68, 0.3)',
  },
  heroLogoOm: {
    fontSize: 36,
    fontWeight: '800',
    color: GOLD,
  },
  astroBadge: {
    backgroundColor: 'rgba(200, 160, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(200, 160, 68, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 10,
  },
  astroBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: MAROON,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: MAROON,
    textAlign: 'center',
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 12,
    color: '#7A6A58',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  termsText: {
    fontSize: 11,
    color: '#7A6A58',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 8,
  },
  stepIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: MAROON,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 4,
  },
  stepIconText: {
    fontSize: 28,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(91, 31, 36, 0.06)',
    borderRadius: 14,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: MAROON,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8B7355',
  },
  activeTabText: {
    color: GOLD,
  },
  modeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(200, 160, 68, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: MAROON,
  },
  noticeBox: {
    backgroundColor: 'rgba(217, 164, 6, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(217, 164, 6, 0.3)',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: MAROON,
  },
  noticeCloseBtn: {
    padding: 2,
  },
  noticeCloseText: {
    fontSize: 13,
    color: MAROON,
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: '#FDE8E8',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F8B4B4',
  },
  errorText: {
    fontSize: 11,
    color: '#991B1B',
    fontWeight: '600',
  },
  formGroup: {
    gap: 12,
  },
  inputContainer: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: MAROON,
    textTransform: 'uppercase',
  },
  input: {
    height: 42,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5D7C3',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 13,
    color: '#3E3125',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5D7C3',
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    backgroundColor: MAROON,
    borderColor: MAROON,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B7355',
  },
  chipTextActive: {
    color: GOLD,
  },
  phoneInputRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5D7C3',
    borderRadius: 12,
    overflow: 'hidden',
  },
  flagPrefix: {
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5D7C3',
  },
  flagText: {
    fontSize: 12,
    fontWeight: '700',
    color: MAROON,
  },
  phoneInput: {
    flex: 1,
    height: 42,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#3E3125',
  },
  actionBtn: {
    backgroundColor: MAROON,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  actionBtnText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  otpHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: MAROON,
    textAlign: 'center',
  },
  otpSub: {
    fontSize: 12,
    color: '#8B7355',
    textAlign: 'center',
  },
  testOtpBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D32',
    textAlign: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 4,
    borderRadius: 8,
  },
  otpInput: {
    height: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: MAROON,
    borderRadius: 14,
    fontSize: 22,
    fontWeight: '800',
    color: MAROON,
    textAlign: 'center',
    letterSpacing: 8,
  },
  resendRow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  resendText: {
    fontSize: 12,
    color: '#8B7355',
    fontWeight: '600',
  },
  resendActiveText: {
    fontSize: 13,
    color: MAROON,
    fontWeight: '800',
  },
  backBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  backBtnText: {
    fontSize: 11,
    color: '#8B7355',
    fontWeight: '700',
  },
});
