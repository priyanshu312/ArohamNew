import { CartProvider } from "@nakshra/shared-state";
import { AuthProvider } from "@nakshra/shared-auth";
import { WishlistProvider } from "@nakshra/shared-state";
import { AppRouter } from "@visual/router/AppRouter";

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <AppRouter />
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}

