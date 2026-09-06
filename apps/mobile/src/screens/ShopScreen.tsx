import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, FlatList, TextInput
} from 'react-native';
import { MAROON, GOLD } from '../constants/theme';
import { NakshraProduct } from '../types';
import { useProducts } from '@nakshra/shared-hooks/useProducts';
import { CATEGORIES as SHARED_CATEGORIES, PURPOSES } from '@nakshra/shared-config/data';
import { ProductCard } from '../components/ProductCard';

const CATEGORIES = ['All', ...SHARED_CATEGORIES];
const SORTS = ['Popular', 'Price: Low', 'Price: High', 'Reviews'];
const PRICE_CAPS = [
  { label: 'All Prices', value: 30000 },
  { label: 'Under ₹1,000', value: 1000 },
  { label: 'Under ₹3,000', value: 3000 },
  { label: 'Under ₹10,000', value: 10000 },
];

// Matches web's ShopPage.tsx exactly — normalizes plural/singular so a category chip
// never silently returns zero results because "Gemstones" doesn't literally contain "Gemstone".
function isSameCategory(prodCategory?: string, filterCat?: string): boolean {
  if (!prodCategory || !filterCat) return false;
  const pCatNorm = prodCategory.toLowerCase().trim().replace(/s$/, '');
  const cNorm = filterCat.toLowerCase().trim().replace(/s$/, '');
  return pCatNorm === cNorm || prodCategory.toLowerCase().trim() === filterCat.toLowerCase().trim();
}

// Same collection-matching heuristic as web's ShopPage.tsx (title-based shelves from Home
// map onto rules here rather than a real "collection" field on the product).
function matchesCollection(p: NakshraProduct, collectionLower: string): boolean {
  if (collectionLower.includes('discount') || collectionLower.includes('sale') || collectionLower.includes('off')) {
    return !!(p.original && p.original > p.price);
  }
  if (collectionLower.includes('trending') || collectionLower.includes('bestsell') || collectionLower.includes('top pick')) {
    return (p.rating || 0) >= 4.7 || !!(p.badges && p.badges.some((b) => b.toLowerCase().includes('bestseller') || b.toLowerCase().includes('trending')));
  }
  if (collectionLower.includes('combo') || collectionLower.includes('kit') || collectionLower.includes('bundle')) {
    return p.name.toLowerCase().includes('kit') || p.name.toLowerCase().includes('combo') || p.name.toLowerCase().includes('bundle')
      || !!(p.category && (p.category.toLowerCase().includes('kit') || p.category.toLowerCase().includes('combo')));
  }
  if (collectionLower.includes('fav')) {
    return (p.reviews || 0) >= 200 || (p.rating || 0) >= 4.8;
  }
  // Unknown collection title (e.g. "Mega Sale" has no dedicated rule on web either) — show everything.
  return true;
}

interface ShopScreenProps {
  onProductPress: (p: NakshraProduct) => void;
  onAddToCart: (p: NakshraProduct) => void;
  searchQuery?: string;
  collection?: string;
}

