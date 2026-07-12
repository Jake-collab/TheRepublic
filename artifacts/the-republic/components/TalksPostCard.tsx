import { Feather } from "@expo/vector-icons";
import React, { memo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

export interface TalkPost {
  id: number;
  categoryId: number;
  userId?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  title: string;
  body: string;
  upvotes: number;
  commentCount: number;
  hasVoted: boolean;
  isPinned?: boolean;
  createdAt: string;
}

interface Props {
  post: TalkPost;
  onVote: (id: number) => void;
  onPress: (post: TalkPost) => void;
  onFlag?: (id: number, reason: string) => void;
}

const FLAG_REASONS = [
  { label: "Spam", value: "spam" },
  { label: "Harassment", value: "harassment" },
  { label: "Misinformation", value: "misinformation" },
  { label: "Hate Speech", value: "hate_speech" },
  { label: "Other", value: "other" },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

function Avatar({ name, url, size = 36 }: { name: string; url?: string | null; size?: number }) {
  const colors = useColors();
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={[styles.avatarImg, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }
  const initial = name?.[0]?.toUpperCase() ?? "?";
  return (
    <View
      style={[
        styles.avatarFallback,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.secondary, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.avatarInitial, { color: colors.primary, fontSize: size * 0.44 }]}>
        {initial}
      </Text>
    </View>
  );
}

const TalksPostCard = memo(function TalksPostCard({ post, onVote, onPress, onFlag }: Props) {
  const colors = useColors();
  const [flagged, setFlagged] = useState(false);

  const handleFlag = () => {
    if (flagged) return;
    Alert.alert(
      "Report Post",
      "Why are you reporting this post?",
      [
        ...FLAG_REASONS.map((r) => ({
          text: r.label,
          onPress: () => {
            setFlagged(true);
            onFlag?.(post.id, r.value);
          },
        })),
        { text: "Cancel", style: "cancel" as const },
      ]
    );
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: post.isPinned ? colors.primary : colors.border, opacity: pressed ? 0.9 : 1 },
      ]}
      onPress={() => onPress(post)}
    >
      {post.isPinned && (
        <View style={[styles.pinnedBanner, { backgroundColor: colors.primary + "18" }]}>
          <Feather name="bookmark" size={11} color={colors.primary} />
          <Text style={[styles.pinnedText, { color: colors.primary }]}>Pinned</Text>
        </View>
      )}

      <View style={styles.topRow}>
        <Avatar name={post.displayName} url={post.avatarUrl} />
        <View style={styles.meta}>
          <Text style={[styles.author, { color: colors.foreground }]} numberOfLines={1}>
            {post.displayName}
          </Text>
          <Text style={[styles.time, { color: colors.mutedForeground }]}>
            {timeAgo(post.createdAt)}
          </Text>
        </View>
      </View>

      <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
        {post.title}
      </Text>
      {!!post.body && (
        <Text style={[styles.body, { color: colors.mutedForeground }]} numberOfLines={3}>
          {post.body}
        </Text>
      )}

      <View style={styles.bottomRow}>
        <Pressable
          style={[
            styles.actionBtn,
            { backgroundColor: post.hasVoted ? colors.primary + "22" : colors.secondary },
          ]}
          onPress={(e) => { e.stopPropagation?.(); onVote(post.id); }}
          hitSlop={8}
        >
          <Feather
            name="arrow-up"
            size={14}
            color={post.hasVoted ? colors.primary : colors.mutedForeground}
          />
          <Text
            style={[
              styles.actionCount,
              { color: post.hasVoted ? colors.primary : colors.mutedForeground },
            ]}
          >
            {post.upvotes}
          </Text>
        </Pressable>

        <View style={[styles.actionBtn, { backgroundColor: colors.secondary }]}>
          <Feather name="message-circle" size={14} color={colors.mutedForeground} />
          <Text style={[styles.actionCount, { color: colors.mutedForeground }]}>
            {post.commentCount}
          </Text>
        </View>

        <Pressable
          style={[styles.flagBtn]}
          onPress={(e) => { e.stopPropagation?.(); handleFlag(); }}
          hitSlop={8}
        >
          <Feather
            name="flag"
            size={13}
            color={flagged ? colors.primary : colors.mutedForeground}
          />
        </Pressable>
      </View>
    </Pressable>
  );
});

export default TalksPostCard;
export { Avatar };

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 14,
    marginVertical: 5,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
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
  pinnedText: {
    fontSize: 11,
    fontWeight: "600",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarImg: {
    resizeMode: "cover",
  },
  avatarFallback: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  avatarInitial: {
    fontWeight: "700",
  },
  meta: { flex: 1 },
  author: { fontSize: 13, fontWeight: "600" },
  time: { fontSize: 11, marginTop: 1 },
  title: { fontSize: 15, fontWeight: "700", lineHeight: 21 },
  body: { fontSize: 13, lineHeight: 19 },
  bottomRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
    alignItems: "center",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  actionCount: { fontSize: 12, fontWeight: "600" },
  flagBtn: {
    marginLeft: "auto",
    padding: 5,
  },
});
