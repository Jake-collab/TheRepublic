import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState, useCallback, useRef, useEffect, memo } from "react";
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
import TalksPostCard, { type TalkPost } from "@/components/TalksPostCard";
import {
  useListTalkCategories,
  useListTalkPosts,
  listTalkPosts,
  useCreateTalkPost,
  useVoteTalkPost,
} from "@workspace/api-client-react";

type TalkCategory = { id: number; name: string; emoji: string; sortOrder: number; isActive: boolean };

const postKeyExtractor = (item: TalkPost) => String(item.id);

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

function CreatePostModal({
  visible,
  categoryId,
  categoryName,
  onClose,
}: {
  visible: boolean;
  categoryId: number | null;
  categoryName: string;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const createMutation = useCreateTalkPost();

  const handleSubmit = () => {
    if (!title.trim() || !body.trim() || categoryId === null) return;
    createMutation.mutate(
      { data: { categoryId, title: title.trim(), body: body.trim() } },
      {
        onSuccess: () => {
          setTitle("");
          setBody("");
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
            style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: createMutation.isPending ? 0.6 : 1 }]}
            disabled={createMutation.isPending || !title.trim() || !body.trim()}
          >
            {createMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Post</Text>
            )}
          </Pressable>
        </View>

        <View style={[styles.modalCatTag, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.modalCatText, { color: colors.primary }]}>{categoryName}</Text>
        </View>

        <ScrollView
          contentContainerStyle={[styles.modalBody, { paddingBottom: insets.bottom + 20 }]}
          keyboardShouldPersistTaps="handled"
        >
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
            autoFocus
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function TalksScreen() {
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

  const { data: categories } = useListTalkCategories();
  const cats = (categories as TalkCategory[]) ?? [];
  const selectedCat = cats.find((c) => c.id === selectedCatId);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset on filter/category change
  useEffect(() => {
    setAllPosts([]);
    setCursor(undefined);
  }, [selectedCatId, sort, debouncedSearch]);

  const { data, isLoading, refetch, isRefetching } = useListTalkPosts({
    categoryId: selectedCatId ?? undefined,
    sort,
    search: debouncedSearch || undefined,
    limit: 25,
  });

  useEffect(() => {
    if (data?.items) {
      setAllPosts(data.items as TalkPost[]);
      setCursor(data.nextCursor ?? null);
    }
  }, [data]);

  const handleLoadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await listTalkPosts({
        categoryId: selectedCatId ?? undefined,
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
  }, [cursor, loadingMore, selectedCatId, sort, debouncedSearch]);

  const voteMutation = useVoteTalkPost();

  const handleVote = useCallback(
    (id: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Optimistic update
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
            // Revert optimistic update
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

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const renderPost = useCallback(
    ({ item }: { item: TalkPost }) => (
      <TalksPostCard post={item} onVote={handleVote} onPress={handlePostPress} />
    ),
    [handleVote, handlePostPress],
  );

  const ListHeader = (
    <View>
      {/* Category tabs */}
      <View style={[styles.catBar, { borderBottomColor: colors.border }]}>
        <ScrollView
          ref={catListRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catList}
        >
          <CategoryPill
            cat={{ id: 0, name: "All", emoji: "✨", sortOrder: 0, isActive: true }}
            isActive={selectedCatId === null}
            onPress={() => { Haptics.selectionAsync(); setSelectedCatId(null); }}
          />
          {cats.map((c) => (
            <CategoryPill
              key={c.id}
              cat={c}
              isActive={selectedCatId === c.id}
              onPress={() => { Haptics.selectionAsync(); setSelectedCatId(c.id); }}
            />
          ))}
        </ScrollView>
      </View>
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
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.background, borderBottomColor: colors.border, paddingTop: topPad + 2 },
        ]}
      >
        {searchVisible ? (
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
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Talks</Text>
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => setSearchVisible(true)}
                style={[styles.headerIconBtn, { backgroundColor: colors.secondary }]}
              >
                <Feather name="search" size={17} color={colors.mutedForeground} />
              </Pressable>
              <Pressable
                onPress={() => { setSort((s) => (s === "new" ? "top" : "new")); }}
                style={[
                  styles.filterBtn,
                  { backgroundColor: colors.secondary, borderColor: colors.border },
                ]}
              >
                <Feather name={sort === "top" ? "trending-up" : "clock"} size={13} color={colors.primary} />
                <Text style={[styles.filterText, { color: colors.primary }]}>
                  {sort === "top" ? "Top" : "New"}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </View>

      {isLoading && allPosts.length === 0 ? (
        <>
          {ListHeader}
          <View style={styles.loadingCenter}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        </>
      ) : (
        <FlatList
          data={allPosts}
          keyExtractor={postKeyExtractor}
          renderItem={renderPost}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="message-circle" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No posts yet. Be the first!
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 90 }}
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

      {/* FAB */}
      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => {
          if (!selectedCatId && cats.length > 0) setSelectedCatId(cats[0].id);
          setShowCreate(true);
        }}
      >
        <Feather name="plus" size={22} color="#ffffff" />
      </Pressable>

      <CreatePostModal
        visible={showCreate}
        categoryId={selectedCatId ?? (cats[0]?.id ?? null)}
        categoryName={selectedCat?.name ?? cats[0]?.name ?? "General"}
        onClose={() => {
          setShowCreate(false);
          setAllPosts([]);
          setCursor(undefined);
          refetch();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
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
    bottom: 82,
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
  // Modal
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
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  modalCatText: { fontSize: 13, fontWeight: "600" },
  modalBody: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
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
});
