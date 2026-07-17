import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export default function PaymentInfoScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border, paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.secondary }]}>
          <Feather name="chevron-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Payment Information</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.empty}>
        <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
          <Feather name="credit-card" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No payment method added</Text>
        <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>
          Add a payment method to pay for services, gigs, and freelance work on The Republic.
        </Text>
        <Pressable style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.addBtnText}>Add Payment Method</Text>
        </Pressable>
      </View>
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
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 14, padding: 32 },
  iconWrap: { width: 72, height: 72, borderRadius: 24, justifyContent: "center", alignItems: "center" },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptySubText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, marginTop: 4,
  },
  addBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
