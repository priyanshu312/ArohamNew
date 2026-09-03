import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Outlet, useLocation, Navigate, useNavigationType } from "react-router";
import { Nav } from "@visual/components/layout/Nav";
import { Footer } from "@visual/components/layout/Footer";
import { WhatsAppButton } from "@visual/components/layout/WhatsAppButton";
import { AstroChatWidget } from "@visual/components/product/AstroChatWidget";
import { CartSidebar } from "@visual/components/cart/CartSidebar";
import { AuthPage } from "@visual/components/auth/AuthPage";
import { NakshraLogoLoader } from "@visual/components/layout/NakshraLogoLoader";
import { HomePage } from "@visual/pages/HomePage";
import { ShopPage } from "@visual/pages/ShopPage";
import { ProductDetailPage } from "@visual/pages/ProductDetailPage";
import { ShippingPage } from "@visual/pages/ShippingPage";
import { PaymentPage } from "@visual/pages/PaymentPage";
import { ConfirmationPage } from "@visual/pages/ConfirmationPage";
import { ConsultPage } from "@visual/pages/ConsultPage";
import { ProfilePage } from "@visual/pages/ProfilePage";
import { AstrologerDashboard } from "@visual/pages/AstrologerDashboard";
import { ShippingPolicyPage } from "@visual/pages/ShippingPolicyPage";
import { ReturnPolicyPage } from "@visual/pages/ReturnPolicyPage";
import { FAQPage } from "@visual/pages/FAQPage";
import { ContactUsPage } from "@visual/pages/ContactUsPage";
import { TrackOrderPage } from "@visual/pages/TrackOrderPage";
import { PrivacyPolicyPage } from "@visual/pages/PrivacyPolicyPage";
import { TermsOfServicePage } from "@visual/pages/TermsOfServicePage";
import { BlogPage } from "@visual/pages/BlogPage";
import { WishlistPage } from "@visual/pages/WishlistPage";
import { useCart } from "@nakshra/shared-state";
import { useAuth } from "@nakshra/shared-auth";

function ScrollManager() {
  const location = useLocation();
  const navType = useNavigationType();

  // Enable native browser scroll restoration for smooth gesture navigation on mobile
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "auto";
    }
  }, []);

  // Reset scroll on forward navigation only
  useEffect(() => {
    if (navType === "PUSH") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [location.pathname, navType]);

  return null;
}

function MainLayout() {
  const { showCart } = useCart();
  const { showAuth } = useAuth();
  const location = useLocation();

  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Monitor network status for slow internet / offline
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Trigger smooth sacred logo transition on route change
  useEffect(() => {
    setIsRouteLoading(true);
    const timer = setTimeout(() => {
      setIsRouteLoading(false);
    }, 280);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-x-hidden">
      <Nav />
      {showCart && <CartSidebar />}
      {showAuth && <AuthPage />}
      
      {/* Slow network / Offline loader */}
      {isOffline && (
        <NakshraLogoLoader text="Connecting to Sacred Database... Please check internet connection" fullScreen={true} />
      )}

      {/* Route transition loader */}
      {isRouteLoading && !isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[9999] h-1 overflow-hidden pointer-events-none">
          <div className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 animate-pulse" />
        </div>
      )}

      {/* Main page content with smooth fade-in transition */}
      <main key={location.pathname + location.search} className="page-transition-enter flex-1 w-full">
        <Outlet />
      </main>

      <Footer />
      <WhatsAppButton />
      <AstroChatWidget />
    </div>
  );
}

function ProtectedRoute() {
  const { isLoggedIn, openAuth } = useAuth();

  if (!isLoggedIn) {
    setTimeout(() => openAuth(), 0);
    return null;
  }

  return <Outlet />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollManager />
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/shop/:slug" element={<ProductDetailPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/consult" element={<ConsultPage />} />
          <Route path="/shipping" element={<ShippingPolicyPage />} />
          <Route path="/returns" element={<ReturnPolicyPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/contact" element={<ContactUsPage />} />
          <Route path="/track" element={<TrackOrderPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/blog" element={<BlogPage />} />
          
          <Route path="/checkout/shipping" element={<ShippingPage />} />
          <Route path="/checkout/payment" element={<PaymentPage />} />
          <Route path="/checkout/confirm" element={<ConfirmationPage />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>
        
        {/* Standalone full-screen pages */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/astrologer" element={<AstrologerDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
