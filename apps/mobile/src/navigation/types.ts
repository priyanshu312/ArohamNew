import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import { NakshraProduct, Astrologer, Address, CartItem } from '../types';

export type OrderConfirmationDetails = {
  orderId: string;
  items: CartItem[];
  total: number;
  createdAt: string;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  ProductDetail: { product: NakshraProduct };
  ChatRoom: { astrologer: Astrologer };
  CheckoutShipping: undefined;
  CheckoutPayment: { address: Address };
  CheckoutConfirm: OrderConfirmationDetails;
  TrackOrder: undefined;
  Policies: undefined;
  Wishlist: undefined;
  Orders: undefined;
  EditProfile: undefined;
  Addresses: undefined;
  ChatHistory: undefined;
};

export type TabParamList = {
  Home: undefined;
  Consult: undefined;
  Shop: { searchQuery?: string; collection?: string } | undefined;
  Profile: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
