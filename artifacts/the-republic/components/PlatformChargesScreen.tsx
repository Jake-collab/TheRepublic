/**
 * PlatformChargesScreen — explains the platform fee model.
 *
 * • 1% consumer fee (capped at $20) on BuySell purchases.
 * • 5% worker fee on Gig/Freelance payouts — waived for Pro members.
 * • Stripe Connect Express for worker payouts.
 */
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUser } from "@clerk/expo";

import {
  useGetUserMembership,
  useGetMembershipPricing,
  useGetStripeConnectStatus,
  useStripeConnectOnboard,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useBrowser } from "@/contexts/BrowserContext";

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function FeeRow({
  icon,
  label,
  value,
  note,
  highlight,
}: {
  icon: "percent" | "shopping-cart" | "briefcase" | "zap" | "info";
  label: string;
  value: string;
  note?: string;
  highlight?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={[styles.feeRow, { borderColor: colors.border }]}>
      <View style={[styles.feeIconWrap, { backgroundColor: highlight ? colors.primary + "18" : colors.secondary }]}>
        <Feather name={icon} size={16} color={highlight ? colors.primary : colors.mutedForeground} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.feeLabel, { color: colors.foreground }]}>{label}</Text>
        {note ? <Text style={[styles.feeNote, { color: colors.mutedForeground }]}>{note}</Text> : null}
      </View>
      <Text style={[styles.feeValue, { color: highlight ? colors.primary : colors.foreground }]}>
        {value}
      </Text>
    </View>
  );
}

