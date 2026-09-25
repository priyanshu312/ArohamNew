import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ChevronLeft, User, Package, Truck, CheckCircle, Edit2, Save, X, Calendar, ChevronDown, MapPin, Trash2, Plus, LogOut, Check, Flame, Home, ShoppingBag, AlertTriangle, Star } from "lucide-react";
import { MAROON, GOLD, IVORY, SANS, SERIF, PRICE_FONT } from "@nakshra/shared-config/theme";
import { orderNumber } from "@nakshra/shared-utils";
import { useAuth } from "@nakshra/shared-auth";
import { api } from "@nakshra/shared-api";
import * as Select from "@radix-ui/react-select";
import * as Popover from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { supabase } from "@nakshra/shared-services";
import { db } from "@nakshra/shared-services";
import { doc, setDoc, serverTimestamp } from "@nakshra/shared-services";
import { INDIA_STATES } from "@nakshra/shared-config/data";
import { useProducts } from "@nakshra/shared-hooks/useProducts";

const ORDER_STEPS = [
  { label: "Ordered", Icon: Check },
  { label: "Processing", Icon: Flame },
  { label: "Shipped", Icon: Truck },
  { label: "Delivered", Icon: Home },
];

// `amount` (paise) is the figure the backend actually computes and is correct
// on every row. `total_amount` is a legacy column that only the offline
// fallback path ever wrote; worse, it used to carry a DEFAULT of 0, so reading
// it first made every order render as ₹0. Prefer amount, fall back, never trust
// a zero.
function orderRupees(order: any): number {
  const paise = Number(order?.amount) || Number(order?.total_amount) || 0;
  return Math.round(paise) / 100;
}

// The line items table stores `name`/`qty`/`price`. The card previously read
// `product_name`/`quantity`/`unit_price`, which do not exist, so items rendered
// as "Sacred Item xundefined" at ₹NaN.
function itemName(it: any): string {
  return it?.name || it?.product_name || "Sacred Item";
}
function itemQty(it: any): number {
  return Number(it?.qty ?? it?.quantity ?? 1) || 1;
}
function itemPaise(it: any): number {
  return Number(it?.price ?? it?.unit_price ?? 0) || 0;
}

/**
 * In-page replacement for window.confirm(). The browser dialog renders as
 * chrome outside the site, takes a plain string (so it can only ever name a
 * thing by its id), blocks the tab synchronously while an async request runs,
 * and gives no way to show a failure or offer a retry.
 *
 * `body` is whatever the caller wants the customer to actually look at before
 * they commit — the product they are cancelling, the address they are deleting.
 */
type ConfirmState = "idle" | "working" | "error";

