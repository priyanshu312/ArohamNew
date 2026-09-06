import React, { useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Modal, Dimensions, TextInput } from 'react-native';
import { MAROON, GOLD } from '../constants/theme';
import { useCart } from '../context/CartContext';

interface CartDrawerProps {
  visible: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  visible,
  onClose,
  onCheckout
}) => {
  const { cart, updateQty, removeFromCart, subtotal, discount, total, appliedCoupon, applyCoupon, removeCoupon } = useCart();
  const [couponCode, setCouponCode] = useState('');
  const [couponMsg, setCouponMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    const res = applyCoupon(couponCode);
    setCouponMsg({ text: res.message, isError: !res.success });
    if (res.success) setCouponCode('');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismissArea} onPress={onClose} activeOpacity={1} />
        
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>My Sacred Cart ({cart.length})</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {cart.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🛍️</Text>
              <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
              <Text style={styles.emptyDesc}>Explore our sacred Vedic store to add energized remedies.</Text>
              <TouchableOpacity style={styles.shopBtn} onPress={onClose}>
                <Text style={styles.shopBtnText}>START SHOPPING</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Scrollable list */}
              <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
                {cart.map((item) => {
                  const product = (item as any).product || item;
                  return (
                    <View key={product.id} style={styles.cartCard}>
                      <View style={styles.imgWrap}>
                        <Image source={{ uri: product.img }} style={styles.img} />
                      </View>
                      
                      <View style={styles.info}>
                        <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
                        <Text style={styles.subtitle}>{product.subtitle}</Text>
                        <Text style={styles.price}>₹{product.price.toLocaleString('en-IN')}</Text>
                      </View>

                      {/* Quantity selectors & Delete */}
                      <View style={styles.actions}>
                        <TouchableOpacity 
                          style={styles.trashBtn} 
                          onPress={() => removeFromCart(product.id)}
                        >
                          <Text style={styles.trashIcon}>🗑️</Text>
                        </TouchableOpacity>

                        <View style={styles.qtyRow}>
                          <TouchableOpacity 
                            style={styles.qtyBtn} 
                            onPress={() => updateQty(product.id, -1)}
                          >
                            <Text style={styles.qtyBtnText}>-</Text>
                          </TouchableOpacity>
                          
                          <Text style={styles.qtyText}>{item.qty}</Text>
                          
                          <TouchableOpacity 
                            style={styles.qtyBtn} 
                            onPress={() => updateQty(product.id, 1)}
                          >
                            <Text style={styles.qtyBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}

                {/* Coupon Code Section */}
                <View style={styles.couponContainer}>
                  <Text style={styles.couponTitle}>Sacred Promo Code</Text>
                  {appliedCoupon ? (
                    <View style={styles.appliedCouponRow}>
                      <View style={styles.couponBadge}>
                        <Text style={styles.couponBadgeText}>🏷️ {appliedCoupon.code}</Text>
                        <Text style={styles.couponLabelText}>{appliedCoupon.label}</Text>
                      </View>
                      <TouchableOpacity onPress={removeCoupon} style={styles.removeCouponBtn}>
                        <Text style={styles.removeCouponText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.couponInputRow}>
                      <TextInput
                        style={styles.couponInput}
                        placeholder="Enter Nakshra10 or FIRST100"
                        placeholderTextColor="#8B7355"
                        value={couponCode}
                        onChangeText={setCouponCode}
                        autoCapitalize="characters"
                      />
                      <TouchableOpacity style={styles.applyBtn} onPress={handleApplyCoupon}>
                        <Text style={styles.applyBtnText}>APPLY</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {couponMsg && (
                    <Text style={[styles.couponMsg, couponMsg.isError ? styles.couponError : styles.couponSuccess]}>
                      {couponMsg.text}
                    </Text>
                  )}
                </View>
              </ScrollView>

              {/* Total & Checkout button */}
              <View style={styles.footer}>
                <View style={styles.totalRow}>
                  <Text style={styles.subtotalLabel}>Subtotal</Text>
                  <Text style={styles.subtotalVal}>₹{subtotal.toLocaleString('en-IN')}</Text>
                </View>
                {discount > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.discountLabel}>Coupon Discount</Text>
                    <Text style={styles.discountVal}>-₹{discount.toLocaleString('en-IN')}</Text>
                  </View>
                )}
                <View style={[styles.totalRow, { marginTop: 4 }]}>
                  <Text style={styles.totalLabel}>Total Payable</Text>
                  <Text style={styles.totalVal}>₹{total.toLocaleString('en-IN')}</Text>
                </View>
                <Text style={styles.taxLabel}>* Free Express Shipping & Sacred Consecration Included</Text>

                <TouchableOpacity style={styles.checkoutBtn} onPress={onCheckout}>
                  <Text style={styles.checkoutText}>PROCEED TO SHIPPING</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const height = Dimensions.get('window').height;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    height: height * 0.82,
    backgroundColor: '#FCFAF7',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#5B1F24',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  header: {
    height: 56,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#FAF3E8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3E3125',
    textTransform: 'uppercase',
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    fontSize: 18,
    color: '#8B7355',
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3E3125',
  },
  emptyDesc: {
    fontSize: 11,
    color: '#8B7355',
    textAlign: 'center',
    lineHeight: 16,
  },
  shopBtn: {
    backgroundColor: MAROON,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 22,
    marginTop: 10,
  },
  shopBtnText: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '800',
  },
  scrollList: {
    flex: 1,
    padding: 16,
  },
  cartCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(200, 160, 68, 0.12)',
    marginBottom: 10,
    alignItems: 'center',
    gap: 12,
  },
  imgWrap: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#FAF8F5',
    padding: 4,
    overflow: 'hidden',
  },
  img: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3E3125',
  },
  subtitle: {
    fontSize: 9,
    color: '#8B7355',
  },
  price: {
    fontSize: 13,
    fontWeight: '800',
    color: MAROON,
    marginTop: 4,
  },
  actions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  trashBtn: {
    padding: 4,
  },
  trashIcon: {
    fontSize: 14,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#E5D7C3',
    borderRadius: 12,
    overflow: 'hidden',
  },
  qtyBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3E3125',
  },
  qtyText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3E3125',
    paddingHorizontal: 8,
  },
  couponContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(200, 160, 68, 0.15)',
    marginVertical: 12,
    gap: 8,
  },
  couponTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: MAROON,
    textTransform: 'uppercase',
  },
  couponInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  couponInput: {
    flex: 1,
    height: 38,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#E5D7C3',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 12,
    color: '#3E3125',
  },
  applyBtn: {
    backgroundColor: MAROON,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnText: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '800',
  },
  appliedCouponRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(91, 31, 36, 0.05)',
    padding: 10,
    borderRadius: 10,
  },
  couponBadge: {
    gap: 2,
  },
  couponBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: MAROON,
  },
  couponLabelText: {
    fontSize: 10,
    color: '#8B7355',
  },
  removeCouponBtn: {
    padding: 4,
  },
  removeCouponText: {
    fontSize: 11,
    color: '#D9381E',
    fontWeight: '700',
  },
  couponMsg: {
    fontSize: 10,
    fontWeight: '600',
  },
  couponSuccess: {
    color: '#2E7D32',
  },
  couponError: {
    color: '#D9381E',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#FAF3E8',
    padding: 16,
    paddingBottom: 28,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  subtotalLabel: {
    fontSize: 12,
    color: '#8B7355',
  },
  subtotalVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3E3125',
  },
  discountLabel: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '700',
  },
  discountVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2E7D32',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#3E3125',
  },
  totalVal: {
    fontSize: 20,
    fontWeight: '800',
    color: MAROON,
  },
  taxLabel: {
    fontSize: 9,
    color: '#8B7355',
    fontWeight: '600',
    marginBottom: 16,
  },
  checkoutBtn: {
    backgroundColor: MAROON,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutText: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
