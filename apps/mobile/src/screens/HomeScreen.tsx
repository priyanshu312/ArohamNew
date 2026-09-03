import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, Dimensions, ActivityIndicator, FlatList, TextInput, Alert
} from 'react-native';
import { MAROON, GOLD, IVORY, SPACE_BLACK, BORDER_COLOR, CARD_BG } from '../constants/theme';
import { NakshraProduct, ActiveTab } from '../types';
import { useProducts } from '@nakshra/shared-hooks/useProducts';
import { DEFAULT_PRODUCTS } from '@nakshra/shared-config/products';
import { COMMENTS_DATA } from '@nakshra/shared-config/data';
import { supabase } from '@nakshra/shared-services';
import { safeLocalStorage } from '@nakshra/shared-utils/storage';
import { Stars } from '../components/Stars';
import { ProductCard } from '../components/ProductCard';

const { width } = Dimensions.get('window');

// 20 mock coordinates for stars
const STAR_COORDS = [
  { x: 30, y: 50 }, { x: 280, y: 30 }, { x: 120, y: 90 }, { x: 220, y: 110 },
  { x: 70, y: 150 }, { x: 320, y: 140 }, { x: 190, y: 180 }, { x: 40, y: 220 },
  { x: 260, y: 240 }, { x: 110, y: 280 }, { x: 310, y: 310 }, { x: 160, y: 350 },
  { x: 80, y: 400 }, { x: 230, y: 430 }, { x: 290, y: 470 }, { x: 50, y: 510 },
  { x: 180, y: 540 }, { x: 130, y: 590 }, { x: 270, y: 620 }, { x: 90, y: 670 }
];

