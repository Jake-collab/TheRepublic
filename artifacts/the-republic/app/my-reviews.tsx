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

type Review = {
  id: number;
  reviewerId: string;
  reviewerName: string;
  contextType: string;
  rating: number;
  description: string;
  createdAt: string;
};

function StarRow({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Feather key={s} name="star" size={13} color={s <= rating ? "#f59e0b" : "#d1d5db"} />
      ))}
    </View>
  );
}

export default function MyReviewsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [avgRating, setAvgRating] = useState(0);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/reviews?userId=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const list: Review[] = Array.isArray(data) ? data : [];
      setReviews(list);
      if (list.length > 0) {
        setAvgRating(list.reduce((s, r) => s + r.rating, 0) / list.length);
      }
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [getToken, user?.id]);

  useEffect(() => { load(); }, [load]);

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const contextLabel = (t: string) =>
    t === "gig_job" ? "Gig" : t === "freelance_project" ? "Freelance" : t === "marketplace_listing" ? "Marketplace" : t;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border, paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.secondary }]}>
          <Feather name="chevron-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Reviews</Text>
        <View style={{ width: 36 }} />
      </View>

      {!loading && reviews.length > 0 && (
        <View style={[styles.summary, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Text style={[styles.avgNum, { color: colors.foreground }]}>{avgRating.toFixed(1)}</Text>
          <StarRow rating={Math.round(avgRating)} />
          <Text style={[styles.reviewCount, { color: colors.mutedForeground }]}>{reviews.length} review{reviews.length !== 1 ? "s" : ""}</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />
      ) : reviews.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="star" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No reviews yet</Text>
          <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>
            Reviews appear here after completing gigs, freelance work, or marketplace transactions
          </Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardTop}>
                <Text style={[styles.reviewerName, { color: colors.foreground }]}>{item.reviewerName}</Text>
                <Text style={[styles.time, { color: colors.mutedForeground }]}>{timeAgo(item.createdAt)}</Text>
              </View>
              <View style={styles.ratingRow}>
                <StarRow rating={item.rating} />
                <Text style={[styles.contextTag, { color: colors.primary, backgroundColor: colors.primary + "15" }]}>
                  {contextLabel(item.contextType)}
                </Text>
              </View>
              {item.description ? (
                <Text style={[styles.reviewText, { color: colors.foreground }]}>{item.description}</Text>
              ) : null}
            </View>
          )}
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
  summary: {
    flexDirection: "row", alignItems: "center", gap: 10, padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avgNum: { fontSize: 28, fontWeight: "800" },
  reviewCount: { fontSize: 13 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10, padding: 32 },
  emptyText: { fontSize: 17, fontWeight: "600" },
  emptySubText: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 6 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reviewerName: { fontSize: 14, fontWeight: "600" },
  time: { fontSize: 12 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  contextTag: { fontSize: 11, fontWeight: "700", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  reviewText: { fontSize: 14, lineHeight: 20 },
});
