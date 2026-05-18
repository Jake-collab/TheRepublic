import { useAuth, useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useGetUserProfile, useGetUserMembership } from "@workspace/api-client-react";

function SettingRow({
  icon,
  label,
  value,
  onPress,
  destructive,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
      onPress={onPress}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon} size={16} color={destructive ? colors.destructive : colors.primary} />
      </View>
      <Text style={[styles.rowLabel, { color: destructive ? colors.destructive : colors.foreground }]}>
        {label}
      </Text>
      {!!value && (
        <View style={[styles.valueBadge, { backgroundColor: colors.primary }]}>
          <Text style={[styles.valueText, { color: colors.primaryForeground }]}>{value}</Text>
        </View>
      )}
      {!value && <Feather name="chevron-right" size={16} color={colors.mutedForeground} />}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();
  const { user } = useUser();
  const { data: membership, isLoading: membershipLoading } = useGetUserMembership();

  const tier = (membership as any)?.tier ?? "free";
  const isPro = tier === "pro";

  const topPad = Platform.OS === "web" ? 67 : insets.top;

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
          style={[styles.closeBtn, { backgroundColor: colors.secondary }]}
        >
          <Feather name="x" size={18} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        <View style={styles.avatarArea}>
          <View style={[styles.avatar, { backgroundColor: colors.secondary, borderColor: colors.primary }]}>
            <Text style={[styles.avatarInitial, { color: colors.primary }]}>
              {user?.firstName?.[0] ?? user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ?? "C"}
            </Text>
          </View>
          <Text style={[styles.name, { color: colors.foreground }]}>
            {user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "Citizen"}
          </Text>
          <Text style={[styles.email, { color: colors.mutedForeground }]}>
            {user?.emailAddresses?.[0]?.emailAddress ?? ""}
          </Text>
          {membershipLoading ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <View style={[styles.tierBadge, { backgroundColor: isPro ? colors.primary : colors.secondary, borderColor: isPro ? colors.primary : colors.border }]}>
              <Feather
                name={isPro ? "star" : "user"}
                size={12}
                color={isPro ? colors.primaryForeground : colors.mutedForeground}
              />
              <Text style={[styles.tierText, { color: isPro ? colors.primaryForeground : colors.mutedForeground }]}>
                {isPro ? "Pro Citizen" : "Free"}
              </Text>
            </View>
          )}
        </View>

        {!isPro && (
          <Pressable
            style={[styles.upgradeCard, { backgroundColor: colors.card, borderColor: colors.primary }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.back(); }}
          >
            <Feather name="star" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.upgradeTitle, { color: colors.foreground }]}>Upgrade to Pro</Text>
              <Text style={[styles.upgradeSub, { color: colors.mutedForeground }]}>
                Unlock all 50+ websites for $9.99/mo
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.primary} />
          </Pressable>
        )}

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Account</Text>
        <View style={[styles.section, { borderColor: colors.border }]}>
          <SettingRow icon="bell" label="Notifications" onPress={() => {}} />
          <SettingRow icon="help-circle" label="Support" onPress={() => {}} />
          <SettingRow icon="file-text" label="Terms & Privacy" onPress={() => {}} />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Membership</Text>
        <View style={[styles.section, { borderColor: colors.border }]}>
          {isPro ? (
            <SettingRow icon="credit-card" label="Manage Subscription" onPress={() => {}} />
          ) : (
            <SettingRow
              icon="star"
              label="Republic Pro"
              value="$9.99/mo"
              onPress={() => {}}
            />
          )}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.signOutBtn,
            { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await signOut();
            router.replace("/sign-in");
          }}
        >
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign out</Text>
        </Pressable>
      </ScrollView>
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
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  scrollContent: { padding: 20, gap: 8 },
  avatarArea: { alignItems: "center", gap: 8, paddingVertical: 16 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  avatarInitial: { fontSize: 32, fontWeight: "700" },
  name: { fontSize: 20, fontWeight: "700" },
  email: { fontSize: 14 },
  tierBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 4,
  },
  tierText: { fontSize: 13, fontWeight: "600" },
  upgradeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    marginVertical: 8,
  },
  upgradeTitle: { fontSize: 15, fontWeight: "600" },
  upgradeSub: { fontSize: 12, marginTop: 2 },
  sectionLabel: { fontSize: 12, fontWeight: "600", letterSpacing: 0.5, marginTop: 8 },
  section: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  rowLabel: { flex: 1, fontSize: 15 },
  valueBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  valueText: { fontSize: 12, fontWeight: "600" },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  signOutText: { fontSize: 15, fontWeight: "600" },
});
