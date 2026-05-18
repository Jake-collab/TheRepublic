import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBrowser } from "@/contexts/BrowserContext";
import { useColors } from "@/hooks/useColors";

const PRO_FEATURES = [
  { icon: "globe" as const, text: "Unlimited website tabs" },
  { icon: "star" as const, text: "Access all 50+ curated sites" },
  { icon: "sliders" as const, text: "Custom tab colors & reorder" },
  { icon: "flag" as const, text: "Citizen Vote — create posts" },
  { icon: "zap" as const, text: "Priority support" },
];

export default function UpgradeModal() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { upgradeModalVisible, setUpgradeModalVisible } = useBrowser();

  const handleUpgrade = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setUpgradeModalVisible(false);
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
        <View style={[styles.priceBadge, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Text style={[styles.price, { color: colors.primary }]}>$9.99</Text>
          <Text style={[styles.pricePeriod, { color: colors.mutedForeground }]}>/ month</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.upgradeBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={handleUpgrade}
        >
          <Text style={[styles.upgradeText, { color: colors.primaryForeground }]}>
            Upgrade to Pro
          </Text>
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
    marginBottom: 8,
  },
  features: { gap: 10 },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  featureText: { fontSize: 14, flex: 1 },
  priceBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 4,
  },
  price: { fontSize: 28, fontWeight: "700" },
  pricePeriod: { fontSize: 14 },
  upgradeBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  upgradeText: { fontSize: 16, fontWeight: "700" },
  dismissBtn: { alignItems: "center", paddingVertical: 8 },
  dismissText: { fontSize: 14 },
});
