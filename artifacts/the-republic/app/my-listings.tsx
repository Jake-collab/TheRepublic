import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

type Listing = {
  id: number;
  title: string;
  priceCents: number;
  category: string;
  status: string;
  locationText: string | null;
  createdAt: string;
};

export default function MyListingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/marketplace/listings/my", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setListings(Array.isArray(data) ? data : []);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = (id: number, title: string) => {
    Alert.alert("Delete listing", `Remove "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          const token = await getToken();
          await fetch(`/api/marketplace/listings/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          load();
        },
      },
    ]);
  };

  const handleMarkSold = async (id: number) => {
    const token = await getToken();
    await fetch(`/api/marketplace/listings/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "sold" }),
    });
    load();
  };

  const statusColor = (s: string) =>
    s === "active" ? colors.primary : s === "sold" ? "#22c55e" : colors.mutedForeground;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border, paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.secondary }]}>
          <Feather name="chevron-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Items Listed</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />
      ) : listings.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="shopping-bag" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No listings yet</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardTop}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.statusPill, { color: statusColor(item.status) }]}>{item.status}</Text>
              </View>
              <Text style={[styles.price, { color: colors.primary }]}>
                ${(item.priceCents / 100).toFixed(2)}
              </Text>
              {item.locationText ? (
                <Text style={[styles.location, { color: colors.mutedForeground }]}>{item.locationText}</Text>
              ) : null}
              <View style={styles.actions}>
                {item.status === "active" && (
                  <Pressable
                    style={[styles.actionBtn, { borderColor: colors.border }]}
                    onPress={() => handleMarkSold(item.id)}
                  >
                    <Feather name="check-circle" size={14} color={colors.foreground} />
                    <Text style={[styles.actionText, { color: colors.foreground }]}>Mark as Sold</Text>
                  </Pressable>
                )}
                <Pressable
                  style={[styles.actionBtn, { borderColor: "#ef4444" }]}
                  onPress={() => handleDelete(item.id, item.title)}
                >
                  <Feather name="trash-2" size={14} color="#ef4444" />
                  <Text style={[styles.actionText, { color: "#ef4444" }]}>Delete</Text>
                </Pressable>
              </View>
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
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  emptyText: { fontSize: 15 },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 4 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 15, fontWeight: "600", flex: 1, marginRight: 8 },
  statusPill: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  price: { fontSize: 16, fontWeight: "700" },
  location: { fontSize: 12 },
  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1,
  },
  actionText: { fontSize: 13, fontWeight: "500" },
});
