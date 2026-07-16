/**
 * UpgradeModal — two-tier upgrade sheet.
 *
 * Web tier  ($2.99/mo) — unlocks the curated Web section.
 * Pro tier  ($4.99/mo) — waives 5% worker fee + everything in Web.
 */
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCreateCheckoutSession, useGetMembershipPricing } from "@workspace/api-client-react";
import { useBrowser } from "@/contexts/BrowserContext";
import { useColors } from "@/hooks/useColors";

type Tier = "web" | "pro";

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

const WEB_FEATURES = [
  { icon: "globe" as const,    text: "Full curated Web section (10+ sites)" },
  { icon: "bookmark" as const, text: "All free content & Citizen Vote" },
];

const PRO_FEATURES = [
  { icon: "star"    as const, text: "Everything in Web" },
  { icon: "globe"   as const, text: "All 27+ curated sites unlocked" },
  { icon: "percent" as const, text: "Worker fee waived (save 5% on every gig payout)" },
  { icon: "zap"     as const, text: "Priority support" },
];

export default function UpgradeModal() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { upgradeModalVisible, setUpgradeModalVisible } = useBrowser();
  const [selected, setSelected]   = useState<Tier>("pro");
  const [isLoading, setIsLoading] = useState(false);

  const { data: pricing }          = useGetMembershipPricing();
  const { mutateAsync: checkout }  = useCreateCheckoutSession();

  const webPrice = pricing ? fmt(pricing.webMonthlyCents) : "$2.99";
  const proPrice = pricing ? fmt(pricing.proMonthlyCents) : "$4.99";

  const handleUpgrade = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    try {
      const result = await checkout({ data: { tier: selected } });
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
      <Pressable style={styles.backdrop} onPress={() => setUpgradeModalVisible(false)} />

      <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 }]}>
        <View style={[styles.handle, { backgroundColor: colors.muted }]} />

        <View style={styles.crown}>
          <Text style={styles.crownEmoji}>⚜️</Text>
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>Choose Your Plan</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Unlock the full Republic experience
        </Text>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
          {/* ── Web tier card ── */}
          <Pressable
            style={[
              styles.tierCard,
              {
                backgroundColor: selected === "web" ? colors.primary + "12" : colors.secondary,
                borderColor:     selected === "web" ? colors.primary : colors.border,
              },
            ]}
            onPress={() => { Haptics.selectionAsync(); setSelected("web"); }}
          >
            <View style={styles.tierHeader}>
              <View style={styles.tierTitleRow}>
                <Text style={[styles.tierName, { color: colors.foreground }]}>Web</Text>
                <View style={[styles.tierBadge, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <Text style={[styles.tierBadgeText, { color: colors.mutedForeground }]}>BASIC</Text>
                </View>
              </View>
              <View style={styles.tierPriceRow}>
                <Text style={[styles.tierPrice, { color: colors.primary }]}>{webPrice}</Text>
                <Text style={[styles.tierPriceSuffix, { color: colors.mutedForeground }]}>/mo</Text>
              </View>
            </View>

            <View style={styles.featureList}>
              {WEB_FEATURES.map(({ icon, text }) => (
                <View key={text} style={styles.featureRow}>
                  <Feather name={icon} size={14} color={colors.mutedForeground} />
                  <Text style={[styles.featureText, { color: colors.foreground }]}>{text}</Text>
                </View>
              ))}
            </View>

            {selected === "web" && (
              <View style={[styles.selectedIndicator, { backgroundColor: colors.primary }]}>
                <Feather name="check" size={12} color="#fff" />
              </View>
            )}
          </Pressable>

          {/* ── Pro tier card ── */}
          <Pressable
            style={[
              styles.tierCard,
              {
                backgroundColor: selected === "pro" ? colors.primary + "12" : colors.secondary,
                borderColor:     selected === "pro" ? colors.primary : colors.border,
              },
            ]}
            onPress={() => { Haptics.selectionAsync(); setSelected("pro"); }}
          >
            {/* Best value badge */}
            <View style={[styles.bestValueBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.bestValueText, { color: colors.primaryForeground }]}>BEST VALUE</Text>
            </View>

            <View style={styles.tierHeader}>
              <View style={styles.tierTitleRow}>
                <Text style={[styles.tierName, { color: colors.foreground }]}>Pro</Text>
              </View>
              <View style={styles.tierPriceRow}>
                <Text style={[styles.tierPrice, { color: colors.primary }]}>{proPrice}</Text>
                <Text style={[styles.tierPriceSuffix, { color: colors.mutedForeground }]}>/mo</Text>
              </View>
            </View>

            <View style={styles.featureList}>
              {PRO_FEATURES.map(({ icon, text }) => (
                <View key={text} style={styles.featureRow}>
                  <Feather name={icon} size={14} color={colors.primary} />
                  <Text style={[styles.featureText, { color: colors.foreground }]}>{text}</Text>
                </View>
              ))}
            </View>

            {selected === "pro" && (
              <View style={[styles.selectedIndicator, { backgroundColor: colors.primary }]}>
                <Feather name="check" size={12} color="#fff" />
              </View>
            )}
          </Pressable>
        </ScrollView>

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
              Upgrade to {selected === "pro" ? "Pro" : "Web"} — {selected === "pro" ? proPrice : webPrice}/mo
            </Text>
          )}
        </Pressable>

        <Pressable onPress={() => setUpgradeModalVisible(false)} style={styles.dismissBtn}>
          <Text style={[styles.dismissText, { color: colors.mutedForeground }]}>Not now</Text>
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
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    padding:              24,
    gap:                  12,
    maxHeight:            "85%",
  },
  handle: {
    width:      40,
    height:     4,
    borderRadius: 2,
    alignSelf:  "center",
    marginBottom: 8,
  },
  crown:     { alignItems: "center" },
  crownEmoji: { fontSize: 36 },
  title: {
    fontSize:   22,
    fontWeight: "700",
    textAlign:  "center",
  },
  subtitle: {
    fontSize:  14,
    textAlign: "center",
  },
  scroll: { flexGrow: 0 },

  // ── Tier cards ──────────────────────────────────────────────────────────────
  tierCard: {
    borderWidth:  2,
    borderRadius: 16,
    padding:      16,
    marginBottom: 12,
    position:     "relative",
    overflow:     "hidden",
  },
  tierHeader:   { gap: 4, marginBottom: 12 },
  tierTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tierName:     { fontSize: 18, fontWeight: "700" },
  tierBadge: {
    borderWidth:   1,
    borderRadius:  6,
    paddingHorizontal: 6,
    paddingVertical:   2,
  },
  tierBadgeText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  tierPriceRow:  { flexDirection: "row", alignItems: "baseline", gap: 2 },
  tierPrice:     { fontSize: 28, fontWeight: "800" },
  tierPriceSuffix: { fontSize: 13 },

  featureList:  { gap: 8 },
  featureRow:   { flexDirection: "row", alignItems: "center", gap: 10 },
  featureText:  { fontSize: 13, flex: 1 },

  bestValueBadge: {
    position:         "absolute",
    top:              12,
    right:            -1,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    paddingHorizontal: 10,
    paddingVertical:   4,
  },
  bestValueText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },

  selectedIndicator: {
    position:    "absolute",
    top:         12,
    left:        12,
    width:       22,
    height:      22,
    borderRadius: 11,
    alignItems:  "center",
    justifyContent: "center",
  },

  // ── CTA ─────────────────────────────────────────────────────────────────────
  upgradeBtn: {
    borderRadius:   14,
    paddingVertical: 15,
    alignItems:     "center",
  },
  upgradeText:  { fontSize: 16, fontWeight: "700" },
  dismissBtn:   { alignItems: "center", paddingVertical: 8 },
  dismissText:  { fontSize: 14 },
});
