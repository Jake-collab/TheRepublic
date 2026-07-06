import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { Avatar } from "@/components/TalksPostCard";
import {
  useListTalkComments,
  useCreateTalkComment,
  useVoteTalkPost,
} from "@workspace/api-client-react";

type Comment = {
  id: number;
  postId: number;
  userId?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  body: string;
  createdAt: string;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

const commentKeyExtractor = (item: Comment) => String(item.id);

export default function TalkPostScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; title?: string; body?: string; displayName?: string; avatarUrl?: string; upvotes?: string; commentCount?: string; hasVoted?: string; createdAt?: string }>();
  const postId = Number(params.id);

  const [commentText, setCommentText] = useState("");
  const inputRef = useRef<TextInput>(null);

  const title = decodeURIComponent(params.title ?? "");
  const body = decodeURIComponent(params.body ?? "");
  const displayName = decodeURIComponent(params.displayName ?? "Anonymous");
  const avatarUrl = params.avatarUrl ? decodeURIComponent(params.avatarUrl) : null;
  const createdAt = decodeURIComponent(params.createdAt ?? new Date().toISOString());

  const [upvotes, setUpvotes] = useState(Number(params.upvotes ?? 0));
  const [hasVoted, setHasVoted] = useState(params.hasVoted === "true");
  const [comments, setComments] = useState<Comment[]>([]);

  const { data: commentsData, isLoading: commentsLoading } = useListTalkComments(postId);

  const allComments = comments.length > 0 ? comments : ((commentsData as Comment[]) ?? []);

  const voteMutation = useVoteTalkPost();
  const commentMutation = useCreateTalkComment();

  const handleVote = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newVoted = !hasVoted;
    const newCount = newVoted ? upvotes + 1 : upvotes - 1;
    setHasVoted(newVoted);
    setUpvotes(newCount);
    voteMutation.mutate({ id: postId }, {
      onSuccess: (res) => {
        setUpvotes((res as any).upvotes);
        setHasVoted((res as any).hasVoted);
      },
      onError: () => {
        setHasVoted(!newVoted);
        setUpvotes(upvotes);
      },
    });
  }, [hasVoted, upvotes, postId, voteMutation]);

  const handleAddComment = useCallback(() => {
    const text = commentText.trim();
    if (!text) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCommentText("");
    commentMutation.mutate(
      { id: postId, data: { body: text } },
      {
        onSuccess: (res) => {
          setComments((prev) => [...prev, res as Comment]);
        },
      },
    );
  }, [commentText, postId, commentMutation]);

  const renderComment = useCallback(({ item }: { item: Comment }) => (
    <View style={[styles.commentRow, { borderBottomColor: colors.border }]}>
      <Avatar name={item.displayName} url={item.avatarUrl} size={30} />
      <View style={styles.commentContent}>
        <View style={styles.commentMeta}>
          <Text style={[styles.commentAuthor, { color: colors.foreground }]}>{item.displayName}</Text>
          <Text style={[styles.commentTime, { color: colors.mutedForeground }]}>{timeAgo(item.createdAt)}</Text>
        </View>
        <Text style={[styles.commentBody, { color: colors.foreground }]}>{item.body}</Text>
      </View>
    </View>
  ), [colors]);

  const ListHeader = (
    <View>
      {/* Full post content */}
      <View style={[styles.postContainer, { borderBottomColor: colors.border }]}>
        <View style={styles.postAuthorRow}>
          <Avatar name={displayName} url={avatarUrl} />
          <View>
            <Text style={[styles.postAuthor, { color: colors.foreground }]}>{displayName}</Text>
            <Text style={[styles.postTime, { color: colors.mutedForeground }]}>{timeAgo(createdAt)}</Text>
          </View>
        </View>
        <Text style={[styles.postTitle, { color: colors.foreground }]}>{title}</Text>
        {!!body && <Text style={[styles.postBody, { color: colors.foreground }]}>{body}</Text>}
        <View style={styles.voteRow}>
          <Pressable
            style={[styles.voteBtn, { backgroundColor: hasVoted ? colors.primary + "22" : colors.secondary }]}
            onPress={handleVote}
          >
            <Feather name="arrow-up" size={15} color={hasVoted ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.voteBtnText, { color: hasVoted ? colors.primary : colors.mutedForeground }]}>
              {upvotes}
            </Text>
          </Pressable>
          <View style={[styles.voteBtn, { backgroundColor: colors.secondary }]}>
            <Feather name="message-circle" size={15} color={colors.mutedForeground} />
            <Text style={[styles.voteBtnText, { color: colors.mutedForeground }]}>{allComments.length}</Text>
          </View>
        </View>
      </View>
      <Text style={[styles.commentsLabel, { color: colors.mutedForeground }]}>
        {allComments.length} Comment{allComments.length !== 1 ? "s" : ""}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.navHeader, { paddingTop: Platform.OS === "web" ? 67 : insets.top, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.secondary }]}>
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.foreground }]} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {commentsLoading ? (
          <>
            {ListHeader}
            <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
          </>
        ) : (
          <FlatList
            data={allComments}
            keyExtractor={commentKeyExtractor}
            renderItem={renderComment}
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={
              <View style={styles.emptyComments}>
                <Text style={[styles.emptyCommentsText, { color: colors.mutedForeground }]}>
                  No comments yet. Start the conversation!
                </Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 80 }}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Comment input */}
        <View
          style={[
            styles.inputBar,
            { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 },
          ]}
        >
          <TextInput
            ref={inputRef}
            style={[styles.commentInput, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
            placeholder="Add a comment..."
            placeholderTextColor={colors.mutedForeground}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
            returnKeyType="default"
          />
          <Pressable
            style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: !commentText.trim() ? 0.5 : 1 }]}
            onPress={handleAddComment}
            disabled={!commentText.trim() || commentMutation.isPending}
          >
            {commentMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="send" size={16} color="#ffffff" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  navTitle: { flex: 1, fontSize: 16, fontWeight: "600" },
  postContainer: {
    padding: 16,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  postAuthorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  postAuthor: { fontSize: 14, fontWeight: "600" },
  postTime: { fontSize: 12, marginTop: 1 },
  postTitle: { fontSize: 20, fontWeight: "700", lineHeight: 27 },
  postBody: { fontSize: 15, lineHeight: 22 },
  voteRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  voteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  voteBtnText: { fontSize: 13, fontWeight: "600" },
  commentsLabel: { fontSize: 13, fontWeight: "600", paddingHorizontal: 16, paddingVertical: 12 },
  commentRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  commentContent: { flex: 1, gap: 3 },
  commentMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  commentAuthor: { fontSize: 13, fontWeight: "600" },
  commentTime: { fontSize: 11 },
  commentBody: { fontSize: 14, lineHeight: 20 },
  emptyComments: { padding: 32, alignItems: "center" },
  emptyCommentsText: { fontSize: 14, textAlign: "center" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  commentInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    maxHeight: 100,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
});
