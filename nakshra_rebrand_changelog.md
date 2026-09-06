# Nakshra Rebranding Changelog
**Date:** 2026-09-04  
**Branch:** `Yashasvi`  
**Repo:** [github.com/priyanshu312/ArohamNew/tree/Yashasvi](https://github.com/priyanshu312/ArohamNew/tree/Yashasvi)  
**Commit:** `028796b` — _rebrand: rename Aroham to Nakshra across entire codebase_

---

## What Changed

All occurrences of `Aroham`, `aroham`, and `AROHAM` were replaced with `Nakshra`, `nakshra`, and `NAKSHRA` respectively — across **133 source files** and **3 file renames**.

---

## File Renames

| Old Filename | New Filename |
|---|---|
| `apps/web/visual/components/layout/ArohamLogoLoader.tsx` | `NakshraLogoLoader.tsx` |
| `apps/web/visual/components/home/WhyAroham.tsx` | `WhyNakshra.tsx` |
| `docs/Aroham_AI_Chatbot_Recommendation_Engine_Documentation.pdf` | `Nakshra_AI_Chatbot_Recommendation_Engine_Documentation.pdf` |

---

## Files Modified by Category

### 🌐 Web App — Pages (`apps/web/visual/pages/`)
- `HomePage.tsx`
- `ShopPage.tsx`
- `ProductDetailPage.tsx`
- `ShippingPage.tsx`
- `PaymentPage.tsx`
- `ConfirmationPage.tsx`
- `ConsultPage.tsx`
- `ProfilePage.tsx`
- `AstrologerDashboard.tsx`
- `ShippingPolicyPage.tsx`
- `ReturnPolicyPage.tsx`
- `FAQPage.tsx`
- `ContactUsPage.tsx`
- `TrackOrderPage.tsx`
- `PrivacyPolicyPage.tsx`
- `TermsOfServicePage.tsx`
- `BlogPage.tsx`
- `WishlistPage.tsx`

### 🧩 Web App — Components (`apps/web/visual/components/`)
- `layout/Nav.tsx` — brand name in navbar
- `layout/Footer.tsx` — brand name in footer
- `layout/NakshraLogoLoader.tsx` _(renamed + updated)_ — loader text & import
- `layout/SearchModal.tsx`
- `layout/WhatsAppButton.tsx`
- `layout/LanguageSelector.tsx`
- `home/WhyNakshra.tsx` _(renamed + updated)_ — section heading
- `home/NavagrahaHero.tsx`
- `home/HowItsMade.tsx`
- `home/ProductsAndCombos.tsx`
- `home/ShopConsultCards.tsx`
- `home/SolarSystem3D.tsx`
- `home/HexPrismCarousel.tsx`
- `home/VideoTestimonials.tsx`
- `home/CommunityComments.tsx`
- `home/Newsletter.tsx`
- `product/AstroChatWidget.tsx` — AI chat system prompt
- `product/ProductCard.tsx`
- `product/KundliModal.tsx`
- `cart/CartSidebar.tsx`
- `checkout/CheckoutProgress.tsx`
- `checkout/OrderSummaryCard.tsx`
- `consult/AstrologerCard.tsx`
- `consult/ConsultChatModal.tsx`
- `consult/ConsultHero.tsx`
- `consult/PastHistoryModal.tsx`
- `blog/BlogCard.tsx`
- `blog/BlogDetailModal.tsx`
- `blog/BlogSidebar.tsx`
- `auth/AuthPage.tsx`
- `astrologer/AstrologerOnboardingWizard.tsx`
- `astrologer/AstrologerOnboardingStatus.tsx`

### 🔀 Web App — Router & App
- `visual/router/AppRouter.tsx` — import of `NakshraLogoLoader`, package imports
- `visual/app/App.tsx` — package imports
- `visual/data/blogData.ts` — blog content text
- `visual/i18n/locales/en.ts` — translation strings

### ⚙️ Web App — Config Files
- `apps/web/index.html` — browser tab title: `"Nakshra — Sacred Vedic Products & Temple Energized Yantras"`
- `apps/web/package.json` — package name: `@nakshra/web`, all dependency scopes `@nakshra/*`
- `apps/web/tsconfig.json` — path aliases `@nakshra/*`
- `apps/web/vite.config.ts` — path aliases `@nakshra/*`
- `apps/web/netlify.toml`
- `apps/web/README.md`

### 📦 Shared Packages (`packages/`)
All package `name` fields and internal cross-imports updated:

| Package | Old Name | New Name |
|---|---|---|
| shared-api | `@aroham/shared-api` | `@nakshra/shared-api` |
| shared-auth | `@aroham/shared-auth` | `@nakshra/shared-auth` |
| shared-config | `@aroham/shared-config` | `@nakshra/shared-config` |
| shared-hooks | `@aroham/shared-hooks` | `@nakshra/shared-hooks` |
| shared-services | `@aroham/shared-services` | `@nakshra/shared-services` |
| shared-state | `@aroham/shared-state` | `@nakshra/shared-state` |
| shared-types | `@aroham/shared-types` | `@nakshra/shared-types` |
| shared-utils | `@aroham/shared-utils` | `@nakshra/shared-utils` |
| shared-validation | `@aroham/shared-validation` | `@nakshra/shared-validation` |

Modified source files within packages:
- `packages/shared-types/src/product.ts` — `ArohamProduct` → `NakshraProduct` interface
- `packages/shared-types/src/cart.ts`
- `packages/shared-state/src/CartContext.tsx` — storage keys, coupon code `NAKSHRA10`, type refs
- `packages/shared-state/src/WishlistContext.tsx` — storage keys, type refs
- `packages/shared-auth/src/AuthContext.tsx`
- `packages/shared-api/src/api.ts`
- `packages/shared-api/src/astrology.ts`
- `packages/shared-config/src/data.ts`
- `packages/shared-config/src/mockData.ts`
- `packages/shared-config/src/products.ts`
- `packages/shared-config/src/contact.ts`
- `packages/shared-services/src/supabase.ts`
- `packages/shared-hooks/src/useAuth.ts`
- `packages/shared-hooks/src/useCart.ts`
- `packages/shared-hooks/src/useProducts.ts`

### 🖥️ Backend (`backend/`)
- `server.js` — server startup log, health endpoint service name
- `routes/auth.js` — auto-generated email `@nakshra.in`, password prefix
- `routes/chat.js` — AI system prompt: `"Nakshra's Sacred AI AstroGuide"`, store references
- `routes/products.js` — `NakshraProduct` type comment
- `routes/shiprocket.js` — test email `test@nakshra.in`, test customer name
- `services/orderService.js` — coupon code `NAKSHRA10`
- `package.json` — package name `nakshra-backend`, description

### 📱 Mobile App (`apps/mobile/`)
- `App.tsx`, `app.json`, `metro.config.js`, `package.json`
- All screens, components, contexts, services, types

### 🗂️ Root & Infra
- `package.json` — root workspace name
- `tsconfig.base.json` — path aliases
- `docker-compose.yml` — container name `nakshra_gorse_engine`
- `netlify.toml` — project name
- `fixes_log.md`
- `docs/local_dependencies_handoff.md`

---

## Storage Keys Changed
> ⚠️ Existing browser data under old keys will not be migrated (user accepted this).

| Old Key | New Key |
|---|---|
| `aroham_cart` | `nakshra_cart` |
| `aroham_wishlist` | `nakshra_wishlist` |
| `aroham_user_cart_{id}` | `nakshra_user_cart_{id}` |
| `aroham_user_wishlist_{id}` | `nakshra_user_wishlist_{id}` |
| `aroham_applied_coupon` | `nakshra_applied_coupon` |
| `aroham_buy_now_intent` | `nakshra_buy_now_intent` |
| `aroham_user_profile` | `nakshra_user_profile` |
| `aroham_astro_chat_history` | `nakshra_astro_chat_history` |
| `aroham_guest_user_id` | `nakshra_guest_user_id` |

---

## Coupon Code Changed
| Old | New |
|---|---|
| `AROHAM10` | `NAKSHRA10` |

---

## Issues Fixed During Rebranding

| Issue | Fix |
|---|---|
| UTF-8 BOM added by PowerShell `WriteAllText` | Stripped BOM from all 133 files using `UTF8Encoding($false)` |
| `@Nakshra/` (wrong case) in package scopes | Fixed to `@nakshra/` (all lowercase) across 102 files |
| `ArohamLogoLoader.tsx` file not renamed → build error | Renamed to `NakshraLogoLoader.tsx` |
| `WhyAroham.tsx` file not renamed | Renamed to `WhyNakshra.tsx` |

---

## Build Verification
```
vite v6.3.5 building for production...
✓ 2670 modules transformed.
dist/index.html                     1.76 kB │ gzip:   0.84 kB
dist/assets/index-BkC5ogEj.css    174.68 kB │ gzip:  26.75 kB
dist/assets/index-Qk3RHZzX.js   1,703.67 kB │ gzip: 462.02 kB
✓ built in 1m  ← Exit code 0 ✅
```
