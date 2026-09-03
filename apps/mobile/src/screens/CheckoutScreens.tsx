import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image, ActivityIndicator, Dimensions, Alert, Platform } from 'react-native';
import { MAROON, GOLD } from '../constants/theme';
import { Address, CartItem } from '../types';
import { api } from '@nakshra/shared-api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const { width } = Dimensions.get('window');

// Loaded dynamically (not a static import) so this file still bundles on web — the native
// Razorpay checkout SDK has no web implementation and this app also targets Expo web.
function getRazorpayCheckout(): any {
  if (Platform.OS === 'web') return null;
  try {
    // @ts-ignore -- native-only module, no web build
    return require('react-native-razorpay').default;
  } catch (e) {
    return null;
  }
}

// Razorpay public key — safe to expose in the client, matches web's PaymentPage.tsx fallback
const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_T905SJtpz903AN';

// ── SHIPPING ADDRESS SCREEN ─────────────────────────────────────────────
interface ShippingProps {
  onNext: (address: Address) => void;
  onBack: () => void;
}

interface SavedAddress {
  id: number;
  name: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export const CheckoutShippingScreen: React.FC<ShippingProps> = ({ onNext, onBack }) => {
  const { user } = useAuth();
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [selectedSavedId, setSelectedSavedId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setLoadingSaved(false);
      setShowForm(true);
      return;
    }
    (async () => {
      try {
        const res: any = await api('/addresses').catch(() => null);
        const list: SavedAddress[] = Array.isArray(res) ? res : (res?.addresses || []);
        setSavedAddresses(list);
        if (list.length > 0) {
          setSelectedSavedId(list[0].id);
        } else {
          setShowForm(true);
        }
      } catch (e) {
        setShowForm(true);
      } finally {
        setLoadingSaved(false);
      }
    })();
  }, [user?.id]);

  const handleProceedWithSaved = () => {
    const saved = savedAddresses.find((a) => a.id === selectedSavedId);
    if (!saved) return;
    onNext({
      name: saved.name,
      phone: saved.phone,
      line1: saved.address,
      city: saved.city,
      state: saved.state,
      pincode: saved.pincode,
    });
  };

  const handleProceedWithNewAddress = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!name.trim()) { setErrorMsg('Please enter your full name.'); return; }
    if (cleanPhone.length !== 10) { setErrorMsg('Please enter a valid 10-digit phone number.'); return; }
    if (!line1.trim()) { setErrorMsg('Please enter your address.'); return; }
    if (!city.trim() || !state.trim()) { setErrorMsg('Please enter city and state.'); return; }
    if (pincode.replace(/\D/g, '').length !== 6) { setErrorMsg('Please enter a valid 6-digit pincode.'); return; }

    setErrorMsg('');
    const fullAddress = line2.trim() ? `${line1.trim()}, ${line2.trim()}` : line1.trim();

    // Persist to the backend so it shows up next time, same as web's ShippingPage auto-save.
    if (user?.id) {
      setSaving(true);
      try {
        await api('/addresses', {
          method: 'POST',
          body: JSON.stringify({ name: name.trim(), phone: cleanPhone, address: fullAddress, city: city.trim(), state: state.trim(), pincode }),
        }).catch(() => {});
      } finally {
        setSaving(false);
      }
    }

    onNext({ name: name.trim(), phone: cleanPhone, line1: fullAddress, city: city.trim(), state: state.trim(), pincode });
  };

  if (loadingSaved) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={MAROON} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}><Text style={styles.backText}>← Cart</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>1. Shipping Address</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {errorMsg ? (
          <View style={styles.errorBox}><Text style={styles.errorText}>⚠️ {errorMsg}</Text></View>
        ) : null}

        {!showForm && savedAddresses.length > 0 && (
          <View style={styles.savedList}>
            <Text style={styles.savedListTitle}>Choose a delivery address</Text>
            {savedAddresses.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={[styles.savedCard, selectedSavedId === a.id && styles.savedCardActive]}
                onPress={() => setSelectedSavedId(a.id)}
              >
                <View style={[styles.radio, selectedSavedId === a.id && styles.activeRadio]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.savedName}>{a.name} • {a.phone}</Text>
                  <Text style={styles.savedAddr}>{a.address}, {a.city}, {a.state} - {a.pincode}</Text>
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.addNewBtn} onPress={() => setShowForm(true)}>
              <Text style={styles.addNewBtnText}>+ Add a new address</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.proceedBtn} onPress={handleProceedWithSaved} disabled={!selectedSavedId}>
              <Text style={styles.proceedText}>PROCEED TO PAYMENT</Text>
            </TouchableOpacity>
          </View>
        )}

        {showForm && (
          <View style={styles.form}>
            {savedAddresses.length > 0 && (
              <TouchableOpacity onPress={() => setShowForm(false)} style={{ marginBottom: 8 }}>
                <Text style={styles.backText}>← Use a saved address</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.label}>Full Name</Text>
            <TextInput style={styles.input} placeholder="Enter your name" placeholderTextColor="#9a8c7a" value={name} onChangeText={setName} />

            <Text style={styles.label}>Phone Number</Text>
            <TextInput style={styles.input} placeholder="10-digit mobile number" placeholderTextColor="#9a8c7a" keyboardType="phone-pad" maxLength={10} value={phone} onChangeText={(t) => setPhone(t.replace(/\D/g, ''))} />

            <Text style={styles.label}>Flat / House / Area Address</Text>
            <TextInput style={styles.input} placeholder="Flat no, building, street address" placeholderTextColor="#9a8c7a" value={line1} onChangeText={setLine1} />

            <Text style={styles.label}>Landmark (Optional)</Text>
            <TextInput style={styles.input} placeholder="E.g., near temple" placeholderTextColor="#9a8c7a" value={line2} onChangeText={setLine2} />

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>City</Text>
                <TextInput style={styles.input} placeholder="City name" placeholderTextColor="#9a8c7a" value={city} onChangeText={setCity} />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>State</Text>
                <TextInput style={styles.input} placeholder="State" placeholderTextColor="#9a8c7a" value={state} onChangeText={setState} />
              </View>
            </View>

            <Text style={styles.label}>Pincode</Text>
            <TextInput style={styles.input} placeholder="6-digit zip code" placeholderTextColor="#9a8c7a" keyboardType="number-pad" maxLength={6} value={pincode} onChangeText={(t) => setPincode(t.replace(/\D/g, ''))} />

            <TouchableOpacity style={styles.proceedBtn} onPress={handleProceedWithNewAddress} disabled={saving}>
              {saving ? <ActivityIndicator color={GOLD} /> : <Text style={styles.proceedText}>PROCEED TO PAYMENT</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// ── PAYMENT METHODS SCREEN ──────────────────────────────────────────────
interface PaymentProps {
  cart: CartItem[];
  cartTotal: number;
  address: Address;
  onNext: (orderId: string, items: CartItem[], total: number) => void;
  onBack: () => void;
}

export const CheckoutPaymentScreen: React.FC<PaymentProps> = ({
  cart,
  cartTotal,
  address,
  onNext,
  onBack
}) => {
  const { user } = useAuth();
  const { subtotal, discount, appliedCoupon, applyCoupon, removeCoupon } = useCart();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [couponMsg, setCouponMsg] = useState<{ success: boolean; message: string } | null>(null);

  const handleApplyCoupon = () => {
    if (!couponInput.trim()) return;
    const res = applyCoupon(couponInput);
    setCouponMsg(res);
    if (res.success) setCouponInput('');
  };

  const handlePayment = async () => {
    if (cart.length === 0) {
      setErrorMsg('Your cart is empty.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    let orderId: string | undefined;
    let razorpayOrderId: string | undefined;
    let keyId = RAZORPAY_KEY_ID;
    let amountPaisa = Math.round(cartTotal * 100);

    // Same backend contract as web's PaymentPage.tsx — server validates items/stock/price
    // and reserves stock before payment ever happens.
    try {
      const orderData: any = await api('/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: cart.map((i) => ({ id: i.product.id, qty: i.qty })),
          address,
          checkoutType: 'cart',
        }),
      });
      orderId = orderData?.orderId;
      razorpayOrderId = orderData?.razorpayOrderId;
      if (orderData?.keyId) keyId = orderData.keyId;
      if (orderData?.amount) amountPaisa = orderData.amount;
    } catch (e: any) {
      setLoading(false);
      setErrorMsg(e?.message || 'Could not create your order. Please try again.');
      return;
    }

    if (!orderId) {
      setLoading(false);
      setErrorMsg('Could not create your order. Please try again.');
      return;
    }

    const RazorpayCheckout = getRazorpayCheckout();
    if (!RazorpayCheckout) {
      setLoading(false);
      setErrorMsg(
        Platform.OS === 'web'
          ? 'Razorpay checkout is not available on web preview — test payment on a real device/simulator build.'
          : 'Payment gateway module not available in this build. Rebuild the app with a development client (Expo Go cannot load native payment modules).'
      );
      return;
    }

    const rawPhone = String(user?.user_metadata?.phone || address?.phone || '').replace(/\D/g, '');
    const cleanPhone = rawPhone.length > 10 ? rawPhone.slice(-10) : rawPhone;

    const options = {
      description: 'Sacred Products – Temple Energized',
      image: 'https://Nakshra.in/favicon.ico',
      currency: 'INR',
      key: keyId,
      amount: amountPaisa,
      order_id: razorpayOrderId,
      name: 'Nakshra',
      prefill: {
        email: user?.email || '',
        contact: cleanPhone,
        name: user?.user_metadata?.full_name || address?.name || 'Devotee',
      },
      theme: { color: MAROON },
    };

    try {
      const paymentResult = await RazorpayCheckout.open(options);
      await api('/payments/verify', {
        method: 'POST',
        body: JSON.stringify({
          orderId,
          razorpay_order_id: paymentResult.razorpay_order_id,
          razorpay_payment_id: paymentResult.razorpay_payment_id,
          razorpay_signature: paymentResult.razorpay_signature,
        }),
      }).catch(() => {});

      setLoading(false);
      onNext(orderId, cart, cartTotal);
    } catch (err: any) {
      // User cancelled or payment failed — report it so reserved stock gets released.
      await api('/payments/failed', {
        method: 'POST',
        body: JSON.stringify({ orderId, reason: err?.description || 'Payment cancelled or failed' }),
      }).catch(() => {});

      setLoading(false);
      setErrorMsg(err?.description ? `Payment failed: ${err.description}` : 'Payment was cancelled.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>2. Payment</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Coupon bar */}
        <View style={styles.couponBox}>
          {appliedCoupon ? (
            <View style={styles.couponAppliedRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.couponAppliedCode}>{appliedCoupon.code}</Text>
                <Text style={styles.couponAppliedLabel}>{appliedCoupon.label}</Text>
              </View>
              <TouchableOpacity onPress={() => { removeCoupon(); setCouponMsg(null); }}>
                <Text style={styles.couponRemove}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.couponInputRow}>
              <TextInput
                style={styles.couponInput}
                placeholder="Coupon code (e.g. Nakshra10)"
                placeholderTextColor="#9a8c7a"
                autoCapitalize="characters"
                value={couponInput}
                onChangeText={(t) => { setCouponInput(t); setCouponMsg(null); }}
              />
              <TouchableOpacity style={styles.couponApplyBtn} onPress={handleApplyCoupon}>
                <Text style={styles.couponApplyBtnText}>APPLY</Text>
              </TouchableOpacity>
            </View>
          )}
          {couponMsg && (
            <Text style={[styles.couponMsg, couponMsg.success ? styles.couponMsgSuccess : styles.couponMsgError]}>
              {couponMsg.success ? '✓ ' : '✕ '}{couponMsg.message}
            </Text>
          )}
        </View>

        {/* Price breakdown */}
        <View style={styles.breakdownBox}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Subtotal</Text>
            <Text style={styles.breakdownVal}>₹{subtotal.toLocaleString('en-IN')}</Text>
          </View>
          {appliedCoupon && discount > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, styles.discountColor]}>Discount ({appliedCoupon.code})</Text>
              <Text style={[styles.breakdownVal, styles.discountColor]}>−₹{discount.toLocaleString('en-IN')}</Text>
            </View>
          )}
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Shipping</Text>
            <Text style={[styles.breakdownVal, styles.discountColor]}>FREE</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>GST (5% Included)</Text>
            <Text style={[styles.breakdownVal, styles.discountColor]}>INCLUDED</Text>
          </View>
          <View style={styles.breakdownDivider} />
          <View style={styles.breakdownRow}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalVal}>₹{cartTotal.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {errorMsg ? (
          <View style={styles.errorBox}><Text style={styles.errorText}>⚠️ {errorMsg}</Text></View>
        ) : null}

        <View style={styles.razorpayCard}>
          <Text style={styles.razorpayBrand}>Pay Securely with Razorpay</Text>
          <Text style={styles.razorpaySub}>UPI · Cards · Net Banking · Wallets · EMI</Text>
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={MAROON} />
            <Text style={styles.loaderText}>Processing secure gateway transaction…</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.proceedBtn} onPress={handlePayment}>
            <Text style={styles.proceedText}>PAY ₹{cartTotal.toLocaleString('en-IN')} WITH RAZORPAY</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

// ── CONFIRMATION / SUCCESS SCREEN ────────────────────────────────────────
interface ConfirmProps {
  orderId: string;
  items: CartItem[];
  total: number;
  createdAt: string;
  onHomePress: () => void;
}

export const CheckoutConfirmScreen: React.FC<ConfirmProps> = ({ orderId, items, total, createdAt, onHomePress }) => {
  const orderDate = new Date(createdAt);
  const deliveryDate = new Date(createdAt);
  deliveryDate.setDate(deliveryDate.getDate() + 4);
  const fmt = (d: Date) => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <ScrollView style={[styles.container, styles.confirmBg]} contentContainerStyle={styles.confirmScroll}>
      <View style={styles.confirmContent}>
        <Text style={styles.successIcon}>🎉</Text>
        <Text style={styles.confirmTitle}>Order Confirmed!</Text>
        <Text style={styles.confirmDesc}>
          Namaste. Your order has been placed successfully. Our temple priests will energize your remedies on the upcoming auspicious tithi.
        </Text>

        <View style={styles.orderIdBox}>
          <Text style={styles.orderLabel}>ORDER ID</Text>
          <Text style={styles.orderVal}>{orderId}</Text>
          <Text style={styles.orderMeta}>Placed {fmt(orderDate)} • Estimated delivery {fmt(deliveryDate)}</Text>
        </View>

        {items.length > 0 && (
          <View style={styles.confirmItemsBox}>
            {items.map(({ product: p, qty }) => (
              <View key={p.id} style={styles.confirmItemRow}>
                <Image source={{ uri: p.img }} style={styles.confirmItemImg} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.confirmItemName} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.confirmItemQty}>Qty: {qty}</Text>
                </View>
                <Text style={styles.confirmItemPrice}>₹{(p.price * qty).toLocaleString('en-IN')}</Text>
              </View>
            ))}
            <View style={styles.confirmTotalRow}>
              <Text style={styles.confirmTotalLabel}>Total Paid</Text>
              <Text style={styles.confirmTotalVal}>₹{total.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.confirmHomeBtn} onPress={onHomePress}>
          <Text style={styles.confirmHomeBtnText}>CONTINUE SHOPPING</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

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
    fontSize: 13,
    fontWeight: '800',
    color: '#3E3125',
    textTransform: 'uppercase',
  },
  scroll: {
    padding: 16,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },
  loaderText: {
    fontSize: 11,
    color: '#8B7355',
    fontWeight: '600',
    marginTop: 10,
  },
  errorBox: {
    backgroundColor: '#FDE8E8',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F8B4B4',
    marginBottom: 14,
  },
  errorText: {
    fontSize: 11,
    color: '#991B1B',
    fontWeight: '600',
  },
  savedList: {
    gap: 10,
  },
  savedListTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3E3125',
    marginBottom: 4,
  },
  savedCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5D7C3',
    padding: 14,
    gap: 12,
    alignItems: 'flex-start',
  },
  savedCardActive: {
    borderColor: MAROON,
    backgroundColor: 'rgba(91, 31, 36, 0.03)',
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
  addNewBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  addNewBtnText: {
    fontSize: 12,
    fontWeight: '700',
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
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#E5D7C3',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 12,
    color: '#3E3125',
    backgroundColor: '#FAF8F5',
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
    marginTop: 24,
  },
  proceedText: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5D7C3',
    marginTop: 2,
  },
  activeRadio: {
    borderColor: MAROON,
    backgroundColor: MAROON,
  },
  couponBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(91, 31, 36, 0.08)',
    padding: 12,
    marginBottom: 12,
  },
  couponInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  couponInput: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderColor: 'rgba(91, 31, 36, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 11,
    color: MAROON,
    backgroundColor: '#FAF7F2',
    textTransform: 'uppercase',
  },
  couponApplyBtn: {
    backgroundColor: MAROON,
    borderRadius: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  couponAppliedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74,138,74,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(74,138,74,0.2)',
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  couponAppliedCode: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1B5E20',
  },
  couponAppliedLabel: {
    fontSize: 10,
    color: '#2E7D32',
    marginTop: 2,
  },
  couponRemove: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  couponMsg: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 6,
  },
  couponMsgSuccess: {
    color: '#16A34A',
  },
  couponMsgError: {
    color: '#DC2626',
  },
  breakdownBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(200, 160, 68, 0.12)',
    marginBottom: 12,
    gap: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#7A6A58',
  },
  breakdownVal: {
    fontSize: 12,
    fontWeight: '700',
    color: MAROON,
  },
  discountColor: {
    color: '#2E8B57',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: 'rgba(200,160,68,0.25)',
    marginVertical: 4,
  },
  grandTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: MAROON,
  },
  grandTotalVal: {
    fontSize: 20,
    fontWeight: '800',
    color: MAROON,
  },
  razorpayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5D7C3',
    padding: 16,
    alignItems: 'center',
    marginBottom: 4,
  },
  razorpayBrand: {
    fontSize: 13,
    fontWeight: '800',
    color: MAROON,
  },
  razorpaySub: {
    fontSize: 10,
    color: '#8B7355',
    marginTop: 4,
  },
  confirmBg: {
    backgroundColor: MAROON,
  },
  confirmScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmContent: {
    width: width * 0.9,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: GOLD,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: MAROON,
    marginBottom: 12,
  },
  confirmDesc: {
    fontSize: 12,
    color: '#5B4A32',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  orderIdBox: {
    backgroundColor: '#FAF6EF',
    borderWidth: 1,
    borderColor: '#E5D7C3',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  orderLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8B7355',
    letterSpacing: 0.5,
  },
  orderVal: {
    fontSize: 16,
    fontWeight: '800',
    color: MAROON,
    marginTop: 4,
  },
  orderMeta: {
    fontSize: 9,
    color: '#8B7355',
    marginTop: 6,
    textAlign: 'center',
  },
  confirmItemsBox: {
    width: '100%',
    marginBottom: 20,
  },
  confirmItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FAF3E8',
  },
  confirmItemImg: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  confirmItemName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3E3125',
  },
  confirmItemQty: {
    fontSize: 9,
    color: '#9a8c7a',
    marginTop: 2,
  },
  confirmItemPrice: {
    fontSize: 11,
    fontWeight: '800',
    color: MAROON,
  },
  confirmTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  confirmTotalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3E3125',
  },
  confirmTotalVal: {
    fontSize: 14,
    fontWeight: '800',
    color: MAROON,
  },
  confirmHomeBtn: {
    backgroundColor: MAROON,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 22,
  },
  confirmHomeBtnText: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '800',
  },
});
