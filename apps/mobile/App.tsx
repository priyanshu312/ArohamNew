import React from 'react';
import { Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { CartProvider } from './src/context/CartContext';
import { WishlistProvider } from './src/context/WishlistContext';
import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("App Root ErrorBoundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#5B1F24', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🕉️</Text>
          <Text style={{ color: '#C8A044', fontSize: 20, fontWeight: '800', marginBottom: 8, textAlign: 'center' }}>
            Nakshra Sacred App
          </Text>
          <Text style={{ color: '#FFFFFF', fontSize: 13, textAlign: 'center', marginBottom: 20, lineHeight: 18 }}>
            {this.state.error?.message || "Something went wrong. Tap to reload."}
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#C8A044', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 }}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={{ color: '#5B1F24', fontSize: 13, fontWeight: '800' }}>RETRY AGAIN</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <RootNavigator />
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
