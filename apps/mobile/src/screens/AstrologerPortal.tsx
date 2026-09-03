import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Image, ActivityIndicator, Alert, Switch } from 'react-native';
import { MAROON, GOLD } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { useProducts } from '@nakshra/shared-hooks/useProducts';

type MainTab = 'overview' | 'workstation' | 'wallet' | 'reviews' | 'remedies' | 'profile';

const QUICK_RESPONSES = [
  'Namaste! How can I guide you today?',
  'Please share your date, time and place of birth.',
  'This is a temporary planetary influence — it will pass.',
  'I recommend a short remedy for this. One moment.',
];

const PLACEHOLDER_TEXT = 'Namaste! Astrologer will join your chat soon.';

interface ProfileForm {
  name: string;
  email: string;
  phone: string;
  title: string;
  experience: string;
  specialty: string;
  languages: string;
  bio: string;
  pricePerMin: string;
  avatar: string;
}

const EMPTY_PROFILE: ProfileForm = {
  name: '', email: '', phone: '', title: 'Vedic Jyotish Acharya', experience: '5',
  specialty: 'Vedic Kundali', languages: 'Hindi, English', bio: '', pricePerMin: '20',
  avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
};

export const AstrologerPortal: React.FC = () => {
  const { user, logout } = useAuth();
  const { products: hookRemedyProducts } = useProducts();
  const astroId = user?.id;

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profile, setProfile] = useState<ProfileForm>(EMPTY_PROFILE);
  const [showWizard, setShowWizard] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [workingHoursEnabled, setWorkingHoursEnabled] = useState(false);
  const [workingHoursStart, setWorkingHoursStart] = useState('09:00');
  const [workingHoursEnd, setWorkingHoursEnd] = useState('22:00');
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState<MainTab>('overview');

  const [sessions, setSessions] = useState<any[]>([]);
  const [seekerNames, setSeekerNames] = useState<Record<string, string>>({});
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimerRef = useRef<any>(null);

  const [financialStats, setFinancialStats] = useState({ todayEarnings: 0, monthlyEarnings: 0, lifetimeEarnings: 0, totalConsultations: 0, averageRating: 0 });
  const [dbTransactions, setDbTransactions] = useState<any[]>([]);
  const [dbReviews, setDbReviews] = useState<any[]>([]);
  const [dbRemedyProducts, setDbRemedyProducts] = useState<any[]>([]);

  const remedyProducts = dbRemedyProducts.length > 0 ? dbRemedyProducts : hookRemedyProducts;

  // ── Fetch & hydrate astrologer profile ──────────────────────────────
  useEffect(() => {
    if (!astroId) { setLoadingProfile(false); return; }
    (async () => {
      const { data } = await supabase.from('astrologers').select('*').eq('id', astroId).maybeSingle();
      if (data) {
        setProfile({
          name: data.full_name || data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          title: data.title || 'Vedic Jyotish Acharya',
          experience: String(data.experience_years || 5),
          specialty: Array.isArray(data.specialties) ? (data.specialties[0] || 'Vedic Kundali') : (data.specialties || 'Vedic Kundali'),
          languages: Array.isArray(data.languages) ? data.languages.join(', ') : (data.languages || 'Hindi, English'),
          bio: data.bio || '',
          pricePerMin: String(data.price_per_min || 20),
          avatar: data.avatar_url || EMPTY_PROFILE.avatar,
        });
        setIsOnline(!!data.is_online);
        if (data.working_hours) {
          setWorkingHoursEnabled(!!data.working_hours.enabled);
          setWorkingHoursStart(data.working_hours.start || '09:00');
          setWorkingHoursEnd(data.working_hours.end || '22:00');
        }
        const needsWizard = !data.bio || data.bio === 'PENDING_WIZARD_COMPLETION' || data.bio.trim() === '';
        setShowWizard(needsWizard);
      } else {
        setShowWizard(true);
      }
      setLoadingProfile(false);
    })();
  }, [astroId]);

  // ── Fetch wallet / reviews / remedies (and refresh alongside session polling) ────────
  const fetchDatabaseData = async () => {
    if (!astroId) return;
    try {
      const { data: txns } = await supabase.from('astrologer_transactions').select('*').eq('astrologer_id', astroId).order('created_at', { ascending: false });
      if (txns) {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        let today = 0, month = 0, lifetime = 0;
        txns.forEach((t: any) => {
          const amt = Number(t.amount) || 0;
          const created = new Date(t.created_at);
          lifetime += amt;
          if (created >= monthStart) month += amt;
          if (created >= todayStart) today += amt;
        });
        setDbTransactions(txns);
        setFinancialStats((prev) => ({ ...prev, todayEarnings: today, monthlyEarnings: month, lifetimeEarnings: lifetime, totalConsultations: txns.length }));
      }
    } catch (e) {}

    try {
      const { data: revs } = await supabase.from('astrologer_reviews').select('*').eq('astrologer_id', astroId).order('created_at', { ascending: false });
      if (revs && revs.length > 0) {
        setDbReviews(revs);
        const avg = revs.reduce((acc: number, r: any) => acc + (Number(r.rating) || 5), 0) / revs.length;
        setFinancialStats((prev) => ({ ...prev, averageRating: Math.round(avg * 100) / 100 }));
      }
    } catch (e) {}

    try {
      const { data: prods } = await supabase.from('products').select('*').limit(15);
      if (prods && prods.length > 0) {
        setDbRemedyProducts(prods.map((p: any) => ({ ...p, price: p.price / 100 })));
      }
    } catch (e) {}
  };

  const fetchSeekerNames = async (list: any[]) => {
    const userIds = Array.from(new Set(list.map((s) => s.user_id).filter(Boolean)));
    if (userIds.length === 0) return;
    try {
      const { data } = await supabase.from('users').select('id, full_name').in('id', userIds);
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((u: any) => { map[u.id] = u.full_name; });
        setSeekerNames((prev) => ({ ...prev, ...map }));
      }
    } catch (e) {}
  };

  const fetchSessions = async () => {
    if (!astroId) return;
    try {
      const { data } = await supabase.from('chat_sessions').select('*').eq('astrologer_id', astroId).order('created_at', { ascending: false });
      if (data) {
        const weight: Record<string, number> = { pending: 3, active: 2, completed: 1 };
        const sorted = [...data].sort((a, b) => {
          const w = (weight[b.status] || 0) - (weight[a.status] || 0);
          if (w !== 0) return w;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setSessions(sorted);
        fetchSeekerNames(sorted);
      }
    } catch (e) {}
  };

  // Session queue polling + realtime, matches web's 3s poll + postgres_changes subscription.
  useEffect(() => {
    if (!astroId) return;
    fetchSessions();
    fetchDatabaseData();

    const pollInterval = setInterval(() => { fetchSessions(); fetchDatabaseData(); }, 3000);

    const channel = supabase
      .channel(`incoming-requests-${astroId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_sessions', filter: `astrologer_id=eq.${astroId}` }, () => {
        fetchSessions();
        fetchDatabaseData();
      })
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [astroId]);

  const fetchMessages = async (sessionId: string) => {
    try {
      const { data } = await supabase.from('chat_messages').select('*').eq('session_id', sessionId).order('created_at', { ascending: true });
      if (data) {
        setMessages(
          data
            .filter((m: any) => (m.text || m.message_text) !== PLACEHOLDER_TEXT)
            .map((m: any) => ({
              id: m.id,
              sender: m.sender || m.sender_type,
              text: m.text || m.message_text,
              timestamp: new Date(m.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              recommendedProduct: m.recommended_product_slug ? remedyProducts.find((p: any) => p.slug === m.recommended_product_slug) : null,
            }))
        );
      }
    } catch (e) {}
  };

  // Active-session message polling + realtime insert + status sync + typing broadcast.
  useEffect(() => {
    if (!activeSession?.id) return;
    fetchMessages(activeSession.id);

    const msgInterval = setInterval(() => fetchMessages(activeSession.id), 2000);
    const statusInterval = setInterval(async () => {
      const { data } = await supabase.from('chat_sessions').select('status').eq('id', activeSession.id).maybeSingle();
      if (data && data.status !== activeSession.status) {
        setActiveSession((prev: any) => prev ? { ...prev, status: data.status } : null);
      }
    }, 2000);

    const messageChannel = supabase
      .channel(`live-session-${activeSession.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `session_id=eq.${activeSession.id}` }, () => {
        fetchMessages(activeSession.id);
      })
      .subscribe();

    const typingChannel = supabase
      .channel(`typing-${activeSession.id}`)
      .on('broadcast', { event: 'typing' }, (payload: any) => {
        if (payload.payload?.sender === 'user') {
          setIsTyping(true);
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
          typingTimerRef.current = setTimeout(() => setIsTyping(false), 3000);
        }
      })
      .subscribe();

    return () => {
      clearInterval(msgInterval);
      clearInterval(statusInterval);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(typingChannel);
    };
  }, [activeSession?.id]);

  // ── Online/offline toggle ────────────────────────────────────────────
  const toggleOnline = async (next: boolean) => {
    setIsOnline(next);
    if (!astroId) return;
    try {
      await supabase.from('astrologers').update({ is_online: next }).eq('id', astroId);
    } catch (e) {}
  };

  // ── Profile save (also completes the wizard) ─────────────────────────
  const saveProfile = async () => {
    if (!astroId) return;
    if (!profile.name.trim()) {
      Alert.alert('Missing name', 'Please enter your full name.');
      return;
    }
    setSaving(true);
    const bio = profile.bio.trim() || 'Certified Vedic Astrologer guiding seekers with sacred remedies, Kundali readings, and traditional wisdom.';
    const languagesList = profile.languages.split(',').map((s) => s.trim()).filter(Boolean);
    try {
      await supabase.from('astrologers').upsert({
        id: astroId,
        full_name: profile.name,
        email: profile.email || null,
        phone: profile.phone || null,
        title: profile.title,
        experience_years: parseInt(profile.experience) || 5,
        specialties: [profile.specialty, 'Vedic Kundali', 'Sacred Remedies'],
        languages: languagesList.length ? languagesList : ['Hindi', 'English'],
        bio,
        avatar_url: profile.avatar,
        price_per_min: parseFloat(profile.pricePerMin) || 20,
        is_online: isOnline,
        role: 'astrologer',
        working_hours: { enabled: workingHoursEnabled, start: workingHoursStart, end: workingHoursEnd },
      });
      setProfile((p) => ({ ...p, bio }));
      setShowWizard(false);
      setActiveTab('overview');
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (e: any) {
      Alert.alert('Failed to save', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Session actions ───────────────────────────────────────────────────
  const acceptSession = async (s: any) => {
    setActiveSession({ ...s, status: 'active' });
    setActiveTab('workstation');
    setSessions((prev) => prev.map((x) => x.id === s.id ? { ...x, status: 'active' } : x));
    try {
      await supabase.from('chat_sessions').update({ status: 'active', astrologer_id: astroId }).eq('id', s.id);
      await supabase.from('chat_messages').insert({ session_id: s.id, sender: 'astrologer', text: 'Astrologer is here to help you.' });
    } catch (e) {}
    fetchMessages(s.id);
  };

  const rejectSession = async (s: any) => {
    try {
      await supabase.from('chat_sessions').update({ status: 'declined' }).eq('id', s.id);
    } catch (e) {}
    setSessions((prev) => prev.filter((x) => x.id !== s.id));
    if (activeSession?.id === s.id) setActiveSession(null);
  };

  const endSession = async () => {
    if (!activeSession) return;
    const durationMins = Math.max(1, Math.round((Date.now() - new Date(activeSession.created_at).getTime()) / 60000));
    const ratePerMin = parseFloat(profile.pricePerMin) || 20;
    const totalAmount = durationMins * ratePerMin;
    const resolvedName = activeSession.user_name || seekerNames[activeSession.user_id] || 'Devotee';

    try {
      await supabase.channel(`typing-${activeSession.id}`).send({ type: 'broadcast', event: 'end-chat', payload: { sessionId: activeSession.id } });
    } catch (e) {}
    try {
      await supabase.from('chat_sessions').update({ status: 'completed', ended_at: new Date().toISOString() }).eq('id', activeSession.id);
    } catch (e) {}
    try {
      await supabase.from('astrologer_transactions').insert({
        astrologer_id: astroId,
        session_id: activeSession.id,
        user_name: resolvedName,
        session_type: 'Live Chat',
        duration_mins: durationMins,
        rate_per_min: ratePerMin,
        amount: totalAmount,
        status: 'Settled',
      });
    } catch (e) {}

    setSessions((prev) => prev.map((x) => x.id === activeSession.id ? { ...x, status: 'completed' } : x));
    setActiveSession(null);
    fetchDatabaseData();
  };

  // ── Messaging ──────────────────────────────────────────────────────────
  const handleReplyChange = (text: string) => {
    setReply(text);
    if (!activeSession?.id) return;
    try {
      supabase.channel(`typing-${activeSession.id}`).send({ type: 'broadcast', event: 'typing', payload: { sender: 'astrologer', timestamp: Date.now() } });
    } catch (e) {}
  };

  const sendMessage = async (customText?: string, productRemedy?: any) => {
    const messageText = customText || reply;
    if (!messageText.trim() && !productRemedy) return;
    if (!activeSession) return;

    const newMsg = {
      id: Date.now().toString(),
      sender: 'astrologer',
      text: messageText,
      recommendedProduct: productRemedy || null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, newMsg]);
    if (!customText) setReply('');

    try {
      await supabase.from('chat_messages').insert({
        session_id: activeSession.id,
        sender: 'astrologer',
        sender_type: 'astrologer',
        text: messageText,
        message_text: messageText,
        recommended_product_slug: productRemedy?.slug || null,
      });
    } catch (e) {}
  };

  const handleLogout = async () => {
    if (astroId) {
      try { await supabase.from('astrologers').update({ is_online: false }).eq('id', astroId); } catch (e) {}
    }
    try { await logout(); } catch (e) {}
  };

  const pendingCount = sessions.filter((s) => s.status === 'pending').length;

  if (loadingProfile) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={MAROON} />
      </View>
    );
  }

  // ── Wizard onboarding modal ──────────────────────────────────────────
  if (showWizard) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.wizardTitle}>Complete Your Scholar Profile</Text>
        <Text style={styles.wizardSub}>This is shown to seekers before they start a consultation with you.</Text>

        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} value={profile.name} onChangeText={(v) => setProfile((p) => ({ ...p, name: v }))} placeholderTextColor="#9a8c7a" />

        <Text style={styles.label}>Title</Text>
        <TextInput style={styles.input} value={profile.title} onChangeText={(v) => setProfile((p) => ({ ...p, title: v }))} placeholderTextColor="#9a8c7a" />

        <Text style={styles.label}>Primary Specialty</Text>
        <TextInput style={styles.input} value={profile.specialty} onChangeText={(v) => setProfile((p) => ({ ...p, specialty: v }))} placeholderTextColor="#9a8c7a" />

        <Text style={styles.label}>Experience (Years)</Text>
        <TextInput style={styles.input} value={profile.experience} onChangeText={(v) => setProfile((p) => ({ ...p, experience: v }))} keyboardType="number-pad" placeholderTextColor="#9a8c7a" />

        <Text style={styles.label}>Languages (comma separated)</Text>
        <TextInput style={styles.input} value={profile.languages} onChangeText={(v) => setProfile((p) => ({ ...p, languages: v }))} placeholderTextColor="#9a8c7a" />

        <Text style={styles.label}>Rate per Minute (₹)</Text>
        <TextInput style={styles.input} value={profile.pricePerMin} onChangeText={(v) => setProfile((p) => ({ ...p, pricePerMin: v }))} keyboardType="number-pad" placeholderTextColor="#9a8c7a" />

        <Text style={styles.label}>Your Bio</Text>
        <TextInput style={[styles.input, styles.textArea]} value={profile.bio} onChangeText={(v) => setProfile((p) => ({ ...p, bio: v }))} multiline numberOfLines={4} placeholder="Tell seekers about your background and expertise…" placeholderTextColor="#9a8c7a" />

        <TouchableOpacity style={styles.saveBtn} onPress={saveProfile} disabled={saving}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>COMPLETE PROFILE</Text>}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Active chat workstation ───────────────────────────────────────────
  if (activeSession) {
    const isEnded = activeSession.status === 'completed' || activeSession.status === 'ended' || activeSession.status === 'declined';
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setActiveSession(null)} style={styles.backBtn}>
            <Text style={styles.backText}>← Queue</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{activeSession.user_name || seekerNames[activeSession.user_id] || 'Devotee'}</Text>
            <Text style={styles.headerSub}>{activeSession.topic || 'Vedic Consultation'}</Text>
          </View>
          {!isEnded && (
            <TouchableOpacity style={styles.endChatBtn} onPress={() => Alert.alert('End Session', 'End this consultation?', [{ text: 'Cancel', style: 'cancel' }, { text: 'End', style: 'destructive', onPress: endSession }])}>
              <Text style={styles.endChatBtnText}>End</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.messageScroll}>
          {messages.map((m) => {
            const isAstro = m.sender === 'astrologer';
            return (
              <View key={m.id} style={[styles.msgRow, isAstro ? styles.astroRow : styles.seekerRow]}>
                <View style={[styles.bubble, isAstro ? styles.astroBubble : styles.seekerBubble]}>
                  <Text style={isAstro ? styles.astroText : styles.seekerText}>{m.text}</Text>
                  {m.recommendedProduct && (
                    <View style={styles.recItem}>
                      <Image source={{ uri: m.recommendedProduct.img }} style={styles.recImg} />
                      <Text style={styles.recName}>{m.recommendedProduct.name}</Text>
                    </View>
                  )}
                  <Text style={styles.time}>{m.timestamp}</Text>
                </View>
              </View>
            );
          })}
          {isTyping && (
            <View style={[styles.msgRow, styles.seekerRow]}>
              <View style={[styles.bubble, styles.seekerBubble]}>
                <Text style={styles.seekerText}>Devotee is typing…</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {!isEnded && (
          <>
            <View style={styles.quickRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {QUICK_RESPONSES.map((q, idx) => (
                  <TouchableOpacity key={idx} style={styles.quickChip} onPress={() => sendMessage(q)}>
                    <Text style={styles.quickChipText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.prescriptionTray}>
              <Text style={styles.trayTitle}>Prescribe Remedy:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {remedyProducts.slice(0, 6).map((p: any) => (
                  <TouchableOpacity key={p.id} style={styles.presBtn} onPress={() => sendMessage('I recommend wearing this sacred item to balance your planetary stars:', p)}>
                    <Text style={styles.presText}>💎 {p.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputRow}>
              <TextInput
                style={styles.chatInput}
                placeholder="Type your spiritual advice…"
                placeholderTextColor="#9a8c7a"
                value={reply}
                onChangeText={handleReplyChange}
              />
              <TouchableOpacity style={styles.sendBtn} onPress={() => sendMessage()}>
                <Text style={styles.sendText}>Send</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  }

  // ── Main dashboard (tabbed) ───────────────────────────────────────────
  return (
    <View style={styles.container}>
      <View style={styles.dashHeader}>
        <View>
          <Text style={styles.astroTitle}>Scholar Dashboard</Text>
          <Text style={styles.astroName}>{profile.name || 'Astrologer'}</Text>
        </View>
        <View style={styles.onlineToggleRow}>
          <Text style={styles.onlineToggleLabel}>{isOnline ? 'Online' : 'Offline'}</Text>
          <Switch value={isOnline} onValueChange={toggleOnline} trackColor={{ true: GOLD, false: '#555' }} thumbColor="#FFFFFF" />
        </View>
      </View>

      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {([
            { key: 'overview', label: 'Overview' },
            { key: 'workstation', label: `Queue${pendingCount ? ` (${pendingCount})` : ''}` },
            { key: 'wallet', label: 'Wallet' },
            { key: 'reviews', label: 'Reviews' },
            { key: 'remedies', label: 'Remedies' },
            { key: 'profile', label: 'Profile' },
          ] as { key: MainTab; label: string }[]).map((t) => (
            <TouchableOpacity key={t.key} style={[styles.tabChip, activeTab === t.key && styles.tabChipActive]} onPress={() => setActiveTab(t.key)}>
              <Text style={[styles.tabChipText, activeTab === t.key && styles.tabChipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {activeTab === 'overview' && (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>₹{financialStats.todayEarnings.toLocaleString('en-IN')}</Text>
                <Text style={styles.statLabel}>Today's Earnings</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{financialStats.totalConsultations}</Text>
                <Text style={styles.statLabel}>Total Consultations</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>₹{financialStats.monthlyEarnings.toLocaleString('en-IN')}</Text>
                <Text style={styles.statLabel}>This Month</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{financialStats.averageRating || '—'}</Text>
                <Text style={styles.statLabel}>Average Rating</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutBtnText}>🚪 Sign Out</Text>
            </TouchableOpacity>
          </>
        )}

        {activeTab === 'workstation' && (
          <>
            <Text style={styles.secTitle}>Consultation Queue</Text>
            {sessions.length === 0 && <Text style={styles.emptyText}>No consultation requests yet.</Text>}
            {sessions.map((s) => (
              <View key={s.id} style={styles.chatCard}>
                <View style={styles.chatInfo}>
                  <Text style={styles.chatSeeker}>{s.user_name || seekerNames[s.user_id] || 'Devotee'}</Text>
                  <Text style={styles.chatTopic}>{s.topic || 'Vedic Consultation'} · {s.status}</Text>
                </View>
                <View style={styles.chatAction}>
                  {s.status === 'pending' ? (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity onPress={() => rejectSession(s)}><Text style={styles.declineBtnText}>Decline</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => acceptSession(s)}><Text style={styles.acceptBtnText}>Accept ›</Text></TouchableOpacity>
                    </View>
                  ) : s.status === 'active' ? (
                    <TouchableOpacity onPress={() => setActiveSession(s)}><Text style={styles.acceptBtnText}>Open ›</Text></TouchableOpacity>
                  ) : (
                    <Text style={styles.doneText}>{s.status}</Text>
                  )}
                </View>
              </View>
            ))}
          </>
        )}

        {activeTab === 'wallet' && (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>₹{financialStats.todayEarnings.toLocaleString('en-IN')}</Text>
                <Text style={styles.statLabel}>Today</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>₹{financialStats.monthlyEarnings.toLocaleString('en-IN')}</Text>
                <Text style={styles.statLabel}>This Month</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>₹{financialStats.lifetimeEarnings.toLocaleString('en-IN')}</Text>
                <Text style={styles.statLabel}>Lifetime</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.withdrawBtn}
              onPress={() => Alert.alert('Withdrawal Requested', `Withdrawal request for ₹${financialStats.todayEarnings || 0} initiated via UPI / Netbanking. Settlement within 24 hours.`)}
            >
              <Text style={styles.withdrawBtnText}>WITHDRAW PAYOUT</Text>
            </TouchableOpacity>

            <Text style={[styles.secTitle, { marginTop: 20 }]}>Transactions</Text>
            {dbTransactions.length === 0 && <Text style={styles.emptyText}>No transactions yet.</Text>}
            {dbTransactions.map((t) => (
              <View key={t.id} style={styles.txnRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txnName}>{t.user_name}</Text>
                  <Text style={styles.txnMeta}>{t.session_type} · {t.duration_mins} min</Text>
                </View>
                <Text style={styles.txnAmount}>₹{t.amount}</Text>
              </View>
            ))}
          </>
        )}

        {activeTab === 'reviews' && (
          <>
            <Text style={styles.secTitle}>Ratings & Reviews {financialStats.averageRating ? `(★ ${financialStats.averageRating})` : ''}</Text>
            {dbReviews.length === 0 && <Text style={styles.emptyText}>No reviews yet.</Text>}
            {dbReviews.map((r) => (
              <View key={r.id} style={styles.reviewCard}>
                <Text style={styles.reviewName}>{r.user_name || 'Seeker'} · {'★'.repeat(Math.round(r.rating || 5))}</Text>
                <Text style={styles.reviewText}>{r.text}</Text>
              </View>
            ))}
          </>
        )}

        {activeTab === 'remedies' && (
          <>
            <Text style={styles.secTitle}>Remedies Catalog</Text>
            <View style={styles.remedyGrid}>
              {remedyProducts.slice(0, 15).map((p: any) => (
                <View key={p.id} style={styles.remedyCard}>
                  <Image source={{ uri: p.img }} style={styles.remedyImg} />
                  <Text style={styles.remedyName} numberOfLines={2}>{p.name}</Text>
                  <Text style={styles.remedyPrice}>₹{Math.round(p.price)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {activeTab === 'profile' && (
          <>
            <Text style={styles.label}>Full Name</Text>
            <TextInput style={styles.input} value={profile.name} onChangeText={(v) => setProfile((p) => ({ ...p, name: v }))} placeholderTextColor="#9a8c7a" />
            <Text style={styles.label}>Title</Text>
            <TextInput style={styles.input} value={profile.title} onChangeText={(v) => setProfile((p) => ({ ...p, title: v }))} placeholderTextColor="#9a8c7a" />
            <Text style={styles.label}>Rate per Minute (₹)</Text>
            <TextInput style={styles.input} value={profile.pricePerMin} onChangeText={(v) => setProfile((p) => ({ ...p, pricePerMin: v }))} keyboardType="number-pad" placeholderTextColor="#9a8c7a" />
            <Text style={styles.label}>Experience (Years)</Text>
            <TextInput style={styles.input} value={profile.experience} onChangeText={(v) => setProfile((p) => ({ ...p, experience: v }))} keyboardType="number-pad" placeholderTextColor="#9a8c7a" />
            <Text style={styles.label}>Bio</Text>
            <TextInput style={[styles.input, styles.textArea]} value={profile.bio} onChangeText={(v) => setProfile((p) => ({ ...p, bio: v }))} multiline numberOfLines={4} placeholderTextColor="#9a8c7a" />

            <Text style={[styles.label, { marginTop: 16 }]}>Working Hours</Text>
            <View style={styles.workingHoursRow}>
              <Text style={styles.workingHoursLabel}>Restrict to set hours</Text>
              <Switch value={workingHoursEnabled} onValueChange={setWorkingHoursEnabled} trackColor={{ true: GOLD, false: '#ccc' }} />
            </View>
            {workingHoursEnabled && (
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.label}>Start (HH:MM)</Text>
                  <TextInput style={styles.input} value={workingHoursStart} onChangeText={setWorkingHoursStart} placeholder="09:00" placeholderTextColor="#9a8c7a" />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>End (HH:MM)</Text>
                  <TextInput style={styles.input} value={workingHoursEnd} onChangeText={setWorkingHoursEnd} placeholder="22:00" placeholderTextColor="#9a8c7a" />
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.saveBtn} onPress={saveProfile} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>SAVE PROFILE CHANGES</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutBtnText}>🚪 Sign Out</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FCFAF7' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FCFAF7' },
  header: {
    height: 56, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#FAF3E8', gap: 12,
  },
  backBtn: { paddingVertical: 6 },
  backText: { fontSize: 12, fontWeight: '700', color: MAROON },
  headerTitle: { fontSize: 13, fontWeight: '800', color: '#3E3125' },
  headerSub: { fontSize: 9, color: '#8B7355', fontWeight: '600', marginTop: 2 },
  endChatBtn: { borderWidth: 1, borderColor: 'rgba(220,38,38,0.3)', backgroundColor: 'rgba(220,38,38,0.05)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  endChatBtnText: { fontSize: 10, fontWeight: '700', color: '#DC2626' },
  dashHeader: {
    backgroundColor: MAROON, paddingVertical: 20, paddingHorizontal: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  astroTitle: { fontSize: 10, fontWeight: '800', color: GOLD, letterSpacing: 1 },
  astroName: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', marginTop: 4 },
  onlineToggleRow: { alignItems: 'center', gap: 4 },
  onlineToggleLabel: { fontSize: 9, fontWeight: '800', color: '#FFFFFF' },
  tabBar: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#FAF3E8', paddingVertical: 8, paddingHorizontal: 12 },
  tabChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: '#FAF8F5', marginHorizontal: 4, borderWidth: 1, borderColor: '#E5D7C3' },
  tabChipActive: { backgroundColor: MAROON, borderColor: MAROON },
  tabChipText: { fontSize: 11, fontWeight: '700', color: '#5B4A32' },
  tabChipTextActive: { color: GOLD },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(200, 160, 68, 0.12)' },
  statVal: { fontSize: 16, fontWeight: '800', color: MAROON },
  statLabel: { fontSize: 9, color: '#8B7355', fontWeight: '700', marginTop: 4, textAlign: 'center' },
  secTitle: { fontSize: 13, fontWeight: '800', color: '#3E3125', marginBottom: 12 },
  emptyText: { fontSize: 11, color: '#8B7355', textAlign: 'center', marginTop: 10 },
  chatCard: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: 'rgba(200, 160, 68, 0.12)', marginBottom: 10, alignItems: 'center', justifyContent: 'space-between',
  },
  chatInfo: { gap: 4, flex: 1 },
  chatSeeker: { fontSize: 13, fontWeight: '800', color: '#3E3125' },
  chatTopic: { fontSize: 10, color: '#8B7355' },
  chatAction: { alignItems: 'flex-end', gap: 6 },
  acceptBtnText: { fontSize: 11, fontWeight: '800', color: MAROON },
  declineBtnText: { fontSize: 11, fontWeight: '800', color: '#DC2626' },
  doneText: { fontSize: 10, fontWeight: '700', color: '#8B7355', textTransform: 'uppercase' },
  messageScroll: { flex: 1, padding: 16 },
  msgRow: { flexDirection: 'row', marginBottom: 12 },
  astroRow: { justifyContent: 'flex-end' },
  seekerRow: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
  astroBubble: { backgroundColor: MAROON, borderBottomRightRadius: 4 },
  seekerBubble: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#FAF3E8', borderBottomLeftRadius: 4 },
  astroText: { color: '#FFFFFF', fontSize: 12 },
  seekerText: { color: '#3E3125', fontSize: 12 },
  time: { fontSize: 8, color: 'rgba(0,0,0,0.3)', alignSelf: 'flex-end', marginTop: 4 },
  quickRow: { paddingVertical: 8, paddingLeft: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#FAF3E8' },
  quickChip: { backgroundColor: '#FAF8F5', borderWidth: 1, borderColor: '#E5D7C3', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, maxWidth: 220 },
  quickChipText: { fontSize: 10, fontWeight: '600', color: '#5B4A32' },
  prescriptionTray: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#FAF3E8', padding: 12 },
  trayTitle: { fontSize: 10, fontWeight: '800', color: '#8B7355', marginBottom: 8 },
  presBtn: { backgroundColor: '#FAF8F5', borderWidth: 1, borderColor: '#E5D7C3', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 },
  presText: { fontSize: 10, fontWeight: '700', color: '#5B4A32' },
  inputRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#FAF3E8', gap: 10 },
  chatInput: { flex: 1, height: 40, backgroundColor: '#FAF8F5', borderRadius: 20, borderWidth: 1, borderColor: '#E5D7C3', paddingHorizontal: 16, fontSize: 12 },
  sendBtn: { backgroundColor: MAROON, paddingHorizontal: 16, borderRadius: 20, justifyContent: 'center' },
  sendText: { color: GOLD, fontSize: 11, fontWeight: '800' },
  recItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 6, marginTop: 6, gap: 8 },
  recImg: { width: 24, height: 24, borderRadius: 4 },
  recName: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  withdrawBtn: { backgroundColor: MAROON, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  withdrawBtnText: { color: GOLD, fontSize: 12, fontWeight: '800' },
  txnRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(200,160,68,0.1)', marginBottom: 8, alignItems: 'center' },
  txnName: { fontSize: 12, fontWeight: '700', color: '#3E3125' },
  txnMeta: { fontSize: 10, color: '#8B7355', marginTop: 2 },
  txnAmount: { fontSize: 13, fontWeight: '800', color: MAROON },
  reviewCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(200,160,68,0.12)', marginBottom: 10 },
  reviewName: { fontSize: 12, fontWeight: '800', color: MAROON },
  reviewText: { fontSize: 11, color: '#5B4A32', marginTop: 6, lineHeight: 16 },
  remedyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  remedyCard: { width: '31%', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 8, borderWidth: 1, borderColor: 'rgba(200,160,68,0.12)' },
  remedyImg: { width: '100%', aspectRatio: 1, borderRadius: 8, marginBottom: 6 },
  remedyName: { fontSize: 9, fontWeight: '700', color: '#3E3125' },
  remedyPrice: { fontSize: 10, fontWeight: '800', color: MAROON, marginTop: 2 },
  logoutBtn: { marginTop: 20, alignItems: 'center', paddingVertical: 14, borderRadius: 22, backgroundColor: 'rgba(91,31,36,0.06)' },
  logoutBtnText: { fontSize: 12, fontWeight: '800', color: MAROON },
  wizardTitle: { fontSize: 20, fontWeight: '800', color: MAROON, marginBottom: 6 },
  wizardSub: { fontSize: 12, color: '#8B7355', marginBottom: 20, lineHeight: 17 },
  label: { fontSize: 11, fontWeight: '700', color: '#5B4A32', marginBottom: 6, marginTop: 10 },
  input: { height: 42, borderWidth: 1, borderColor: '#E5D7C3', borderRadius: 12, paddingHorizontal: 14, fontSize: 13, color: '#3E3125', backgroundColor: '#FAF8F5' },
  textArea: { height: 90, paddingTop: 10, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  workingHoursRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5D7C3' },
  workingHoursLabel: { fontSize: 12, fontWeight: '700', color: '#3E3125' },
  saveBtn: { backgroundColor: MAROON, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  saveBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
});
