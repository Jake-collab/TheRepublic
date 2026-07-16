/**
 * BuySellScreen — marketplace section.
 *
 * Default view: Buy (consumer). A flip toggle switches to Sell (provider).
 * Categories appear as horizontal section headers with sideways-scrolling
 * item cards. "View All →" expands any category to a full-page list.
 *
 * Full item data, listing creation, and search will be wired in Section 3.
 * This screen establishes the complete navigation shell and visual structure.
 */
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState, useCallback, useRef } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

type Mode = "buy" | "sell";

interface Category {
  id: string;
  label: string;
  emoji: string;
}

const CATEGORIES: Category[] = [
  { id: "electronics",  label: "Electronics",  emoji: "📱" },
  { id: "clothing",     label: "Clothing",      emoji: "👕" },
  { id: "furniture",    label: "Furniture",     emoji: "🪑" },
  { id: "vehicles",     label: "Vehicles",      emoji: "🚗" },
  { id: "collectibles", label: "Collectibles",  emoji: "🎨" },
  { id: "sports",       label: "Sports",        emoji: "⚽" },
  { id: "home",         label: "Home & Garden", emoji: "🏡" },
  { id: "books",        label: "Books",         emoji: "📚" },
];

// ─── Mode flip toggle ─────────────────────────────────────────────────────────

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const colors = useColors();
  const flipAnim = useRef(new Animated.Value(0)).current;

  const handleFlip = () => {
    const next: Mode = mode === "buy" ? "sell" : "buy";
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(flipAnim, {
      toValue: next === "sell" ? 1 : 0,
      useNativeDriver: true,
      tension: 300,
      friction: 20,
    }).start();
    onChange(next);
  };

  const rotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });

  return (
    <Pressable
      style={[styles.toggleWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}
      onPress={handleFlip}
      hitSlop={8}
    >
      <Text style={[styles.toggleLabel, { color: mode === "buy" ? colors.primary : colors.mutedForeground }]}>
        Buy
      </Text>
      <Animated.View style={[styles.toggleIcon, { transform: [{ rotate }] }]}>
        <Feather name="refresh-cw" size={14} color={colors.foreground} />
      </Animated.View>
      <Text style={[styles.toggleLabel, { color: mode === "sell" ? colors.primary : colors.mutedForeground }]}>
        Sell
      </Text>
    </Pressable>
  );
}

// ─── Item card skeleton ───────────────────────────────────────────────────────

function ItemCard({ label, price, emoji }: { label: string; price: string; emoji: string }) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.cardThumb, { backgroundColor: colors.secondary }]}>
        <Text style={styles.cardEmoji}>{emoji}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardLabel, { color: colors.foreground }]} numberOfLines={2}>
          {label}
        </Text>
        <Text style={[styles.cardPrice, { color: colors.primary }]}>{price}</Text>
      </View>
    </View>
  );
}

// ─── Sell placeholder ─────────────────────────────────────────────────────────

function SellView() {
  const colors = useColors();
  return (
    <View style={styles.placeholderCenter}>
      <View style={[styles.placeholderIcon, { backgroundColor: colors.secondary }]}>
        <Feather name="plus-circle" size={36} color={colors.primary} />
      </View>
      <Text style={[styles.placeholderTitle, { color: colors.foreground }]}>List an Item</Text>
      <Text style={[styles.placeholderSub, { color: colors.mutedForeground }]}>
        Photos, price, description, and your location — buyers in your area see it instantly.
      </Text>
      <Pressable style={[styles.ctaBtn, { backgroundColor: colors.primary }]}>
        <Feather name="camera" size={16} color="#ffffff" />
        <Text style={styles.ctaBtnText}>Create Listing</Text>
      </Pressable>
      <Text style={[styles.feeTip, { color: colors.mutedForeground }]}>
        1% platform fee · capped at $20
      </Text>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BuySellScreen({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("buy");

  const handleViewAll = useCallback((cat: Category) => {
    Haptics.selectionAsync();
    // Full-page category drill-down — wired in Section 3
  }, []);

  // Sample items per category (will come from API in Section 3)
  const sampleItems = [
    { label: "iPhone 14 Pro — 256GB", price: "$749", emoji: "📱" },
    { label: "Nike Air Max 2024", price: "$89", emoji: "👟" },
    { label: "Vintage Oak Desk", price: "$210", emoji: "🪑" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={onOpenDrawer} style={styles.hamburger} hitSlop={10}>
          <Feather name="menu" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {mode === "buy" ? "Buy" : "Sell"}
        </Text>
        <ModeToggle mode={mode} onChange={setMode} />
      </View>

      {/* ── Content ────────────────────────────────────────────────────── */}
      {mode === "sell" ? (
        <SellView />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        >
          {/* Search bar */}
          <Pressable
            style={[styles.searchBar, { backgroundColor: colors.secondary, borderColor: colors.border }]}
          >
            <Feather name="search" size={15} color={colors.mutedForeground} />
            <Text style={[styles.searchPlaceholder, { color: colors.mutedForeground }]}>
              Search items near you…
            </Text>
          </Pressable>

          {/* Category sections */}
          {CATEGORIES.map((cat) => (
            <View key={cat.id} style={styles.catSection}>
              {/* Section header */}
              <View style={styles.catHeader}>
                <Text style={styles.catEmoji}>{cat.emoji}</Text>
                <Text style={[styles.catLabel, { color: colors.foreground }]}>{cat.label}</Text>
                <Pressable
                  style={styles.viewAllBtn}
                  onPress={() => handleViewAll(cat)}
                  hitSlop={8}
                >
                  <Text style={[styles.viewAllText, { color: colors.primary }]}>View All</Text>
                  <Feather name="chevron-right" size={13} color={colors.primary} />
                </Pressable>
              </View>

              {/* Horizontal item scroll */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.itemRow}
              >
                {sampleItems.map((item, i) => (
                  <ItemCard key={i} {...item} />
                ))}
                {/* "See more" nudge card */}
                <Pressable
                  style={[styles.seeMoreCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                  onPress={() => handleViewAll(cat)}
                >
                  <Feather name="grid" size={22} color={colors.primary} />
                  <Text style={[styles.seeMoreText, { color: colors.primary }]}>
                    See all {cat.label}
                  </Text>
                </Pressable>
              </ScrollView>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  hamburger: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    flex: 1,
    letterSpacing: -0.4,
  },
  toggleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  toggleIcon: {
    width: 22,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingTop: 12,
    gap: 28,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchPlaceholder: { fontSize: 15 },
  catSection: { gap: 10 },
  catHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
  },
  catEmoji: { fontSize: 17 },
  catLabel: { fontSize: 17, fontWeight: "700", flex: 1 },
  viewAllBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  viewAllText: { fontSize: 13, fontWeight: "600" },
  itemRow: {
    paddingHorizontal: 16,
    gap: 10,
  },
  card: {
    width: 148,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  cardThumb: {
    height: 110,
    justifyContent: "center",
    alignItems: "center",
  },
  cardEmoji: { fontSize: 40 },
  cardBody: { padding: 10, gap: 4 },
  cardLabel: { fontSize: 13, lineHeight: 18 },
  cardPrice: { fontSize: 15, fontWeight: "700" },
  seeMoreCard: {
    width: 110,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
  },
  seeMoreText: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  // Sell mode
  placeholderCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 14,
  },
  placeholderIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  placeholderTitle: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  placeholderSub: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 24,
    marginTop: 4,
  },
  ctaBtnText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
  feeTip: { fontSize: 12, marginTop: 4 },
});
