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
  const updateMutation = useUpdateMarketplaceListing();
  const cat = CATEGORIES.find((c) => c.id === listing?.category);
  const isOwn = listing?.sellerId === currentUserId;

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
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
            >
              <Feather name="message-circle" size={17} color="#ffffff" />
              <Text style={styles.actionBtnText}>Message Seller</Text>
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

  const priceCents = useMemo(() => {
    const n = parseFloat(priceText.replace(/[^0-9.]/g, ""));
    return isNaN(n) ? 0 : Math.round(n * 100);
  }, [priceText]);

  const canStep1 = !!category;
  const canStep2 = title.trim().length >= 3 && description.trim().length >= 10 && priceCents >= 1;
  const canSubmit = canStep1 && canStep2 && city.trim().length > 0;

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

export default function BuySellScreen({ onOpenDrawer }: { onOpenDrawer: () => void }) {
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

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset on filter change
  useEffect(() => {
    setAllListings([]);
    setCursor(undefined);
  }, [selectedCat, debouncedSearch]);

  const { data, isLoading, refetch, isRefetching } = useListMarketplaceListings({
    category: selectedCat ?? undefined,
    search: debouncedSearch || undefined,
    limit: 24,
  });

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
        category: selectedCat ?? undefined,
        search: debouncedSearch || undefined,
        cursor,
        limit: 24,
      }) as { items: MarketplaceListing[]; nextCursor: number | null };
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

  const ListHeader = (
    <>
      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
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
      {CategoryChips}

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
        <ModeToggle mode={mode} onChange={(m) => { setMode(m); if (m === "buy") setSellSuccess(false); }} />
      </View>

      {/* ── Content ── */}
      {mode === "sell" ? (
        <SellView onCreated={handleSellCreated} />
      ) : isLoading && allListings.length === 0 ? (
        <>
          {ListHeader}
          <SkeletonGrid />
        </>
      ) : (
        <FlatList
          data={allListings}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={
            <View style={styles.emptyCenter}>
              <Feather name="shopping-bag" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No listings found</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                {debouncedSearch
                  ? "Try a different search term."
                  : selectedCat
                  ? "No listings in this category yet. Be the first to sell!"
                  : "No listings yet. Tap 'Sell' to post the first one!"}
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
      )}

      {/* Listing detail modal */}
      <ListingDetailModal
        listing={detailListing}
        onClose={() => setDetailListing(null)}
        currentUserId={userId}
      />
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
});
