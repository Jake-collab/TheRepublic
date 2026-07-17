import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useAuth } from "@clerk/expo";

import { useColors } from "@/hooks/useColors";
import { Avatar } from "@/components/TalksPostCard";
import ReportUserModal from "@/components/ReportUserModal";
import {
  useListTalkComments,
  useCreateTalkComment,
  useVoteTalkPost,
  useVoteTalkComment,
  useFlagTalkPost,
  useFlagTalkComment,
  useDeleteTalkComment,
  type FlagInputReason,
} from "@workspace/api-client-react";
import { useUser } from "@clerk/expo";

type Comment = {
  id: number;
  postId: number;
  userId?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  body: string;
  upvotes: number;
  hasVoted: boolean;
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

const FLAG_REASONS = [
  { label: "Spam", value: "spam" },
  { label: "Harassment", value: "harassment" },
  { label: "Misinformation", value: "misinformation" },
  { label: "Hate Speech", value: "hate_speech" },
  { label: "Other", value: "other" },
];

const commentKeyExtractor = (item: Comment) => String(item.id);

export default function TalkPostScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useAuth();
  const params = useLocalSearchParams<{
    id: string;
    title?: string;
    body?: string;
    displayName?: string;
    avatarUrl?: string;
    upvotes?: string;
    commentCount?: string;
    hasVoted?: string;
    createdAt?: string;
  }>();

  const postId = Number(params.id);
  const title = params.title ?? "";
  const body = params.body ?? "";
  const displayName = params.displayName ?? "Anonymous";
  const avatarUrl = params.avatarUrl || null;
  const createdAt = params.createdAt ?? new Date().toISOString();
  const postUserId = (params as any).postUserId ?? "";

  const isPostOwner = !!userId && !!postUserId && userId === postUserId;

  const [upvotes, setUpvotes] = useState(Number(params.upvotes ?? 0));
  const [hasVoted, setHasVoted] = useState(params.hasVoted === "true");
  const [postFlagged, setPostFlagged] = useState(false);
  const [reportUserVisible, setReportUserVisible] = useState(false);

  const [commentText, setCommentText] = useState("");
  const inputRef = useRef<TextInput>(null);

  const [comments, setComments] = useState<Comment[]>([]);
  const [initialized, setInitialized] = useState(false);

  const { data: commentsData, isLoading: commentsLoading } = useListTalkComments(postId);

  React.useEffect(() => {
    if (!initialized && commentsData) {
      setComments(commentsData as unknown as Comment[]);
      setInitialized(true);
    }
  }, [commentsData, initialized]);

  const voteMutation = useVoteTalkPost();
  const commentMutation = useCreateTalkComment();
  const commentVoteMutation = useVoteTalkComment();
  const flagPostMutation = useFlagTalkPost();
  const flagCommentMutation = useFlagTalkComment();
  const deleteCommentMutation = useDeleteTalkComment();
  const { getToken } = useUser() as any;
  const [deletingPost, setDeletingPost] = useState(false);

  const handleDeletePost = useCallback(() => {
    Alert.alert("Delete Post", "Are you sure you want to delete this post? This cannot be undone.", [
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeletingPost(true);
          try {
            const token = typeof getToken === "function" ? await getToken() : null;
            const headers: Record<string, string> = {};
            if (token) headers["Authorization"] = `Bearer ${token}`;
            const res = await fetch(`/api/talks/posts/${postId}`, { method: "DELETE", headers });
            if (res.ok || res.status === 404) { router.back(); return; }
            Alert.alert("Error", "Could not delete the post. Please try again.");
          } catch {
            Alert.alert("Error", "Could not delete the post. Please try again.");
          } finally { setDeletingPost(false); }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [postId, getToken, router]);

  const handleVote = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newVoted = !hasVoted;
    setHasVoted(newVoted);
    setUpvotes((v) => newVoted ? v + 1 : v - 1);
    voteMutation.mutate({ id: postId }, {
      onSuccess: (res) => {
        setUpvotes((res as any).upvotes);
        setHasVoted((res as any).hasVoted);
      },
      onError: () => {
        setHasVoted(!newVoted);
        setUpvotes((v) => newVoted ? v - 1 : v + 1);
      },
    });
  }, [hasVoted, postId, voteMutation]);

  const handleReportPost = useCallback(() => {
    if (postFlagged) {
      Alert.alert("Already Reported", "You have already reported this post.");
      return;
    }
    Alert.alert(
      "Report Post",
      "Why are you reporting this post?",
      [
        ...FLAG_REASONS.map((r) => ({
          text: r.label,
          onPress: () => {
            setPostFlagged(true);
            flagPostMutation.mutate({ id: postId, data: { reason: r.value as FlagInputReason } });
            Alert.alert("Reported", "Thanks for keeping the community safe.");
          },
        })),
        { text: "Cancel", style: "cancel" as const },
      ],
    );
  }, [postFlagged, postId, flagPostMutation]);

  const handleCommentVote = useCallback((commentId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, upvotes: c.hasVoted ? c.upvotes - 1 : c.upvotes + 1, hasVoted: !c.hasVoted }
          : c,
      ),
    );
    commentVoteMutation.mutate({ id: commentId }, {
      onSuccess: (res) => {
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? { ...c, upvotes: (res as any).upvotes, hasVoted: (res as any).hasVoted }
              : c,
          ),
        );
      },
      onError: () => {
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? { ...c, upvotes: c.hasVoted ? c.upvotes + 1 : c.upvotes - 1, hasVoted: !c.hasVoted }
              : c,
          ),
        );
      },
    });
  }, [commentVoteMutation]);

  const handleCommentMenu = useCallback((comment: Comment) => {
    const isOwn = !!userId && comment.userId === userId;
    const reportOption = {
      text: "Report",
      onPress: () => {
        Alert.alert(
          "Report Comment",
          "Why are you reporting this comment?",
          [
            ...FLAG_REASONS.map((r) => ({
              text: r.label,
              onPress: () => {
                flagCommentMutation.mutate({ id: comment.id, data: { reason: r.value as FlagInputReason } });
                Alert.alert("Reported", "Thanks for keeping the community safe.");
              },
            })),
            { text: "Cancel", style: "cancel" as const },
          ],
        );
      },
    };
    const deleteOption = {
      text: "Delete",
      style: "destructive" as const,
      onPress: () => {
        Alert.alert("Delete Comment", "Are you sure you want to delete this comment?", [
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              deleteCommentMutation.mutate({ id: comment.id }, {
                onSuccess: () => {
                  setComments((prev) => prev.filter((c) => c.id !== comment.id));
                },
                onError: () => {
                  Alert.alert("Error", "Could not delete comment. Please try again.");
                },
              });
            },
          },
          { text: "Cancel", style: "cancel" },
        ]);
      },
    };

    Alert.alert(
      "Comment",
      undefined,
      [
        ...(isOwn ? [deleteOption] : []),
        reportOption,
        { text: "Cancel", style: "cancel" as const },
      ],
    );
  }, [userId, flagCommentMutation, deleteCommentMutation]);

  const handleAddComment = useCallback(() => {
    const text = commentText.trim();
    if (!text) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCommentText("");
    commentMutation.mutate(
      { id: postId, data: { body: text } },
      {
        onSuccess: (res) => {
          const newComment: Comment = {
            ...(res as any),
            upvotes: (res as any).upvotes ?? 0,
            hasVoted: false,
          };
          setComments((prev) => [newComment, ...prev]);
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
        <View style={styles.commentActions}>
          <Pressable
            style={[
              styles.commentUpvoteBtn,
              { backgroundColor: item.hasVoted ? colors.primary + "22" : colors.secondary },
            ]}
            onPress={() => handleCommentVote(item.id)}
            hitSlop={6}
          >
            <Feather
              name="arrow-up"
              size={12}
              color={item.hasVoted ? colors.primary : colors.mutedForeground}
            />
            <Text style={[styles.commentUpvoteCount, { color: item.hasVoted ? colors.primary : colors.mutedForeground }]}>
              {item.upvotes}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleCommentMenu(item)}
            hitSlop={8}
            style={styles.commentMenuBtn}
          >
            <Feather name="more-horizontal" size={15} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </View>
    </View>
  ), [colors, handleCommentVote, handleCommentMenu]);

  const ListHeader = (
    <View>
      <View style={[styles.postContainer, { borderBottomColor: colors.border }]}>
        <View style={styles.postAuthorRow}>
          <Avatar name={displayName} url={avatarUrl} />
          <View style={{ flex: 1 }}>
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
            <Text style={[styles.voteBtnText, { color: colors.mutedForeground }]}>{comments.length}</Text>
          </View>
          <Pressable
            style={[styles.voteBtn, { backgroundColor: postFlagged ? colors.primary + "18" : colors.secondary, marginLeft: "auto" }]}
            onPress={handleReportPost}
            hitSlop={6}
          >
            <Feather name="flag" size={13} color={postFlagged ? colors.primary : colors.mutedForeground} />
          </Pressable>
          {!!postUserId && postUserId !== userId && (
            <Pressable
              style={[styles.voteBtn, { backgroundColor: colors.secondary }]}
              onPress={() => setReportUserVisible(true)}
              hitSlop={6}
            >
              <Feather name="user-x" size={13} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>
      <Text style={[styles.commentsLabel, { color: colors.mutedForeground }]}>
        {comments.length} Comment{comments.length !== 1 ? "s" : ""}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.navHeader, { paddingTop: Platform.OS === "web" ? 67 : insets.top, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.secondary }]}>
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.foreground }]} numberOfLines={1}>
          {title}
        </Text>
        {isPostOwner && (
          <Pressable
            onPress={handleDeletePost}
            style={[styles.backBtn, { backgroundColor: "#dc262620" }]}
            hitSlop={8}
            disabled={deletingPost}
          >
            {deletingPost ? (
              <ActivityIndicator size="small" color="#dc2626" />
            ) : (
              <Feather name="trash-2" size={16} color="#dc2626" />
            )}
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {commentsLoading && !initialized ? (
          <>
            {ListHeader}
            <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
          </>
        ) : (
          <FlatList
            data={comments}
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

      {!!postUserId && postUserId !== userId && (
        <ReportUserModal
          visible={reportUserVisible}
          reportedUserId={postUserId}
          reportedUserName={displayName}
          onClose={() => setReportUserVisible(false)}
        />
      )}
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
  voteRow: { flexDirection: "row", gap: 8, marginTop: 4, alignItems: "center" },
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
  commentContent: { flex: 1, gap: 4 },
  commentMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  commentAuthor: { fontSize: 13, fontWeight: "600" },
  commentTime: { fontSize: 11 },
  commentBody: { fontSize: 14, lineHeight: 20 },
  commentActions: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  commentUpvoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  commentUpvoteCount: { fontSize: 12, fontWeight: "600" },
  commentMenuBtn: { padding: 4 },
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
