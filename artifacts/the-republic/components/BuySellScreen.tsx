/**
 * BuySellScreen — Section 3 full implementation.
 *
 * Buy mode  — search bar, category filter pills, 2-column grid of real listings
 *             from the API with infinite scroll. Tap a card to see full details.
 * Sell mode — 3-step form: (1) category, (2) title + description + price,
 *             (3) location + review. Creates a listing via the API.
 *
 * Photos: picker UI is shown but URLs are not uploaded yet (object-storage
 * integration is a future section). The listing is created without photos.
 */
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  memo,
} from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@clerk/expo";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useColors } from "@/hooks/useColors";
import {
  useListMarketplaceListings,
  useCreateMarketplaceListing,
  useUpdateMarketplaceListing,
  listMarketplaceListings,
  getListMarketplaceListingsQueryKey,
  type MarketplaceListing,
} from "@workspace/api-client-react";

// ── Constants ─────────────────────────────────────────────────────────────────

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
  { id: "other",        label: "Other",         emoji: "📦" },
];

type PlaceholderItem = { id: string; emoji: string; title: string; priceCents: number };
const PLACEHOLDER_LISTINGS: Record<string, PlaceholderItem[]> = {
  electronics: [
    { id: "p-e-1", emoji: "📱", title: "iPhone 14 Pro 128GB", priceCents: 75000 },
    { id: "p-e-2", emoji: "💻", title: "MacBook Air M2", priceCents: 110000 },
    { id: "p-e-3", emoji: "🎧", title: "AirPods Pro 2nd Gen", priceCents: 18000 },
    { id: "p-e-4", emoji: "⌚", title: "Apple Watch Series 9", priceCents: 29900 },
    { id: "p-e-5", emoji: "📺", title: '55" 4K Smart TV', priceCents: 34999 },
  ],
  clothing: [
    { id: "p-c-1", emoji: "👟", title: "Nike Air Max 270", priceCents: 8500 },
    { id: "p-c-2", emoji: "👕", title: "Vintage Levi's Jacket", priceCents: 4500 },
    { id: "p-c-3", emoji: "👗", title: "Summer Maxi Dress", priceCents: 2500 },
    { id: "p-c-4", emoji: "🧥", title: "North Face Puffer", priceCents: 12000 },
    { id: "p-c-5", emoji: "👜", title: "Coach Leather Tote", priceCents: 7500 },
  ],
  furniture: [
    { id: "p-f-1", emoji: "🛋", title: "Mid-Century Sofa", priceCents: 45000 },
    { id: "p-f-2", emoji: "🪑", title: "Ergonomic Desk Chair", priceCents: 18000 },
    { id: "p-f-3", emoji: "🛏", title: "Queen Bed Frame", priceCents: 32000 },
    { id: "p-f-4", emoji: "📚", title: "Tall Bookshelf", priceCents: 8500 },
    { id: "p-f-5", emoji: "🪞", title: "Full-Length Floor Mirror", priceCents: 5500 },
  ],
  vehicles: [
    { id: "p-v-1", emoji: "🚗", title: "2019 Honda Civic EX", priceCents: 1590000 },
    { id: "p-v-2", emoji: "🛵", title: "Vespa GTS 300", priceCents: 320000 },
    { id: "p-v-3", emoji: "🚙", title: "2020 Toyota RAV4", priceCents: 2490000 },
    { id: "p-v-4", emoji: "🚲", title: "Trek Road Bike 2022", priceCents: 45000 },
    { id: "p-v-5", emoji: "⚡", title: "Electric Bike 500W", priceCents: 98000 },
  ],
  collectibles: [
    { id: "p-co-1", emoji: "🎨", title: "Original Oil Painting", priceCents: 25000 },
    { id: "p-co-2", emoji: "🏆", title: "Signed Baseball Cards", priceCents: 5500 },
    { id: "p-co-3", emoji: "🎭", title: "Vintage Movie Poster", priceCents: 8000 },
    { id: "p-co-4", emoji: "🪆", title: "Antique Ceramic Set", priceCents: 12000 },
    { id: "p-co-5", emoji: "💎", title: "Vintage Luxury Watch", priceCents: 55000 },
  ],
  sports: [
    { id: "p-s-1", emoji: "⚽", title: "Wilson Soccer Ball", priceCents: 3500 },
    { id: "p-s-2", emoji: "🎾", title: "Babolat Tennis Racket", priceCents: 8500 },
    { id: "p-s-3", emoji: "🏋", title: "Dumbbell Set 50lbs", priceCents: 7500 },
    { id: "p-s-4", emoji: "🎿", title: "Ski Set + Poles", priceCents: 28000 },
    { id: "p-s-5", emoji: "🏄", title: "7ft Longboard Surfboard", priceCents: 45000 },
  ],
  home: [
    { id: "p-h-1", emoji: "🌱", title: "Indoor Plant Collection", priceCents: 4500 },
    { id: "p-h-2", emoji: "🍲", title: "Instant Pot Duo 7-in-1", priceCents: 6500 },
    { id: "p-h-3", emoji: "🌀", title: "Dyson Vacuum V15", priceCents: 45000 },
    { id: "p-h-4", emoji: "☕", title: "Breville Espresso Machine", priceCents: 28000 },
    { id: "p-h-5", emoji: "🪴", title: "Outdoor Patio Set (6pc)", priceCents: 65000 },
  ],
  books: [
    { id: "p-b-1", emoji: "📚", title: "Business Books Bundle (5)", priceCents: 4000 },
    { id: "p-b-2", emoji: "📖", title: "Harry Potter Complete Set", priceCents: 8500 },
    { id: "p-b-3", emoji: "🔬", title: "Science Textbooks (10 vols)", priceCents: 12000 },
    { id: "p-b-4", emoji: "🎭", title: "Classic Literature Box Set", priceCents: 3500 },
    { id: "p-b-5", emoji: "🍳", title: "Cookbook Collection (8)", priceCents: 5500 },
  ],
  other: [
    { id: "p-o-1", emoji: "🎮", title: "Nintendo Switch OLED Bundle", priceCents: 28000 },
    { id: "p-o-2", emoji: "🎸", title: "Fender Acoustic Guitar", priceCents: 35000 },
    { id: "p-o-3", emoji: "🎉", title: "Party Decoration Kit", priceCents: 2500 },
    { id: "p-o-4", emoji: "🪁", title: "Outdoor Games Bundle", priceCents: 8500 },
    { id: "p-o-5", emoji: "🎯", title: "Dart Board Pro Set", priceCents: 4500 },
  ],
};

