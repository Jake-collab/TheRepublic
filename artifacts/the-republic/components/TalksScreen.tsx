import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState, useCallback, useRef, useEffect, memo, useMemo, startTransition } from "react";
import {
  ActivityIndicator,
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
import { useColors } from "@/hooks/useColors";
import { useTalksCategory } from "@/contexts/TalksCategoryContext";
import TalksPostCard, { type TalkPost } from "@/components/TalksPostCard";
import CitizenVoteFeed, { GEO_OPTIONS as CV_GEO, CAT_OPTIONS as CV_CATS } from "@/components/CitizenVoteFeed";
import {
  useListTalkCategories,
  useListTalkPosts,
  listTalkPosts,
  useCreateTalkPost,
  useVoteTalkPost,
} from "@workspace/api-client-react";

type TalkCategory = { id: number; name: string; emoji: string; sortOrder: number; isActive: boolean };

const CITIZEN_VOTE_ID = -1;
const CHAT_ALL_ID = -2;
// CHAT_PILL is the first pill — selects all-posts mode (selectedCatId = null).
const CHAT_PILL: TalkCategory = { id: CHAT_ALL_ID, name: "Chat", emoji: "💬", sortOrder: -2, isActive: true };
const CV_PILL: TalkCategory = { id: CITIZEN_VOTE_ID, name: "Citizen Vote", emoji: "🗳", sortOrder: -1, isActive: true };

const postKeyExtractor = (item: TalkPost) => String(item.id);

// ─── Category Pill ────────────────────────────────────────────────────────────
const CategoryPill = memo(function CategoryPill({
  cat,
  isActive,
  onPress,
}: {
  cat: TalkCategory;
  isActive: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.catPill,
        {
          backgroundColor: isActive ? colors.primary : colors.secondary,
          borderColor: isActive ? colors.primary : colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text style={styles.catEmoji}>{cat.emoji}</Text>
      <Text
        style={[
          styles.catLabel,
          { color: isActive ? "#ffffff" : colors.foreground, fontWeight: isActive ? "600" : "400" },
        ]}
        numberOfLines={1}
      >
        {cat.name}
      </Text>
    </Pressable>
  );
});

// ─── Create Post Modal ────────────────────────────────────────────────────────
function CreatePostModal({
  visible,
  categoryId,
  categoryName,
  categories,
  onClose,
}: {
  visible: boolean;
  categoryId: number | null;
  categoryName: string;
  categories?: TalkCategory[];
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [localCatId, setLocalCatId] = useState<number | null>(categoryId);
  const createMutation = useCreateTalkPost();

  useEffect(() => {
    setLocalCatId(categoryId);
  }, [categoryId, visible]);

  const resolvedCatId = categories ? localCatId : categoryId;
  const resolvedCatName = categories
    ? (categories.find((c) => c.id === localCatId)?.name ?? "")
    : categoryName;

  const canSubmit = !!(title.trim() && body.trim() && resolvedCatId !== null);

  const handleSubmit = () => {
    if (!canSubmit || resolvedCatId === null) return;
    createMutation.mutate(
      { data: { categoryId: resolvedCatId, title: title.trim(), body: body.trim() } },
      {
        onSuccess: () => {
          setTitle("");
          setBody("");
          setLocalCatId(categoryId);
          onClose();
        },
      },
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.modalContainer, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} style={[styles.modalCloseBtn, { backgroundColor: colors.secondary }]}>
            <Feather name="x" size={18} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Post</Text>
          <Pressable
            onPress={handleSubmit}
            style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: (createMutation.isPending || !canSubmit) ? 0.5 : 1 }]}
            disabled={createMutation.isPending || !canSubmit}
          >
            {createMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Post</Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.modalBody, { paddingBottom: insets.bottom + 20 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Category picker — shown only in "All" mode */}
          {categories && categories.length > 0 && (
            <View style={styles.catPickerSection}>
              <Text style={[styles.catPickerLabel, { color: colors.mutedForeground }]}>
                Post to section:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catPickerRow}>
                {categories.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => setLocalCatId(c.id)}
                    style={[
                      styles.catPickerChip,
                      {
                        backgroundColor: localCatId === c.id ? colors.primary : colors.secondary,
                        borderColor: localCatId === c.id ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={styles.catPickerEmoji}>{c.emoji}</Text>
                    <Text style={[styles.catPickerChipText, { color: localCatId === c.id ? "#fff" : colors.foreground }]}>
                      {c.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              {!localCatId && (
                <Text style={[styles.catPickerHint, { color: colors.mutedForeground }]}>
                  Select a section to continue
                </Text>
              )}
            </View>
          )}

          {/* Category tag */}
          {resolvedCatName ? (
            <View style={[styles.modalCatTag, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.modalCatText, { color: colors.primary }]}>{resolvedCatName}</Text>
            </View>
          ) : null}

          <TextInput
            style={[styles.titleInput, { color: colors.foreground, borderBottomColor: colors.border }]}
            placeholder="Title"
            placeholderTextColor={colors.mutedForeground}
            value={title}
            onChangeText={setTitle}
            maxLength={120}
            multiline
          />
          <TextInput
            style={[styles.bodyInput, { color: colors.foreground }]}
            placeholder="What's on your mind?"
            placeholderTextColor={colors.mutedForeground}
            value={body}
            onChangeText={setBody}
            multiline
            textAlignVertical="top"
            autoFocus={!categories}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Filter Panel ─────────────────────────────────────────────────────────────
function FilterPanel({
  visible,
  activeGeo,
  activeCat,
  onGeo,
  onCat,
  onClose,
  onReset,
}: {
  visible: boolean;
  activeGeo: string | null;
  activeCat: string | null;
  onGeo: (g: string | null) => void;
  onCat: (c: string | null) => void;
  onClose: () => void;
  onReset: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.filterOverlay}>
        <Pressable style={styles.filterBackdrop} onPress={onClose} />
        <View style={[styles.filterPanel, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.filterHandle, { backgroundColor: colors.border }]} />

          <View style={styles.filterPanelHeader}>
            <Text style={[styles.filterPanelTitle, { color: colors.foreground }]}>Filter Citizen Vote</Text>
            <Pressable onPress={onReset} hitSlop={8}>
              <Text style={[styles.filterResetText, { color: colors.primary }]}>Reset</Text>
            </Pressable>
          </View>

          <Text style={[styles.filterSectionLabel, { color: colors.mutedForeground }]}>Geo Scope</Text>
          <View style={styles.filterChipRow}>
            {CV_GEO.map((g) => (
              <Pressable
                key={g}
                onPress={() => onGeo(activeGeo === g ? null : g)}
                style={[
                  styles.filterChip,
                  { backgroundColor: activeGeo === g ? colors.primary : colors.secondary, borderColor: activeGeo === g ? colors.primary : colors.border },
                ]}
              >
                <Feather name="map-pin" size={10} color={activeGeo === g ? colors.primaryForeground : colors.mutedForeground} />
                <Text style={[styles.filterChipText, { color: activeGeo === g ? colors.primaryForeground : colors.foreground }]}>
                  {g}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.filterSectionLabel, { color: colors.mutedForeground }]}>Category</Text>
          <View style={styles.filterChipRow}>
            {CV_CATS.map((c) => (
              <Pressable
                key={c}
                onPress={() => onCat(activeCat === c ? null : c)}
                style={[
                  styles.filterChip,
                  { backgroundColor: activeCat === c ? colors.primary : colors.secondary, borderColor: activeCat === c ? colors.primary : colors.border },
                ]}
              >
                <Text style={[styles.filterChipText, { color: activeCat === c ? colors.primaryForeground : colors.foreground }]}>
                  {c}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[styles.filterApplyBtn, { backgroundColor: colors.primary }]}
            onPress={onClose}
          >
            <Text style={[styles.filterApplyText, { color: colors.primaryForeground }]}>Apply Filter</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TalksScreen({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [sort, setSort] = useState<"new" | "top">("new");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchVisible, setSearchVisible] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [allPosts, setAllPosts] = useState<TalkPost[]>([]);
  const [cursor, setCursor] = useState<number | null | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  const catListRef = useRef<ScrollView>(null);

  // Citizen Vote filter state
  const [filterGeo, setFilterGeo] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const isCVMode = selectedCatId === CITIZEN_VOTE_ID;
  const isAllMode = selectedCatId === null;
  const hasActiveFilter = !!(filterGeo || filterCat);

  const { data: categories } = useListTalkCategories();
  const cats = (categories as TalkCategory[]) ?? [];
  const selectedCat = cats.find((c) => c.id === selectedCatId);

  const { hiddenCatIds, catOrder } = useTalksCategory();

  // Base list: exclude the "Citizen Vote" DB entry (always shown as CV_PILL).
  const filteredCats = useMemo(
    () => cats.filter((c) => c.isActive && c.name !== "Citizen Vote"),
    [cats],
  );

  // Apply user's preferred order, then filter out hidden categories.
  const orderedVisibleCats = useMemo(() => {
    const allIds = filteredCats.map((c) => c.id);
    const sorted =
      catOrder.length > 0
        ? [
            ...catOrder
              .map((id) => filteredCats.find((c) => c.id === id))
              .filter(Boolean) as TalkCategory[],
            ...filteredCats.filter((c) => !catOrder.includes(c.id)),
          ]
        : filteredCats;
    return sorted.filter((c) => !hiddenCatIds.includes(c.id));
  }, [filteredCats, catOrder, hiddenCatIds]);

  // Pills: Chat (default all-posts mode) + Citizen Vote + user-ordered discussion categories.
  const allPills = useMemo(
    () => [CHAT_PILL, CV_PILL, ...orderedVisibleCats],
    [orderedVisibleCats],
  );

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset posts on filter/category change (skip if CV mode)
  useEffect(() => {
    if (!isCVMode) {
      setAllPosts([]);
      setCursor(undefined);
    }
  }, [selectedCatId, sort, debouncedSearch, isCVMode]);

  // API call — coerce to valid categoryId (skip CV sentinel)
  const talksCatId = selectedCatId !== null && selectedCatId > 0 ? selectedCatId : undefined;

  const { data, isLoading, refetch, isRefetching } = useListTalkPosts({
    categoryId: talksCatId,
    sort,
    search: debouncedSearch || undefined,
    limit: 25,
  });

  useEffect(() => {
    if (isCVMode) return;
    if (data?.items) {
      setAllPosts(data.items as TalkPost[]);
      setCursor(data.nextCursor ?? null);
    }
  }, [data, isCVMode]);

  const handleLoadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await listTalkPosts({
        categoryId: talksCatId,
        sort,
        search: debouncedSearch || undefined,
        cursor,
        limit: 25,
      });
      if (res?.items) {
        setAllPosts((prev) => [...prev, ...(res.items as TalkPost[])]);
        setCursor(res.nextCursor ?? null);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, talksCatId, sort, debouncedSearch]);

  const voteMutation = useVoteTalkPost();

  const handleVote = useCallback(
    (id: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setAllPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, upvotes: p.hasVoted ? p.upvotes - 1 : p.upvotes + 1, hasVoted: !p.hasVoted }
            : p,
        ),
      );
      voteMutation.mutate(
        { id },
        {
          onSuccess: (result) => {
            setAllPosts((prev) =>
              prev.map((p) =>
                p.id === id ? { ...p, upvotes: (result as any).upvotes, hasVoted: (result as any).hasVoted } : p,
              ),
            );
          },
          onError: () => {
            setAllPosts((prev) =>
              prev.map((p) =>
                p.id === id
                  ? { ...p, upvotes: p.hasVoted ? p.upvotes + 1 : p.upvotes - 1, hasVoted: !p.hasVoted }
                  : p,
              ),
            );
          },
        },
      );
    },
    [voteMutation],
  );

  const handlePostPress = useCallback(
    (post: TalkPost) => {
      router.push({
        pathname: "/talk-post",
        params: {
          id: String(post.id),
          title: post.title,
          body: post.body,
          displayName: post.displayName,
          avatarUrl: post.avatarUrl ?? "",
          upvotes: String(post.upvotes),
          commentCount: String(post.commentCount),
          hasVoted: String(post.hasVoted),
          createdAt: post.createdAt,
        },
      });
    },
    [router],
  );

  const handleRefresh = useCallback(() => {
    setAllPosts([]);
    setCursor(undefined);
    refetch();
  }, [refetch]);

  const handleCatSelect = useCallback((catId: number) => {
    Haptics.selectionAsync();
    startTransition(() => {
      // Chat pill always returns to all-posts mode; CV pill toggles; others toggle.
      const nextId = catId === CHAT_ALL_ID
        ? null
        : catId === CITIZEN_VOTE_ID
        ? (selectedCatId === CITIZEN_VOTE_ID ? null : CITIZEN_VOTE_ID)
        : (selectedCatId === catId ? null : catId);
      setSelectedCatId(nextId);
      setFilterGeo(null);
      setFilterCat(null);
      setSearchVisible(false);
      setSearch("");
    });
  }, [selectedCatId]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const renderPost = useCallback(
    ({ item }: { item: TalkPost }) => (
      <TalksPostCard post={item} onVote={handleVote} onPress={handlePostPress} />
    ),
    [handleVote, handlePostPress],
  );

  // ── Category pills bar (shared) ────────────────────────────────────────────
  const CategoryBar = (
    <View style={[styles.catBar, { borderBottomColor: colors.border }]}>
      <ScrollView
        ref={catListRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catList}
      >
        {allPills.map((c) => {
          const isActive = c.id === CHAT_ALL_ID ? isAllMode : c.id === CITIZEN_VOTE_ID ? isCVMode : selectedCatId === c.id;
          return (
            <CategoryPill
              key={c.id}
              cat={c}
              isActive={isActive}
              onPress={() => handleCatSelect(c.id)}
            />
          );
        })}
      </ScrollView>
    </View>
  );

  const ListFooter = loadingMore ? (
    <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
  ) : cursor ? (
    <Pressable
      style={[styles.loadMoreBtn, { borderColor: colors.border }]}
      onPress={handleLoadMore}
    >
      <Text style={[styles.loadMoreText, { color: colors.mutedForeground }]}>Load more</Text>
    </Pressable>
  ) : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.background, borderBottomColor: colors.border, paddingTop: topPad + 2 },
        ]}
      >
        {searchVisible && !isCVMode ? (
          <View style={[styles.searchBar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="search" size={15} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search posts..."
              placeholderTextColor={colors.mutedForeground}
              value={search}
              onChangeText={setSearch}
              autoFocus
              returnKeyType="search"
            />
            <Pressable onPress={() => { setSearch(""); setSearchVisible(false); }}>
              <Feather name="x" size={15} color={colors.mutedForeground} />
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.headerLeft}>
              <Pressable onPress={onOpenDrawer} style={styles.hamburgerBtn} hitSlop={10}>
                <Feather name="menu" size={22} color={colors.foreground} />
              </Pressable>
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                {isCVMode ? "Citizen Vote" : (selectedCat?.name ?? "Talks")}
              </Text>
            </View>
            <View style={styles.headerActions}>
              {/* Search — only in regular mode */}
              {!isCVMode && (
                <Pressable
                  onPress={() => setSearchVisible(true)}
                  style={[styles.headerIconBtn, { backgroundColor: colors.secondary }]}
                >
                  <Feather name="search" size={17} color={colors.mutedForeground} />
                </Pressable>
              )}

              {/* CV mode: filter button | Regular mode: sort button */}
              {isCVMode ? (
                <Pressable
                  onPress={() => setShowFilterPanel(true)}
                  style={[
                    styles.filterBtn,
                    {
                      backgroundColor: hasActiveFilter ? colors.primary + "18" : colors.secondary,
                      borderColor: hasActiveFilter ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Feather name="sliders" size={13} color={hasActiveFilter ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.filterText, { color: hasActiveFilter ? colors.primary : colors.mutedForeground }]}>
                    Filter{hasActiveFilter ? " •" : ""}
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => setSort((s) => (s === "new" ? "top" : "new"))}
                  style={[styles.filterBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                >
                  <Feather name={sort === "top" ? "trending-up" : "clock"} size={13} color={colors.primary} />
                  <Text style={[styles.filterText, { color: colors.primary }]}>
                    {sort === "top" ? "Top" : "New"}
                  </Text>
                </Pressable>
              )}
            </View>
          </>
        )}
      </View>

      {/* ── Citizen Vote Mode ── */}
      {isCVMode ? (
        <View style={styles.cvContainer}>
          {CategoryBar}
          <CitizenVoteFeed filterGeo={filterGeo} filterCategory={filterCat} />
        </View>
      ) : isLoading && allPosts.length === 0 ? (
        <>
          {CategoryBar}
          <View style={styles.loadingCenter}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        </>
      ) : (
        <FlatList
          data={allPosts}
          keyExtractor={postKeyExtractor}
          renderItem={renderPost}
          ListHeaderComponent={CategoryBar}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="message-circle" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No posts yet. Be the first!
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          removeClippedSubviews
          maxToRenderPerBatch={8}
          windowSize={10}
          initialNumToRender={8}
        />
      )}

      {/* ── FAB — hidden in CV mode (CitizenVoteFeed has its own) ── */}
      {!isCVMode && (
        <Pressable
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => setShowCreate(true)}
        >
          <Feather name="plus" size={22} color="#ffffff" />
        </Pressable>
      )}

      {/* ── Create Post Modal ── */}
      <CreatePostModal
        visible={showCreate}
        categoryId={isAllMode ? (cats[0]?.id ?? null) : (selectedCatId ?? null)}
        categoryName={isAllMode ? "" : (selectedCat?.name ?? "")}
        categories={undefined}
        onClose={() => {
          setShowCreate(false);
          setAllPosts([]);
          setCursor(undefined);
          refetch();
        }}
      />

      {/* ── CV Filter Panel ── */}
      <FilterPanel
        visible={showFilterPanel}
        activeGeo={filterGeo}
        activeCat={filterCat}
        onGeo={setFilterGeo}
        onCat={setFilterCat}
        onClose={() => setShowFilterPanel(false)}
        onReset={() => { setFilterGeo(null); setFilterCat(null); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  cvContainer: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  hamburgerBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  headerActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterText: { fontSize: 13, fontWeight: "600" },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15 },
  catBar: { borderBottomWidth: StyleSheet.hairlineWidth },
  catList: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  catPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  catEmoji: { fontSize: 14 },
  catLabel: { fontSize: 13, maxWidth: 110 },
  loadingCenter: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { alignItems: "center", gap: 12, paddingVertical: 60 },
  emptyText: { fontSize: 15 },
  loadMoreBtn: {
    marginHorizontal: 40,
    marginVertical: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  loadMoreText: { fontSize: 14, fontWeight: "500" },
  fab: {
    position: "absolute",
    bottom: 96,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  // ── Create Post Modal ──────────────────────────────────────────────────────
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: { fontSize: 17, fontWeight: "600" },
  submitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 18,
  },
  submitBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
  modalCatTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  modalCatText: { fontSize: 13, fontWeight: "600" },
  modalBody: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  catPickerSection: { gap: 8 },
  catPickerLabel: { fontSize: 12, fontWeight: "500" },
  catPickerRow: { gap: 8, paddingVertical: 2 },
  catPickerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  catPickerEmoji: { fontSize: 13 },
  catPickerChipText: { fontSize: 13, fontWeight: "500" },
  catPickerHint: { fontSize: 12, fontStyle: "italic" },
  titleInput: {
    fontSize: 20,
    fontWeight: "700",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bodyInput: {
    fontSize: 15,
    lineHeight: 22,
    minHeight: 140,
  },
  // ── Filter Panel ───────────────────────────────────────────────────────────
  filterOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  filterBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  filterPanel: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 12,
    maxHeight: "80%",
  },
  filterHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 4,
  },
  filterPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filterPanelTitle: { fontSize: 18, fontWeight: "700" },
  filterResetText: { fontSize: 14, fontWeight: "600" },
  filterSectionLabel: { fontSize: 12, fontWeight: "500", marginTop: 4 },
  filterChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontWeight: "500" },
  filterApplyBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 8,
  },
  filterApplyText: { fontSize: 15, fontWeight: "700" },
});