function ConfirmDialog({
  open, title, subtitle, body, confirmLabel, workingLabel, state, error, onConfirm, onClose,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  body?: React.ReactNode;
  confirmLabel: string;
  workingLabel: string;
  state: ConfirmState;
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  // Escape-to-close and a scroll lock on the page behind: both things
  // window.confirm() gave us for free and a div does not.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && state !== "working") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, state, onClose]);

  if (!open) return null;
  const busy = state === "working";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(28,6,8,0.55)", backdropFilter: "blur(3px)" }}
      onClick={() => { if (!busy) onClose(); }}
    >
      <div
        role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden animate-fade-in"
        style={{ background: "#fff", boxShadow: "0 20px 60px rgba(91,31,36,0.28)" }}
      >
        <div className="p-5 pb-4 flex items-start gap-3" style={{ borderBottom: "1px solid rgba(91,31,36,0.08)" }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(220,38,38,0.10)" }}>
            <AlertTriangle size={18} strokeWidth={1.8} style={{ color: "#DC2626" }} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="confirm-dialog-title" className="text-base font-semibold" style={{ fontFamily: SERIF, color: MAROON }}>{title}</h3>
            {subtitle && <p className="text-xs mt-0.5" style={{ color: "#9A8A78" }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} disabled={busy} aria-label="Close"
            className="p-1 rounded-full hover:bg-black/5 disabled:opacity-40 flex-shrink-0" style={{ color: MAROON }}>
            <X size={18} />
          </button>
        </div>

        {body && <div className="px-5 py-4">{body}</div>}

        {state === "error" && error && (
          <div className="mx-5 mb-4 p-3 rounded-xl text-xs leading-relaxed"
            style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)", color: "#B02020" }}>
            {error}
          </div>
        )}

        <div className="px-5 pb-5 flex gap-2.5">
          <button onClick={onClose} disabled={busy}
            className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-40"
            style={{ border: "1px solid rgba(91,31,36,0.18)", color: MAROON, background: "#fff" }}>
            Keep it
          </button>
          <button onClick={onConfirm} disabled={busy}
            className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: "#DC2626", color: "#fff" }}>
            {busy && <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
            {busy ? workingLabel : state === "error" ? "Try again" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// fetch() rejects with "Failed to fetch" when the network drops, which reads
// like a crash to a customer. Server-sent messages ("Order can't be cancelled
// once it is SHIPPED.") are worth showing verbatim; transport noise is not.
function humanError(err: any, fallback: string): string {
  const raw = String(err?.message || "");
  if (!raw || /failed to fetch|networkerror|load failed|network request failed/i.test(raw)) {
    return "We couldn't reach our server, so nothing has changed. Check your connection and try again.";
  }
  return raw || fallback;
}

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
  // order_items records product_id but no image, so the picture comes from the
  // catalogue we already load elsewhere. Falls back to the item's emoji.
  const { products: catalogue } = useProducts();
  const orderItems = (order: any): any[] => order?.order_items || order?.items || [];
  const itemProduct = (it: any) =>
    it ? catalogue.find(p => String(p.id) === String(it.product_id ?? it.id)) || null : null;
  const itemThumb = (it: any): string | null => itemProduct(it)?.img || null;
  const orderThumb = (order: any): string | null => itemThumb(orderItems(order)[0]);
  const orderTitle = (order: any): string => {
    const list = orderItems(order);
    if (!list.length) return "Order";
    const extra = list.length - 1;
    return extra > 0 ? `${itemName(list[0])} +${extra} more` : itemName(list[0]);
  };
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

  // Order-cancellation dialog. `cancelTarget` is the order itself, not just its
  // id, so the dialog can show the customer what they are about to cancel.
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [cancelState, setCancelState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [cancelError, setCancelError] = useState("");

  // Address-deletion dialog, same shape.
  const [deleteAddrTarget, setDeleteAddrTarget] = useState<any | null>(null);
  const [deleteAddrState, setDeleteAddrState] = useState<ConfirmState>("idle");
  const [deleteAddrError, setDeleteAddrError] = useState("");

  // Edit Profile Form state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState("");
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
  const [addrErrors, setAddrErrors] = useState<Record<string, string>>({});
  const [addrSaveWarning, setAddrSaveWarning] = useState("");

  // Clear a field's error the moment it is filled in, rather than making the
  // customer press Save again to find out they fixed it.
  useEffect(() => {
    setAddrErrors(prev => {
      if (!Object.keys(prev).length) return prev;
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (String((addrForm as any)[k] ?? "").trim()) delete next[k];
      }
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [addrForm]);

  const handleProfilePinChange = async (val: string) => {
    const cleanVal = val.replace(/\D/g, "").slice(0, 6);
    setAddrForm(p => ({ ...p, pin: cleanVal }));

    if (cleanVal.length === 6) {
      setPincodeLoading(true);
      try {
        // Without a timeout a hung request leaves "Auto-filling..." spinning
        // forever, because setPincodeLoading(false) lives in the finally of a
        // promise that never settles.
        const res = await fetch(`https://api.postalpincode.in/pincode/${cleanVal}`,
          { signal: AbortSignal.timeout(6000) });
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
    // Errors land on the field that is wrong. The alert() this replaces listed
    // every missing field in one string and then disappeared.
    const errs: Record<string, string> = {};
    if (!addrForm.name.trim()) errs.name = "Required";
    if (!addrForm.phone.trim()) errs.phone = "Required";
    else if (addrForm.phone.replace(/\D/g, "").length !== 10) errs.phone = "Enter a 10-digit mobile number";
    if (!addrForm.pin.trim()) errs.pin = "Required";
    else if (!/^\d{6}$/.test(addrForm.pin.trim())) errs.pin = "Enter a 6-digit PIN code";
    if (!addrForm.house.trim()) errs.house = "Required";
    if (!addrForm.street.trim()) errs.street = "Required";
    if (!addrForm.city.trim()) errs.city = "Required";
    // State is required because Shiprocket needs billing_state. Leaving it
    // blank did not fail here — it failed later, where confirmOrder falls back
    // to `addr.state || addr.city || "Unknown"` and ships a parcel labelled
    // with the city (or literally "Unknown") as its state.
    if (!addrForm.state.trim()) errs.state = "Required — needed for shipping";

    setAddrErrors(errs);
    if (Object.keys(errs).length) return;

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
      // supabase-js resolves with {data, error} and does not reject, so the
      // .catch() that used to be here never fired — an RLS refusal left the
      // address in localStorage only, and it silently disappeared on any other
      // device. Surface it instead.
      supabase.from("addresses").upsert(dbPayload).then(({ error }) => {
        if (error) {
          console.error("Address save failed:", error.message);
          setAddrSaveWarning("Saved on this device, but we couldn't sync it to your account. It may not appear on other devices.");
        } else {
          setAddrSaveWarning("");
        }
      });
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

  const openDeleteAddrDialog = (addr: any) => {
    setDeleteAddrTarget(addr);
    setDeleteAddrState("idle");
    setDeleteAddrError("");
  };

  const closeDeleteAddrDialog = () => {
    if (deleteAddrState === "working") return;
    setDeleteAddrTarget(null);
  };

  const confirmDeleteAddress = async () => {
    if (!deleteAddrTarget) return;
    const id = deleteAddrTarget.id;
    setDeleteAddrState("working");
    setDeleteAddrError("");
    try {
      // The row only leaves the screen once the database agrees. This used to
      // remove it optimistically and fire the delete with `.catch(() => {})` —
      // which never ran, because supabase-js reports failures as `result.error`
      // rather than a rejection. An RLS refusal was therefore invisible: the
      // address vanished, then reappeared on the next load.
      if (user?.id) {
        const { error } = await supabase.from("addresses").delete().eq("id", id);
        if (error) throw new Error(error.message);
      }
      const newList = profileAddresses.filter(a => String(a.id) !== String(id));
      setProfileAddresses(newList);
      try {
        localStorage.setItem(
          user?.id ? `Nakshra_user_addresses_${user.id}` : "Nakshra_saved_addresses_list",
          JSON.stringify(newList)
        );
      } catch (e) {}
      setDeleteAddrTarget(null);
    } catch (err: any) {
      console.error("Address delete error:", err);
      setDeleteAddrError(humanError(err, "We couldn't remove this address. Please try again."));
      setDeleteAddrState("error");
    }
  };

  const toggleOrder = (id: string) => {
    setExpandedOrders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Cancelling runs through an in-page dialog rather than window.confirm().
  // The browser dialog was chrome, not the site: it could not show which order
  // was being cancelled (only the raw UUID), it blocked the whole tab, and the
  // alert() that followed gave no way to show a failure in context.
  const openCancelDialog = (order: any) => {
    setCancelTarget(order);
    setCancelState("idle");
    setCancelError("");
  };

  const closeCancelDialog = () => {
    // Never yank the dialog away mid-request — the user would not know whether
    // the cancellation went through.
    if (cancelState === "working") return;
    setCancelTarget(null);
  };

  const confirmCancelOrder = async () => {
    if (!cancelTarget) return;
    const orderId = cancelTarget.id;
    setCancelState("working");
    setCancelError("");
    try {
      // Backend owns cancellation: it checks ownership + status and releases
      // the reserved/sold stock. Let a real failure surface instead of faking success.
      await api(`/orders/${orderId}/cancel`, { method: "POST" });

      // Update the list in place only — no localStorage status override. The
      // cancel already succeeded server-side, so the next load reads CANCELLED
      // from the database rather than from a browser entry that could later
      // contradict it.
      setOrders(prev => prev.map(o => String(o.id) === String(orderId) ? { ...o, status: "CANCELLED" } : o));
      setCancelState("done");
    } catch (err: any) {
      console.error("Order cancellation error:", err);
      // The server explains itself ("Order can't be cancelled once it is
      // SHIPPED.", "Not your order"), and those messages are worth showing.
      // A dropped connection is not: fetch throws "Failed to fetch", which
      // tells a customer nothing and looks like a crash. Translate those.
      const raw = String(err?.message || "");
      const isNetwork = /failed to fetch|networkerror|load failed|network request failed/i.test(raw);
      setCancelError(
        !raw || isNetwork
          ? "We couldn't reach our server, so nothing has changed. Check your connection and try again."
          : raw
      );
      setCancelState("error");
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

        // 1. Fetch orders from Supabase filtered by user_id OR phone
        try {
          // Pull the line items too. Without them the card had nothing to show
          // but the raw order UUID, and `order.order_items` was always undefined.
          const query = supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
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

                  // Linking unclaimed orders to this account is done by
                  // /auth/claim-orders (called on sign-in): row-level security
                  // refuses a direct orders update from the browser, and the
                  // server can actually verify the order's contact details
                  // belong to this user before reassigning it.
                }
              });
            }
          }
        } catch (e) {
          console.warn("Error fetching Supabase orders:", e);
        }

        // Local storage is deliberately NOT consulted for orders any more.
        //
        // It used to be merged in from four places (user-keyed, phone-keyed,
        // guest, and a sessionStorage "last order"), each holding a copy that
        // checkout wrote with a hand-made `status: "Processing"`. Those copies
        // outlived the rows they mirrored and, when checkout fell back to a
        // client-generated id, described orders the server had never heard of:
        // the card rendered, the badge said Processing, and Cancel Order came
        // back "Order not found" because there was nothing to cancel.
        //
        // The database is the only thing that knows whether an order exists,
        // what it costs and where it is. If it is not in this response, it is
        // not an order.

        // Sort by creation date descending
        fetchedOrders.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

        // Evict the old mirrors. Browsers that already went through the old
        // checkout are carrying phantom orders in these keys; without this the
        // ghosts would simply sit there unread forever.
        try {
          if (user?.id) localStorage.removeItem(`Nakshra_user_orders_${user.id}`);
          if (userPhone) localStorage.removeItem(`Nakshra_phone_orders_${userPhone}`);
          localStorage.removeItem("Nakshra_guest_orders");
        } catch (e) {}

        setOrders(fetchedOrders);
        setLoadingOrders(false);
      };

      fetchOrders();
    }
  }, [activeTab, user?.id, user?.email, user?.user_metadata?.phone]);

  const handleSaveProfile = async () => {
    if (!user?.id) return;

    // Phone is optional — email is the account identifier. Requiring it here
    // locked every email-only account out of editing its own profile (including
    // out of correcting a wrong date of birth). Validate only what was entered.
    // Validation errors attach to the field that is wrong, rather than firing a
    // browser alert() that names the problem and then vanishes, leaving the
    // customer to work out which of five inputs it meant.
    const errs: Record<string, string> = {};
    const phoneDigits = editForm.phone.replace(/\D/g, "");
    if (phoneDigits.length > 0 && phoneDigits.length !== 10)
      errs.phone = "Enter a 10-digit mobile number, or leave this blank.";
    if (editForm.dob && new Date(editForm.dob) > new Date())
      errs.dob = "Date of birth can't be in the future.";
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    setSaveError("");

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

      // 1. Persist to the database FIRST and wait for it. This used to flip the
      //    UI to "Saved!" before the write ran and then swallow any failure, so
      //    a rejected write still looked like a success and the change was gone
      //    on the next reload. Blank fields are stored as NULL — never as an
      //    invented placeholder date.
      await api("/auth/profile", {
        method: "POST",
        body: JSON.stringify({
          fullName: editForm.fullName,
          phone: phoneDigits || "",
          gender: editForm.gender || "",
          dob: editForm.dob || "",
          pobCity: editForm.pobCity || "",
        }),
      });

      // 2. Only now is it safe to cache and report success.
      sessionStorage.setItem("Nakshra_user_profile", JSON.stringify(profileData));
      if (phoneDigits) {
        localStorage.setItem(`Nakshra_registered_user_phone_${phoneDigits}`, JSON.stringify(profileData));
      }
      if (editForm.email.trim()) {
        localStorage.setItem(`Nakshra_registered_user_email_${editForm.email.trim().toLowerCase()}`, JSON.stringify(profileData));
      }

      setProfile(profileData);
      setIsEditing(false);
      setSaveSuccess(true);
      setSaving(false);
      setTimeout(() => setSaveSuccess(false), 3000);

      // 3. Best-effort mirror to Firestore; failure here is cosmetic only.
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

    } catch (e: any) {
      setSaving(false);
      setSaveSuccess(false);
      setSaveError(humanError(e, "We couldn't save your profile. Please try again."));
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
                  <button onClick={() => { setIsEditing(false); setFieldErrors({}); setSaveError(""); }} className="p-1 rounded-full hover:bg-black/5" style={{ color: MAROON }}><X size={18} /></button>
                </div>
                {saveError && (
                  <div className="p-3 rounded-xl text-xs leading-relaxed"
                    style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)", color: "#B02020" }}>
                    {saveError}
                  </div>
                )}
                <div>
                  <label htmlFor="profile-full-name" className="block text-xs font-semibold mb-1" style={{ color: "#7A6A58" }}>Full Name</label>
                  <input id="profile-full-name" name="name" autoComplete="name" type="text" value={editForm.fullName} onChange={e => setEditForm(p => ({ ...p, fullName: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ border: "1px solid rgba(91,31,36,0.15)", background: "#FAF7F2", color: MAROON }} />
                </div>
                <div>
                  <label htmlFor="profile-email" className="block text-xs font-semibold mb-1" style={{ color: "#7A6A58" }}>Email Address</label>
                  {/* Read-only on purpose. This was an editable input, but
                      /api/auth/profile accepts no email field and never has, so
                      a change was written to local state and localStorage only —
                      it looked saved, then reverted on the next load when the
                      users row was re-read. Email is also the Supabase Auth
                      identifier, so changing it needs a verification flow rather
                      than a text box. */}
                  <input id="profile-email" name="email" autoComplete="email" type="email" value={editForm.email} readOnly disabled
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none cursor-not-allowed"
                    style={{ border: "1px solid rgba(91,31,36,0.10)", background: "#F1ECE4", color: "#9A8A78" }} />
                  <p className="text-[10px] mt-1" style={{ color: "#9A8A78" }}>
                    Your email is your login. To change it, message us on WhatsApp.
                  </p>
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
                  {fieldErrors.phone && <p className="text-[11px] mt-1" style={{ color: "#DC2626" }}>{fieldErrors.phone}</p>}
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
                                // Belt and braces: `disabled={{ after: new Date() }}`
                                // already stops the picker offering a future day,
                                // so this cannot fire. Ignore rather than alert —
                                // an alert for an unreachable state is noise.
                                if (date > new Date()) return;
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

                {addrSaveWarning && (
                  <div className="mb-3 p-3 rounded-xl text-xs leading-relaxed flex items-start gap-2"
                    style={{ background: "rgba(200,160,68,0.10)", border: "1px solid rgba(200,160,68,0.35)", color: "#8B6914" }}>
                    <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                    <span>{addrSaveWarning}</span>
                  </div>
                )}

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
                            <button onClick={() => openDeleteAddrDialog(addr)} className="p-2 rounded-lg hover:bg-red-50" style={{ color: "#C04040", border: "1px solid rgba(192,64,64,0.15)" }}>
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
                  {addrErrors.name && <p className="text-[11px] mt-1" style={{ color: "#DC2626" }}>{addrErrors.name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-600">Phone Number *</label>
                  <input type="tel" value={addrForm.phone} onChange={e => setAddrForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border border-black/15 bg-[#FAF7F2]" />
                  {addrErrors.phone && <p className="text-[11px] mt-1" style={{ color: "#DC2626" }}>{addrErrors.phone}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-600">PIN Code *</label>
                    <div className="relative">
                      <input type="text" maxLength={6} placeholder="6-digit PIN" value={addrForm.pin} onChange={e => handleProfilePinChange(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border border-black/15 bg-[#FAF7F2]" />
                  {addrErrors.pin && <p className="text-[11px] mt-1" style={{ color: "#DC2626" }}>{addrErrors.pin}</p>}
                      {pincodeLoading && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-amber-700 animate-pulse">Auto-filling...</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-600">House / Flat No. *</label>
                    <input type="text" placeholder="e.g. 01A, B-402" value={addrForm.house} onChange={e => setAddrForm(p => ({ ...p, house: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border border-black/15 bg-[#FAF7F2]" />
                  {addrErrors.house && <p className="text-[11px] mt-1" style={{ color: "#DC2626" }}>{addrErrors.house}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-600">Street Address *</label>
                  <input type="text" value={addrForm.street} onChange={e => setAddrForm(p => ({ ...p, street: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border border-black/15 bg-[#FAF7F2]" />
                  {addrErrors.street && <p className="text-[11px] mt-1" style={{ color: "#DC2626" }}>{addrErrors.street}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-600">City *</label>
                    <input type="text" value={addrForm.city} onChange={e => setAddrForm(p => ({ ...p, city: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border border-black/15 bg-[#FAF7F2]" />
                  {addrErrors.city && <p className="text-[11px] mt-1" style={{ color: "#DC2626" }}>{addrErrors.city}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-600">State *</label>
                    <input type="text" value={addrForm.state} onChange={e => setAddrForm(p => ({ ...p, state: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border border-black/15 bg-[#FAF7F2]" />
                  {addrErrors.state && <p className="text-[11px] mt-1" style={{ color: "#DC2626" }}>{addrErrors.state}</p>}
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
                          {type}
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
                <ShoppingBag size={28} strokeWidth={1.2} className="mx-auto mb-2" style={{ color: "#C9BCAA" }} />
                <p className="text-sm font-semibold mb-1" style={{ fontFamily: SERIF, color: MAROON }}>No orders yet</p>
                <p className="text-xs" style={{ color: "#7A6A58" }}>Orders you place will appear here.</p>
              </div>
            )}
            {orders.map(order => {
              const itemsList = order.order_items || order.items || [];
              const isExpanded = expandedOrders[order.id];
              const stepIdx = getOrderStep(order.status, order.awb_code);
              const isCancelled = order.status === "CANCELLED" || order.status === "Cancelled";
              const canReview = !isCancelled && String(order.status || "").toUpperCase() !== "PENDING";
              return (
                <div key={order.id} className="rounded-2xl overflow-hidden transition-all" style={{ background: "#fff", border: "1px solid rgba(91,31,36,0.08)" }}>
                  <div className="p-4 flex items-center justify-between gap-3 cursor-pointer" onClick={() => toggleOrder(order.id)}>
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Lead with what was actually bought. The card used to show
                          the raw order UUID, which means nothing to a customer and
                          swallowed the whole row. */}
                      <div className="relative flex-shrink-0">
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden"
                          style={{ background: "#FAF7F2", border: "1px solid rgba(91,31,36,0.08)" }}>
                          {orderThumb(order) ? (
                            <img src={orderThumb(order)!} alt="" className="w-full h-full object-contain" loading="lazy" />
                          ) : (
                            <Package size={20} strokeWidth={1.4} style={{ color: "#C9BCAA" }} />
                          )}
                        </div>
                        {itemsList.length > 1 && (
                          <span className="absolute -bottom-1 -right-1 min-w-[20px] h-5 px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
                            style={{ background: MAROON, color: IVORY, border: "2px solid #fff" }}>
                            +{itemsList.length - 1}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: MAROON }}>{orderTitle(order)}</p>
                        <p className="text-[10px]" style={{ color: "#9A8A78" }}>{orderNumber(order.id)} · {new Date(order.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold" style={{ fontFamily: PRICE_FONT, color: MAROON }}>₹{orderRupees(order).toLocaleString("en-IN")}</p>
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
                                  <s.Icon size={13} strokeWidth={1.6} />
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
                          <div key={i} className="flex items-center gap-3 text-xs">
                            <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                              style={{ background: "#FAF7F2", border: "1px solid rgba(91,31,36,0.08)" }}>
                              {itemThumb(it) ? (
                                <img src={itemThumb(it)!} alt="" className="w-full h-full object-contain" loading="lazy" />
                              ) : (
                                <Package size={16} strokeWidth={1.4} style={{ color: "#C9BCAA" }} />
                              )}
                            </div>
                            <span className="flex-1 min-w-0" style={{ color: "#3A2A20" }}>
                              {itemName(it)} <span style={{ color: "#9A8A78" }}>× {itemQty(it)}</span>
                            </span>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <span className="font-semibold">₹{((itemPaise(it) * itemQty(it)) / 100).toLocaleString("en-IN")}</span>
                              {/* Reviews were hard to find from the product page alone;
                                  this is where a buyer thinks about what they bought. */}
                              {canReview && itemProduct(it)?.slug && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); navigate(`/shop/${itemProduct(it)!.slug}?review=1`); }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors hover:bg-amber-50"
                                  style={{ color: "#8B6914", border: "1px solid rgba(200,160,68,0.4)" }}>
                                  <Star size={10} fill={GOLD} stroke={GOLD} /> Rate &amp; review
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Action Buttons */}
                      {!isCancelled && stepIdx <= 1 && (
                        <div className="pt-4 flex justify-end items-center mt-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); openCancelDialog(order); }}
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

      {/* Cancel-order confirmation. Replaces window.confirm() + alert(), which
          rendered as browser chrome outside the site and could only show the
          order's raw UUID. */}
      {cancelTarget && cancelState === "done" ? (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: "rgba(28,6,8,0.55)", backdropFilter: "blur(3px)" }}
          onClick={() => setCancelTarget(null)}>
          <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden animate-fade-in p-6 text-center"
            style={{ background: "#fff", boxShadow: "0 20px 60px rgba(91,31,36,0.28)" }}>
            <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(74,138,74,0.12)" }}>
              <Check size={22} strokeWidth={2} style={{ color: "#2E6B2E" }} />
            </div>
            <h3 className="text-base font-semibold mb-1" style={{ fontFamily: SERIF, color: MAROON }}>Order cancelled</h3>
            <p className="text-xs leading-relaxed mb-5" style={{ color: "#7A6A58" }}>
              We've cancelled it and put the items back in stock. If you had already paid, your refund is being processed and will reach you in 5–7 working days.
            </p>
            <button onClick={() => setCancelTarget(null)} className="w-full py-3 rounded-xl text-sm font-semibold"
              style={{ background: MAROON, color: IVORY }}>Done</button>
          </div>
        </div>
      ) : (
        <ConfirmDialog
          open={!!cancelTarget}
          title="Cancel this order?"
          subtitle="This can't be undone."
          confirmLabel="Yes, cancel"
          workingLabel="Cancelling…"
          state={cancelState === "done" ? "idle" : cancelState}
          error={cancelError}
          onConfirm={confirmCancelOrder}
          onClose={closeCancelDialog}
          body={cancelTarget && (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{ background: "rgba(200,160,68,0.10)", border: "1px solid rgba(91,31,36,0.08)" }}>
                {orderThumb(cancelTarget) ? (
                  <img src={orderThumb(cancelTarget)!} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Package size={20} strokeWidth={1.4} style={{ color: "#C9BCAA" }} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate" style={{ color: MAROON }}>{orderTitle(cancelTarget)}</p>
                <p className="text-[10px]" style={{ color: "#9A8A78" }}>
                  {new Date(cancelTarget.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
              <p className="text-sm font-semibold flex-shrink-0" style={{ fontFamily: PRICE_FONT, color: MAROON }}>
                ₹{orderRupees(cancelTarget).toLocaleString("en-IN")}
              </p>
            </div>
          )}
        />
      )}

      {/* Address deletion — same dialog, so both destructive actions on this
          page behave identically instead of one being browser chrome. */}
      <ConfirmDialog
        open={!!deleteAddrTarget}
        title="Remove this address?"
        subtitle="You can add it again later."
        confirmLabel="Remove"
        workingLabel="Removing…"
        state={deleteAddrState}
        error={deleteAddrError}
        onConfirm={confirmDeleteAddress}
        onClose={closeDeleteAddrDialog}
        body={deleteAddrTarget && (
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl mt-0.5 flex-shrink-0" style={{ background: "rgba(200,160,68,0.1)", color: MAROON }}>
              <MapPin size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold" style={{ color: "#3A2A1A" }}>
                {deleteAddrTarget.full_name || deleteAddrTarget.name} · {deleteAddrTarget.phone}
              </p>
              <p className="text-xs leading-relaxed text-gray-600 mt-1">
                {[deleteAddrTarget.line1 || deleteAddrTarget.address_line1 || deleteAddrTarget.address,
                  deleteAddrTarget.city, deleteAddrTarget.state].filter(Boolean).join(", ")}
                {" – "}{deleteAddrTarget.pincode || deleteAddrTarget.pin}
              </p>
            </div>
          </div>
        )}
      />
    </div>
  );
}
