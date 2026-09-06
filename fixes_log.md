# Nakshra Bug Fixes & Optimizations Log

1. The Checkout Login Loop (Cart Sidebar)

The Bug: Guests clicking "Proceed to Checkout" from the cart were triggering backend errors because they weren't logged in, and the cart wouldn't close.

What We Fixed: The cart now gracefully slides shut and forces the beautiful Login Modal to appear if the user isn't logged in. Checkout is perfectly protected.

2. Product Image & Data Lag (Frontend Caching)

The Bug: The website was making fresh network requests every single time you switched between the Home, Shop, and Product pages. This caused the data and beautiful images to constantly "pop in" sluggishly.

What We Fixed: I built a custom caching system (`useProducts.ts`) that saves the data in the browser's memory and aggressively pre-loads all product images in the background. Now, switching pages feels smooth.

3. The "Select State" Overlap UI Glitch

The Bug: On the shipping page, the floating label "State" was visually colliding / overlapping with the default "Select State" placeholder text inside the dropdown box.

What We Fixed: I modified the internal `<option>` logic so the floating label acts as the sole, clean placeholder. No more overlapping text.

4. The Silent Shiprocket Failure

The Bug: The backend was silently skipping the Shiprocket API integration entirely, even when payments succeeded perfectly.

What We Fixed: I traced it to a broken database query (`select("*, users(*)")`) that was crashing under the hood. I rewrote and simplified the query in `paymentService.js`. Shiprocket now successfully generates shipments, assigns couriers, and grabs Air Waybills (AWBs) entirely automatically!

5. Profile Page Speed Optimization

The Bug: The Profile Page had a minor delay because it was fetching your name, email, and phone number from the database every single time you clicked it.

What We Fixed: Added `sessionStorage` caching directly to the Profile Page so your details snap onto the screen instantly from memory.

6. The Missing "State" in Saved Addresses

The Bug: Your saved addresses were perfectly saving the street, city, and pincode, but the State field was failing because the database table literally didn't have a column for it!

What We Fixed: I safely updated the backend routing code (`addresses.js`) to capture the state, added it to the database blueprint, and prepared the exact SQL command you need to run to add the column.

7. Cluttered UI when Adding Address

The Bug: When adding an address on the shipping page, the "Saved Addresses" block was still visible, making the form look cluttered.

What We Fixed: Modified `ShippingPage.tsx` to conditionally hide the saved addresses list while the new address form is actively shown, giving you a clean screen.

8. Cart clears too early during Payment

The Bug: The backend was clearing the cart database as soon as the Razorpay popup opened. If the user closed the popup without paying, their cart was completely erased!

What We Fixed: Moved the cart deletion logic in the backend from `/orders` (initialization) to `/payments/verify` (successful payment confirmation). The cart is now 100% safe until a successful payment happens.

9. Missing "My Orders" in Top Nav

The Bug: The "My Orders" link in the top navigation bar completely disappeared if the user wasn't fully logged in.

What We Fixed: Updated `Nav.tsx` to always show the link. If a guest clicks it, it safely opens the Login Modal instead of just being missing or redirecting them away.

10. "Buy Now" button fails

The Bug: The Buy Now button was force-navigating to the checkout page, completely bypassing the auth check. This caused the shipping page to crash for guests.

What We Fixed: Updated `ProductDetailPage.tsx` to intercept the Buy Now action. If the user is a guest, it safely opens the Login Modal instead of proceeding to a broken checkout.

11. Sluggish Product Page Loading

The Bug: Navigating to a product page had an artificial, multi-second smooth scrolling delay that made the page feel slow.

What We Fixed: Removed `behavior: "smooth"` from the `ScrollToTop` router component in `AppRouter.tsx` and changed it to `"instant"`. Page transitions now snap onto the screen immediately.

12. Cart persists after Logout

The Bug: When logging out, the cart context successfully cleared the items, but a separate guest-sync function accidentally saved the ghost cart items back into the guest memory before it finished wiping!

What We Fixed: Restructured the `CartContext.tsx` logic with a protective `isLoggingOut` mechanism. This blocks the guest-sync function from saving the cart during the exact moment a user is logging out.

13. Profile Details persist after Logout

The Bug: Our lightning-fast profile page cache (`Nakshra_user_profile`) wasn't being cleared when the user signed out, leaving details stored in the browser memory.

What We Fixed: Added `sessionStorage.removeItem("Nakshra_user_profile")` directly to the main `logout()` function in `AuthContext.tsx`.
