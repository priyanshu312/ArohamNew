import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Lock, ChevronLeft, ChevronRight, CheckCircle, Truck, Trash2, Edit2 } from "lucide-react";
import { MAROON, GOLD, IVORY, SANS, SERIF } from "@nakshra/shared-config/theme";
import { INDIA_STATES } from "@nakshra/shared-config/data";
import { FloatingInput } from "@visual/components/auth/FloatingInput";
import { FloatingSelect } from "@visual/components/auth/FloatingSelect";
import { useCart } from "@nakshra/shared-state";
import { useAuth } from "@nakshra/shared-auth";
import { api } from "@nakshra/shared-api";
import { supabase } from "@nakshra/shared-services";

function CheckoutHeader() {
  const navigate = useNavigate();
  return (
    <div className="w-full" style={{ background: "rgba(250,247,242,0.97)", borderBottom: "1px solid rgba(91,31,36,0.08)", boxShadow: "0 1px 12px rgba(91,31,36,0.05)" }}>
      <div className="max-w-7xl mx-auto px-5 lg:px-10 h-14 lg:h-16 flex items-center justify-between">
        <button onClick={() => navigate("/")} className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: `linear-gradient(135deg,${MAROON},#E78B2F)`, color: IVORY, fontFamily: SERIF }}>ॐ</div>
          <span className="hidden sm:inline text-lg lg:text-xl font-semibold tracking-wide" style={{ fontFamily: SERIF, color: MAROON }}>Nakshra</span>
        </button>
        <span className="text-xs font-medium tracking-widest uppercase" style={{ color: "#9A8A78", letterSpacing: "0.12em" }}>Secure Checkout</span>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(200,160,68,0.1)", border: "1px solid rgba(200,160,68,0.22)" }}>
          <Lock size={10} style={{ color: GOLD }} /><span className="text-[10px] font-semibold" style={{ color: "#8B6914" }}>SSL Secured</span>
        </div>
      </div>
    </div>
  );
}

import { getShiprocketDeliveryEstimate, ShippingEstimate } from "@nakshra/shared-api/shipping";