export const ShopScreen: React.FC<ShopScreenProps> = ({ onProductPress, onAddToCart, searchQuery = '', collection = '' }) => {
  const { products, loading } = useProducts();
  const [selectedCat, setSelectedCat] = useState('All');
  const [selectedPurposes, setSelectedPurposes] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState(30000);
  const [selectedSort, setSelectedSort] = useState('Popular');
  const [search, setSearch] = useState(searchQuery);
  const [showFilters, setShowFilters] = useState(false);

  const togglePurpose = (p: string) => setSelectedPurposes((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);

  const filtered = products.filter((p) => {
    if (selectedCat !== 'All' && !isSameCategory(p.category, selectedCat)) return false;
    if (selectedPurposes.length && p.purpose && !selectedPurposes.includes(p.purpose)) return false;
    if (collection && !matchesCollection(p, collection.toLowerCase())) return false;
    if (maxPrice < 30000 && p.price > maxPrice) return false;
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      const matchesSearch = p.name.toLowerCase().includes(q) || (p.subtitle || '').toLowerCase().includes(q) || (p.purpose || '').toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (selectedSort === 'Price: Low') return a.price - b.price;
    if (selectedSort === 'Price: High') return b.price - a.price;
    if (selectedSort === 'Reviews') return (b.reviews ?? 0) - (a.reviews ?? 0);
    return (b.rating ?? 0) - (a.rating ?? 0);
  });

  const hasActiveFilters = selectedCat !== 'All' || selectedPurposes.length > 0 || maxPrice < 30000;
  const clearAll = () => { setSelectedCat('All'); setSelectedPurposes([]); setMaxPrice(30000); };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={MAROON} />
        <Text style={styles.loaderText}>Loading sacred catalog…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Input Bar */}
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, purpose, or category..."
          placeholderTextColor="#8B7355"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.clearSearchBtn}>
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category Chips Bar */}
      <View style={styles.chipBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, selectedCat === cat && styles.activeChip]}
              onPress={() => setSelectedCat(cat)}
            >
              <Text style={[styles.chipText, selectedCat === cat && styles.activeChipText]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sort + Filter Toggle Row */}
      <View style={styles.sortBar}>
        <TouchableOpacity onPress={() => setShowFilters((s) => !s)} style={styles.filterToggle}>
          <Text style={styles.filterToggleText}>⚙ Filters{hasActiveFilters ? ' •' : ''}</Text>
        </TouchableOpacity>
        <Text style={styles.countText}>{sorted.length} Remedies</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortScroll}>
          {SORTS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.sortChip, selectedSort === s && styles.activeSortChip]}
              onPress={() => setSelectedSort(s)}
            >
              <Text style={[styles.sortText, selectedSort === s && styles.activeSortText]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Purpose & Price Filter Panel */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <Text style={styles.filterPanelLabel}>Purpose & Benefit</Text>
          <View style={styles.chipRow}>
            {PURPOSES.map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.filterChip, selectedPurposes.includes(p) && styles.activeChip]}
                onPress={() => togglePurpose(p)}
              >
                <Text style={[styles.chipText, selectedPurposes.includes(p) && styles.activeChipText]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.filterPanelLabel, { marginTop: 14 }]}>Price Budget</Text>
          <View style={styles.chipRow}>
            {PRICE_CAPS.map((pc) => (
              <TouchableOpacity
                key={pc.label}
                style={[styles.filterChip, maxPrice === pc.value && styles.activeChip]}
                onPress={() => setMaxPrice(pc.value)}
              >
                <Text style={[styles.chipText, maxPrice === pc.value && styles.activeChipText]}>{pc.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {hasActiveFilters && (
            <TouchableOpacity onPress={clearAll} style={styles.clearFiltersBtn}>
              <Text style={styles.clearFiltersBtnText}>↺ Reset All Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Product List Grid */}
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.gridContainer}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => onProductPress(item)}
            onAddToCart={() => onAddToCart(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>No Remedies Found</Text>
            <Text style={styles.emptyText}>Try selecting another category or search term.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCFAF7',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 10,
    fontSize: 12,
    color: '#8B7355',
    fontWeight: '600',
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#FAF3E8',
    position: 'relative',
    justifyContent: 'center',
  },
  searchInput: {
    height: 38,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#E5D7C3',
    borderRadius: 19,
    paddingHorizontal: 16,
    fontSize: 12,
    color: '#3E3125',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: 28,
    padding: 4,
  },
  clearSearchText: {
    fontSize: 14,
    color: '#8B7355',
    fontWeight: '700',
  },
  chipBar: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#FAF3E8',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#E5D7C3',
    marginRight: 8,
  },
  activeChip: {
    backgroundColor: MAROON,
    borderColor: MAROON,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5B4A32',
  },
  activeChipText: {
    color: GOLD,
  },
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#FAF3E8',
    gap: 10,
  },
  filterToggle: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(91,31,36,0.18)',
  },
  filterToggleText: {
    fontSize: 10,
    fontWeight: '800',
    color: MAROON,
  },
  countText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8B7355',
  },
  sortScroll: {
    flex: 1,
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#FAF8F5',
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeSortChip: {
    borderColor: MAROON,
    backgroundColor: 'rgba(91, 31, 36, 0.06)',
  },
  sortText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8B7355',
  },
  activeSortText: {
    color: MAROON,
    fontWeight: '800',
  },
  filterPanel: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#FAF3E8',
    padding: 16,
  },
  filterPanelLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: MAROON,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#E5D7C3',
  },
  clearFiltersBtn: {
    alignSelf: 'center',
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(192,64,64,0.3)',
  },
  clearFiltersBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C04040',
  },
  gridContainer: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 80,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3E3125',
  },
  emptyText: {
    fontSize: 11,
    color: '#8B7355',
  },
});