interface HomeScreenProps {
  setTab: (tab: ActiveTab, collection?: string) => void;
  onProductPress: (p: NakshraProduct) => void;
  onAddToCart?: (p: NakshraProduct) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ setTab, onProductPress, onAddToCart }) => {
  const { products, loading } = useProducts();
  const [carouselIndex, setCarouselIndex] = useState(1);

  // Newsletter signup state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterJoined, setNewsletterJoined] = useState(false);
  const [newsletterLoading, setNewsletterLoading] = useState(false);

  // Community reviews state
  const [customReviews, setCustomReviews] = useState<any[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      let cached: any[] = [];
      try {
        const cachedStr = safeLocalStorage.getItem('Nakshra_custom_reviews');
        if (cachedStr) cached = JSON.parse(cachedStr);
      } catch (e) {}

      try {
        const { data, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
        if (data && data.length > 0 && !error) {
          const combined = new Map<string, any>();
          cached.forEach((r) => combined.set(String(r.id || `${r.name}-${r.text}`), r));
          data.forEach((r: any) => {
            combined.set(String(r.id || `${r.name}-${r.text}`), {
              id: r.id,
              name: r.name,
              city: r.city || 'Verified Buyer',
              rating: r.rating || 5,
              text: r.text,
              product: r.product || 'Sacred Item',
              init: r.name ? r.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 'VB',
            });
          });
          const merged = Array.from(combined.values());
          setCustomReviews(merged);
          safeLocalStorage.setItem('Nakshra_custom_reviews', JSON.stringify(merged));
        } else if (cached.length > 0) {
          setCustomReviews(cached);
        }
      } catch (e) {
        if (cached.length > 0) setCustomReviews(cached);
      }
    })();
  }, []);

  const handleNewsletterSubmit = async () => {
    if (!newsletterEmail || !newsletterEmail.includes('@')) return;
    setNewsletterLoading(true);
    try {
      await supabase.from('subscribers').upsert({ email: newsletterEmail.trim(), created_at: new Date().toISOString() });
    } catch (e) {}
    setNewsletterJoined(true);
    setNewsletterLoading(false);
  };

  const handleSubmitReview = async () => {
    if (!reviewName.trim() || !reviewText.trim()) {
      Alert.alert('Missing details', 'Please enter your name and review text.');
      return;
    }
    setReviewSubmitting(true);
    const newRev = {
      id: Date.now(),
      name: reviewName.trim(),
      city: 'Verified Buyer',
      rating: reviewRating,
      text: reviewText.trim(),
      product: products[0]?.name || 'Sacred Product',
      init: reviewName.trim().split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2),
    };
    try {
      await supabase.from('reviews').insert({
        name: newRev.name,
        rating: newRev.rating,
        text: newRev.text,
        product: newRev.product,
        city: newRev.city,
        status: 'Approved',
        likes: 0,
      });
    } catch (e) {}
    const updated = [newRev, ...customReviews];
    setCustomReviews(updated);
    safeLocalStorage.setItem('Nakshra_custom_reviews', JSON.stringify(updated));
    setReviewSubmitting(false);
    setReviewSubmitted(true);
  };

  const allReviews = [...customReviews, ...COMMENTS_DATA];

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={styles.loaderText}>Loading sacred offerings…</Text>
      </View>
    );
  }

  // Dynamic 3D Carousel Data from live loaded sacred products
  const carouselItems = (products && products.length >= 3 ? products.slice(0, 3) : DEFAULT_PRODUCTS.slice(0, 3)).map(p => ({
    id: p.id,
    name: p.name,
    desc: p.subtitle || p.shortDesc || 'Authentic & Temple Energized',
    img: p.img,
    product: p
  }));

  const consecrationCards = [
    { id: 4, title: 'PYRITE SUN RING', desc: 'Consecrated through 108 mantra rounds', tags: ['Certificate', 'Vedic Pandit'] },
    { id: 2, title: 'NEPAL 1 MUKHI', desc: 'Siddha sanctified on Pradosham tithi', tags: ['Lab Certified', 'Nepali Bead'] }
  ];

  // Matches web's ProductsAndCombos.tsx shelf set exactly (title, sub-eyebrow, emoji title, sorted products).
  const shelves: { title: string; sub: string; emoji: string; items: NakshraProduct[] }[] = [
    { title: 'Bestselling Products', sub: 'TOP PICKS', emoji: '🔥', items: products.slice(0, 10) },
    { title: 'Fav Items', sub: 'FAN FAVOURITES', emoji: '❤️', items: [...products].reverse().slice(0, 10) },
    { title: 'Combo Deals', sub: 'BUNDLE & SAVE', emoji: '🎁', items: products.slice(0, 10) },
    { title: 'Mega Sale', sub: 'LIMITED TIME', emoji: '⚡', items: [...products].sort((a, b) => (b.original - b.price) - (a.original - a.price)).slice(0, 10) },
    { title: 'Discount Zone', sub: 'BEST SAVINGS', emoji: '🏷️', items: [...products].sort((a, b) => (1 - b.price / (b.original || b.price)) - (1 - a.price / (a.original || a.price))).slice(0, 10) },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Section & Background */}
      <View style={styles.heroSection}>
        {/* Starry night backgrounds */}
        {STAR_COORDS.map((coord, idx) => (
          <View
            key={idx}
            style={[
              styles.starDot,
              { left: coord.x, top: coord.y, opacity: idx % 2 === 0 ? 0.3 : 0.6 }
            ]}
          />
        ))}
        {/* Gold Glow Center */}
        <View style={styles.radialGlow} />

        <View style={styles.heroContent}>
          <Text style={styles.heroSubtitle}>• VEDIC ASTROLOGY & VASTU</Text>
          <Text style={styles.heroTitle}>100% Authentic{'\n'}<Text style={styles.heroTitleGold}>Astro Solution</Text></Text>
          <Text style={styles.heroDesc}>
            Authentic Vedic products & expert consultations to align your life with cosmic energy. Temple energized. Astrologer recommended.
          </Text>

          <View style={styles.heroBtnRow}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setTab('shop')}>
              <Text style={styles.primaryBtnText}>🛍️ Shop Now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setTab('consult')}>
              <Text style={styles.secondaryBtnText}>🔮 Talk to Astrologer</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Feature Grid (2x2) */}
        <View style={styles.featureGrid}>
          <View style={styles.featureCard}>
            <Text style={styles.featureEmoji}>🙏</Text>
            <View>
              <Text style={styles.featureVal}>12,000+</Text>
              <Text style={styles.featureLabel}>Happy Customers</Text>
            </View>
          </View>
          <View style={styles.featureCard}>
            <Text style={styles.featureEmoji}>📦</Text>
            <View>
              <Text style={styles.featureVal}>500+</Text>
              <Text style={styles.featureLabel}>Products</Text>
            </View>
          </View>
          <View style={styles.featureCard}>
            <Text style={styles.featureEmoji}>⭐</Text>
            <View>
              <Text style={styles.featureVal}>98%</Text>
              <Text style={styles.featureLabel}>Satisfaction</Text>
            </View>
          </View>
          <View style={styles.featureCard}>
            <Text style={styles.featureEmoji}>🔥</Text>
            <View>
              <Text style={styles.featureVal}>Temple</Text>
              <Text style={styles.featureLabel}>Energized</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 3D Sacred Store Carousel Section */}
      <View style={styles.carouselSection}>
        <Text style={styles.carouselSubTitle}>SACRED COLLECTION</Text>
        <Text style={styles.carouselTitle}>Explore Our{'\n'}<Text style={styles.carouselTitleGold}>Sacred Store</Text></Text>

        <View style={styles.carouselContainer}>
          {carouselItems.map((item, idx) => {
            const isCenter = idx === carouselIndex;
            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.carouselCard,
                  isCenter ? styles.carouselCardCenter : styles.carouselCardSide,
                  idx === 0 && { transform: [{ rotateY: '15deg' }, { scale: 0.95 }] },
                  idx === 2 && { transform: [{ rotateY: '-15deg' }, { scale: 0.95 }] }
                ]}
                activeOpacity={0.9}
                onPress={() => { isCenter ? onProductPress(item.product) : setCarouselIndex(idx); }}
              >
                <Image source={{ uri: item.img }} style={styles.carouselImg} />
                <View style={styles.carouselTag}>
                  <Text style={styles.carouselTagText}>AUTHENTIC</Text>
                </View>
                <View style={styles.carouselInfo}>
                  <Text style={styles.carouselCardName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.carouselCardDesc}>{item.desc}</Text>
                </View>
                {isCenter && (
                  <View style={styles.carouselExpandBadge}>
                    <Text style={styles.carouselExpandText}>TAP TO EXPAND ↓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Dots Indicator */}
        <View style={styles.dotsRow}>
          {carouselItems.map((_, i) => (
            <View key={i} style={[styles.dot, i === carouselIndex && styles.activeDot]} />
          ))}
        </View>
      </View>

      {/* Craftsmanship Section */}
      <View style={styles.craftSection}>
        <Text style={styles.craftSub}>CRAFTSMANSHIP</Text>
        <Text style={styles.craftTitle}>From Earth to Sacred Artifact</Text>
        <Text style={styles.craftDesc}>
          Every Nakshra product follows a sacred 5-step ritual: sourcing pristine natural elements, strict quality purification, lab verification, astrologer customization, and authentic temple consecration under mantra rounds.
        </Text>
      </View>

      {/* Product Shelves — Bestselling, Fav Items, Combo Deals, Mega Sale, Discount Zone */}
      {shelves.map((shelf) => (
        <View key={shelf.title} style={styles.productsSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionSub}>{shelf.sub}</Text>
              <Text style={styles.sectionTitle}>{shelf.emoji} {shelf.title}</Text>
            </View>
            <TouchableOpacity onPress={() => setTab('shop', shelf.title)}>
              <Text style={styles.viewAllText}>View all ›</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            horizontal
            data={shelf.items}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <ProductCard
                product={item}
                onPress={() => onProductPress(item)}
                onAddToCart={() => onAddToCart && onAddToCart(item)}
              />
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12 }}
          />
        </View>
      ))}

      {/* The Nakshra Difference (Why Choose Us) */}
      <View style={styles.differenceSection}>
        <Text style={styles.diffSub}>THE Nakshra DIFFERENCE</Text>
        <Text style={styles.diffTitle}>Not just products.{'\n'}<Text style={styles.diffTitleGold}>Sacred instruments.</Text></Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.diffScroll}>
          {consecrationCards.map((c) => (
            <View key={c.id} style={styles.diffCard}>
              <View style={styles.diffImagePlaceholder}>
                <Text style={styles.diffCardCategory}>TEMPLE ENERGIZED</Text>
                <Text style={styles.diffCardTitle}>{c.title}</Text>
                <Text style={styles.diffCardDesc}>{c.desc}</Text>
                <View style={styles.tagRow}>
                  {c.tags.map((t, idx) => (
                    <Text key={idx} style={styles.tagLabel}>{t}</Text>
                  ))}
                </View>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* 4-Box Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>12,000+</Text>
            <Text style={styles.statLabel}>Families Served</Text>
            <Text style={styles.statSub}>Across 18 states</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>100%</Text>
            <Text style={styles.statLabel}>Temple Energized</Text>
            <Text style={styles.statSub}>No exceptions</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>4.9 / 5</Text>
            <Text style={styles.statLabel}>Customer Rating</Text>
            <Text style={styles.statSub}>3,200+ reviews</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>7 Days</Text>
            <Text style={styles.statLabel}>Return Window</Text>
            <Text style={styles.statSub}>No questions asked</Text>
          </View>
        </View>
      </View>

      {/* Expert Guidance Section */}
      <View style={styles.guidanceSection}>
        <Text style={styles.guidanceSub}>EXPERT GUIDANCE</Text>
        <Text style={styles.guidanceTitle}>Confused? Let Us Help You Choose.</Text>
        <Text style={styles.guidanceDesc}>
          Every individual planetary chart is unique. Speak directly with our certified scholars to find the correct gemstone, rudraksha mukhi, or vastu yantra tailored specifically for your zodiac stars.
        </Text>
        <TouchableOpacity style={styles.guidanceBtn} onPress={() => setTab('consult')}>
          <Text style={styles.guidanceBtnText}>💬 Consult Vedic Pandit</Text>
        </TouchableOpacity>
      </View>

      {/* Community Reviews */}
      <View style={styles.reviewsSection}>
        <View style={styles.reviewsHeader}>
          <View>
            <Text style={styles.reviewsSub}>COMMUNITY</Text>
            <Text style={styles.reviewsTitle}>What Our Community Says</Text>
            <Text style={styles.reviewsCount}>{allReviews.length} verified reviews · 4.8 average rating</Text>
          </View>
          <TouchableOpacity
            style={styles.writeReviewBtn}
            onPress={() => { setShowReviewForm((s) => !s); if (reviewSubmitted) { setReviewSubmitted(false); setReviewName(''); setReviewText(''); setReviewRating(5); } }}
          >
            <Text style={styles.writeReviewBtnText}>✍ Write a Review</Text>
          </TouchableOpacity>
        </View>

        {showReviewForm && (
          <View style={styles.reviewFormCard}>
            {reviewSubmitted ? (
              <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>🙏</Text>
                <Text style={styles.reviewFormThanksTitle}>Thank You for Your Review!</Text>
                <Text style={styles.reviewFormThanksDesc}>Your experience has been posted and will help others in their spiritual journey.</Text>
              </View>
            ) : (
              <>
                <Text style={styles.reviewFormLabel}>Your Name</Text>
                <TextInput style={styles.reviewFormInput} value={reviewName} onChangeText={setReviewName} placeholderTextColor="#9a8c7a" />
                <Text style={styles.reviewFormLabel}>Your Rating</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <TouchableOpacity key={n} onPress={() => setReviewRating(n)}>
                      <Text style={{ fontSize: 22, color: n <= reviewRating ? GOLD : '#E5D7C3' }}>★</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.reviewFormLabel}>Your Review</Text>
                <TextInput
                  style={[styles.reviewFormInput, styles.reviewFormTextArea]}
                  value={reviewText}
                  onChangeText={setReviewText}
                  placeholder="Share how this product has impacted your life…"
                  placeholderTextColor="#9a8c7a"
                  multiline
                  numberOfLines={4}
                />
                <TouchableOpacity style={styles.reviewSubmitBtn} onPress={handleSubmitReview} disabled={reviewSubmitting}>
                  {reviewSubmitting ? <ActivityIndicator color={IVORY} /> : <Text style={styles.reviewSubmitBtnText}>Submit Review</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        <FlatList
          horizontal
          data={allReviews}
          keyExtractor={(item, idx) => String(item.id ?? idx)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          renderItem={({ item: c }) => (
            <View style={styles.reviewCard}>
              <View style={styles.reviewCardTop}>
                <Stars rating={c.rating} />
                <Text style={styles.reviewCardDate}>{c.date || 'Just now'}</Text>
              </View>
              <Text style={styles.reviewCardText} numberOfLines={4}>"{c.text}"</Text>
              <Text style={styles.reviewCardProduct}>📦 {c.product}</Text>
              <View style={styles.reviewCardFooter}>
                <View style={[styles.reviewAvatar, { backgroundColor: c.bg || MAROON }]}>
                  <Text style={styles.reviewAvatarText}>{c.init}</Text>
                </View>
                <View>
                  <Text style={styles.reviewCardName}>{c.name}</Text>
                  <Text style={styles.reviewCardCity}>{c.city || 'Verified Buyer'} · ✓ Verified</Text>
                </View>
              </View>
            </View>
          )}
        />
      </View>

      {/* Newsletter Signup */}
      <View style={styles.newsletterSection}>
        <Text style={styles.newsletterOm}>ॐ</Text>
        <Text style={styles.newsletterTitle}>Join India's Spiritual Community</Text>
        <Text style={styles.newsletterDesc}>Auspicious dates, Vedic wisdom, exclusive offers & early access to new products.</Text>
        {newsletterJoined ? (
          <View style={styles.newsletterJoinedBox}>
            <Text style={styles.newsletterJoinedText}>✓ Welcome to the Nakshra community!</Text>
          </View>
        ) : (
          <View style={styles.newsletterForm}>
            <TextInput
              style={styles.newsletterInput}
              placeholder="Enter your email address"
              placeholderTextColor="#9a8c7a"
              keyboardType="email-address"
              autoCapitalize="none"
              value={newsletterEmail}
              onChangeText={setNewsletterEmail}
            />
            <TouchableOpacity style={styles.newsletterBtn} onPress={handleNewsletterSubmit} disabled={newsletterLoading}>
              {newsletterLoading ? <ActivityIndicator color={IVORY} /> : <Text style={styles.newsletterBtnText}>Join Community</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCFAF7',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: SPACE_BLACK,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 13,
    color: GOLD,
    fontWeight: '600',
  },
  heroSection: {
    backgroundColor: SPACE_BLACK,
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  starDot: {
    position: 'absolute',
    width: 2.5,
    height: 2.5,
    borderRadius: 1.25,
    backgroundColor: '#FFFFFF',
  },
  radialGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(200, 160, 68, 0.12)',
    top: 60,
    left: width / 2 - 120,
  },
  heroContent: {
    alignItems: 'center',
    zIndex: 10,
  },
  heroSubtitle: {
    color: GOLD,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 40,
  },
  heroTitleGold: {
    color: GOLD,
  },
  heroDesc: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginVertical: 20,
    paddingHorizontal: 10,
  },
  heroBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  primaryBtn: {
    backgroundColor: GOLD,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  primaryBtnText: {
    color: SPACE_BLACK,
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
  },
  secondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    zIndex: 10,
  },
  featureCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 10,
  },
  featureEmoji: {
    fontSize: 18,
  },
  featureVal: {
    fontSize: 13,
    fontWeight: '800',
    color: GOLD,
  },
  featureLabel: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
    marginTop: 1,
  },
  carouselSection: {
    backgroundColor: SPACE_BLACK,
    paddingTop: 30,
    paddingBottom: 20,
    alignItems: 'center',
  },
  carouselSubTitle: {
    color: GOLD,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  carouselTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginVertical: 12,
    lineHeight: 32,
  },
  carouselTitleGold: {
    color: GOLD,
  },
  carouselContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 320,
    width: '100%',
    marginTop: 15,
  },
  carouselCard: {
    backgroundColor: '#16120F',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(200, 160, 68, 0.25)',
    position: 'relative',
  },
  carouselCardCenter: {
    width: width * 0.55,
    height: 280,
    zIndex: 10,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  carouselCardSide: {
    width: width * 0.20,
    height: 240,
    opacity: 0.4,
    zIndex: 5,
  },
  carouselImg: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    resizeMode: 'cover',
  },
  carouselTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: MAROON,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  carouselTagText: {
    color: GOLD,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  carouselInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(22, 18, 15, 0.85)',
    padding: 12,
  },
  carouselCardName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  carouselCardDesc: {
    color: GOLD,
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
  carouselExpandBadge: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: GOLD,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  carouselExpandText: {
    color: SPACE_BLACK,
    fontSize: 9,
    fontWeight: '800',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeDot: {
    backgroundColor: GOLD,
    width: 14,
  },
  craftSection: {
    backgroundColor: '#FAF8F5',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E5D5',
  },
  craftSub: {
    fontSize: 9,
    color: GOLD,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  craftTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: MAROON,
    marginVertical: 8,
  },
  craftDesc: {
    fontSize: 12,
    color: '#5B4A32',
    lineHeight: 18,
    fontWeight: '500',
  },
  productsSection: {
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#FAF3E8',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionSub: {
    fontSize: 9,
    color: GOLD,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3E3125',
    marginTop: 4,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '800',
    color: MAROON,
  },
  differenceSection: {
    backgroundColor: SPACE_BLACK,
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  diffSub: {
    color: GOLD,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  diffTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 30,
    marginVertical: 12,
  },
  diffTitleGold: {
    color: GOLD,
  },
  diffScroll: {
    marginVertical: 16,
  },
  diffCard: {
    width: width * 0.75,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(200, 160, 68, 0.15)',
    padding: 16,
    marginRight: 12,
  },
  diffCardCategory: {
    color: GOLD,
    fontSize: 9,
    fontWeight: '800',
  },
  diffCardTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginVertical: 8,
  },
  diffCardDesc: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    lineHeight: 16,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
  },
  tagLabel: {
    backgroundColor: 'rgba(200, 160, 68, 0.12)',
    color: GOLD,
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(200, 160, 68, 0.25)',
  },
  diffImagePlaceholder: {
    minHeight: 140,
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 20,
  },
  statBox: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(200, 160, 68, 0.15)',
    borderRadius: 14,
    padding: 16,
  },
  statVal: {
    fontSize: 18,
    fontWeight: '900',
    color: GOLD,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 6,
  },
  statSub: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  guidanceSection: {
    backgroundColor: '#FAF8F5',
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0E5D5',
  },
  guidanceSub: {
    fontSize: 9,
    color: GOLD,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  guidanceTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: MAROON,
    marginVertical: 10,
    textAlign: 'center',
  },
  guidanceDesc: {
    fontSize: 12,
    color: '#5B4A32',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  guidanceBtn: {
    backgroundColor: MAROON,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  guidanceBtnText: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '800',
  },
  reviewsSection: {
    backgroundColor: '#FAF7F2',
    paddingTop: 28,
    paddingBottom: 16,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 10,
  },
  reviewsSub: {
    fontSize: 9,
    color: GOLD,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  reviewsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: MAROON,
    marginTop: 4,
  },
  reviewsCount: {
    fontSize: 10,
    color: '#7A6A58',
    marginTop: 4,
  },
  writeReviewBtn: {
    backgroundColor: MAROON,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  writeReviewBtnText: {
    color: IVORY,
    fontSize: 10,
    fontWeight: '800',
  },
  reviewFormCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(91,31,36,0.08)',
  },
  reviewFormLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: MAROON,
    marginBottom: 6,
    marginTop: 8,
  },
  reviewFormInput: {
    height: 42,
    borderWidth: 1.5,
    borderColor: 'rgba(91,31,36,0.12)',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 13,
    color: '#3E3125',
    backgroundColor: '#FAF7F2',
  },
  reviewFormTextArea: {
    height: 90,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  reviewSubmitBtn: {
    backgroundColor: MAROON,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  reviewSubmitBtnText: {
    color: IVORY,
    fontSize: 12,
    fontWeight: '800',
  },
  reviewFormThanksTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: MAROON,
    marginBottom: 6,
  },
  reviewFormThanksDesc: {
    fontSize: 11,
    color: '#7A6A58',
    textAlign: 'center',
  },
  reviewCard: {
    width: width * 0.72,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(91,31,36,0.07)',
    padding: 16,
    justifyContent: 'space-between',
  },
  reviewCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewCardDate: {
    fontSize: 9,
    color: '#9A8A78',
  },
  reviewCardText: {
    fontSize: 12,
    color: '#4A3A2A',
    fontStyle: 'italic',
    lineHeight: 17,
    marginBottom: 10,
  },
  reviewCardProduct: {
    fontSize: 9,
    color: '#8B6914',
    backgroundColor: 'rgba(200,160,68,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  reviewCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(91,31,36,0.07)',
  },
  reviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '800',
  },
  reviewCardName: {
    fontSize: 11,
    fontWeight: '700',
    color: MAROON,
  },
  reviewCardCity: {
    fontSize: 9,
    color: '#9A8A78',
    marginTop: 1,
  },
  newsletterSection: {
    backgroundColor: '#FAF7F2',
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0E5D5',
  },
  newsletterOm: {
    fontSize: 24,
    color: MAROON,
    marginBottom: 6,
  },
  newsletterTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: MAROON,
    textAlign: 'center',
    marginBottom: 8,
  },
  newsletterDesc: {
    fontSize: 11,
    color: '#7A6A58',
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 16,
  },
  newsletterForm: {
    width: '100%',
    gap: 10,
  },
  newsletterInput: {
    height: 46,
    borderWidth: 1,
    borderColor: 'rgba(91,31,36,0.15)',
    borderRadius: 23,
    paddingHorizontal: 18,
    fontSize: 12,
    color: MAROON,
    backgroundColor: '#FFFFFF',
  },
  newsletterBtn: {
    backgroundColor: MAROON,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newsletterBtnText: {
    color: IVORY,
    fontSize: 12,
    fontWeight: '700',
  },
  newsletterJoinedBox: {
    backgroundColor: 'rgba(200,160,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(200,160,68,0.3)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  newsletterJoinedText: {
    color: MAROON,
    fontSize: 12,
    fontWeight: '700',
  },
});
