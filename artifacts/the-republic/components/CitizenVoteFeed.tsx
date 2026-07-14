import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState, useCallback, memo, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  useListCitizenVotePosts,
  useCreateCitizenVotePost,
  useUpvoteCitizenVotePost,
} from "@workspace/api-client-react";

export const GEO_OPTIONS = ["City", "State", "National", "Global"];
export const CAT_OPTIONS = ["Economy", "Healthcare", "Education", "Immigration", "Environment", "Civil Rights", "Housing", "Elections", "Foreign Policy", "Taxes", "Other"];
const FLAG_REASONS = [
  { label: "Spam", value: "spam" },
  { label: "Harassment", value: "harassment" },
  { label: "Misinformation", value: "misinformation" },
  { label: "Hate Speech", value: "hate_speech" },
  { label: "Other", value: "other" },
];
const postKeyExtractor = (item: { id: number }) => String(item.id);

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

interface Post {
  id: number;
  title: string;
  body: string;
  category: string;
  geo: string;
  upvoteCount: number;
  didUpvote: boolean;
  authorName: string;
  isPinned?: boolean;
  createdAt: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

const PostCard = memo(function PostCard({ post, onUpvote }: { post: Post; onUpvote: (id: number) => void }) {
  const colors = useColors();
  const [flagged, setFlagged] = useState(false);

  const handleFlag = () => {
    if (flagged) return;
    Alert.alert(
      "Report Vote",
      "Why are you reporting this?",
      [
        ...FLAG_REASONS.map((r) => ({
          text: r.label,
          onPress: async () => {
            try {
              await fetch(`${BASE_URL}/api/citizen-vote/posts/${post.id}/flag`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ reason: r.value }),
              });
              setFlagged(true);
            } catch {
              // silent — flag is best-effort
            }
          },
        })),
        { text: "Cancel", style: "cancel" as const },
      ]
    );
  };

  return (
    <View style={[
      styles.card,
      {
        backgroundColor: colors.card,
        borderColor: post.isPinned ? colors.primary : colors.border,
        borderWidth: post.isPinned ? 1.5 : StyleSheet.hairlineWidth,
      },
    ]}>
      {post.isPinned && (
        <View style={[styles.pinnedBanner, { backgroundColor: colors.primary + "18" }]}>
          <Feather name="bookmark" size={10} color={colors.primary} />
          <Text style={[styles.pinnedText, { color: colors.primary }]}>Pinned</Text>
        </View>
      )}
      <View style={styles.cardHeader}>
        <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
            {post.category}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
          <Feather name="map-pin" size={10} color={colors.mutedForeground} />
          <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>{post.geo}</Text>
        </View>
        <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
          {timeAgo(post.createdAt)}
        </Text>
      </View>
      <Text style={[styles.cardTitle, { color: colors.foreground }]}>{post.title}</Text>
      {!!post.body && (
        <Text style={[styles.cardBody, { color: colors.mutedForeground }]} numberOfLines={3}>
          {post.body}
        </Text>
      )}
      <View style={styles.cardFooter}>
        <Text style={[styles.authorText, { color: colors.mutedForeground }]}>
          {post.authorName}
        </Text>
        <View style={styles.footerActions}>
          <Pressable
            style={({ pressed }) => [
              styles.upvoteBtn,
              {
                backgroundColor: post.didUpvote ? colors.primary : colors.secondary,
                borderColor: post.didUpvote ? colors.primary : colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            onPress={() => onUpvote(post.id)}
          >
            <Feather
              name="arrow-up"
              size={13}
              color={post.didUpvote ? colors.primaryForeground : colors.mutedForeground}
            />
            <Text
              style={[
                styles.upvoteText,
                { color: post.didUpvote ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              {post.upvoteCount}
            </Text>
          </Pressable>
          <Pressable onPress={handleFlag} hitSlop={8} style={styles.flagBtn}>
            <Feather
              name="flag"
              size={13}
              color={flagged ? colors.primary : colors.mutedForeground}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
});

function CreatePostModal({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (data: { title: string; body: string; category: string; geo: string }) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("Other");
  const [geo, setGeo] = useState("National");

  const handleSubmit = () => {
    if (!title.trim()) return;
    onCreate({ title: title.trim(), body: body.trim(), category, geo });
    setTitle("");
    setBody("");
    setCategory("Other");
    setGeo("National");
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="formSheet">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 },
          ]}
        >
          <View style={[styles.modalHandle, { backgroundColor: colors.muted }]} />
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Citizen Vote</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
            placeholder="What should citizens vote on?"
            placeholderTextColor={colors.mutedForeground}
            value={title}
            onChangeText={setTitle}
            maxLength={120}
          />
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
            placeholder="Add context (optional)"
            placeholderTextColor={colors.mutedForeground}
            value={body}
            onChangeText={setBody}
            multiline
            numberOfLines={3}
          />

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Geo Scope</Text>
          <View style={styles.chipRow}>
            {GEO_OPTIONS.map((g) => (
              <Pressable
                key={g}
                style={[styles.chip, { backgroundColor: geo === g ? colors.primary : colors.secondary, borderColor: geo === g ? colors.primary : colors.border }]}
                onPress={() => setGeo(g)}
              >
                <Text style={[styles.chipText, { color: geo === g ? colors.primaryForeground : colors.foreground }]}>
                  {g}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Category</Text>
          <ScrollView style={{ maxHeight: 100 }} contentContainerStyle={styles.chipRow} showsVerticalScrollIndicator={false}>
            {CAT_OPTIONS.map((c) => (
              <Pressable
                key={c}
                style={[styles.chip, { backgroundColor: category === c ? colors.primary : colors.secondary, borderColor: category === c ? colors.primary : colors.border }]}
                onPress={() => setCategory(c)}
              >
                <Text style={[styles.chipText, { color: category === c ? colors.primaryForeground : colors.foreground }]}>
                  {c}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable
            style={[styles.submitBtn, { backgroundColor: title.trim() ? colors.primary : colors.muted }]}
            onPress={handleSubmit}
          >
            <Text style={[styles.submitText, { color: title.trim() ? colors.primaryForeground : colors.mutedForeground }]}>
              Post Vote
            </Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface CitizenVoteFeedProps {
  filterGeo?: string | null;
  filterCategory?: string | null;
}

export default function CitizenVoteFeed({ filterGeo, filterCategory }: CitizenVoteFeedProps = {}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [sort, setSort] = useState<"newest" | "top">("newest");
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useListCitizenVotePosts({ sort });
  const upvoteMutation = useUpvoteCitizenVotePost();
  const createMutation = useCreateCitizenVotePost();

  const rawPosts = (data as any)?.items ?? (Array.isArray(data) ? data : []) as Post[];

  const posts = useMemo(() => {
    if (!rawPosts.length) return rawPosts;
    return rawPosts.filter((p: Post) => {
      if (filterGeo && p.geo !== filterGeo) return false;
      if (filterCategory && p.category !== filterCategory) return false;
      return true;
    });
  }, [rawPosts, filterGeo, filterCategory]);

  const handleUpvote = useCallback((id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    upvoteMutation.mutate({ id });
  }, [upvoteMutation]);

  const handleCreate = (formData: {
    title: string;
    body: string;
    category: string;
    geo: string;
  }) => {
    const content = formData.body.trim()
      ? `${formData.title}\n\n${formData.body}`
      : formData.title;
    createMutation.mutate(
      { data: { content, category: formData.category, geo: formData.geo } },
      { onSuccess: () => refetch() }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.sortRow, { borderBottomColor: colors.border }]}>
        {(["newest", "top"] as const).map((s) => (
          <Pressable
            key={s}
            style={[styles.sortBtn, sort === s && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setSort(s)}
          >
            <Text style={[styles.sortText, { color: sort === s ? colors.primary : colors.mutedForeground }]}>
              {s === "newest" ? "New" : "Top"}
            </Text>
          </Pressable>
        ))}
        {(filterGeo || filterCategory) && (
          <View style={[styles.activeFilterBadge, { backgroundColor: colors.primary + "18" }]}>
            <Text style={[styles.activeFilterText, { color: colors.primary }]}>
              {[filterGeo, filterCategory].filter(Boolean).join(" · ")}
            </Text>
          </View>
        )}
      </View>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={posts as Post[]}
          keyExtractor={postKeyExtractor}
          renderItem={({ item }) => (
            <PostCard post={item} onUpvote={handleUpvote} />
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 80 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="flag" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {filterGeo || filterCategory ? "No votes match this filter" : "No votes yet"}
              </Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                {filterGeo || filterCategory ? "Try a different filter" : "Be the first to post a citizen vote"}
              </Text>
            </View>
          }
        />
      )}
      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowCreate(true); }}
      >
        <Feather name="plus" size={24} color={colors.primaryForeground} />
      </Pressable>
      <CreatePostModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sortBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sortText: { fontSize: 14, fontWeight: "600" },
  activeFilterBadge: {
    marginLeft: "auto" as any,
    marginRight: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeFilterText: { fontSize: 11, fontWeight: "600" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 12, gap: 10 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 17, fontWeight: "600" },
  emptySub: { fontSize: 14, textAlign: "center" },
  card: {
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  pinnedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginBottom: 2,
  },
  pinnedText: { fontSize: 11, fontWeight: "600" },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: { fontSize: 11, fontWeight: "500" },
  timeText: { fontSize: 11, marginLeft: "auto" as any },
  cardTitle: { fontSize: 15, fontWeight: "600", lineHeight: 22 },
  cardBody: { fontSize: 13, lineHeight: 19 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  authorText: { fontSize: 12 },
  footerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  upvoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  upvoteText: { fontSize: 12, fontWeight: "600" },
  flagBtn: { padding: 4 },
  fab: {
    position: "absolute",
    bottom: 70,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalContainer: {
    flex: 1,
    marginTop: 60,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 12,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  input: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    borderWidth: 1,
  },
  textArea: { height: 80, textAlignVertical: "top" },
  fieldLabel: { fontSize: 12, fontWeight: "500", marginTop: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: "500" },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  submitText: { fontSize: 16, fontWeight: "700" },
  cancelBtn: { alignItems: "center", paddingVertical: 8 },
  cancelText: { fontSize: 15 },
});
