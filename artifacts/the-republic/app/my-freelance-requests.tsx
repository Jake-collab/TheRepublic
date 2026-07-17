import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import React, { useState, useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

type Project = {
  id: number;
  title: string;
  description: string;
  category: string;
  budgetMinCents: number | null;
  budgetMaxCents: number | null;
  status: string;
  createdAt: string;
};

function formatBudget(min: number | null, max: number | null): string {
  if (!min && !max) return "Open budget";
  const fmt = (c: number) =>
    `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return `Up to ${fmt(max!)}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function statusColor(status: string): string {
  if (status === "open") return "#16a34a";
  if (status === "in_progress") return "#2563eb";
  if (status === "completed") return "#6b7280";
  return "#9ca3af";
}

export default function MyFreelanceRequestsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProjects = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const token = await getToken();
        const res = await fetch("/api/freelance/my-projects", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) setProjects((await res.json()) as Project[]);
      } catch {}
      finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getToken],
  );

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const renderItem = useCallback(
    ({ item }: { item: Project }) => (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardTop}>
          <View style={[styles.catIcon, { backgroundColor: colors.secondary }]}>
            <Text style={styles.catEmoji}>💼</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={[styles.cardBudget, { color: colors.primary }]}>
              {formatBudget(item.budgetMinCents, item.budgetMaxCents)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + "20" }]}>
            <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
              {item.status.replace("_", " ")}
            </Text>
          </View>
        </View>
        <Text style={[styles.cardDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={[styles.cardDate, { color: colors.mutedForeground }]}>
          {timeAgo(item.createdAt)}
        </Text>
      </View>
    ),
    [colors],
  );

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
          style={[styles.backBtn, { backgroundColor: colors.secondary }]}
        >
          <Feather name="chevron-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Active Freelance Requests</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchProjects(true)}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="layers" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No active freelance requests
              </Text>
              <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>
                Freelance projects you post as a client will appear here.
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
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
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", flex: 1, textAlign: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, padding: 32, paddingTop: 60 },
  emptyTitle: { fontSize: 17, fontWeight: "600" },
  emptySubText: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  list: { padding: 16, gap: 12 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 8 },
  cardTop: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  catIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  catEmoji: { fontSize: 20 },
  cardTitle: { fontSize: 15, fontWeight: "600", lineHeight: 20 },
  cardBudget: { fontSize: 13, fontWeight: "600", marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  cardDate: { fontSize: 11 },
});
