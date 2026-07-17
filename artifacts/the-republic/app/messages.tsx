import { useAuth, useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

type Conv = {
  id: number;
  contextType: string;
  contextTitle: string;
  otherUserId: string;
  otherUserName: string;
  lastMessageText: string;
  lastMessageSenderId: string | null;
  lastMessageAt: string;
};

const CONTEXT_ICONS: Record<string, string> = {
  marketplace: "shopping-bag",
  gig: "briefcase",
  freelance: "layers",
  job: "list",
};

export default function MessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();
  const meId = user?.id ?? "";
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [convs, setConvs] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch("/api/messages/conversations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConvs(Array.isArray(data) ? data : []);
      }
    } catch {}
    setLoading(false);
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "now";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  const openConv = (conv: Conv) => {
    router.push(`/conversation?id=${conv.id}&title=${encodeURIComponent(conv.otherUserName)}` as never);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border, paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.secondary }]}>
          <Feather name="chevron-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Messages</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />
      ) : convs.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="message-square" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No messages yet</Text>
          <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>
            Start a conversation from any listing, gig, freelance project, or job.
          </Text>
        </View>
      ) : (
        <FlatList
          data={convs}
          keyExtractor={(c) => String(c.id)}
          onRefresh={load}
          refreshing={loading}
          renderItem={({ item: conv }) => {
            const icon = CONTEXT_ICONS[conv.contextType] ?? "message-circle";
            const isMine = conv.lastMessageSenderId === meId;
            const preview = conv.lastMessageText
              ? `${isMine ? "You: " : ""}${conv.lastMessageText}`
              : "Tap to start the conversation";
            return (
              <Pressable
                onPress={() => openConv(conv)}
                style={[styles.convRow, { borderBottomColor: colors.border }]}
              >
                <View style={[styles.convIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name={icon as any} size={20} color={colors.primary} />
                </View>
                <View style={styles.convBody}>
                  <View style={styles.convTop}>
                    <Text style={[styles.convName, { color: colors.foreground }]} numberOfLines={1}>
                      {conv.otherUserName}
                    </Text>
                    <Text style={[styles.convTime, { color: colors.mutedForeground }]}>
                      {timeAgo(conv.lastMessageAt)}
                    </Text>
                  </View>
                  <Text style={[styles.convCtx, { color: colors.primary }]} numberOfLines={1}>
                    {conv.contextTitle}
                  </Text>
                  <Text style={[styles.convPreview, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {preview}
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, padding: 32 },
  emptyTitle: { fontSize: 17, fontWeight: "600" },
  emptySubText: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  convRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  convIcon: { width: 46, height: 46, borderRadius: 23, justifyContent: "center", alignItems: "center" },
  convBody: { flex: 1, gap: 2 },
  convTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  convName: { fontSize: 15, fontWeight: "600" },
  convTime: { fontSize: 12 },
  convCtx: { fontSize: 11, fontWeight: "600" },
  convPreview: { fontSize: 13 },
});