function formatPrice(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Skeleton loading card (2-column grid) ─────────────────────────────────────

function SkeletonCard() {
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.85, duration: 850, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 850, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return (
    <Animated.View style={[skStyles.card, { opacity: anim }]}>
      <View style={skStyles.cardImg} />
      <View style={skStyles.cardBody}>
        <View style={skStyles.line100} />
        <View style={skStyles.line70} />
        <View style={skStyles.linePrice} />
      </View>
    </Animated.View>
  );
}

function SkeletonGrid() {
  return (
    <View style={skStyles.grid}>
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

// ── Horizontal listing card (browse view) ─────────────────────────────────────

const HorizontalListingCard = memo(function HorizontalListingCard({
  item,
  onPress,
}: {
  item: PlaceholderItem;
  onPress?: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      style={[styles.hCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
    >
      <View style={[styles.hCardThumb, { backgroundColor: colors.secondary }]}>
        <Text style={styles.hCardEmoji}>{item.emoji}</Text>
      </View>
      <View style={styles.hCardBody}>
        <Text style={[styles.hCardTitle, { color: colors.foreground }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.hCardPrice, { color: colors.primary }]}>
          {formatPrice(item.priceCents)}
        </Text>
      </View>
    </Pressable>
  );
});

const skStyles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    paddingTop: 16,
    gap: 10,
  },
  card: {
    width: "48%",
    borderRadius: 14,
    backgroundColor: "#8882",
    overflow: "hidden",
  },
  cardImg: {
    height: 120,
    backgroundColor: "#8882",
  },
  cardBody: {
    padding: 10,
    gap: 7,
  },
  line100: {
    height: 12,
    borderRadius: 6,
    backgroundColor: "#8882",
    width: "100%",
  },
  line70: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "#8882",
    width: "70%",
  },
  linePrice: {
    height: 14,
    borderRadius: 7,
    backgroundColor: "#8882",
    width: "45%",
    marginTop: 2,
  },
});

// ── Mode flip toggle ──────────────────────────────────────────────────────────

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

// ── Listing card ──────────────────────────────────────────────────────────────

const ListingCard = memo(function ListingCard({
  item,
  onPress,
}: {
  item: MarketplaceListing;
  onPress: (item: MarketplaceListing) => void;
}) {
  const colors = useColors();
  const cat = CATEGORIES.find((c) => c.id === item.category);
  const emoji = cat?.emoji ?? "📦";
  const location = [item.city, item.stateCode].filter(Boolean).join(", ");

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
      onPress={() => { Haptics.selectionAsync(); onPress(item); }}
    >
      {/* Photo / emoji placeholder */}
      <View style={[styles.cardThumb, { backgroundColor: colors.secondary }]}>
        {item.photos.length > 0 ? (
          <Text style={styles.cardThumbEmoji}>{emoji}</Text>
        ) : (
          <Text style={styles.cardThumbEmoji}>{emoji}</Text>
        )}
        {item.status === "sold" && (
          <View style={styles.soldBadge}>
            <Text style={styles.soldText}>SOLD</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.cardPrice, { color: colors.primary }]}>
          {formatPrice(item.priceCents)}
        </Text>
        {location ? (
          <Text style={[styles.cardLocation, { color: colors.mutedForeground }]} numberOfLines={1}>
            {location}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

// ── Listing detail modal ──────────────────────────────────────────────────────

function ListingDetailModal({
  listing,
  onClose,
  currentUserId,
}: {
  listing: MarketplaceListing | null;
  onClose: () => void;
  currentUserId: string | null | undefined;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { getToken } = useAuth();
  const updateMutation = useUpdateMarketplaceListing();
  const cat = CATEGORIES.find((c) => c.id === listing?.category);
  const isOwn = listing?.sellerId === currentUserId;
  const [startingConv, setStartingConv] = useState(false);

  const handleMessageSeller = async () => {
    if (!listing || !currentUserId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStartingConv(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/messages/conversations/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          contextType: "marketplace",
          contextId: listing.id,
          contextTitle: listing.title,
          otherUserId: listing.sellerId,
        }),
      });
      if (res.ok) {
        const conv = await res.json();
        router.push(`/conversation?id=${conv.id}&title=${encodeURIComponent(listing.sellerName)}` as never);
      }
    } catch {}
    setStartingConv(false);
  };

  const handleMarkSold = () => {
    if (!listing) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateMutation.mutate(
      { id: listing.id, data: { status: "sold" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMarketplaceListingsQueryKey({}) });
          onClose();
        },
      },
    );
  };

  if (!listing) return null;
  const location = [listing.city, listing.stateCode].filter(Boolean).join(", ");

  return (
    <Modal
      visible={!!listing}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.modalHeader, { borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
          <Pressable onPress={onClose} style={[styles.modalCloseBtn, { backgroundColor: colors.secondary }]}>
            <Feather name="x" size={18} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.modalHeaderTitle, { color: colors.foreground }]} numberOfLines={1}>
            Listing
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.modalBody, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Photo / emoji hero */}
          <View style={[styles.modalHero, { backgroundColor: colors.secondary }]}>
            <Text style={styles.modalHeroEmoji}>{cat?.emoji ?? "📦"}</Text>
            {listing.status === "sold" && (
              <View style={styles.modalSoldBadge}>
                <Text style={styles.modalSoldText}>SOLD</Text>
              </View>
            )}
          </View>

          {/* Core info */}
          <View style={styles.modalSection}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{listing.title}</Text>
            <Text style={[styles.modalPrice, { color: colors.primary }]}>
              {formatPrice(listing.priceCents)}
            </Text>
          </View>

          {/* Category + location */}
          <View style={[styles.modalMeta, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <View style={styles.modalMetaRow}>
              <Feather name="tag" size={14} color={colors.mutedForeground} />
              <Text style={[styles.modalMetaText, { color: colors.foreground }]}>
                {cat?.label ?? listing.category}
              </Text>
            </View>
            {location ? (
              <View style={styles.modalMetaRow}>
                <Feather name="map-pin" size={14} color={colors.mutedForeground} />
                <Text style={[styles.modalMetaText, { color: colors.foreground }]}>
                  {location}
                </Text>
              </View>
            ) : null}
            <View style={styles.modalMetaRow}>
              <Feather name="user" size={14} color={colors.mutedForeground} />
              <Text style={[styles.modalMetaText, { color: colors.foreground }]}>
                {listing.sellerName}
              </Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.modalSection}>
            <Text style={[styles.modalDescLabel, { color: colors.mutedForeground }]}>Description</Text>
            <Text style={[styles.modalDesc, { color: colors.foreground }]}>{listing.description}</Text>
          </View>

          {/* Fee note */}
          <View style={[styles.feeNote, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="info" size={12} color={colors.mutedForeground} />
            <Text style={[styles.feeNoteText, { color: colors.mutedForeground }]}>
              1% platform fee on purchase · capped at $20
            </Text>
          </View>

          {/* Actions */}
          {isOwn ? (
            listing.status === "active" ? (
              <Pressable
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={handleMarkSold}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Feather name="check-circle" size={17} color="#ffffff" />
                    <Text style={styles.actionBtnText}>Mark as Sold</Text>
                  </>
                )}
              </Pressable>
            ) : (
              <View style={[styles.actionBtn, { backgroundColor: colors.secondary }]}>
                <Feather name="check" size={17} color={colors.mutedForeground} />
                <Text style={[styles.actionBtnText, { color: colors.mutedForeground }]}>
                  This item is sold
                </Text>
              </View>
            )
          ) : (
            <Pressable
              style={[styles.actionBtn, { backgroundColor: colors.primary, opacity: startingConv ? 0.7 : 1 }]}
              onPress={handleMessageSeller}
              disabled={startingConv}
            >
              <Feather name="message-circle" size={17} color="#ffffff" />
              <Text style={styles.actionBtnText}>{startingConv ? "Opening…" : "Message Seller"}</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Sell form ─────────────────────────────────────────────────────────────────

function SellView({ onCreated }: { onCreated: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const createMutation = useCreateMarketplaceListing();

  const [step, setStep] = useState(1);
  const [category, setCategory]     = useState("");
  const [title, setTitle]           = useState("");
  const [description, setDescription] = useState("");
  const [priceText, setPriceText]   = useState("");
  const [city, setCity]             = useState("");
  const [stateCode, setStateCode]   = useState("");
  const [sellLat, setSellLat]       = useState<string | null>(null);
  const [sellLon, setSellLon]       = useState<string | null>(null);
  const [detectingLoc, setDetectingLoc] = useState(false);

  const priceCents = useMemo(() => {
    const n = parseFloat(priceText.replace(/[^0-9.]/g, ""));
    return isNaN(n) ? 0 : Math.round(n * 100);
  }, [priceText]);

  const canStep1 = !!category;
  const canStep2 = title.trim().length >= 3 && description.trim().length >= 10 && priceCents >= 1;
  const canSubmit = canStep1 && canStep2 && city.trim().length > 0;

  // Auto-detect location when seller reaches step 3
  useEffect(() => {
    if (step !== 3) return;
    let cancelled = false;
    (async () => {
      setDetectingLoc(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted" || cancelled) return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        setSellLat(String(pos.coords.latitude));
        setSellLon(String(pos.coords.longitude));
        if (!city) {
          const [geo] = await Location.reverseGeocodeAsync(pos.coords);
          if (!cancelled && geo) {
            if (geo.city && !city) setCity(geo.city);
            if (geo.region && !stateCode) setStateCode(geo.region.slice(0, 2).toUpperCase());
          }
        }
      } catch {}
      finally { if (!cancelled) setDetectingLoc(false); }
    })();
    return () => { cancelled = true; };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = () => {
    if (!canSubmit || createMutation.isPending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createMutation.mutate(
      {
        data: {
          title: title.trim(),
          description: description.trim(),
          priceCents,
          category,
          photos: [],
          city: city.trim(),
          stateCode: stateCode.trim().toUpperCase().slice(0, 2),
          ...(sellLat && sellLon ? { latitude: sellLat, longitude: sellLon, locationText: `${city.trim()}, ${stateCode.trim().toUpperCase()}` } : {}),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMarketplaceListingsQueryKey({}) });
          onCreated();
        },
      },
    );
  };

  if (!isSignedIn) {
    return (
      <View style={styles.placeholderCenter}>
        <View style={[styles.placeholderIcon, { backgroundColor: colors.secondary }]}>
          <Feather name="lock" size={32} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.placeholderTitle, { color: colors.foreground }]}>Sign in to sell</Text>
        <Text style={[styles.placeholderSub, { color: colors.mutedForeground }]}>
          Create a free account to list items in your area.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.sellScroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Step indicator */}
        <View style={styles.stepRow}>
          {[1, 2, 3].map((s) => (
            <View key={s} style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  {
                    backgroundColor:
                      s < step ? colors.primary :
                      s === step ? colors.primary :
                      colors.secondary,
                    borderColor: s <= step ? colors.primary : colors.border,
                  },
                ]}
              >
                {s < step ? (
                  <Feather name="check" size={12} color="#ffffff" />
                ) : (
                  <Text style={[styles.stepNum, { color: s === step ? "#ffffff" : colors.mutedForeground }]}>
                    {s}
                  </Text>
                )}
              </View>
              {s < 3 && (
                <View style={[styles.stepLine, { backgroundColor: s < step ? colors.primary : colors.border }]} />
              )}
            </View>
          ))}
        </View>

        {/* ── Step 1: Category ── */}
        {step === 1 && (
          <>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>What are you selling?</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={({ pressed }) => [
                    styles.catGridItem,
                    {
                      backgroundColor: category === cat.id ? colors.primary + "20" : colors.secondary,
                      borderColor: category === cat.id ? colors.primary : colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  onPress={() => { Haptics.selectionAsync(); setCategory(cat.id); }}
                >
                  <Text style={styles.catGridEmoji}>{cat.emoji}</Text>
                  <Text
                    style={[
                      styles.catGridLabel,
                      { color: category === cat.id ? colors.primary : colors.foreground },
                    ]}
                    numberOfLines={1}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* ── Step 2: Details ── */}
        {step === 2 && (
          <>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Describe your item</Text>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Title</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
              placeholder="e.g. iPhone 14 Pro – 256GB"
              placeholderTextColor={colors.mutedForeground}
              value={title}
              onChangeText={setTitle}
              maxLength={80}
              returnKeyType="next"
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Condition, age, any defects…"
              placeholderTextColor={colors.mutedForeground}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={1000}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Price (USD)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
              placeholder="0.00"
              placeholderTextColor={colors.mutedForeground}
              value={priceText}
              onChangeText={setPriceText}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
          </>
        )}

        {/* ── Step 3: Location + Review ── */}
        {step === 3 && (
          <>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Where are you located?</Text>

            {detectingLoc && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Detecting location…</Text>
              </View>
            )}
            {sellLat && !detectingLoc && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Feather name="map-pin" size={13} color="#16a34a" />
                <Text style={{ fontSize: 13, color: "#16a34a" }}>Location detected — buyers near you will find this listing</Text>
              </View>
            )}

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>City</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
              placeholder="e.g. Austin"
              placeholderTextColor={colors.mutedForeground}
              value={city}
              onChangeText={setCity}
              maxLength={60}
              returnKeyType="next"
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>State (2-letter)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
              placeholder="TX"
              placeholderTextColor={colors.mutedForeground}
              value={stateCode}
              onChangeText={(t) => setStateCode(t.toUpperCase().slice(0, 2))}
              maxLength={2}
              autoCapitalize="characters"
              returnKeyType="done"
            />

            {/* Review summary */}
            <View style={[styles.reviewCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Text style={[styles.reviewLabel, { color: colors.mutedForeground }]}>Listing preview</Text>
              <Text style={[styles.reviewTitle, { color: colors.foreground }]}>{title}</Text>
              <Text style={[styles.reviewPrice, { color: colors.primary }]}>{formatPrice(priceCents)}</Text>
              <Text style={[styles.reviewMeta, { color: colors.mutedForeground }]}>
                {CATEGORIES.find((c) => c.id === category)?.label} · {city}, {stateCode}
              </Text>
            </View>

            {/* Fee disclosure */}
            <View style={[styles.feeNote, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="info" size={12} color={colors.mutedForeground} />
              <Text style={[styles.feeNoteText, { color: colors.mutedForeground }]}>
                1% platform fee on sale · capped at $20
              </Text>
            </View>
          </>
        )}

        {/* Navigation buttons */}
        <View style={styles.stepNavRow}>
          {step > 1 && (
            <Pressable
              style={[styles.navBtn, styles.navBtnBack, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={() => { Haptics.selectionAsync(); setStep(step - 1); }}
            >
              <Feather name="chevron-left" size={16} color={colors.foreground} />
              <Text style={[styles.navBtnText, { color: colors.foreground }]}>Back</Text>
            </Pressable>
          )}

          {step < 3 ? (
            <Pressable
              style={[
                styles.navBtn,
                styles.navBtnNext,
                { backgroundColor: colors.primary, opacity: (step === 1 ? canStep1 : canStep2) ? 1 : 0.4 },
              ]}
              onPress={() => {
                if (step === 1 && !canStep1) return;
                if (step === 2 && !canStep2) return;
                Haptics.selectionAsync();
                setStep(step + 1);
              }}
            >
              <Text style={[styles.navBtnText, { color: "#ffffff" }]}>Next</Text>
              <Feather name="chevron-right" size={16} color="#ffffff" />
            </Pressable>
          ) : (
            <Pressable
              style={[
                styles.navBtn,
                styles.navBtnNext,
                { backgroundColor: colors.primary, opacity: canSubmit && !createMutation.isPending ? 1 : 0.4 },
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Feather name="check" size={16} color="#ffffff" />
                  <Text style={[styles.navBtnText, { color: "#ffffff" }]}>Post Listing</Text>
                </>
              )}
            </Pressable>
          )}
        </View>

        {createMutation.isError && (
          <Text style={[styles.errorText, { color: "#ef4444" }]}>
            Failed to create listing. Please try again.
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BuySellScreen({ onOpenDrawer, externalMode }: { onOpenDrawer: () => void; externalMode?: "buy" | "sell" }) {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { userId } = useAuth();

  const [mode, setMode]                 = useState<Mode>("buy");
  const [selectedCat, setSelectedCat]   = useState<string | null>(null);
  const [search, setSearch]             = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [cursor, setCursor]             = useState<number | undefined>(undefined);
  const [allListings, setAllListings]   = useState<MarketplaceListing[]>([]);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [detailListing, setDetailListing] = useState<MarketplaceListing | null>(null);
  const [sellSuccess, setSellSuccess]   = useState(false);
  const [viewAllCat, setViewAllCat]     = useState<string | null>(null);
  const [showFilter, setShowFilter]     = useState(false);
  const [filterCat, setFilterCat]       = useState<string | null>(null);
  const [filterRadius, setFilterRadius] = useState<number | null>(null);
  const [filterMinPrice, setFilterMinPrice] = useState("");
  const [filterMaxPrice, setFilterMaxPrice] = useState("");
  const [filterSort, setFilterSort]     = useState<"new" | "price_asc" | "price_desc">("new");
  const [userLat, setUserLat]           = useState<number | null>(null);
  const [userLon, setUserLon]           = useState<number | null>(null);

  const hasFilter =
    !!filterCat || filterRadius !== null || !!filterMinPrice || !!filterMaxPrice || filterSort !== "new";

  // Silently try to get device location for radius filtering
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLat(pos.coords.latitude);
        setUserLon(pos.coords.longitude);
      } catch {}
    })();
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Sync external mode from DrawerNav
  useEffect(() => {
    if (externalMode) {
      setMode(externalMode as Mode);
      setViewAllCat(null);
    }
  }, [externalMode]);

  // When switching to sell mode, clear viewAllCat
  useEffect(() => {
    if (mode === "sell") setViewAllCat(null);
  }, [mode]);

  // effectiveCat = viewAllCat when drilling into a category, else selectedCat filter
  const effectiveCat = viewAllCat ?? selectedCat;

  const minPriceCents = filterMinPrice ? Math.round(parseFloat(filterMinPrice) * 100) : undefined;
  const maxPriceCents = filterMaxPrice ? Math.round(parseFloat(filterMaxPrice) * 100) : undefined;
  const canUseRadius = filterRadius !== null && userLat !== null && userLon !== null;

  // Reset on filter/search change
  useEffect(() => {
    setAllListings([]);
    setCursor(undefined);
  }, [effectiveCat, debouncedSearch, filterCat, filterRadius, filterMinPrice, filterMaxPrice, filterSort]);

  const { data, isLoading, refetch, isRefetching } = useListMarketplaceListings({
    category: effectiveCat ?? filterCat ?? undefined,
    search: debouncedSearch || undefined,
    limit: 24,
    ...(canUseRadius ? { lat: userLat!, lon: userLon!, radius: filterRadius! } : {}),
    ...(minPriceCents ? { minPrice: minPriceCents } : {}),
    ...(maxPriceCents ? { maxPrice: maxPriceCents } : {}),
    sort: filterSort,
  } as Parameters<typeof useListMarketplaceListings>[0]);

  const page = data as { items: MarketplaceListing[]; nextCursor: number | null } | undefined;

  useEffect(() => {
    if (page?.items) {
      setAllListings(page.items);
      setCursor(page.nextCursor ?? undefined);
      // Seed AsyncStorage so the next cold-start renders immediately while
      // React Query re-validates in the background.
      AsyncStorage.setItem(
        "rq:marketplace:page1",
        JSON.stringify(page.items.slice(0, 12))
      ).catch(() => {});
    }
  }, [page]);

  const handleLoadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await listMarketplaceListings({
        category: effectiveCat ?? filterCat ?? undefined,
        search: debouncedSearch || undefined,
        cursor,
        limit: 24,
        ...(canUseRadius ? { lat: userLat!, lon: userLon!, radius: filterRadius! } : {}),
        ...(minPriceCents ? { minPrice: minPriceCents } : {}),
        ...(maxPriceCents ? { maxPrice: maxPriceCents } : {}),
        sort: filterSort,
      } as Parameters<typeof listMarketplaceListings>[0]) as { items: MarketplaceListing[]; nextCursor: number | null };
      if (res?.items) {
        setAllListings((prev) => [...prev, ...res.items]);
        setCursor(res.nextCursor ?? undefined);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, selectedCat, debouncedSearch]);

  const handleRefresh = useCallback(() => {
    setAllListings([]);
    setCursor(undefined);
    refetch();
  }, [refetch]);

  const renderItem = useCallback(
    ({ item }: { item: MarketplaceListing }) => (
      <ListingCard item={item} onPress={setDetailListing} />
    ),
    [],
  );

  const keyExtractor = useCallback((item: MarketplaceListing) => String(item.id), []);

  const handleSellCreated = () => {
    setSellSuccess(true);
    setMode("buy");
    setSelectedCat(null);
    setSearch("");
    setTimeout(() => setSellSuccess(false), 3000);
  };

  // ── Category chips bar ────────────────────────────────────────────────────

  const CategoryChips = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
      style={[styles.chipBar, { borderBottomColor: colors.border }]}
    >
      {/* "All" chip */}
      <Pressable
        style={[
          styles.chip,
          {
            backgroundColor: selectedCat === null ? colors.primary : colors.secondary,
            borderColor: selectedCat === null ? colors.primary : colors.border,
          },
        ]}
        onPress={() => { Haptics.selectionAsync(); setSelectedCat(null); }}
      >
        <Text style={[styles.chipText, { color: selectedCat === null ? "#ffffff" : colors.foreground, fontWeight: selectedCat === null ? "600" : "400" }]}>
          All
        </Text>
      </Pressable>

      {CATEGORIES.map((cat) => (
        <Pressable
          key={cat.id}
          style={[
            styles.chip,
            {
              backgroundColor: selectedCat === cat.id ? colors.primary : colors.secondary,
              borderColor: selectedCat === cat.id ? colors.primary : colors.border,
            },
          ]}
          onPress={() => {
            Haptics.selectionAsync();
            setSelectedCat((prev) => (prev === cat.id ? null : cat.id));
          }}
        >
          <Text style={styles.chipEmoji}>{cat.emoji}</Text>
          <Text style={[styles.chipText, { color: selectedCat === cat.id ? "#ffffff" : colors.foreground, fontWeight: selectedCat === cat.id ? "600" : "400" }]}>
            {cat.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  const GridHeader = (
    <>
      {/* Back button when drilled into a category */}
      {viewAllCat && (
        <Pressable
          style={[styles.backRow, { borderBottomColor: colors.border }]}
          onPress={() => { setViewAllCat(null); setSearch(""); }}
        >
          <Feather name="arrow-left" size={16} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}>Browse All</Text>
          <View style={styles.backSep} />
          <Text style={[styles.backCatLabel, { color: colors.foreground }]}>
            {CATEGORIES.find((c) => c.id === viewAllCat)?.emoji}{" "}
            {CATEGORIES.find((c) => c.id === viewAllCat)?.label}
          </Text>
        </Pressable>
      )}
      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <Feather name="search" size={15} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder={viewAllCat ? `Search ${CATEGORIES.find((c) => c.id === viewAllCat)?.label ?? ""}…` : "Search listings near you…"}
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Feather name="x" size={14} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>
      {sellSuccess && (
        <View style={[styles.successBanner, { backgroundColor: "#16a34a20", borderColor: "#16a34a" }]}>
          <Feather name="check-circle" size={14} color="#16a34a" />
          <Text style={[styles.successText, { color: "#16a34a" }]}>
            Listing posted! Buyers in your area will see it shortly.
          </Text>
        </View>
      )}
    </>
  );

  const ListFooter = loadingMore ? (
    <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
  ) : cursor ? (
    <Pressable style={styles.loadMoreBtn} onPress={handleLoadMore}>
      <Text style={[styles.loadMoreText, { color: colors.primary }]}>Load more</Text>
    </Pressable>
  ) : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 12, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={onOpenDrawer} style={styles.hamburger} hitSlop={10}>
          <Feather name="menu" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {mode === "buy" ? "Buy" : "Sell"}
        </Text>
        {mode === "buy" ? (
          <Pressable
            style={[
              styles.filterBtn,
              {
                backgroundColor: hasFilter ? colors.primary + "18" : colors.secondary,
                borderColor: hasFilter ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setShowFilter(true)}
            hitSlop={8}
          >
            <Feather name="sliders" size={14} color={hasFilter ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.filterBtnText, { color: hasFilter ? colors.primary : colors.mutedForeground }]}>
              Filter{hasFilter ? " •" : ""}
            </Text>
          </Pressable>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      {/* ── Content ── */}
      {mode === "sell" ? (
        <SellView onCreated={handleSellCreated} />
      ) : viewAllCat !== null || debouncedSearch.length > 0 ? (
        // Grid view — drilled into category or searching
        isLoading && allListings.length === 0 ? (
          <>
            {GridHeader}
            <SkeletonGrid />
          </>
        ) : (
          <FlatList
            data={allListings}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            ListHeaderComponent={GridHeader}
            ListFooterComponent={ListFooter}
            ListEmptyComponent={
              <View style={styles.emptyCenter}>
                <Feather name="shopping-bag" size={40} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No listings found</Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                  {debouncedSearch ? "Try a different search term." : "No listings in this category yet."}
                </Text>
              </View>
            }
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : (
        // Horizontal browse per category
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          <View style={[styles.searchBar, { backgroundColor: colors.secondary, borderColor: colors.border, margin: 12 }]}>
            <Feather name="search" size={15} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search listings near you…"
              placeholderTextColor={colors.mutedForeground}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <Feather name="x" size={14} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>
          {sellSuccess && (
            <View style={[styles.successBanner, { backgroundColor: "#16a34a20", borderColor: "#16a34a", marginHorizontal: 12, marginBottom: 4 }]}>
              <Feather name="check-circle" size={14} color="#16a34a" />
              <Text style={[styles.successText, { color: "#16a34a" }]}>Listing posted! Buyers in your area will see it shortly.</Text>
            </View>
          )}
          {CATEGORIES.map((cat) => {
            const items = PLACEHOLDER_LISTINGS[cat.id] ?? [];
            return (
              <View key={cat.id} style={styles.browseSection}>
                <View style={styles.browseSectionHeader}>
                  <Text style={[styles.browseSectionTitle, { color: colors.foreground }]}>
                    {cat.emoji} {cat.label}
                  </Text>
                  <Pressable
                    onPress={() => { Haptics.selectionAsync(); setViewAllCat(cat.id); }}
                    style={[styles.viewAllBtn, { borderColor: colors.border }]}
                    hitSlop={8}
                  >
                    <Text style={[styles.viewAllText, { color: colors.primary }]}>View All</Text>
                    <Feather name="chevron-right" size={12} color={colors.primary} />
                  </Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollContent}>
                  {items.map((item) => (
                    <HorizontalListingCard
                      key={item.id}
                      item={item}
                      onPress={() => { Haptics.selectionAsync(); setViewAllCat(cat.id); }}
                    />
                  ))}
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Listing detail modal */}
      <ListingDetailModal
        listing={detailListing}
        onClose={() => setDetailListing(null)}
        currentUserId={userId}
      />

      {/* ── Filter sheet ── */}
      <Modal visible={showFilter} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowFilter(false)}>
        <View style={[filterStyles.container, { backgroundColor: colors.background }]}>
          <View style={[filterStyles.handle, { backgroundColor: colors.border }]} />
          <View style={[filterStyles.topRow, { borderBottomColor: colors.border }]}>
            <Text style={[filterStyles.title, { color: colors.foreground }]}>Filter Listings</Text>
            <Pressable
              onPress={() => {
                setFilterCat(null);
                setFilterRadius(null);
                setFilterMinPrice("");
                setFilterMaxPrice("");
                setFilterSort("new");
              }}
              hitSlop={8}
            >
              <Text style={[filterStyles.clearAll, { color: colors.primary }]}>Clear All</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
            {/* Sort section */}
            <Text style={[filterStyles.sectionLabel, { color: colors.mutedForeground }]}>Sort By</Text>
            <View style={filterStyles.radiusRow}>
              {([
                { id: "new" as const, label: "Newest" },
                { id: "price_asc" as const, label: "Price ↑" },
                { id: "price_desc" as const, label: "Price ↓" },
              ]).map((s) => (
                <Pressable
                  key={s.id}
                  style={[
                    filterStyles.radiusChip,
                    { backgroundColor: filterSort === s.id ? colors.primary + "18" : colors.secondary, borderColor: filterSort === s.id ? colors.primary : colors.border },
                  ]}
                  onPress={() => { Haptics.selectionAsync(); setFilterSort(s.id); }}
                >
                  <Text style={[filterStyles.radiusChipText, { color: filterSort === s.id ? colors.primary : colors.foreground }]}>
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Price range section */}
            <Text style={[filterStyles.sectionLabel, { color: colors.mutedForeground }]}>Price Range</Text>
            <View style={filterStyles.priceRow}>
              <View style={[filterStyles.priceInputWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={[filterStyles.priceCurrency, { color: colors.mutedForeground }]}>$</Text>
                <TextInput
                  style={[filterStyles.priceInput, { color: colors.foreground }]}
                  placeholder="Min"
                  placeholderTextColor={colors.mutedForeground}
                  value={filterMinPrice}
                  onChangeText={setFilterMinPrice}
                  keyboardType="decimal-pad"
                />
              </View>
              <Text style={[filterStyles.priceSep, { color: colors.mutedForeground }]}>—</Text>
              <View style={[filterStyles.priceInputWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={[filterStyles.priceCurrency, { color: colors.mutedForeground }]}>$</Text>
                <TextInput
                  style={[filterStyles.priceInput, { color: colors.foreground }]}
                  placeholder="Max"
                  placeholderTextColor={colors.mutedForeground}
                  value={filterMaxPrice}
                  onChangeText={setFilterMaxPrice}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Category section — single select */}
            <Text style={[filterStyles.sectionLabel, { color: colors.mutedForeground }]}>Category</Text>
            <View style={filterStyles.chipGrid}>
              {CATEGORIES.map((cat) => {
                const active = filterCat === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    style={[
                      filterStyles.catChip,
                      { backgroundColor: active ? colors.primary + "18" : colors.secondary, borderColor: active ? colors.primary : colors.border },
                    ]}
                    onPress={() => { Haptics.selectionAsync(); setFilterCat((prev) => prev === cat.id ? null : cat.id); }}
                  >
                    <Text style={filterStyles.catChipEmoji}>{cat.emoji}</Text>
                    <Text style={[filterStyles.catChipLabel, { color: active ? colors.primary : colors.foreground }]}>{cat.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Radius section */}
            <Text style={[filterStyles.sectionLabel, { color: colors.mutedForeground }]}>
              Search Radius{!userLat ? "  (location not available)" : ""}
            </Text>
            <View style={filterStyles.radiusRow}>
              {([10, 25, 50, 100, 250] as const).map((mi) => (
                <Pressable
                  key={mi}
                  style={[
                    filterStyles.radiusChip,
                    { backgroundColor: filterRadius === mi ? colors.primary + "18" : colors.secondary, borderColor: filterRadius === mi ? colors.primary : colors.border, opacity: !userLat ? 0.4 : 1 },
                  ]}
                  onPress={() => { if (!userLat) return; Haptics.selectionAsync(); setFilterRadius((prev) => prev === mi ? null : mi); }}
                >
                  <Text style={[filterStyles.radiusChipText, { color: filterRadius === mi ? colors.primary : colors.foreground }]}>
                    {mi} mi
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View style={[filterStyles.bottomRow, { borderTopColor: colors.border, paddingBottom: insets.bottom + 12 }]}>
            <Pressable
              style={[filterStyles.applyBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowFilter(false)}
            >
              <Text style={filterStyles.applyBtnText}>Apply Filters</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

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
  hamburger: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 22, fontWeight: "700", flex: 1, letterSpacing: -0.4 },

  toggleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  toggleLabel: { fontSize: 13, fontWeight: "600" },
  toggleIcon: { width: 22, height: 22, justifyContent: "center", alignItems: "center" },

  listContent: { paddingTop: 0 },
  columnWrapper: { paddingHorizontal: 12, gap: 10, marginBottom: 10 },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },

  chipBar: { borderBottomWidth: StyleSheet.hairlineWidth },
  chipRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipEmoji: { fontSize: 14 },
  chipText: { fontSize: 13 },

  card: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  cardThumb: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  cardThumbEmoji: { fontSize: 44 },
  soldBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  soldText: { color: "#ffffff", fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  cardBody: { padding: 10, gap: 3 },
  cardTitle: { fontSize: 13, lineHeight: 18 },
  cardPrice: { fontSize: 15, fontWeight: "700" },
  cardLocation: { fontSize: 11, marginTop: 1 },

  loadingCenter: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60 },
  emptyCenter: { paddingTop: 60, alignItems: "center", gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  loadMoreBtn: { alignItems: "center", paddingVertical: 16 },
  loadMoreText: { fontSize: 14, fontWeight: "600" },

  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  successText: { flex: 1, fontSize: 13 },

  // Sell form
  sellScroll: { paddingHorizontal: 20, paddingTop: 16, gap: 14 },
  stepRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  stepItem: { flexDirection: "row", alignItems: "center" },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  stepNum: { fontSize: 12, fontWeight: "700" },
  stepLine: { width: 40, height: 2, marginHorizontal: 4 },
  stepTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  catGridItem: {
    width: "30%",
    flexGrow: 1,
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  catGridEmoji: { fontSize: 24 },
  catGridLabel: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  fieldLabel: { fontSize: 13, fontWeight: "500", marginBottom: 4, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: { minHeight: 100, paddingTop: 12 },
  stepNavRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  navBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  navBtnBack: {},
  navBtnNext: { borderWidth: 0 },
  navBtnText: { fontSize: 15, fontWeight: "700" },
  reviewCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  reviewLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  reviewTitle: { fontSize: 17, fontWeight: "600", marginTop: 4 },
  reviewPrice: { fontSize: 22, fontWeight: "700" },
  reviewMeta: { fontSize: 13 },
  feeNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  feeNoteText: { flex: 1, fontSize: 12 },
  errorText: { fontSize: 13, textAlign: "center" },

  // Sell placeholder (unauthenticated)
  placeholderCenter: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40, gap: 14 },
  placeholderIcon: { width: 72, height: 72, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  placeholderTitle: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  placeholderSub: { fontSize: 14, textAlign: "center", lineHeight: 20 },

  // Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  modalHeaderTitle: { fontSize: 17, fontWeight: "600" },
  modalBody: { paddingHorizontal: 16, paddingTop: 0, gap: 16 },
  modalHero: {
    height: 220,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  modalHeroEmoji: { fontSize: 80 },
  modalSoldBadge: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  modalSoldText: { color: "#ffffff", fontSize: 12, fontWeight: "700", letterSpacing: 0.8 },
  modalSection: { gap: 6 },
  modalTitle: { fontSize: 22, fontWeight: "700", lineHeight: 28 },
  modalPrice: { fontSize: 26, fontWeight: "800" },
  modalMeta: { padding: 14, borderRadius: 14, borderWidth: 1, gap: 10 },
  modalMetaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  modalMetaText: { fontSize: 14 },
  modalDescLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  modalDesc: { fontSize: 15, lineHeight: 22 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
  },
  actionBtnText: { fontSize: 16, fontWeight: "700", color: "#ffffff" },

  // Browse mode — per-category horizontal sections
  browseSection: { marginBottom: 4 },
  browseSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  browseSectionTitle: { fontSize: 16, fontWeight: "700" },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  viewAllText: { fontSize: 12, fontWeight: "600" },
  hScrollContent: { paddingHorizontal: 12, gap: 10, paddingBottom: 8 },
  hCard: { width: 132, borderRadius: 16, overflow: "hidden", borderWidth: 1 },
  hCardThumb: { height: 100, justifyContent: "center", alignItems: "center" },
  hCardEmoji: { fontSize: 38 },
  hCardBody: { padding: 8, gap: 3 },
  hCardTitle: { fontSize: 12, lineHeight: 16 },
  hCardPrice: { fontSize: 13, fontWeight: "700" },

  // Grid mode back row
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backText: { fontSize: 14, fontWeight: "600" },
  backSep: { width: StyleSheet.hairlineWidth, height: 14, backgroundColor: "rgba(128,128,128,0.3)", marginHorizontal: 2 },
  backCatLabel: { fontSize: 14, fontWeight: "600", flex: 1 },

  // Filter button in header
  filterBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
  },
  filterBtnText: { fontSize: 13, fontWeight: "600" },
});

// ── Filter sheet styles ────────────────────────────────────────────────────────

const filterStyles = StyleSheet.create({
  container: { flex: 1 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 4 },
  topRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 17, fontWeight: "700" },
  clearAll: { fontSize: 14, fontWeight: "600" },
  sectionLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  catChipEmoji: { fontSize: 14 },
  catChipLabel: { fontSize: 13, fontWeight: "500" },
  radiusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  radiusChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  radiusChipText: { fontSize: 14, fontWeight: "600" },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  priceInputWrap: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 4,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  priceCurrency: { fontSize: 15, fontWeight: "600" },
  priceInput: { flex: 1, fontSize: 15, padding: 0 },
  priceSep: { fontSize: 16, fontWeight: "600" },
  bottomRow: { padding: 20, borderTopWidth: StyleSheet.hairlineWidth },
  applyBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center" },
  applyBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