export default function PlatformChargesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useUser();
  const { setUpgradeModalVisible } = useBrowser();
  const [onboarding, setOnboarding] = useState(false);

  const { data: membership }    = useGetUserMembership();
  const { data: pricing }       = useGetMembershipPricing();
  const { data: connectStatus } = useGetStripeConnectStatus();
  const { mutateAsync: onboard } = useStripeConnectOnboard();

  const isPro   = membership?.tier === "pro";
  const webPrice = pricing ? fmt(pricing.webMonthlyCents) : "$2.99";
  const proPrice = pricing ? fmt(pricing.proMonthlyCents) : "$4.99";

  const handleOnboard = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setOnboarding(true);
    try {
      const result = await onboard();
      if (result.url) await WebBrowser.openBrowserAsync(result.url);
    } catch {
      Alert.alert("Error", "Could not start payout setup. Please try again.");
    } finally {
      setOnboarding(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text style={[styles.heading, { color: colors.foreground }]}>Platform Charges</Text>
      <Text style={[styles.intro, { color: colors.mutedForeground }]}>
        The Republic charges small fees to keep the platform running. Here's exactly what you pay.
      </Text>

      {/* ── Buyer fees ── */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>BUYER FEES</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <FeeRow
          icon="shopping-cart"
          label="BuySell marketplace"
          value="1%"
          note="Platform fee on each purchase · capped at $20"
        />
        <FeeRow
          icon="info"
          label="Max consumer fee"
          value="$20.00"
          note="No matter the purchase price"
        />
      </View>

      {/* ── Worker fees ── */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>WORKER FEES</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <FeeRow
          icon="briefcase"
          label="Gig payout fee"
          value={isPro ? "0% ✓" : "5%"}
          note={isPro ? "Waived — you're on Pro" : "Applied when you're paid for a gig"}
          highlight={isPro}
        />
        <FeeRow
          icon="briefcase"
          label="Freelance payout fee"
          value={isPro ? "0% ✓" : "5%"}
          note={isPro ? "Waived — you're on Pro" : "Applied on milestone payouts"}
          highlight={isPro}
        />
      </View>

      {/* ── Membership comparison ── */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>MEMBERSHIP TIERS</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <FeeRow
          icon="zap"
          label="Free"
          value="$0"
          note="10 curated sites · 1% buyer fee · 5% worker fee"
        />
        <FeeRow
          icon="zap"
          label="Web"
          value={`${webPrice}/mo`}
          note="Full curated Web section · same fees"
        />
        <FeeRow
          icon="zap"
          label="Pro"
          value={`${proPrice}/mo`}
          highlight
          note="All 27+ sites · worker fee waived · priority support"
        />
      </View>

      {/* ── Upgrade CTA ── */}
      {isSignedIn && !isPro && (
        <Pressable
          style={[styles.upgradeBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setUpgradeModalVisible(true);
          }}
        >
          <Feather name="star" size={16} color={colors.primaryForeground} />
          <Text style={[styles.upgradeBtnText, { color: colors.primaryForeground }]}>
            Upgrade to Pro — waive worker fees
          </Text>
        </Pressable>
      )}

      {/* ── Connect payouts ── */}
      {isSignedIn && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PAYOUT SETUP</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.connectRow}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.connectTitle, { color: colors.foreground }]}>
                  Stripe Connect
                </Text>
                <Text style={[styles.connectSub, { color: colors.mutedForeground }]}>
                  {connectStatus?.connected && connectStatus.payoutsEnabled
                    ? "Your payout account is active"
                    : connectStatus?.connected
                    ? "Account connected — complete onboarding to enable payouts"
                    : "Connect a bank account to receive gig & freelance payouts"}
                </Text>
              </View>
              {connectStatus?.connected && connectStatus.payoutsEnabled ? (
                <View style={[styles.connectedBadge, { backgroundColor: "#22c55e18", borderColor: "#22c55e44" }]}>
                  <Feather name="check-circle" size={14} color="#22c55e" />
                  <Text style={[styles.connectedText, { color: "#22c55e" }]}>Active</Text>
                </View>
              ) : (
                <Pressable
                  style={[styles.connectBtn, { backgroundColor: colors.primary, opacity: onboarding ? 0.7 : 1 }]}
                  onPress={handleOnboard}
                  disabled={onboarding}
                >
                  {onboarding ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.connectBtnText}>
                      {connectStatus?.connected ? "Continue" : "Set Up"}
                    </Text>
                  )}
                </Pressable>
              )}
            </View>
          </View>
        </>
      )}

      {/* Footer */}
      <Text style={[styles.footer, { color: colors.mutedForeground }]}>
        Fees are deducted automatically. You always see the breakdown before confirming a transaction.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { padding: 20, gap: 8 },
  heading:      { fontSize: 24, fontWeight: "700", marginBottom: 4 },
  intro:        { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginTop: 8, marginBottom: 4 },

  card: {
    borderWidth:  1,
    borderRadius: 16,
    overflow:     "hidden",
    marginBottom: 4,
  },

  feeRow: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            12,
    padding:        14,
    borderBottomWidth: 1,
  },
  feeIconWrap: {
    width:         36,
    height:        36,
    borderRadius:  10,
    alignItems:    "center",
    justifyContent: "center",
  },
  feeLabel:  { fontSize: 14, fontWeight: "600" },
  feeNote:   { fontSize: 12 },
  feeValue:  { fontSize: 15, fontWeight: "700", minWidth: 50, textAlign: "right" },

  upgradeBtn: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "center",
    gap:            8,
    borderRadius:   14,
    paddingVertical: 14,
    marginTop:      8,
    marginBottom:   4,
  },
  upgradeBtnText: { fontSize: 15, fontWeight: "700" },

  connectRow:  { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  connectTitle: { fontSize: 15, fontWeight: "600" },
  connectSub:   { fontSize: 12 },
  connectedBadge: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           4,
    borderWidth:   1,
    borderRadius:  20,
    paddingHorizontal: 10,
    paddingVertical:   5,
  },
  connectedText: { fontSize: 12, fontWeight: "600" },
  connectBtn: {
    borderRadius:   10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  connectBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  footer: { fontSize: 12, textAlign: "center", marginTop: 12, lineHeight: 18 },
});
