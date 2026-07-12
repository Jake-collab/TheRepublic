import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  useListNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@workspace/api-client-react";

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: notifications, isLoading, refetch } = useListNotifications();
  const { mutate: markRead } = useMarkNotificationRead();
  const { mutate: markAll } = useMarkAllNotificationsRead();

  const items = (notifications as any[]) ?? [];
  const unreadCount = items.filter((n: any) => !n.isRead).length;

  const handleMarkAll = () => {
    markAll(undefined as any, { onSuccess: () => refetch() });
  };

  const handleMarkOne = (id: number) => {
    markRead({ id }, { onSuccess: () => refetch() });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.background, borderBottomColor: colors.border, paddingTop: topPad + 8 },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={[styles.closeBtn, { backgroundColor: colors.secondary }]}
        >
          <Feather name="x" size={18} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notifications</Text>
        {unreadCount > 0 ? (
          <Pressable onPress={handleMarkAll}>
            <Text style={[styles.markAllText, { color: colors.primary }]}>Mark all read</Text>
          </Pressable>
        ) : (
          <View style={{ width: 72 }} />
        )}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centered}>
          <Feather name="bell-off" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No notifications</Text>
          <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
            You're all caught up!
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}>
          {items.map((n: any) => (
            <Pressable
              key={n.id}
              onPress={() => !n.isRead && handleMarkOne(n.id)}
              style={[
                styles.notifCard,
                {
                  backgroundColor: n.isRead ? colors.card : colors.secondary,
                  borderColor: n.isRead ? colors.border : colors.primary,
                },
              ]}
            >
              <View style={[styles.dot, { backgroundColor: n.isRead ? colors.border : colors.primary }]} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.notifTitle, { color: colors.foreground }]}>{n.title}</Text>
                <Text style={[styles.notifBody, { color: colors.mutedForeground }]}>{n.message}</Text>
                <Text style={[styles.notifTime, { color: colors.mutedForeground }]}>
                  {new Date(n.createdAt).toLocaleDateString()}
                </Text>
              </View>
              {!n.isRead && (
                <Feather name="circle" size={8} color={colors.primary} style={{ marginTop: 4 }} />
              )}
            </Pressable>
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  markAllText: { fontSize: 14, fontWeight: "600" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600" },
  emptyBody: { fontSize: 14 },
  list: { padding: 16, gap: 10 },
  notifCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  notifTitle: { fontSize: 15, fontWeight: "600" },
  notifBody: { fontSize: 14, lineHeight: 20 },
  notifTime: { fontSize: 12, marginTop: 2 },
});
