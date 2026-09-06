import React, { useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { NakshraProduct } from '../types';
import { MAROON, GOLD } from '../constants/theme';
import { Stars } from '../components/Stars';
import { MOCK_REVIEWS } from '@nakshra/shared-config';
import { useWishlist } from '../context/WishlistContext';

interface ProductDetailScreenProps {
  product: NakshraProduct;
  onBack: () => void;
  onAddToCart: (p: NakshraProduct, qty: number) => void;
  onBuyNow: (p: NakshraProduct, qty: number) => void;
}

export const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({
  product,
  onBack,
  onAddToCart,
  onBuyNow
}) => {
  const [showBenefits, setShowBenefits] = useState(false);
  const [showSpecs, setShowSpecs] = useState(false);
  const [qty, setQty] = useState(1);
  const { toggleWishlist, isInWishlist } = useWishlist();
  const isWished = isInWishlist(product.id);

  const discount = product.original > product.price
    ? Math.round(((product.original - product.price) / product.original) * 100)
    : 0;

  return (
    <View style={styles.container}>
      {/* Detail Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back to Shop</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{product.name}</Text>
        <TouchableOpacity onPress={() => toggleWishlist(product)} style={styles.wishlistHeaderBtn}>
          <Text style={styles.wishlistHeaderIcon}>{isWished ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Main Product Image */}
        <Image source={{ uri: product.img }} style={styles.image} />

        {/* Product Details info block */}
        <View style={styles.infoBlock}>
          {product.badges && product.badges.length > 0 && (
            <View style={styles.badgeRow}>
              {product.badges.map((b, idx) => (
                <Text key={idx} style={styles.badge}>{b}</Text>
              ))}
            </View>
          )}

          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.subtitle}>{product.subtitle}</Text>

          {/* Rating */}
          <View style={styles.ratingRow}>
            <Stars rating={product.rating || 5} />
            <Text style={styles.ratingCount}>{product.rating || 5.0} ({product.reviews || 1} reviews)</Text>
          </View>

          {/* Prices */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{product.price.toLocaleString('en-IN')}</Text>
            {product.original > product.price && (
              <Text style={styles.original}>₹{product.original.toLocaleString('en-IN')}</Text>
            )}
            {discount > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{discount}% OFF</Text>
              </View>
            )}
          </View>

          <Text style={styles.shortDesc}>{product.shortDesc}</Text>

          {/* Quantity Selector */}
          <View style={styles.qtySelectorRow}>
            <Text style={styles.qtySelectorLabel}>Quantity</Text>
            <View style={styles.qtySelector}>
              <TouchableOpacity
                style={styles.qtySelectorBtn}
                onPress={() => setQty((q) => Math.max(1, q - 1))}
              >
                <Text style={styles.qtySelectorBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtySelectorValue}>{qty}</Text>
              <TouchableOpacity
                style={styles.qtySelectorBtn}
                onPress={() => setQty((q) => q + 1)}
              >
                <Text style={styles.qtySelectorBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Accordions */}
        <View style={styles.accordionContainer}>
          {/* Benefits Accordion */}
          <TouchableOpacity style={styles.accordionHeader} onPress={() => setShowBenefits(!showBenefits)}>
            <Text style={styles.accordionTitle}>✨ Sacred Benefits</Text>
            <Text style={styles.accordionArrow}>{showBenefits ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showBenefits && (
            <View style={styles.accordionContent}>
              {(product.benefits && product.benefits.length > 0 ? product.benefits : ['Lab Certified', 'Temple Consecrated']).map((b, idx) => (
                <Text key={idx} style={styles.bulletItem}>• {b}</Text>
              ))}
            </View>
          )}

          {/* Specifications Accordion */}
          <TouchableOpacity style={styles.accordionHeader} onPress={() => setShowSpecs(!showSpecs)}>
            <Text style={styles.accordionTitle}>📏 Specifications & Details</Text>
            <Text style={styles.accordionArrow}>{showSpecs ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showSpecs && (
            <View style={styles.accordionContent}>
              <View style={styles.specRow}><Text style={styles.specLabel}>Size</Text><Text style={styles.specVal}>{product.size || 'Standard'}</Text></View>
              <View style={styles.specRow}><Text style={styles.specLabel}>Material</Text><Text style={styles.specVal}>{product.material || 'Vedic Metals'}</Text></View>
              <View style={styles.specRow}><Text style={styles.specLabel}>Use for</Text><Text style={styles.specVal}>Daily Wear / Pooja Ghar</Text></View>
            </View>
          )}
        </View>

        {/* Customer Reviews */}
        <View style={styles.reviewsContainer}>
          <Text style={styles.reviewsTitle}>Customer Reviews</Text>
          {MOCK_REVIEWS.map((r) => (
            <View key={r.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewerName}>{r.name}</Text>
                <Text style={styles.reviewDate}>{r.date}</Text>
              </View>
              <Stars rating={r.rating} />
              <Text style={styles.reviewText}>{r.text}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Bottom CTAs */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.cartBtn} onPress={() => onAddToCart(product, qty)}>
          <Text style={styles.cartBtnText}>ADD TO CART</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buyBtn} onPress={() => onBuyNow(product, qty)}>
          <Text style={styles.buyBtnText}>BUY NOW</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const width = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCFAF7',
  },
  header: {
    height: 56,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FAF3E8',
    gap: 16,
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
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#3E3125',
    textTransform: 'uppercase',
  },
  wishlistHeaderBtn: {
    padding: 6,
  },
  wishlistHeaderIcon: {
    fontSize: 18,
  },
  scroll: {
    backgroundColor: '#FCFAF7',
  },
  image: {
    width: width,
    aspectRatio: 1,
    resizeMode: 'contain',
    backgroundColor: '#FFFFFF',
  },
  infoBlock: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FAF3E8',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  badge: {
    fontSize: 8,
    fontWeight: '800',
    color: GOLD,
    backgroundColor: MAROON,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3E3125',
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 11,
    color: '#8B7355',
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  ratingCount: {
    fontSize: 10,
    color: '#9a8c7a',
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 14,
  },
  price: {
    fontSize: 20,
    fontWeight: '800',
    color: MAROON,
  },
  original: {
    fontSize: 14,
    color: '#9a8c7a',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  shortDesc: {
    fontSize: 12,
    color: '#5B4A32',
    lineHeight: 18,
    fontWeight: '500',
  },
  qtySelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  qtySelectorLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3E3125',
    textTransform: 'uppercase',
  },
  qtySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1.5,
    borderColor: MAROON,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  qtySelectorBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtySelectorBtnText: {
    color: MAROON,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 18,
  },
  qtySelectorValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#3E3125',
    minWidth: 16,
    textAlign: 'center',
  },
  accordionContainer: {
    backgroundColor: '#FFFFFF',
    marginTop: 10,
    paddingHorizontal: 16,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#FAF3E8',
  },
  accordionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3E3125',
  },
  accordionArrow: {
    fontSize: 10,
    color: '#8B7355',
  },
  accordionContent: {
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#FAF3E8',
  },
  bulletItem: {
    fontSize: 11,
    color: '#5B4A32',
    lineHeight: 16,
    fontWeight: '500',
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  specLabel: {
    fontSize: 11,
    color: '#8B7355',
    fontWeight: '600',
  },
  specVal: {
    fontSize: 11,
    color: '#3E3125',
    fontWeight: '700',
  },
  reviewsContainer: {
    backgroundColor: '#FFFFFF',
    marginTop: 10,
    padding: 16,
  },
  reviewsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3E3125',
    marginBottom: 12,
  },
  reviewCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FAF3E8',
    gap: 4,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reviewerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3E3125',
  },
  reviewDate: {
    fontSize: 10,
    color: '#9a8c7a',
  },
  reviewText: {
    fontSize: 11,
    color: '#5B4A32',
    lineHeight: 16,
    marginTop: 4,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#FAF3E8',
    flexDirection: 'row',
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 12,
    paddingBottom: 16,
  },
  cartBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: MAROON,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBtnText: {
    color: MAROON,
    fontSize: 12,
    fontWeight: '800',
  },
  buyBtn: {
    flex: 1,
    backgroundColor: MAROON,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyBtnText: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '800',
  },
});
