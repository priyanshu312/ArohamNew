import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, FlatList, Dimensions } from 'react-native';
import { MAROON, GOLD } from '../constants/theme';
import { NakshraProduct } from '../types';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';

interface WishlistScreenProps {
  onBack: () => void;
  onProductPress: (p: NakshraProduct) => void;
  onShopPress: () => void;
}

export const WishlistScreen: React.FC<WishlistScreenProps> = ({ onBack, onProductPress, onShopPress }) => {
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  const handleAddToCart = (product: NakshraProduct) => {
    if (addToCart(product, 1, false)) removeFromWishlist(product.id);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>My Wishlist</Text>
        <Text style={styles.headerCount}>{wishlist.length} {wishlist.length === 1 ? 'item' : 'items'}</Text>
      </View>

      {wishlist.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Text style={styles.emptyIcon}>♡</Text>
          </View>
          <Text style={styles.emptyTitle}>Your Wishlist is Empty</Text>
          <Text style={styles.emptyDesc}>
            Explore our temple-energized sacred products and tap the heart icon to save your favorites here.
          </Text>
          <TouchableOpacity style={styles.shopBtn} onPress={onShopPress}>
            <Text style={styles.shopBtnText}>CONTINUE SHOPPING</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={wishlist}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.gridContainer}
          renderItem={({ item: product }) => {
            const discountPct = product.original > product.price
              ? Math.round((1 - product.price / product.original) * 100)
              : 0;
            return (
              <View style={styles.card}>
                <TouchableOpacity style={styles.imageContainer} onPress={() => onProductPress(product)} activeOpacity={0.9}>
                  <Image source={{ uri: product.img }} style={styles.image} />
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeFromWishlist(product.id)}>
                    <Text style={styles.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                </TouchableOpacity>

                <View style={styles.info}>
                  <TouchableOpacity onPress={() => onProductPress(product)}>
                    <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
                  </TouchableOpacity>
                  {product.subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{product.subtitle}</Text> : null}

                  <View style={styles.priceRow}>
                    <Text style={styles.price}>₹{Math.round(product.price).toLocaleString('en-IN')}</Text>
                    {product.original > product.price && (
                      <>
                        <Text style={styles.original}>₹{Math.round(product.original).toLocaleString('en-IN')}</Text>
                        <Text style={styles.discountPercent}>({discountPct}% OFF)</Text>
                      </>
                    )}
                  </View>

                  <TouchableOpacity style={styles.addBtn} onPress={() => handleAddToCart(product)} activeOpacity={0.8}>
                    <Text style={styles.addBtnText}>ADD TO CART</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
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
    minHeight: 56,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    fontSize: 15,
    fontWeight: '800',
    color: '#3E3125',
    flex: 1,
  },
  headerCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8B7355',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FDE8E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 28,
    color: '#EF4444',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: MAROON,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#8B7355',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 260,
  },
  shopBtn: {
    backgroundColor: MAROON,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24,
  },
  shopBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  gridContainer: {
    padding: 12,
  },
  card: {
    width: (width - 36) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  imageContainer: {
    aspectRatio: 3 / 4,
    backgroundColor: '#FAF8F5',
    position: 'relative',
    padding: 10,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '800',
  },
  info: {
    padding: 12,
  },
  name: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3E3125',
  },
  subtitle: {
    fontSize: 10,
    color: '#8B7355',
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 8,
    marginBottom: 10,
  },
  price: {
    fontSize: 13,
    fontWeight: '800',
    color: MAROON,
  },
  original: {
    fontSize: 10,
    color: '#9a8c7a',
    textDecorationLine: 'line-through',
  },
  discountPercent: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EA580C',
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
});
