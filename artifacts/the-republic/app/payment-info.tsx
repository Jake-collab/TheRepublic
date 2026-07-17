import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useCreatePortalSession, useGetUserMembership } from "@workspace/api-client-react";

export default function PaymentInfoScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { mutateAsync: createPortal } = useCreatePortalSession();
  const { data: membership } = useGetUserMembership();
  const [loading, setLoading] = useState(false);

  const isPro = membership?.plan !== "free" && (membership as any)?.status === "active";

  const handleManagePayment = async () => {
    setLoading(true);
    try {
      const result = await createPortal();
      if (result.url) await WebBrowser.openBrowserAsync(result.url);
    } catch {
      Alert.alert(
        "Not Available",
        "Payment management is not yet configured. Please contact support if you need assistance.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.background, borderBottomColor: colors.border, paddingTop: topPad + 8 },
        ]}
      >
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.secondary }]}>
          <Feather name="chevron-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Payment Information</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.body}>
        {/* Current plan card */}
        <View style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.planIconWrap, { backgroundColor: isPro ? "#16a34a20" : colors.secondary }]}>
            <Feather
              name={isPro ? "star" : "user"}
              size={24}
              color={isPro ? "#16a34a" : colors.mutedForeground}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.planLabel, { color: colors.mutedForeground }]}>Current Plan</Text>
            <Text style={[styles.planName, { color: colors.foreground }]}>
              {isPro ? "Pro Member" : "Free Tier"}
            </Text>
          </View>
          {isPro && (
            <View style={[styles.activeBadge, { backgroundColor: "#16a34a20" }]}>
              <Text style={[styles.activeBadgeText, { color: "#16a34a" }]}>Active</Text>
            </View>
          )}
        </View>

        {/* Manage via Stripe */}
        <View style={[styles.infoCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="credit-card" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoTitle, { color: colors.foreground }]}>
              {isPro ? "Manage Subscription & Payment Methods" : "Payment Methods"}
            </Text>
            <Text style={[styles.infoSub, { color: colors.mutedForeground }]}>
              {isPro
                ? "Update your card, change your plan, or cancel your subscription through the secure Stripe portal."
                : "Payment methods are managed via the secure Stripe portal after subscribing to a plan."}
            </Text>
          </View>
        </View>

        <Pressable
          style={[styles.portalBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
          onPress={handleManagePayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="external-link" size={16} color="#fff" />
              <Text style={styles.portalBtnText}>
                {isPro ? "Open Stripe Portal" : "Manage via Stripe"}
              </Text>
            </>
          )}
        </Pressable>

        <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
          Payment information is securely managed by Stripe. The Republic never stores your card details.
        </Text>

        {/* Feature list */}
        <View style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.featureTitle, { color: colors.foreground }]}>What's included in Pro</Text>
          {[
            "Unlock all 26+ curated sites",
            "Tab customization & reordering",
            "Worker fee waived on gigs & freelance",
            "Priority support",
          ].map((f) => (
            <View key={f} style={styles.featureRow}>
              <Feather name="check" size={14} color="#16a34a" />
              <Text style={[styles.featureText, { color: colors.foreground }]}>{f}</Text>
            </View>
          ))}
        </View>
      </View>
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
  headerTitle: { fontSize: 17, fontWeight: "700" },

  body: { flex: 1, padding: 20, gap: 16 },

  planCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  planIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  planLabel: { fontSize: 12, fontWeight: "500" },
  planName: { fontSize: 16, fontWeight: "700" },
  activeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  activeBadgeText: { fontSize: 12, fontWeight: "600" },

  infoCard: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  infoTitle: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  infoSub: { fontSize: 13, lineHeight: 18 },

  portalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  portalBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  disclaimer: { fontSize: 12, textAlign: "center", lineHeight: 17 },

  featureCard: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 10 },
  featureTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureText: { fontSize: 14 },
});
