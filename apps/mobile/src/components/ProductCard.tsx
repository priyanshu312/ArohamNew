import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { NakshraProduct } from '../types';
import { MAROON, GOLD } from '../constants/theme';
import { Stars } from './Stars';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';

interface ProductCardProps {
  product: NakshraProduct;
  onPress?: () => void;
  onAddToCart?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onPress, onAddToCart }) => {
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { cart, updateQty, removeFromCart } = useCart();
  const isFav = isInWishlist(product.id);
  const cartItem = cart.find((i) => i.product.id === product.id);

  const discount = product.original > product.price
    ? Math.round(((product.original - product.price) / product.original) * 100)
    : 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {/* Image Area */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: product.img }} style={styles.image} />
        
        {/* Heart Overlay */}
        <TouchableOpacity style={styles.heartBtn} onPress={() => toggleWishlist(product)}>
          <Text style={[styles.heartIcon, isFav && styles.heartActive]}>
            {isFav ? '❤️' : '♡'}
          </Text>
        </TouchableOpacity>

        {/* Discount Circle */}
        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discount}%</Text>
          </View>
        )}
      </View>

      {/* Info Area */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{product.subtitle}</Text>

        {/* Stars Rating */}
        <View style={styles.ratingRow}>
          <Stars rating={product.rating || 5} />
          <Text style={styles.ratingCount}>({product.reviews || 1})</Text>
        </View>

        {/* Prices & Discount Info */}
        <View style={styles.priceRow}>
          <Text style={styles.price}>₹{Math.round(product.price).toLocaleString('en-IN')}</Text>
          {product.original > product.price && (
            <Text style={styles.original}>₹{Math.round(product.original).toLocaleString('en-IN')}</Text>
          )}
          {discount > 0 && (
            <Text style={styles.discountPercent}>{discount}% OFF</Text>
          )}
        </View>

        {/* Add to Cart Button, or a live qty stepper once it's in the cart */}
        {cartItem ? (
          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => cartItem.qty <= 1 ? removeFromCart(product.id) : updateQty(product.id, -1)}
              activeOpacity={0.8}
            >
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{cartItem.qty} IN CART</Text>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => updateQty(product.id, 1)}
              activeOpacity={0.8}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.addBtn} onPress={onAddToCart} activeOpacity={0.8}>
            <Text style={styles.addBtnText}>ADD TO CART</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const width = Dimensions.get('window').width;

const styles = StyleSheet.create({
  card: {
    width: (width - 40) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(200, 160, 68, 0.12)',
    shadowColor: '#5B1F24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  imageContainer: {
    aspectRatio: 1,
    backgroundColor: '#FAF8F5',
    position: 'relative',
    padding: 10,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  heartIcon: {
    fontSize: 16,
    color: '#8B7355',
  },
  heartActive: {
    color: '#EF4444',
  },
  discountBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  info: {
    padding: 10,
  },
  name: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3E3125',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 9,
    color: '#8B7355',
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  ratingCount: {
    fontSize: 9,
    color: '#9a8c7a',
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
    marginBottom: 10,
  },
  price: {
    fontSize: 13,
    fontWeight: '800',
    color: '#3E3125',
  },
  original: {
    fontSize: 10,
    color: '#9a8c7a',
    textDecorationLine: 'line-through',
  },
  discountPercent: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10B981',
  },
  addBtn: {
    backgroundColor: MAROON,
    paddingVertical: 9,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: MAROON,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  qtyBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
  },
  qtyValue: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
