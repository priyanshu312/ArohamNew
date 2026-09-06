import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MAROON, GOLD } from '../constants/theme';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onWishlistPress?: () => void;
  onMenuPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onWishlistPress,
  onMenuPress,
}) => {
  const { wishlist } = useWishlist();
  const { isLoggedIn } = useAuth();

  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.left}>
          {/* Logo Disc */}
          <View style={styles.logoDisc}>
            <Text style={styles.logoOm}>ॐ</Text>
          </View>
          <Text style={styles.title}>Nakshra</Text>
        </View>

        <View style={styles.right}>
          {isLoggedIn && (
            <>
              <TouchableOpacity onPress={onWishlistPress} style={styles.iconBtn}>
                <Text style={styles.iconText}>❤️</Text>
                {wishlist.length > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{wishlist.length}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={onMenuPress} style={styles.iconBtn}>
                <Text style={styles.iconText}>👤</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(200, 160, 68, 0.12)',
  },
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoDisc: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: MAROON,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoOm: {
    fontSize: 16,
    fontWeight: '800',
    color: GOLD,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: MAROON,
    letterSpacing: 0.5,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    padding: 6,
    position: 'relative',
  },
  iconText: {
    fontSize: 18,
    color: '#3E3125',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: MAROON,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: GOLD,
    fontSize: 9,
    fontWeight: '800',
  },
});