export function ShippingPage() {
  const navigate = useNavigate();
  const { items, subtotal, openCart } = useCart();
  const { isLoggedIn, user } = useAuth();
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddr, setSelectedAddr] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(true);
  const [editingAddrId, setEditingAddrId] = useState<string | number | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "", pin: "", house: "", street: "", landmark: "", city: "", state: "", addressType: "Home", isDefault: false, saveAddress: true, sameBilling: true, specialRequest: "" });
  const [savingAddress, setSavingAddress] = useState(false);
  const [estimates, setEstimates] = useState<Record<string, ShippingEstimate>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});
  const set = (k: keyof typeof form) => (v: string | boolean) => { setForm(p => ({ ...p, [k]: v })); setValidationErrors(prev => ({ ...prev, [k]: false })); };

  const fetchEstimate = async (pincode: string) => {
    const pin = pincode.replace(/\D/g, "").slice(0, 6);
    if (pin.length === 6 && !estimates[pin]) {
      const est = await getShiprocketDeliveryEstimate(pin);
      if (est) {
        setEstimates(prev => ({ ...prev, [pin]: est }));
      }
    }
  };

  // Pre-fill phone from user profile & load persistent saved address
  // Pre-fill phone from user profile & load persistent saved addresses
  useEffect(() => {
    const loadAddresses = async () => {
      let localAddrs: any[] = [];
      const userPhone = user?.user_metadata?.phone ? String(user.user_metadata.phone).replace(/\D/g, "").slice(-10) : "";
      const userEmail = user?.email || "";

      // 1. Read pre-filled shipping form (account-separated)
      try {
        const formKey = user?.id ? `Nakshra_saved_shipping_form_${user.id}` : "Nakshra_saved_shipping_form_guest";
        const savedForm = localStorage.getItem(formKey);
        if (savedForm) {
          const parsed = JSON.parse(savedForm);
          setForm(prev => ({ ...prev, ...parsed }));
          if (parsed.pin) fetchEstimate(parsed.pin);
        }
      } catch (e) {}

      // 2. Read local cache
      try {
        if (user?.id) {
          const uStr = localStorage.getItem(`Nakshra_user_addresses_${user.id}`);
          if (uStr) {
            const parsed = JSON.parse(uStr);
            if (Array.isArray(parsed) && parsed.length > 0) localAddrs = parsed;
          }
        } else {
          const gStr = localStorage.getItem("Nakshra_saved_addresses_list");
          if (gStr) {
            const parsed = JSON.parse(gStr);
            if (Array.isArray(parsed) && parsed.length > 0) localAddrs = parsed;
          }
        }
      } catch (e) {}

      let combined: any[] = [...localAddrs];

      // 3. Fetch from Supabase addresses table matching this account
      try {
        const query = supabase.from("addresses").select("*");
        let hasFilter = false;
        if (user?.id) {
          query.or(`user_id.eq.${user.id},user_phone.eq.${userPhone},phone.ilike.%${userPhone}%`);
          hasFilter = true;
        } else if (userPhone) {
          query.or(`user_phone.eq.${userPhone},phone.ilike.%${userPhone}%`);
          hasFilter = true;
        }

        if (hasFilter) {
          const { data: dbAddrs } = await query;
          if (dbAddrs && dbAddrs.length > 0) {
            dbAddrs.forEach((a: any) => {
              const aPhone = String(a.phone || "").replace(/\D/g, "").slice(-10);
              const aEmail = String(a.email || "").trim().toLowerCase();
              const matches = (user?.id && String(a.user_id) === String(user.id)) ||
                              (userPhone && aPhone && aPhone === userPhone) ||
                              (userEmail && aEmail && aEmail === userEmail.toLowerCase());

              if (matches) {
                const fullAddr = a.address || a.line1 || "";
                if (!combined.some(existing => String(existing.id) === String(a.id) || (existing.address === fullAddr && existing.pincode === a.pincode))) {
                  combined.push(a);
                }
                if (user?.id && (!a.user_id || a.user_id !== user.id)) {
                  Promise.resolve(supabase.from("addresses").update({ user_id: user.id }).eq("id", a.id)).catch(() => {});
                }
              }
            });
          }
        }
      } catch (e) {}

      // 4. Extract addresses from past orders (guarantees order shipping addresses are never lost)
      try {
        const orderQuery = supabase.from("orders").select("*");
        let hasOrderFilter = false;
        if (user?.id) {
          orderQuery.or(`user_id.eq.${user.id},user_phone.eq.${userPhone}`);
          hasOrderFilter = true;
        } else if (userPhone) {
          orderQuery.eq("user_phone", userPhone);
          hasOrderFilter = true;
        }

        if (hasOrderFilter) {
          const { data: dbOrders } = await orderQuery;
          if (dbOrders && dbOrders.length > 0) {
            dbOrders.forEach((o: any) => {
              const sa = o.shipping_address || o.address;
              if (sa && (sa.address || sa.line1 || sa.house)) {
                const saPhone = String(sa.phone || o.phone || "").replace(/\D/g, "").slice(-10);
                const saEmail = String(sa.email || o.email || "").trim().toLowerCase();
                const matches = (user?.id && String(o.user_id) === String(user.id)) ||
                                (userPhone && saPhone && saPhone === userPhone) ||
                                (userEmail && saEmail && saEmail === userEmail.toLowerCase());

                if (matches) {
                  const addrText = sa.address || sa.line1 || `${sa.house || ''}, ${sa.street || ''}`.trim();
                  const pinCode = sa.pincode || sa.pin || "";
                  if (addrText && !combined.some(existing => (existing.address || existing.line1) === addrText)) {
                    combined.push({
                      id: `order-addr-${o.id}`,
                      user_id: user?.id || null,
                      name: sa.full_name || sa.name || "Devotee",
                      phone: saPhone || userPhone,
                      email: saEmail || userEmail,
                      address: addrText,
                      line1: addrText,
                      house: sa.house || "",
                      street: sa.street || "",
                      city: sa.city || "",
                      state: sa.state || "",
                      pincode: pinCode,
                      pin: pinCode,
                      address_type: sa.address_type || sa.addressType || "Home"
                    });
                  }
                }
              }
            });
          }
        }
      } catch (e) {}

      if (combined.length > 0) {
        setSavedAddresses(combined);
        setSelectedAddr(combined[0].id);
        setShowForm(false);
        combined.forEach((a: any) => {
          const p = String(a.pincode || a.pin || "");
          if (p) fetchEstimate(p);
        });

        // Persist combined addresses in local storage
        try {
          if (user?.id) {
            localStorage.setItem(`Nakshra_user_addresses_${user.id}`, JSON.stringify(combined));
          } else {
            localStorage.setItem("Nakshra_saved_addresses_list", JSON.stringify(combined));
          }
        } catch (e) {}
      } else {
        setShowForm(true);
      }
    };

    loadAddresses();

    if (user?.user_metadata?.phone) {
      const userPhone = String(user.user_metadata.phone).replace(/\D/g, "");
      const cleanPhone = userPhone.length > 10 ? userPhone.slice(-10) : userPhone;
      setForm(prev => ({ ...prev, phone: prev.phone || cleanPhone }));
    }
    if (user?.email) {
      setForm(prev => ({ ...prev, email: prev.email || user.email || "" }));
    }
    if (user?.user_metadata?.full_name) {
      const nameParts = (user.user_metadata.full_name || "").trim().split(" ");
      setForm(prev => ({
        ...prev,
        firstName: prev.firstName || nameParts[0] || "",
        lastName: prev.lastName || nameParts.slice(1).join(" ") || ""
      }));
    }
  }, [user]);

  // Save selected address to sessionStorage so PaymentPage can use it
  const getSelectedAddressObj = () => {
    const found = savedAddresses.find(a => a.id === selectedAddr) || null;
    if (!found) return null;
    const pin = String(found.pincode || found.pin || "").replace(/\D/g, "").slice(0, 6);
    const est = estimates[pin];
    return {
      ...found,
      deliveryDate: est?.deliveryDate || found.deliveryDate || "3–5 business days"
    };
  };

  const [formErrorMsg, setFormErrorMsg] = useState("");

  // Save new address and proceed to payment
  const handleSaveAddress = async () => {
    const errors: Record<string, boolean> = {};
    const missing: string[] = [];
    setFormErrorMsg("");
    if (!form.firstName.trim()) { errors.firstName = true; missing.push("First Name"); }
    if (!form.phone.trim() || form.phone.replace(/\D/g, "").length < 10) { errors.phone = true; missing.push("Mobile Phone Number"); }
    if (!form.pin.trim() || form.pin.replace(/\D/g, "").length !== 6) { errors.pin = true; missing.push("6-Digit PIN Code"); }
    if (!form.house.trim()) { errors.house = true; missing.push("House / Flat No."); }
    if (!form.city.trim()) { errors.city = true; missing.push("City"); }

    if (missing.length > 0) {
      setValidationErrors(errors);
      setFormErrorMsg(`Please fill in: ${missing.join(", ")}`);
      return;
    }

    setSavingAddress(true);
    const est = estimates[form.pin];

    // Save to LocalStorage for automatic pre-fill next time (account-separated)
    try {
      const formKey = user?.id ? `Nakshra_saved_shipping_form_${user.id}` : "Nakshra_saved_shipping_form_guest";
      localStorage.setItem(formKey, JSON.stringify(form));
      const newAddrItem = {
        id: editingAddrId || Date.now(),
        full_name: `${form.firstName} ${form.lastName}`.trim(),
        name: `${form.firstName} ${form.lastName}`.trim(),
        phone: form.phone.replace(/\D/g, "").slice(-10),
        email: form.email,
        house: form.house,
        street: form.street,
        landmark: form.landmark,
        line1: `${form.house}${form.street ? ", " + form.street : ""}${form.landmark ? ", " + form.landmark : ""}`.trim(),
        address: `${form.house}${form.street ? ", " + form.street : ""}${form.landmark ? ", " + form.landmark : ""}`.trim(),
        city: form.city,
        state: form.state,
        pin: form.pin,
        pincode: form.pin,
        address_type: form.addressType,
        deliveryDate: est?.deliveryDate || "3–5 business days",
        specialRequest: form.specialRequest
      };

      setSavedAddresses(prev => {
        const filtered = prev.filter(a => a.id !== editingAddrId);
        const updated = [newAddrItem, ...filtered];
        if (user?.id) {
          localStorage.setItem(`Nakshra_user_addresses_${user.id}`, JSON.stringify(updated));
        } else {
          localStorage.setItem("Nakshra_saved_addresses_list", JSON.stringify(updated));
        }
        return updated;
      });
      setSelectedAddr(typeof newAddrItem.id === "number" ? newAddrItem.id : Number(newAddrItem.id) || Date.now());
    } catch (e) {}

    try {
      const payload = {
        name: `${form.firstName} ${form.lastName}`.trim(),
        phone: form.phone.replace(/\D/g, "").slice(-10),
        email: form.email,
        address: `${form.house}${form.street ? ", " + form.street : ""}${form.landmark ? ", " + form.landmark : ""}`.trim(),
        city: form.city,
        state: form.state,
        pincode: form.pin,
        address_type: form.addressType,
      };

      if (user?.id) {
        const dbPayload: any = {
          user_id: user.id,
          user_phone: user?.user_metadata?.phone ? String(user.user_metadata.phone).replace(/\D/g, "").slice(-10) : form.phone.replace(/\D/g, "").slice(-10),
          name: `${form.firstName} ${form.lastName}`.trim(),
          phone: form.phone.replace(/\D/g, "").slice(-10),
          email: form.email,
          address: `${form.house}${form.street ? ", " + form.street : ""}${form.landmark ? ", " + form.landmark : ""}`.trim(),
          city: form.city,
          state: form.state,
          pincode: form.pin,
          house: form.house,
          street: form.street,
          landmark: form.landmark,
          address_type: form.addressType
        };
        if (typeof editingAddrId === 'number') {
          dbPayload.id = editingAddrId;
        }
        Promise.resolve(supabase.from("addresses").upsert(dbPayload))
          .catch(err => console.warn("Supabase address save warning:", err));
      }

      let savedObj: any = null;
      if (editingAddrId) {
        const result = await api(`/addresses/${editingAddrId}`, { method: "PUT", body: JSON.stringify(payload) }).catch(() => null);
        savedObj = result?.data || result;
      } else {
        const result = await api("/addresses", { method: "POST", body: JSON.stringify(payload) }).catch(() => null);
        savedObj = result?.data || result;
      }

      const finalAddrObj = {
        id: Date.now(),
        full_name: `${form.firstName} ${form.lastName}`.trim(),
        name: `${form.firstName} ${form.lastName}`.trim(),
        phone: form.phone.replace(/\D/g, "").slice(-10),
        email: form.email,
        line1: `${form.house}, ${form.street}${form.landmark ? ", " + form.landmark : ""}`.trim(),
        city: form.city,
        state: form.state,
        pin: form.pin,
        pincode: form.pin,
        deliveryDate: est?.deliveryDate || "3–5 business days",
        specialRequest: form.specialRequest,
        ...savedObj
      };

      sessionStorage.setItem("Nakshra_shipping_addr", JSON.stringify(finalAddrObj));
      navigate("/checkout/payment");
    } catch (e: any) {
      const fallbackObj = {
        id: Date.now(),
        full_name: `${form.firstName} ${form.lastName}`.trim(),
        phone: form.phone.replace(/\D/g, "").slice(-10),
        email: form.email,
        line1: `${form.house}, ${form.street}${form.landmark ? ", " + form.landmark : ""}`.trim(),
        city: form.city,
        state: form.state,
        pin: form.pin,
        deliveryDate: est?.deliveryDate || "3–5 business days",
        specialRequest: form.specialRequest
      };
      sessionStorage.setItem("Nakshra_shipping_addr", JSON.stringify(fallbackObj));
      navigate("/checkout/payment");
    } finally {
      setSavingAddress(false);
    }
  };

  const handleEditAddress = (addr: any) => {
    const nameParts = (addr.full_name || addr.name || "").trim().split(" ");
    setEditingAddrId(addr.id);

    let houseVal = (addr.house || "").trim();
    let streetVal = (addr.street || "").trim();

    if (!houseVal && (addr.address || addr.line1 || addr.address_line1)) {
      houseVal = (addr.address || addr.line1 || addr.address_line1 || "").trim();
    }

    // Clean houseVal if it accidentally contains a comma or merged street address
    if (houseVal.includes(",")) {
      const parts = houseVal.split(",");
      houseVal = parts[0].trim();
      if (!streetVal) {
        streetVal = parts.slice(1).join(",").trim();
      }
    }

    setForm(prev => ({
      ...prev,
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" ") || "",
      phone: addr.phone || prev.phone,
      email: addr.email || prev.email,
      pin: String(addr.pincode || addr.pin || ""),
      house: houseVal,
      street: streetVal,
      landmark: addr.landmark || "",
      city: addr.city || "",
      state: addr.state || "",
      addressType: addr.address_type || addr.type || "Home",
    }));
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteAddress = async (addrId: string | number) => {
    if (!confirm("Delete this address?")) return;

    // 1. Update state & localStorage immediately with type-safe string matching
    setSavedAddresses(prev => {
      const updated = prev.filter(a => String(a.id) !== String(addrId));
      localStorage.setItem("Nakshra_saved_addresses_list", JSON.stringify(updated));
      if (updated.length === 0) {
        setShowForm(true);
      }
      return updated;
    });

    if (String(selectedAddr) === String(addrId)) {
      setSelectedAddr(null);
    }

    // 2. Delete from Supabase / API in background
    try {
      if (user?.id) {
        Promise.resolve(supabase.from("addresses").delete().eq("id", addrId)).catch(() => {});
      }
      await api(`/addresses/${addrId}`, { method: "DELETE" }).catch(() => {});
    } catch (e) {
      console.warn("Delete address backend warning:", e);
    }
  };

  const handlePinChange = async (val: string) => {
    const cleanVal = val.replace(/\D/g, "").slice(0, 6);
    setForm(prev => ({ ...prev, pin: cleanVal }));
    setValidationErrors(prev => ({ ...prev, pin: false }));
    if (cleanVal.length === 6) {
      fetchEstimate(cleanVal);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${cleanVal}`);
        const data = await res.json();
        if (data && data[0] && data[0].Status === "Success") {
          const postOffice = data[0].PostOffice[0];
          const city = postOffice.District;
          const state = postOffice.State;
          setForm(prev => ({
            ...prev,
            city: city || prev.city,
            state: state || prev.state
          }));
        }
      } catch (e) {
        console.error("Failed to auto-fetch city/state from pincode", e);
      }
    }
  };

  // Restore address from sessionStorage if returning to page
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("Nakshra_shipping_addr");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed) {
          const nameParts = (parsed.full_name || parsed.name || "").trim().split(" ");
          const fName = nameParts[0] || "";
          const lName = nameParts.slice(1).join(" ") || "";
          const pPin = String(parsed.pincode || parsed.pin || "").replace(/\D/g, "").slice(0, 6);

          setForm(prev => ({
            ...prev,
            firstName: fName || prev.firstName,
            lastName: lName || prev.lastName,
            phone: parsed.phone || prev.phone,
            email: parsed.email || prev.email,
            pin: pPin || prev.pin,
            house: parsed.house || parsed.address_line1 || parsed.line1 || prev.house,
            street: parsed.street || prev.street,
            landmark: parsed.landmark || prev.landmark,
            city: parsed.city || prev.city,
            state: parsed.state || prev.state,
            specialRequest: parsed.specialRequest || prev.specialRequest,
          }));

          if (pPin) {
            fetchEstimate(pPin);
          }
        }
      }
    } catch (e) {
      console.error("Address restoration error:", e);
    }
  }, []);



  const fieldBorder = (key: string) => validationErrors[key] ? "2px solid #E53E3E" : undefined;

  const handleProceedToPayment = async () => {
    const selected = getSelectedAddressObj();

    // 1. If user is selecting from saved addresses (!showForm)
    if (!showForm) {
      if (selected) {
        sessionStorage.setItem("Nakshra_shipping_addr", JSON.stringify({ ...selected, specialRequest: form.specialRequest }));
        navigate("/checkout/payment");
        return;
      } else if (savedAddresses.length > 0) {
        // Fallback: use first saved address if selectedAddr was somehow lost
        const fallback = savedAddresses[0];
        const pin = String(fallback.pincode || fallback.pin || "").replace(/\D/g, "").slice(0, 6);
        const est = estimates[pin];
        const addrObj = {
          ...fallback,
          courier: est?.courier || fallback.courier || "Shiprocket Express",
          deliveryDate: est?.deliveryDate || fallback.deliveryDate || "3–5 business days",
          specialRequest: form.specialRequest
        };
        sessionStorage.setItem("Nakshra_shipping_addr", JSON.stringify(addrObj));
        navigate("/checkout/payment");
        return;
      }
    }

    // 2. User is entering a new address (showForm === true)
    const errors: Record<string, boolean> = {};
    const missing: string[] = [];
    if (!form.firstName.trim()) { errors.firstName = true; missing.push("First Name"); }
    if (!form.phone.trim() || form.phone.replace(/\D/g, "").length < 10) { errors.phone = true; missing.push("Mobile Phone Number"); }
    if (!form.pin.trim() || form.pin.replace(/\D/g, "").length !== 6) { errors.pin = true; missing.push("6-Digit PIN Code"); }
    if (!form.house.trim()) { errors.house = true; missing.push("House / Flat No."); }
    if (!form.city.trim()) { errors.city = true; missing.push("City"); }

    if (missing.length > 0) {
      setValidationErrors(errors);
      setFormErrorMsg(`Please fill in: ${missing.join(", ")}`);
      setShowForm(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const est = estimates[form.pin];
    const newAddressObj = {
      id: Date.now(),
      full_name: `${form.firstName} ${form.lastName}`.trim(),
      name: `${form.firstName} ${form.lastName}`.trim(),
      phone: form.phone.replace(/\D/g, "").slice(-10),
      email: form.email,
      address_line1: `${form.house}${form.street ? ", " + form.street : ""}${form.landmark ? ", " + form.landmark : ""}`.trim(),
      line1: `${form.house}${form.street ? ", " + form.street : ""}${form.landmark ? ", " + form.landmark : ""}`.trim(),
      city: form.city,
      state: form.state,
      pincode: form.pin,
      pin: form.pin,
      address_type: form.addressType,
      courier: est?.courier || "Shiprocket Express",
      deliveryDate: est?.deliveryDate || "3–5 business days",
      specialRequest: form.specialRequest,
    };

    // Auto-save new address to savedAddresses list & local storage
    setSavedAddresses(prev => {
      const updated = [newAddressObj, ...prev.filter(a => String(a.id) !== String(newAddressObj.id))];
      try {
        if (user?.id) {
          localStorage.setItem(`Nakshra_user_addresses_${user.id}`, JSON.stringify(updated));
        } else {
          localStorage.setItem("Nakshra_saved_addresses_list", JSON.stringify(updated));
        }
      } catch (e) {}
      return updated;
    });

    const userPhone = user?.user_metadata?.phone ? String(user.user_metadata.phone).replace(/\D/g, "").slice(-10) : newAddressObj.phone;

    Promise.resolve(supabase.from("addresses").insert({
      user_id: user?.id || null,
      user_phone: userPhone,
      name: newAddressObj.name,
      phone: newAddressObj.phone,
      email: newAddressObj.email,
      address: newAddressObj.address_line1,
      line1: newAddressObj.line1,
      city: newAddressObj.city,
      state: newAddressObj.state,
      pincode: newAddressObj.pincode,
      house: form.house,
      street: form.street,
      landmark: form.landmark,
      address_type: newAddressObj.address_type || "Home"
    })).catch(err => console.warn("Supabase address auto-save warning:", err));

    if (isLoggedIn) {
      try {
        await api("/addresses", {
          method: "POST",
          body: JSON.stringify({
            name: newAddressObj.name,
            phone: newAddressObj.phone,
            email: newAddressObj.email,
            address: newAddressObj.address_line1,
            city: newAddressObj.city,
            state: newAddressObj.state,
            pincode: newAddressObj.pincode,
          })
        });
      } catch (e) {
        console.error("Address sync error:", e);
      }
    }

    sessionStorage.setItem("Nakshra_shipping_addr", JSON.stringify(newAddressObj));
    navigate("/checkout/payment");
  };


  return (
    <div className="w-full overflow-x-hidden" style={{ background: "#FAF7F2", minHeight: "100vh", fontFamily: SANS }}>
      <CheckoutHeader />
      <div className="pt-4 pb-4 sm:pt-6 sm:pb-6 lg:pt-8 lg:pb-6 relative overflow-hidden" style={{ background: "linear-gradient(135deg,#F5EDE0,#FAF7F2,#F0E8D8)" }}>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `repeating-linear-gradient(0deg,${MAROON} 0,${MAROON} 1px,transparent 1px,transparent 48px),repeating-linear-gradient(90deg,${MAROON} 0,${MAROON} 1px,transparent 1px,transparent 48px)` }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <button
            onClick={() => navigate("/shop")}
            className="inline-flex items-center gap-2 mb-3 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all hover:shadow-md active:scale-95"
            style={{ background: "#FFFFFF", color: MAROON, border: `1px solid rgba(91,31,36,0.15)`, boxShadow: "0 2px 8px rgba(91,31,36,0.08)" }}
          >
            <ChevronLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-2 mb-2 text-xs" style={{ color: "#9A8A78" }}>
            <span style={{ color: MAROON }}>Cart</span><ChevronRight size={12} /><span className="font-medium" style={{ color: MAROON }}>Delivery Details</span><ChevronRight size={12} /><span>Payment</span>
          </div>
          <h1 className="mb-1" style={{ fontFamily: SERIF, fontSize: "clamp(1.5rem,4vw,2.5rem)", fontWeight: 500, color: MAROON, lineHeight: 1.1 }}>Delivery Details</h1>
          <p className="text-xs sm:text-sm" style={{ color: "#7A6A58" }}>Tell us where you'd like your sacred products delivered.</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 pb-48 lg:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 sm:gap-10 items-start">
          <div>
            {savedAddresses.length > 0 && !showForm && (
              <div className="space-y-4">
                <div className="rounded-3xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid rgba(91,31,36,0.08)", boxShadow: "0 2px 20px rgba(91,31,36,0.04)" }}>
                  <div className="px-4 sm:px-6 pt-5 pb-4 flex items-center justify-between gap-2" style={{ borderBottom: "1px solid rgba(91,31,36,0.06)" }}>
                    <h2 className="text-base sm:text-lg font-semibold leading-tight" style={{ fontFamily: SERIF, color: MAROON }}>Select Delivery Address</h2>
                    <button onClick={() => { setEditingAddrId(null); setShowForm(true); }} className="text-[11px] sm:text-xs font-bold px-3.5 py-2 rounded-full transition-all hover:opacity-90 flex-shrink-0" style={{ background: "rgba(91,31,36,0.08)", color: MAROON }}>+ Add New Address</button>
                  </div>

                  <div className="p-4 sm:p-6 space-y-3">
                    {savedAddresses.map(addr => {
                      const sel = selectedAddr === addr.id;
                      const addrLine = [addr.line1 || addr.address_line1 || addr.address, addr.city, addr.state].filter(Boolean).join(", ");
                      return (
                        <div key={addr.id} onClick={() => setSelectedAddr(addr.id)}
                          className="group relative p-4 sm:p-5 rounded-2xl cursor-pointer transition-all duration-200 overflow-hidden"
                          style={{ border: `1.5px solid ${sel ? GOLD : "rgba(91,31,36,0.1)"}`, background: sel ? "rgba(200,160,68,0.05)" : "#FAFAF8", boxShadow: sel ? `0 0 0 3px rgba(200,160,68,0.1)` : "none" }}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5 flex-1 min-w-0">
                              <div className="mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-colors" style={{ border: `2px solid ${sel ? GOLD : "rgba(91,31,36,0.25)"}`, background: sel ? GOLD : "transparent" }}>
                                {sel && <div className="w-2 h-2 rounded-full bg-white" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="text-sm font-bold uppercase tracking-wider" style={{ fontFamily: SANS, color: MAROON }}>{addr.address_type || addr.type || "Home"}</span>
                                  {(addr.is_default || addr.isDefault) && <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: "rgba(200,160,68,0.15)", color: "#8B6914" }}>DEFAULT</span>}
                                </div>
                                <p className="text-xs font-semibold mb-0.5 truncate" style={{ color: "#3A2A1A" }}>{addr.full_name || addr.name} · {addr.phone}</p>
                                <p className="text-xs leading-relaxed break-words" style={{ color: "#7A6A58" }}>{addrLine} – {addr.pincode || addr.pin}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button onClick={(e) => { e.stopPropagation(); handleEditAddress(addr); }} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold hover:bg-amber-50 flex items-center gap-1" style={{ color: MAROON, border: "1px solid rgba(91,31,36,0.15)" }}>
                                <Edit2 size={11} /> <span className="hidden sm:inline">Edit</span>
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteAddress(addr.id); }} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold hover:bg-red-50 flex items-center gap-1" style={{ color: "#C04040", border: "1px solid rgba(192,64,64,0.15)" }}>
                                <Trash2 size={11} /> <span className="hidden sm:inline">Delete</span>
                              </button>
                            </div>
                          </div>

                          {sel && (() => {
                            const pin = String(addr.pincode || addr.pin || "").replace(/\D/g, "").slice(0, 6);
                            const est = estimates[pin];
                            const dateStr = est?.deliveryDate || "3–5 business days";
                            return (
                              <div className="mt-3 pt-2.5 flex items-center gap-2" style={{ borderTop: "1px solid rgba(200,160,68,0.2)" }}>
                                <Truck size={14} style={{ color: "#4A8A4A", flexShrink: 0 }} />
                                <span className="text-xs font-semibold" style={{ color: "#4A8A4A" }}>
                                  Expected delivery by <strong>{dateStr}</strong> · Free Shipping
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => { setEditingAddrId(null); setShowForm(true); }}
                  className="w-full p-4 rounded-3xl border-2 border-dashed flex items-center justify-center gap-2 text-xs font-bold transition-all hover:bg-black/5"
                  style={{ borderColor: "rgba(91,31,36,0.2)", color: MAROON, background: "#FFFFFF" }}
                >
                  + Add New Address
                </button>
              </div>
            )}

            {(showForm || savedAddresses.length === 0) && (
              <div className="rounded-3xl overflow-hidden mt-0" style={{ background: "#FFFFFF", border: "1px solid rgba(91,31,36,0.08)", boxShadow: "0 2px 20px rgba(91,31,36,0.04)" }}>
                <div className="px-4 sm:px-6 pt-5 pb-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(91,31,36,0.06)" }}>
                  <h2 className="text-base sm:text-lg font-semibold" style={{ fontFamily: SERIF, color: MAROON }}>{editingAddrId ? "Edit Address" : "New Address"}</h2>
                  {savedAddresses.length > 0 && (
                    <button onClick={() => { setShowForm(false); setEditingAddrId(null); }} className="text-xs font-semibold px-3 py-1.5 sm:px-4 sm:py-2 rounded-full transition-all hover:opacity-80" style={{ background: "rgba(91,31,36,0.07)", color: MAROON }}>← Back to Saved Addresses</button>
                  )}
                </div>
                <div className="p-4 sm:p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div style={{ border: fieldBorder("firstName"), borderRadius: 16 }}><FloatingInput label="First Name" value={form.firstName} onChange={set("firstName") as (v: string) => void} required /></div>
                    <FloatingInput label="Last Name" value={form.lastName} onChange={set("lastName") as (v: string) => void} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: MAROON, fontFamily: SANS }}>Mobile Phone Number *</label>
                      <div className="flex items-center rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: fieldBorder("phone") || "1.5px solid rgba(91,31,36,0.14)" }}>
                        <span className="px-3 py-3 text-xs font-bold border-r flex items-center gap-1 flex-shrink-0 select-none" style={{ background: "rgba(91,31,36,0.04)", color: MAROON, borderColor: "rgba(91,31,36,0.1)", fontFamily: SANS }}>
                          🇮🇳 +91
                        </span>
                        <input
                          type="tel"
                          autoComplete="off"
                          placeholder="10-digit mobile number"
                          maxLength={10}
                          value={form.phone}
                          onChange={e => set("phone")(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          className="flex-1 px-3 py-3 text-sm bg-transparent outline-none font-medium"
                          style={{ color: MAROON, fontFamily: SANS }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: MAROON, fontFamily: SANS }}>Email Address (Optional)</label>
                      <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: fieldBorder("email") || "1.5px solid rgba(91,31,36,0.14)" }}>
                        <input
                          type="email"
                          autoComplete="off"
                          placeholder="name@example.com"
                          value={form.email}
                          onChange={e => (set("email") as (v: string) => void)(e.target.value)}
                          className="w-full px-4 py-3 text-sm bg-transparent outline-none font-medium"
                          style={{ color: MAROON, fontFamily: SANS }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div style={{ border: fieldBorder("pin"), borderRadius: 16 }}><FloatingInput label="PIN Code" value={form.pin} onChange={handlePinChange} required /></div>
                    <div style={{ border: fieldBorder("house"), borderRadius: 16 }}><FloatingInput label="House / Flat No." value={form.house} onChange={set("house") as (v: string) => void} required /></div>
                  </div>
                  <div style={{ border: fieldBorder("street"), borderRadius: 16 }}>
                    <FloatingInput label="Street Address (Optional)" value={form.street} onChange={set("street") as (v: string) => void} />
                  </div>
                  <FloatingInput label="Landmark (Optional)" value={form.landmark} onChange={set("landmark") as (v: string) => void} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div style={{ border: fieldBorder("city"), borderRadius: 16 }}><FloatingInput label="City" value={form.city} onChange={set("city") as (v: string) => void} required /></div>
                    <FloatingSelect label="State" options={INDIA_STATES} value={form.state} onChange={set("state") as (v: string) => void} />
                  </div>

                  {/* Address Type Selector & Default option */}
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold mb-2" style={{ color: "#7A6A58" }}>Save Address As</label>
                      <div className="flex gap-2">
                        {["Home", "Office", "Other"].map(type => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => set("addressType")(type)}
                            className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                            style={{
                              background: form.addressType === type ? MAROON : "#FAF7F2",
                              color: form.addressType === type ? IVORY : MAROON,
                              border: `1.5px solid ${form.addressType === type ? MAROON : "rgba(91,31,36,0.15)"}`
                            }}
                          >
                            {type === "Home" ? "🏠 Home" : type === "Office" ? "🏢 Office" : "📍 Other"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={form.isDefault || false}
                        onChange={e => set("isDefault")(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-700 focus:ring-amber-500 cursor-pointer"
                      />
                      <span className="text-xs font-semibold" style={{ color: MAROON }}>Make this my default delivery address</span>
                    </label>
                  </div>
                  {form.pin.length === 6 && estimates[form.pin] && (
                    <div className="p-3.5 rounded-2xl flex items-center gap-2.5 my-2" style={{ background: "rgba(74,138,74,0.08)", border: "1px solid rgba(74,138,74,0.2)" }}>
                      <Truck size={15} style={{ color: "#4A8A4A", flexShrink: 0 }} />
                      <span className="text-xs font-semibold" style={{ color: "#4A8A4A" }}>
                        Expected delivery by <strong>{estimates[form.pin].deliveryDate}</strong> · Free Shipping
                      </span>
                    </div>
                  )}
                  {formErrorMsg && (
                    <div className="p-3 rounded-xl text-center" style={{ background: "rgba(229,62,62,0.08)", border: "1px solid rgba(229,62,62,0.2)" }}>
                      <p className="text-xs font-semibold text-red-600">{formErrorMsg}</p>
                    </div>
                  )}
                  <button
                    onClick={handleSaveAddress}
                    disabled={savingAddress}
                    className="w-full py-4 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 mt-2 transition-all hover:opacity-90 disabled:opacity-60"
                    style={{ background: `linear-gradient(135deg,${MAROON},#7A2A30)`, color: IVORY }}>
                    {savingAddress
                      ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Saving…</>
                      : <><CheckCircle size={15} /> {editingAddrId ? "Update Address" : "Save & Deliver Here"}</>}
                  </button>
                </div>
              </div>
            )}
            <div className="rounded-3xl overflow-hidden mt-4" style={{ background: "#FFFFFF", border: "1px solid rgba(91,31,36,0.08)" }}>
              <div className="px-6 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(91,31,36,0.06)" }}>
                <h2 className="text-base font-semibold" style={{ fontFamily: SERIF, color: MAROON }}>Special Delivery Instructions</h2>
              </div>
              <div className="p-6">
                <textarea value={form.specialRequest} onChange={e => set("specialRequest")(e.target.value)} rows={3}
                  placeholder="E.g., Leave at door, call before delivery, gift wrapping..." className="w-full px-4 py-3 rounded-2xl text-sm outline-none resize-none transition-all"
                  style={{ border: "1.5px solid rgba(91,31,36,0.12)", background: "#FAF7F2", color: "#222222", fontFamily: SANS }}
                  onFocus={e => { e.target.style.borderColor = GOLD; }} onBlur={e => { e.target.style.borderColor = "rgba(91,31,36,0.12)"; }} />
              </div>
            </div>
          </div>

          {/* Desktop-only order summary sidebar */}
          <div className="hidden lg:block">
            <div className="lg:sticky lg:top-24 rounded-3xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid rgba(91,31,36,0.08)", boxShadow: "0 4px 30px rgba(91,31,36,0.07)" }}>
              <div className="px-6 pt-4 pb-3" style={{ borderBottom: "1px solid rgba(91,31,36,0.06)" }}>
                <h2 className="text-lg font-semibold" style={{ fontFamily: SERIF, color: MAROON }}>Order Summary</h2>
              </div>
              <div className="px-6 py-3 space-y-2" style={{ borderBottom: "1px solid rgba(91,31,36,0.06)" }}>
                {items.map(({ product: p, qty }) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-amber-50"><img src={p.img} alt={p.name} className="w-full h-full object-cover" /></div>
                    <div className="flex-1 min-w-0"><p className="text-xs font-semibold truncate" style={{ fontFamily: SERIF, color: MAROON }}>{p.name}</p><p className="text-[10px]" style={{ color: "#9A8A78" }}>Qty: {qty}</p></div>
                  </div>
                ))}
              </div>
              <div className="px-6 py-3 space-y-2">
                <div className="flex justify-between text-sm"><span style={{ color: "#7A6A58" }}>Subtotal</span><span style={{ color: MAROON, fontWeight: 600 }}>₹{subtotal.toLocaleString("en-IN")}</span></div>
                <div className="flex justify-between text-sm"><span style={{ color: "#7A6A58" }}>Shipping</span><span style={{ color: "#4A8A4A", fontWeight: 600 }}>FREE</span></div>
              </div>
              <div className="px-6 pb-4 space-y-2">
                <button onClick={handleProceedToPayment}
                  className="w-full py-4 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 hover:shadow-lg"
                  style={{ background: `linear-gradient(135deg,${MAROON},#7A2A30)`, color: IVORY }}>
                  <Lock size={14} /> Proceed to Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom bar — address page is address-only */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-5 py-4" style={{ background: "#FFFFFF", borderTop: "1px solid rgba(91,31,36,0.08)", boxShadow: "0 -4px 20px rgba(91,31,36,0.08)" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs" style={{ color: "#7A6A58" }}>{items.length} item{items.length !== 1 ? "s" : ""} · Subtotal</span>
          <span className="text-base font-semibold" style={{ color: MAROON, fontFamily: SERIF }}>₹{subtotal.toLocaleString("en-IN")}</span>
        </div>
        <button onClick={handleProceedToPayment}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90"
          style={{ background: `linear-gradient(135deg,${MAROON},#7A2A30)`, color: IVORY }}>
          <Lock size={14} /> Proceed to Payment
        </button>
      </div>

    </div>
  );
}
