import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ChevronLeft, User, Package, Truck, CheckCircle, Edit2, Save, X, Calendar, ChevronDown, MapPin, Trash2, Plus, LogOut } from "lucide-react";
import { MAROON, GOLD, IVORY, SANS, SERIF, PRICE_FONT } from "@nakshra/shared-config/theme";
import { useAuth } from "@nakshra/shared-auth";
import { api } from "@nakshra/shared-api";
import * as Select from "@radix-ui/react-select";
import * as Popover from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { supabase } from "@nakshra/shared-services";
import { db } from "@nakshra/shared-services";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { INDIA_STATES } from "@nakshra/shared-config/data";

const ORDER_STEPS = [
  { label: "Ordered", icon: "✓" },
  { label: "Processing", icon: "🪔" },
  { label: "Shipped", icon: "🚚" },
  { label: "Delivered", icon: "🏠" },
];

function getOrderStep(status: string, awbCode?: string) {
  if (status === "CANCELLED" || status === "Cancelled") return -1;
  if (status === "Delivered" || status === "DELIVERED") return 3;
  if (awbCode || status === "SHIPPED" || status === "Shipped") return 2;
  if (status === "CONFIRMED" || status === "Processing") return 1;
  return 0; // Ordered
}

export function ProfilePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "addresses" | "orders">(
    (searchParams.get("tab") as "profile" | "addresses" | "orders") || "profile"
  );

  // Synchronize activeTab with URL search params whenever user clicks navbar header profile icon
  useEffect(() => {
    const tabParam = searchParams.get("tab") as "profile" | "addresses" | "orders" | null;
    if (tabParam === "addresses" || tabParam === "orders" || tabParam === "profile") {
      setActiveTab(tabParam);
    } else {
      setActiveTab("profile");
    }
  }, [searchParams]);
  const [orders, setOrders] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  // Edit Profile Form state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    gender: "",
    dob: "",
    pobCity: ""
  });

  // Address Manager State
  const [profileAddresses, setProfileAddresses] = useState<any[]>([]);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [editingAddrId, setEditingAddrId] = useState<string | number | null>(null);
  const [addrForm, setAddrForm] = useState({
    name: "",
    phone: "",
    pin: "",
    house: "",
    street: "",
    landmark: "",
    city: "",
    state: "",
    addressType: "Home"
  });

  // Load profile addresses with automatic order address recovery and phone/email matching
  useEffect(() => {
    const loadProfileAddresses = async () => {
      let combined: any[] = [];
      const userPhone = user?.user_metadata?.phone ? String(user.user_metadata.phone).replace(/\D/g, "").slice(-10) : "";
      const userEmail = user?.email || "";

      // 1. Check local storage
      try {
        if (user?.id) {
          const uStr = localStorage.getItem(`Nakshra_user_addresses_${user.id}`);
          if (uStr) {
            const parsed = JSON.parse(uStr);
            if (Array.isArray(parsed) && parsed.length > 0) combined = [...parsed];
          }
        } else {
          // Only load guest list if not logged in
          const gStr = localStorage.getItem("Nakshra_saved_addresses_list");
          if (gStr) {
            const parsed = JSON.parse(gStr);
            if (Array.isArray(parsed) && parsed.length > 0) combined = [...parsed];
          }
        }
      } catch (e) {}

      // 2. Fetch from Supabase addresses table matching this account
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

      // 3. Extract addresses from past orders (guarantees addresses used in orders are never lost)
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
        setProfileAddresses(combined);
        try {
          if (user?.id) {
            localStorage.setItem(`Nakshra_user_addresses_${user.id}`, JSON.stringify(combined));
          } else {
            localStorage.setItem("Nakshra_saved_addresses_list", JSON.stringify(combined));
          }
        } catch (e) {}
      } else {
        setProfileAddresses([]);
      }
    };

    loadProfileAddresses();
  }, [user?.id, user?.email, user?.user_metadata?.phone, activeTab]);

  const [pincodeLoading, setPincodeLoading] = useState(false);

  const handleProfilePinChange = async (val: string) => {
    const cleanVal = val.replace(/\D/g, "").slice(0, 6);
    setAddrForm(p => ({ ...p, pin: cleanVal }));

    if (cleanVal.length === 6) {
      setPincodeLoading(true);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${cleanVal}`);
        const data = await res.json();
        if (data && data[0] && data[0].Status === "Success") {
          const postOffice = data[0].PostOffice[0];
          const city = postOffice.District || postOffice.Block || postOffice.Name || "";
          const state = postOffice.State || "";
          setAddrForm(p => ({
            ...p,
            city: city || p.city,
            state: state || p.state
          }));
        }
      } catch (e) {
        console.error("Failed to auto-fetch city/state from pincode", e);
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  const handleSaveProfileAddress = async () => {
    const missing: string[] = [];
    if (!addrForm.name.trim()) missing.push("Name");
    if (!addrForm.phone.trim()) missing.push("Phone Number");
    if (!addrForm.pin.trim()) missing.push("PIN Code");
    if (!addrForm.house.trim()) missing.push("House / Flat No.");
    if (!addrForm.street.trim()) missing.push("Street Address");
    if (!addrForm.city.trim()) missing.push("City");

    if (missing.length > 0) {
      alert(`Please fill in: ${missing.join(", ")}`);
      return;
    }

    const newAddrObj = {
      id: editingAddrId || Date.now(),
      name: addrForm.name.trim(),
      full_name: addrForm.name.trim(),
      phone: addrForm.phone.replace(/\D/g, "").slice(-10),
      house: addrForm.house,
      street: addrForm.street,
      landmark: addrForm.landmark,
      address: `${addrForm.house}${addrForm.street ? ", " + addrForm.street : ""}${addrForm.landmark ? ", " + addrForm.landmark : ""}`.trim(),
      line1: `${addrForm.house}${addrForm.street ? ", " + addrForm.street : ""}${addrForm.landmark ? ", " + addrForm.landmark : ""}`.trim(),
      city: addrForm.city,
      state: addrForm.state,
      pincode: addrForm.pin,
      pin: addrForm.pin,
      address_type: addrForm.addressType
    };

    const updatedList = profileAddresses.filter(a => a.id !== editingAddrId);
    const newList = [newAddrObj, ...updatedList];
    setProfileAddresses(newList);
    if (user?.id) {
      try { localStorage.setItem(`Nakshra_user_addresses_${user.id}`, JSON.stringify(newList)); } catch (e) {}
    } else {
      try { localStorage.setItem("Nakshra_saved_addresses_list", JSON.stringify(newList)); } catch (e) {}
    }
    setShowAddrForm(false);
    setEditingAddrId(null);
    setAddrForm({ name: "", phone: "", pin: "", house: "", street: "", landmark: "", city: "", state: "", addressType: "Home" });

    if (user?.id) {
      const dbPayload: any = {
        user_id: user.id,
        user_phone: user?.user_metadata?.phone ? String(user.user_metadata.phone).replace(/\D/g, "").slice(-10) : newAddrObj.phone,
        name: newAddrObj.name,
        phone: newAddrObj.phone,
        address: newAddrObj.address,
        city: newAddrObj.city,
        state: newAddrObj.state,
        pincode: newAddrObj.pincode,
        house: newAddrObj.house,
        street: newAddrObj.street,
        landmark: newAddrObj.landmark,
        address_type: newAddrObj.address_type
      };
      if (typeof editingAddrId === 'number') {
        dbPayload.id = editingAddrId;
      }
      Promise.resolve(supabase.from("addresses").upsert(dbPayload))
        .catch(err => console.warn("Supabase address save warning:", err));
    }
  };

  const handleEditProfileAddress = (addr: any) => {
    const nameParts = (addr.full_name || addr.name || "").trim();
    setEditingAddrId(addr.id);

    let houseVal = (addr.house || "").trim();
    let streetVal = (addr.street || "").trim();

    if (!houseVal && (addr.address || addr.line1)) {
      houseVal = (addr.address || addr.line1 || "").trim();
    }

    // Clean houseVal if it contains a comma or merged street address
    if (houseVal.includes(",")) {
      const parts = houseVal.split(",");
      houseVal = parts[0].trim();
      if (!streetVal) {
        streetVal = parts.slice(1).join(",").trim();
      }
    }

    setAddrForm({
      name: nameParts,
      phone: addr.phone || "",
      pin: String(addr.pincode || addr.pin || ""),
      house: houseVal,
      street: streetVal,
      landmark: addr.landmark || "",
      city: addr.city || "",
      state: addr.state || "",
      addressType: addr.address_type || addr.type || "Home"
    });
    setShowAddrForm(true);
  };

  const handleDeleteProfileAddress = (id: string | number) => {
    if (!confirm("Remove this address?")) return;
    const newList = profileAddresses.filter(a => String(a.id) !== String(id));
    setProfileAddresses(newList);
    if (user?.id) {
      try { localStorage.setItem(`Nakshra_user_addresses_${user.id}`, JSON.stringify(newList)); } catch (e) {}
      Promise.resolve(supabase.from("addresses").delete().eq("id", id)).catch(() => {});
    } else {
      try { localStorage.setItem("Nakshra_saved_addresses_list", JSON.stringify(newList)); } catch (e) {}
    }
  };

  const toggleOrder = (id: string) => {
    setExpandedOrders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCancelOrder = async (orderId: string | number) => {
    if (!confirm(`Are you sure you want to cancel Order #${orderId}?`)) return;

    // 1. Save CANCELLED status persistently in localStorage
    localStorage.setItem(`Nakshra_order_status_${orderId}`, "CANCELLED");

    try {
      if (user?.id) {
        await Promise.resolve(
          supabase.from("orders").update({ status: "CANCELLED" }).eq("id", orderId)
        ).catch(() => {});
      }

      await api(`/orders/${orderId}/cancel`, { method: "POST" }).catch(() => {});

      setOrders(prev => prev.map(o => String(o.id) === String(orderId) ? { ...o, status: "CANCELLED" } : o));
      alert(`Order #${orderId} has been cancelled successfully.`);
    } catch (err) {
      console.error("Order cancellation error:", err);
      setOrders(prev => prev.map(o => String(o.id) === String(orderId) ? { ...o, status: "CANCELLED" } : o));
      alert(`Order #${orderId} has been cancelled.`);
    }
  };

  // Fetch real profile from DB
  useEffect(() => {
    const cachedProfile = sessionStorage.getItem("Nakshra_user_profile");
    if (cachedProfile) {
      try {
        const parsed = JSON.parse(cachedProfile);
        setProfile(parsed);
        initEditForm(parsed);
        setLoadingProfile(false);
      } catch (e) {}
    }
    
    if (user?.id) {
      Promise.resolve(supabase.from("users").select("*").eq("id", user.id).single())
        .then(({ data, error }) => {
          if (data && !error) {
            setProfile(data);
            initEditForm(data);
            sessionStorage.setItem("Nakshra_user_profile", JSON.stringify(data));
          }
        })
        .catch(console.error)
        .finally(() => setLoadingProfile(false));
    } else {
      setLoadingProfile(false);
    }
  }, [user?.id]);

  const initEditForm = (p: any) => {
    setEditForm({
      fullName: p?.full_name || p?.fullName || user?.user_metadata?.full_name || "",
      email: p?.email || user?.email || "",
      phone: p?.phone || user?.user_metadata?.phone || "",
      gender: p?.gender || "",
      dob: p?.dob ? new Date(p.dob).toISOString().split("T")[0] : "",
      pobCity: p?.pob_city || p?.pobCity || ""
    });
  };

  // Fetch real orders from DB with phone-primary matching so orders persist across sessions
  useEffect(() => {
    if (activeTab === "orders") {
      setLoadingOrders(true);
      
      const fetchOrders = async () => {
        let fetchedOrders: any[] = [];
        const userPhone = user?.user_metadata?.phone ? String(user.user_metadata.phone).replace(/\D/g, "").slice(-10) : "";
        const userEmail = user?.email || "";

        // 1. Fetch orders from Supabase filtered by user_id OR phone
        try {
          const query = supabase.from("orders").select("*").order("created_at", { ascending: false });
          let hasFilter = false;
          if (user?.id && userPhone) {
            query.or(`user_id.eq.${user.id},user_phone.eq.${userPhone}`);
            hasFilter = true;
          } else if (user?.id) {
            query.eq("user_id", user.id);
            hasFilter = true;
          } else if (userPhone) {
            query.eq("user_phone", userPhone);
            hasFilter = true;
          }

          if (hasFilter) {
            const { data: dbOrders } = await query;
            if (dbOrders && dbOrders.length > 0) {
              dbOrders.forEach((o: any) => {
                if (!fetchedOrders.some(existing => String(existing.id) === String(o.id))) {
                  fetchedOrders.push(o);

                  // Auto-link unlinked orders to current user_id
                  if (user?.id && (!o.user_id || o.user_id !== user.id)) {
                    Promise.resolve(
                      supabase.from("orders").update({ user_id: user.id }).eq("id", o.id)
                    ).catch(() => {});
                  }
                }
              });
            }
          }
        } catch (e) {
          console.warn("Error fetching Supabase orders:", e);
        }

        // 2. Fetch from user-specific local storage
        if (user?.id) {
          const userOrdersKey = `Nakshra_user_orders_${user.id}`;
          const localUserOrdersStr = localStorage.getItem(userOrdersKey);
          if (localUserOrdersStr) {
            try {
              const parsedLocal = JSON.parse(localUserOrdersStr);
              parsedLocal.forEach((lo: any) => {
                if (!fetchedOrders.some(o => String(o.id) === String(lo.id))) {
                  fetchedOrders.push(lo);
                }
              });
            } catch (e) {}
          }
        }

        // 2b. Fetch from phone-keyed localStorage (survives user ID changes across sessions)
        if (userPhone) {
          const phoneOrdersStr = localStorage.getItem(`Nakshra_phone_orders_${userPhone}`);
          if (phoneOrdersStr) {
            try {
              const parsedPhone = JSON.parse(phoneOrdersStr);
              parsedPhone.forEach((po: any) => {
                if (!fetchedOrders.some(o => String(o.id) === String(po.id))) {
                  fetchedOrders.push(po);
                }
              });
            } catch (e) {}
          }
        }

        // 3. Fetch from guest local storage fallback
        const guestOrdersStr = localStorage.getItem("Nakshra_guest_orders");
        if (guestOrdersStr) {
          try {
            const parsedGuest = JSON.parse(guestOrdersStr);
            parsedGuest.forEach((go: any) => {
              const addr = go.shipping_address || go.address || {};
              const orderPhone = String(addr.phone || go.phone || "").replace(/\D/g, "").slice(-10);
              const orderEmail = String(addr.email || go.email || "").trim().toLowerCase();

              const matchesPhone = userPhone && orderPhone && orderPhone === userPhone;
              const matchesEmail = userEmail && orderEmail && orderEmail === userEmail.toLowerCase();

              if (!fetchedOrders.some(o => String(o.id) === String(go.id))) {
                if (!user?.id || matchesPhone || matchesEmail) {
                  fetchedOrders.push({ ...go, user_id: user?.id || go.user_id });
                }
              }
            });
          } catch (e) {}
        }

        // 4. Fetch from recent session order fallback (guests only)
        const localOrderId = sessionStorage.getItem("Nakshra_last_order_id");
        const localItemsStr = sessionStorage.getItem("Nakshra_last_order_items");
        const localTotalStr = sessionStorage.getItem("Nakshra_order_total");

        if (!user?.id && localOrderId && localItemsStr && !fetchedOrders.some(o => String(o.id) === String(localOrderId))) {
          try {
            const parsedItems = JSON.parse(localItemsStr);
            const savedStatus = localStorage.getItem(`Nakshra_order_status_${localOrderId}`) || "Processing";
            
            fetchedOrders.unshift({
              id: localOrderId,
              created_at: new Date().toISOString(),
              status: savedStatus,
              total_amount: parseFloat(localTotalStr || "0") * 100,
              items: parsedItems.map((i: any) => ({
                product_name: i.product?.name || "Sacred Item",
                quantity: i.qty || 1,
                unit_price: (i.product?.price || 0) * 100
              }))
            });
          } catch (e) {
            console.error("Failed to parse local order items", e);
          }
        }

        // Apply saved status overrides from localStorage for all orders
        fetchedOrders = fetchedOrders.map(o => {
          const overrideStatus = localStorage.getItem(`Nakshra_order_status_${o.id}`);
          return overrideStatus ? { ...o, status: overrideStatus } : o;
        });

        // Sort by creation date descending
        fetchedOrders.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

        // Cache merged orders into user's localStorage
        if (user?.id && fetchedOrders.length > 0) {
          try {
            localStorage.setItem(`Nakshra_user_orders_${user.id}`, JSON.stringify(fetchedOrders));
          } catch (e) {}
        }

        // Also cache into phone-keyed localStorage for cross-session persistence
        if (userPhone && fetchedOrders.length > 0) {
          try {
            localStorage.setItem(`Nakshra_phone_orders_${userPhone}`, JSON.stringify(fetchedOrders));
          } catch (e) {}
        }

        setOrders(fetchedOrders);
        setLoadingOrders(false);
      };

      fetchOrders();
    }
  }, [activeTab, user?.id, user?.email, user?.user_metadata?.phone]);

  const handleSaveProfile = async () => {
    if (!user?.id) return;

    const phoneDigits = editForm.phone.replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (editForm.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim())) {
      alert("Please enter a valid email address.");
      return;
    }

    if (editForm.dob) {
      const selectedDate = new Date(editForm.dob);
      const today = new Date();
      if (selectedDate > today) {
        alert("Date of birth cannot be in the future. Please select a valid date.");
        return;
      }
    }

    setSaving(true);
    setSaveSuccess(false);

    try {
      const profileData = {
        id: user.id,
        full_name: editForm.fullName,
        fullName: editForm.fullName,
        email: editForm.email,
        phone: editForm.phone,
        gender: editForm.gender,
        dob: editForm.dob,
        pobCity: editForm.pobCity,
        created_at: profile?.created_at || new Date().toISOString()
      };

      // 1. Instant save to Session Storage & Local Storage
      sessionStorage.setItem("Nakshra_user_profile", JSON.stringify(profileData));
      if (editForm.phone) {
        const phoneDigits = editForm.phone.replace(/\D/g, "");
        localStorage.setItem(`Nakshra_registered_user_phone_${phoneDigits}`, JSON.stringify(profileData));
      }

      // Update UI profile state & finish saving instantly
      setProfile(profileData);
      setIsEditing(false);
      setSaveSuccess(true);
      setSaving(false);
      setTimeout(() => setSaveSuccess(false), 3000);

      // 2. Non-blocking background sync with Firestore & Supabase
      Promise.race([
        setDoc(doc(db, "users", user.id), {
          fullName: editForm.fullName,
          email: editForm.email,
          phone: editForm.phone,
          gender: editForm.gender,
          dob: editForm.dob,
          pobCity: editForm.pobCity,
          updatedAt: serverTimestamp()
        }, { merge: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2500))
      ]).catch(err => console.warn("Firestore save profile warning:", err));

      // Direct Supabase DB upsert
      try {
        await supabase.from("users").upsert({
          id: user.id,
          full_name: editForm.fullName,
          email: editForm.email || null,
          phone: editForm.phone || null,
          gender: editForm.gender || "Other",
          dob: editForm.dob || "2000-01-01",
          pob_city: editForm.pobCity || null,
          updated_at: new Date().toISOString()
        });
      } catch (supaErr) {
        console.warn("Supabase profile save warning:", supaErr);
      }

    } catch (e: any) {
      alert("Failed to save profile: " + (e.message || "Please try again."));
      setSaving(false);
    }
  };

  const handleLogout = () => { logout(); navigate("/"); };

  const displayName = profile?.full_name || profile?.fullName || user?.user_metadata?.full_name || "Devotee";
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).getFullYear()
    : new Date().getFullYear();

  const profileFields = [
    { label: "Name",   value: profile?.full_name || profile?.fullName || user?.user_metadata?.full_name || "—" },
    { label: "Email",  value: profile?.email || user?.email || "—" },
    { label: "Phone",  value: profile?.phone || user?.user_metadata?.phone || "—" },
    { label: "Gender", value: profile?.gender || "—" },
    { label: "Date of Birth", value: profile?.dob ? new Date(profile.dob).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—" },
    { label: "City of Birth", value: profile?.pob_city || profile?.pobCity || "—" },
  ];

  return (
    <div className="min-h-screen pt-20 lg:pt-28 pb-16 px-4 sm:px-6" style={{ background: "#FAF7F2" }}>
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-6 text-sm font-medium hover:opacity-70 transition-opacity" style={{ color: MAROON }}>
          <ChevronLeft size={16} /> Back
        </button>

        {/* Profile Hero */}
        <div className="rounded-3xl p-8 mb-5 text-center relative overflow-hidden" style={{ background: `linear-gradient(160deg,${MAROON} 0%,#3A1015 100%)`, boxShadow: "0 20px 50px rgba(91,31,36,0.2)" }}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(200,160,68,0.15)", border: "2px solid rgba(200,160,68,0.3)" }}>
            <User size={32} style={{ color: GOLD }} />
          </div>
          <h2 style={{ fontFamily: SERIF, fontSize: "1.5rem", fontWeight: 700, color: IVORY, marginBottom: 4 }}>
            {loadingProfile ? "Loading…" : displayName}
          </h2>
          <p style={{ color: "rgba(250,247,242,0.5)", fontSize: 13, fontFamily: SANS }}>Member since {memberSince}</p>
        </div>

        {saveSuccess && (
          <div className="mb-4 p-4 rounded-2xl flex items-center justify-center gap-2" style={{ background: "rgba(74,138,74,0.1)", border: "1px solid rgba(74,138,74,0.3)", color: "#2E6B2E" }}>
            <CheckCircle size={18} />
            <span className="text-sm font-semibold">Profile updated successfully!</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex p-1 rounded-2xl mb-5" style={{ background: "rgba(91,31,36,0.06)" }}>
          {(["profile", "addresses", "orders"] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className="flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200"
              style={{ background: activeTab === t ? MAROON : "transparent", color: activeTab === t ? IVORY : MAROON }}>
              {t === "profile" ? "My Profile" : t === "addresses" ? "Saved Addresses" : "My Orders"}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <>
            {!isEditing ? (
              <div className="rounded-2xl overflow-hidden mb-4" style={{ border: "1px solid rgba(91,31,36,0.1)", background: "#fff" }}>
                <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(91,31,36,0.08)" }}>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9A8A78" }}>Personal Details</span>
                  <button onClick={() => { initEditForm(profile); setIsEditing(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:shadow-sm"
                    style={{ background: "rgba(200,160,68,0.12)", color: "#8B6914", border: "1px solid rgba(200,160,68,0.25)" }}>
                    <Edit2 size={12} /> Edit Profile
                  </button>
                </div>
                {profileFields.map(({ label, value }, i, arr) => (
                  <div key={label} className="flex items-center justify-between px-5 py-4"
                    style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(91,31,36,0.07)" : "none" }}>
                    <span className="text-sm" style={{ color: "#9A8A78", fontFamily: SANS }}>{label}</span>
                    <span className="text-sm font-medium" style={{ color: value === "—" ? "#ccc" : MAROON, fontFamily: SANS }}>{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl p-6 mb-4 space-y-4" style={{ background: "#fff", border: "1px solid rgba(91,31,36,0.12)", boxShadow: "0 4px 20px rgba(91,31,36,0.05)" }}>
                <div className="flex items-center justify-between pb-3" style={{ borderBottom: "1px solid rgba(91,31,36,0.08)" }}>
                  <h3 className="text-base font-semibold" style={{ fontFamily: SERIF, color: MAROON }}>Edit Your Profile</h3>
                  <button onClick={() => setIsEditing(false)} className="p-1 rounded-full hover:bg-black/5" style={{ color: MAROON }}><X size={18} /></button>
                </div>
                <div>
                  <label htmlFor="profile-full-name" className="block text-xs font-semibold mb-1" style={{ color: "#7A6A58" }}>Full Name</label>
                  <input id="profile-full-name" name="name" autoComplete="name" type="text" value={editForm.fullName} onChange={e => setEditForm(p => ({ ...p, fullName: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ border: "1px solid rgba(91,31,36,0.15)", background: "#FAF7F2", color: MAROON }} />
                </div>
                <div>
                  <label htmlFor="profile-email" className="block text-xs font-semibold mb-1" style={{ color: "#7A6A58" }}>Email Address</label>
                  <input id="profile-email" name="email" autoComplete="email" type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ border: "1px solid rgba(91,31,36,0.15)", background: "#FAF7F2", color: MAROON }} />
                </div>
                <div>
                  <label htmlFor="profile-phone" className="block text-xs font-semibold mb-1" style={{ color: "#7A6A58" }}>Mobile Phone Number</label>
                  <div className="flex items-center rounded-xl overflow-hidden" style={{ border: "1px solid rgba(91,31,36,0.15)", background: "#FAF7F2" }}>
                    <span className="px-3 py-2.5 text-xs font-bold border-r flex items-center gap-1 flex-shrink-0 select-none" style={{ background: "rgba(91,31,36,0.04)", color: MAROON, borderColor: "rgba(91,31,36,0.1)", fontFamily: SANS }}>
                      🇮🇳 +91
                    </span>
                    <input id="profile-phone" name="tel" autoComplete="tel" type="tel" placeholder="10-digit mobile number" maxLength={10} value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                      className="flex-1 px-3 py-2.5 text-sm outline-none bg-transparent" style={{ color: MAROON }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "#7A6A58" }}>Gender</label>
                    <Select.Root value={editForm.gender} onValueChange={v => setEditForm(p => ({ ...p, gender: v }))}>
                      <Select.Trigger asChild>
                        <button className="w-full px-3 py-2.5 rounded-xl text-sm text-left flex items-center justify-between transition-all focus:ring-2 focus:ring-offset-1"
                          style={{ border: "1px solid rgba(91,31,36,0.15)", background: "#FAF7F2", color: MAROON, fontFamily: SANS, outline: "none" }}>
                          <Select.Value placeholder="Select gender" />
                          <ChevronDown size={14} style={{ color: GOLD }} />
                        </button>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content position="popper" align="center" sideOffset={4} className="z-[200] rounded-xl shadow-2xl border overflow-hidden"
                          style={{ background: "#FAF7F2", borderColor: "rgba(91,31,36,0.15)", width: "var(--radix-select-trigger-width)" }}>
                          <Select.Viewport>
                            {["Male", "Female", "Other"].map(opt => (
                              <Select.Item key={opt} value={opt} className="px-4 py-2.5 text-sm cursor-pointer outline-none transition-colors data-[highlighted]:bg-black/5"
                                style={{ color: MAROON, fontFamily: SANS }}>
                                <Select.ItemText>{opt}</Select.ItemText>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "#7A6A58" }}>Date of Birth</label>
                    <Popover.Root>
                      <Popover.Trigger asChild>
                        <button className="w-full px-3 py-2.5 rounded-xl text-sm text-left flex items-center justify-between transition-all focus:ring-2 focus:ring-offset-1"
                          style={{ border: "1px solid rgba(91,31,36,0.15)", background: "#FAF7F2", color: editForm.dob ? MAROON : "#9A8A78", fontFamily: SANS, outline: "none" }}>
                          {editForm.dob ? (() => {
                            const [y, m, d] = editForm.dob.split("-").map(Number);
                            return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                          })() : "Select date"}
                          <Calendar size={14} style={{ color: GOLD }} />
                        </button>
                      </Popover.Trigger>
                      <Popover.Portal>
                        <Popover.Content side="bottom" avoidCollisions={false} align="start" sideOffset={4} className="z-[200] rounded-2xl shadow-2xl border p-4"
                          style={{ background: "#FAF7F2", borderColor: "rgba(91,31,36,0.15)" }}>
                          <style>{`
                            .rdp { --rdp-cell-size: 36px; --rdp-accent-color: ${MAROON}; --rdp-background-color: rgba(91,31,36,0.1); font-family: ${SANS}; }
                            .rdp-caption { color: ${MAROON}; font-weight: 600; }
                            .rdp-nav_button { color: ${MAROON}; }
                            .rdp-day_selected { background: ${MAROON} !important; color: ${IVORY} !important; font-weight: 600; }
                            .rdp-day:hover:not(.rdp-day_selected) { background: rgba(91,31,36,0.08); }
                            .rdp-day_today:not(.rdp-day_selected) { font-weight: inherit; border: none; outline: none; }
                            .rdp-day:focus { outline: none !important; border: none !important; background: transparent; }
                          `}</style>
                          <DayPicker mode="single"
                            disabled={{ after: new Date() }}
                            selected={editForm.dob ? (() => { const [y, m, d] = editForm.dob.split("-").map(Number); return new Date(y, m - 1, d); })() : undefined}
                            onSelect={(date) => { 
                              if (date) {
                                if (date > new Date()) {
                                  alert("Date of birth cannot be in the future.");
                                  return;
                                }
                                const y = date.getFullYear();
                                const m = String(date.getMonth() + 1).padStart(2, '0');
                                const d = String(date.getDate()).padStart(2, '0');
                                setEditForm(p => ({ ...p, dob: `${y}-${m}-${d}` })); 
                              }
                            }}
                            defaultMonth={editForm.dob ? (() => { const [y, m, d] = editForm.dob.split("-").map(Number); return new Date(y, m - 1, d); })() : new Date(2000, 0)}
                            fromYear={1930} toYear={new Date().getFullYear()} captionLayout="dropdown" />
                        </Popover.Content>
                      </Popover.Portal>
                    </Popover.Root>
                  </div>
                </div>
                <div>
                  <label htmlFor="profile-city" className="block text-xs font-semibold mb-1" style={{ color: "#7A6A58" }}>City of Birth</label>
                  <input id="profile-city" name="address-level2" autoComplete="address-level2" type="text" value={editForm.pobCity} onChange={e => setEditForm(p => ({ ...p, pobCity: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ border: "1px solid rgba(91,31,36,0.15)", background: "#FAF7F2", color: MAROON }} />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setIsEditing(false)} className="flex-1 py-3 rounded-xl text-xs font-semibold" style={{ background: "rgba(91,31,36,0.07)", color: MAROON }}>Cancel</button>
                  <button onClick={handleSaveProfile} disabled={saving} className="flex-1 py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5" style={{ background: `linear-gradient(135deg,${MAROON},#7A2A30)`, color: IVORY }}>
                    {saving ? "Saving…" : <><Save size={14} /> Save Profile</>}
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="w-full py-3.5 rounded-2xl text-sm font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2.5 mt-6 shadow-md hover:shadow-xl active:scale-95"
              style={{
                background: `linear-gradient(135deg, ${MAROON}, #7A2A30)`,
                color: IVORY,
                border: "1px solid rgba(200,160,68,0.3)",
                cursor: "pointer"
              }}
            >
              <LogOut size={16} style={{ color: GOLD }} />
              <span>Sign Out</span>
            </button>
          </>
        )}

        {/* Saved Addresses Tab */}
        {activeTab === "addresses" && (
          <div className="space-y-4">
            {!showAddrForm ? (
              <>
                <div className="flex items-center justify-between px-2 mb-2">
                  <h3 className="text-base font-semibold" style={{ fontFamily: SERIF, color: MAROON }}>Your Saved Addresses</h3>
                  <button
                    onClick={() => {
                      setEditingAddrId(null);
                      setAddrForm({ name: "", phone: "", pin: "", house: "", street: "", landmark: "", city: "", state: "", addressType: "Home" });
                      setShowAddrForm(true);
                    }}
                    className="text-xs font-semibold px-4 py-2 rounded-full flex items-center gap-1 transition-all hover:opacity-90 shadow-sm"
                    style={{ background: `linear-gradient(135deg,${MAROON},#7A2A30)`, color: IVORY }}
                  >
                    <Plus size={14} /> Add Address
                  </button>
                </div>

                {profileAddresses.length === 0 ? (
                  <div className="text-center py-12 rounded-2xl" style={{ background: "#fff", border: "1px solid rgba(91,31,36,0.08)" }}>
                    <MapPin size={32} className="mx-auto mb-2 opacity-40" style={{ color: MAROON }} />
                    <p className="text-sm font-semibold mb-1" style={{ fontFamily: SERIF, color: MAROON }}>No saved addresses</p>
                    <p className="text-xs text-gray-500">Add an address to make your checkout faster</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {profileAddresses.map(addr => {
                      const addrLine = [addr.line1 || addr.address_line1 || addr.address, addr.city, addr.state].filter(Boolean).join(", ");
                      return (
                        <div key={addr.id} className="p-4 rounded-2xl bg-white border border-black/10 flex items-start justify-between gap-3 shadow-sm">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="p-2 rounded-xl mt-0.5" style={{ background: "rgba(200,160,68,0.1)", color: MAROON }}>
                              <MapPin size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md" style={{ background: "rgba(91,31,36,0.08)", color: MAROON }}>
                                  {addr.address_type || addr.type || "Home"}
                                </span>
                              </div>
                              <p className="text-xs font-semibold" style={{ color: "#3A2A1A" }}>{addr.full_name || addr.name} · {addr.phone}</p>
                              <p className="text-xs leading-relaxed text-gray-600 mt-1">{addrLine} – {addr.pincode || addr.pin}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button onClick={() => handleEditProfileAddress(addr)} className="p-2 rounded-lg hover:bg-amber-50" style={{ color: MAROON, border: "1px solid rgba(91,31,36,0.12)" }}>
                              <Edit2 size={13} />
                            </button>
                            <button onClick={() => handleDeleteProfileAddress(addr.id)} className="p-2 rounded-lg hover:bg-red-50" style={{ color: "#C04040", border: "1px solid rgba(192,64,64,0.15)" }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl p-6 space-y-4" style={{ background: "#fff", border: "1px solid rgba(91,31,36,0.12)", boxShadow: "0 4px 20px rgba(91,31,36,0.05)" }}>
                <div className="flex items-center justify-between pb-3 border-b border-black/5">
                  <h3 className="text-base font-semibold" style={{ fontFamily: SERIF, color: MAROON }}>{editingAddrId ? "Edit Address" : "Add New Address"}</h3>
                  <button onClick={() => setShowAddrForm(false)} className="p-1 rounded-full hover:bg-black/5" style={{ color: MAROON }}><X size={18} /></button>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-600">Full Name *</label>
                  <input type="text" value={addrForm.name} onChange={e => setAddrForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border border-black/15 bg-[#FAF7F2]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-600">Phone Number *</label>
                  <input type="tel" value={addrForm.phone} onChange={e => setAddrForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border border-black/15 bg-[#FAF7F2]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-600">PIN Code *</label>
                    <div className="relative">
                      <input type="text" maxLength={6} placeholder="6-digit PIN" value={addrForm.pin} onChange={e => handleProfilePinChange(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border border-black/15 bg-[#FAF7F2]" />
                      {pincodeLoading && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-amber-700 animate-pulse">Auto-filling...</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-600">House / Flat No. *</label>
                    <input type="text" placeholder="e.g. 01A, B-402" value={addrForm.house} onChange={e => setAddrForm(p => ({ ...p, house: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border border-black/15 bg-[#FAF7F2]" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-600">Street Address *</label>
                  <input type="text" value={addrForm.street} onChange={e => setAddrForm(p => ({ ...p, street: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border border-black/15 bg-[#FAF7F2]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-600">City *</label>
                    <input type="text" value={addrForm.city} onChange={e => setAddrForm(p => ({ ...p, city: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border border-black/15 bg-[#FAF7F2]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-600">State</label>
                    <input type="text" value={addrForm.state} onChange={e => setAddrForm(p => ({ ...p, state: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border border-black/15 bg-[#FAF7F2]" />
                  </div>
                </div>

                {/* Address Type Selector */}
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold mb-2 text-gray-600">Save Address As</label>
                    <div className="flex gap-2">
                      {["Home", "Office", "Other"].map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setAddrForm(p => ({ ...p, addressType: type }))}
                          className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                          style={{
                            background: addrForm.addressType === type ? MAROON : "#FAF7F2",
                            color: addrForm.addressType === type ? IVORY : MAROON,
                            border: `1.5px solid ${addrForm.addressType === type ? MAROON : "rgba(91,31,36,0.15)"}`
                          }}
                        >
                          {type === "Home" ? "🏠 Home" : type === "Office" ? "🏢 Office" : "📍 Other"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowAddrForm(false)} className="flex-1 py-3 rounded-xl text-xs font-semibold bg-black/5" style={{ color: MAROON }}>Cancel</button>
                  <button onClick={handleSaveProfileAddress} className="flex-1 py-3 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5" style={{ background: `linear-gradient(135deg,${MAROON},#7A2A30)` }}>
                    <Save size={14} /> Save Address
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div className="space-y-3">
            {loadingOrders && (
              <div className="text-center py-10">
                <div className="w-8 h-8 rounded-full border-4 border-t-transparent mx-auto animate-spin mb-3" style={{ borderColor: `${GOLD} transparent ${GOLD} ${GOLD}` }} />
                <p className="text-sm" style={{ color: "#9A8A78" }}>Loading orders…</p>
              </div>
            )}
            {!loadingOrders && orders.length === 0 && (
              <div className="text-center py-12 rounded-2xl" style={{ background: "#fff", border: "1px solid rgba(91,31,36,0.08)" }}>
                <p className="text-2xl mb-2">📦</p>
                <p className="text-sm font-semibold mb-1" style={{ fontFamily: SERIF, color: MAROON }}>No orders yet</p>
                <p className="text-xs" style={{ color: "#7A6A58" }}>Your purchased sacred items will appear here</p>
              </div>
            )}
            {orders.map(order => {
              const itemsList = order.order_items || order.items || [];
              const isExpanded = expandedOrders[order.id];
              const stepIdx = getOrderStep(order.status, order.awb_code);
              const isCancelled = order.status === "CANCELLED" || order.status === "Cancelled";
              return (
                <div key={order.id} className="rounded-2xl overflow-hidden transition-all" style={{ background: "#fff", border: "1px solid rgba(91,31,36,0.08)" }}>
                  <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => toggleOrder(order.id)}>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: MAROON }}>Order #{order.id}</p>
                      <p className="text-[10px]" style={{ color: "#9A8A78" }}>{new Date(order.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold" style={{ fontFamily: PRICE_FONT, color: MAROON }}>₹{(order.total_amount / 100).toLocaleString("en-IN")}</p>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                        style={{
                          background: isCancelled ? "rgba(220,38,38,0.12)" : "rgba(74,138,74,0.12)",
                          color: isCancelled ? "#DC2626" : "#2E6B2E"
                        }}>
                        {order.status || "CONFIRMED"}
                      </span>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-black/5 space-y-4">
                      {/* Timeline */}
                      {!isCancelled && (
                        <div className="relative pt-2">
                          {/* Background line */}
                          <div className="absolute top-[18px] left-[12%] right-[12%] h-[2px] bg-[#eee] z-0" />
                          {/* Progress line */}
                          <div className="absolute top-[18px] left-[12%] h-[2px] z-0 transition-all duration-500" 
                               style={{ width: `${(stepIdx / (ORDER_STEPS.length - 1)) * 76}%`, background: MAROON }} />
                          
                          <div className="flex justify-between items-center text-xs relative z-10">
                            {ORDER_STEPS.map((s, idx) => (
                              <div key={s.label} className="text-center flex-1 flex flex-col items-center">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center mb-1 text-[10px] transition-colors"
                                  style={{ background: idx <= stepIdx ? MAROON : "#eee", color: idx <= stepIdx ? IVORY : "#999" }}>
                                  {s.icon}
                                </div>
                                <span style={{ fontSize: 9, color: idx <= stepIdx ? MAROON : "#999", fontWeight: idx <= stepIdx ? 600 : 400 }}>{s.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Items */}
                      <div className="space-y-2 pt-2 border-t border-black/5">
                        {itemsList.map((it: any, i: number) => (
                          <div key={i} className="flex justify-between items-center text-xs">
                            <span>{it.product_name || "Sacred Item"} x{it.quantity}</span>
                            <span className="font-semibold">₹{((it.unit_price * it.quantity) / 100).toLocaleString("en-IN")}</span>
                          </div>
                        ))}
                      </div>

                      {/* Action Buttons */}
                      {!isCancelled && stepIdx <= 1 && (
                        <div className="pt-4 flex justify-end items-center mt-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleCancelOrder(order.id); }}
                            className="text-xs font-semibold px-5 py-2 rounded-full transition-colors border hover:bg-red-100 active:scale-95 transition-all"
                            style={{ borderColor: "rgba(220,38,38,0.3)", color: "#DC2626", background: "rgba(220,38,38,0.05)" }}>
                            Cancel Order
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
