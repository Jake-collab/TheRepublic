import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCreateCheckoutSession, useGetMembershipPricing } from "@workspace/api-client-react";
import { useBrowser } from "@/contexts/BrowserContext";
import { useColors } from "@/hooks/useColors";

const PRO_FEATURES = [
  { icon: "globe" as const, text: "Unlimited website tabs" },
  { icon: "star" as const, text: "Access all 50+ curated sites" },
  { icon: "sliders" as const, text: "Custom tab colors & reorder" },
  { icon: "flag" as const, text: "Citizen Vote — create posts" },
  { icon: "zap" as const, text: "Priority support" },
];

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function UpgradeModal() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { upgradeModalVisible, setUpgradeModalVisible } = useBrowser();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("monthly");
  const [isLoading, setIsLoading] = useState(false);

  const { data: pricing } = useGetMembershipPricing();
  const { mutateAsync: createCheckout } = useCreateCheckoutSession();

  const monthlyPrice = pricing ? formatCents(pricing.monthlyPriceCents) : "$2.99";
  const annualPrice = pricing ? formatCents(pricing.annualPriceCents) : "$20.00";
  const monthlyPerMonth = pricing ? formatCents(Math.round(pricing.annualPriceCents / 12)) : "$1.67";

  const handleUpgrade = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    try {
      const result = await createCheckout({ data: { plan: selectedPlan } });
      if (result.url) {
        setUpgradeModalVisible(false);
        await WebBrowser.openBrowserAsync(result.url);
      }
    } catch {
      Alert.alert("Error", "Could not start checkout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={upgradeModalVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setUpgradeModalVisible(false)}
    >
      <Pressable
        style={styles.backdrop}
        onPress={() => setUpgradeModalVisible(false)}
      />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.card,
            paddingBottom: insets.bottom + 20,
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.muted }]} />
        <View style={styles.crown}>
          <Text style={styles.crownEmoji}>⚜️</Text>
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Go Republic Pro
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Unlock the full curated web experience
        </Text>

        <View style={styles.features}>
          {PRO_FEATURES.map(({ icon, text }) => (
            <View key={text} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: colors.secondary }]}>
                <Feather name={icon} size={16} color={colors.primary} />
              </View>
              <Text style={[styles.featureText, { color: colors.foreground }]}>
                {text}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.planRow}>
          <Pressable
            style={[
              styles.planOption,
              { borderColor: selectedPlan === "monthly" ? colors.primary : colors.border, backgroundColor: colors.secondary },
            ]}
            onPress={() => setSelectedPlan("monthly")}
          >
            <Text style={[styles.planLabel, { color: colors.foreground }]}>Monthly</Text>
            <Text style={[styles.planPrice, { color: colors.primary }]}>{monthlyPrice}</Text>
            <Text style={[styles.planSub, { color: colors.mutedForeground }]}>/ month</Text>
          </Pressable>

          <Pressable
            style={[
              styles.planOption,
              { borderColor: selectedPlan === "annual" ? colors.primary : colors.border, backgroundColor: colors.secondary },
            ]}
            onPress={() => setSelectedPlan("annual")}
          >
            <View style={[styles.saveBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.saveBadgeText, { color: colors.primaryForeground }]}>Save 44%</Text>
            </View>
            <Text style={[styles.planLabel, { color: colors.foreground }]}>Annual</Text>
            <Text style={[styles.planPrice, { color: colors.primary }]}>{annualPrice}</Text>
            <Text style={[styles.planSub, { color: colors.mutedForeground }]}>{monthlyPerMonth}/mo</Text>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.upgradeBtn,
            { backgroundColor: colors.primary, opacity: pressed || isLoading ? 0.85 : 1 },
          ]}
          onPress={handleUpgrade}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.upgradeText, { color: colors.primaryForeground }]}>
              Upgrade to Pro
            </Text>
          )}
        </Pressable>
        <Pressable onPress={() => setUpgradeModalVisible(false)} style={styles.dismissBtn}>
          <Text style={[styles.dismissText, { color: colors.mutedForeground }]}>
            Not now
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  crown: { alignItems: "center" },
  crownEmoji: { fontSize: 36 },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 4,
  },
  features: { gap: 8 },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  featureText: { fontSize: 14, flex: 1 },
  planRow: {
    flexDirection: "row",
    gap: 12,
    marginVertical: 4,
  },
  planOption: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 2,
    position: "relative",
  },
  saveBadge: {
    position: "absolute",
    top: -10,
    right: 8,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  saveBadgeText: { fontSize: 10, fontWeight: "700" },
  planLabel: { fontSize: 12, fontWeight: "600" },
  planPrice: { fontSize: 22, fontWeight: "700" },
  planSub: { fontSize: 11 },
  upgradeBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  upgradeText: { fontSize: 16, fontWeight: "700" },
  dismissBtn: { alignItems: "center", paddingVertical: 8 },
  dismissText: { fontSize: 14 },
});
