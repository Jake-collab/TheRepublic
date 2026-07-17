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

type GigJob = {
  id: number;
  title: string;
  description: string;
  category: string;
  payRateCents: number | null;
  payType: string;
  city: string | null;
  stateCode: string | null;
  isRemote: boolean | null;
  status: string;
  createdAt: string;
};

function formatPay(cents: number | null, payType: string): string {
  if (!cents) return "Negotiable";
  const amt = `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
  if (payType === "hourly") return `${amt}/hr`;
  if (payType === "daily") return `${amt}/day`;
  return `${amt} fixed`;
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
  if (status === "filled") return "#2563eb";
  if (status === "closed") return "#6b7280";
  return "#9ca3af";
}

const GIG_CAT_EMOJI: Record<string, string> = {
  moving:      "📦",
  cleaning:    "🧹",
  yardwork:    "🌿",
  handyman:    "🔨",
  delivery:    "🚚",
  pet_care:    "🐾",
  errands:     "🏃",
  tech_help:   "💻",
  painting:    "🖌",
  other:       "✨",
};

export default function MyGigRequestsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [jobs, setJobs] = useState<GigJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobs = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const token = await getToken();
        const res = await fetch("/api/gigs/my-jobs", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) setJobs((await res.json()) as GigJob[]);
      } catch {}
      finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getToken],
  );

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const renderItem = useCallback(
    ({ item }: { item: GigJob }) => (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardTop}>
          <View style={[styles.catIcon, { backgroundColor: colors.secondary }]}>
            <Text style={styles.catEmoji}>{GIG_CAT_EMOJI[item.category] ?? "✨"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={[styles.cardPay, { color: colors.primary }]}>
              {formatPay(item.payRateCents, item.payType)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + "20" }]}>
            <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
              {item.status}
            </Text>
          </View>
        </View>
        <Text style={[styles.cardDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.cardFooter}>
          {(item.city || item.isRemote) && (
            <View style={styles.metaRow}>
              <Feather name={item.isRemote ? "globe" : "map-pin"} size={12} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {item.isRemote ? "Remote" : `${item.city}${item.stateCode ? `, ${item.stateCode}` : ""}`}
              </Text>
            </View>
          )}
          <Text style={[styles.cardDate, { color: colors.mutedForeground }]}>
            {timeAgo(item.createdAt)}
          </Text>
        </View>
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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Active Gig Work Requests</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchJobs(true)}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="briefcase" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No active gig requests
              </Text>
              <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>
                Gigs you post as a hirer will appear here, showing worker applications and status.
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
  cardPay: { fontSize: 13, fontWeight: "600", marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11 },
  cardDate: { fontSize: 11 },
});
