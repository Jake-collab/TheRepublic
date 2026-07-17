import { useAuth, useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import * as WebBrowser from "expo-web-browser";
import { useColors } from "@/hooks/useColors";
import {
  useCreatePortalSession,
  useGetMembershipPricing,
  useGetUserMembership,
  useGetUserProfile,
  useListNotifications,
  useUpdateUserProfile,
} from "@workspace/api-client-react";

function SettingRow({
  icon,
  label,
  value,
  badge,
  onPress,
  destructive,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value?: string;
  badge?: number;
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
      {badge != null && badge > 0 && (
        <View style={[styles.badgePill, { backgroundColor: colors.primary }]}>
          <Text style={[styles.badgeText, { color: colors.primaryForeground }]}>{badge}</Text>
        </View>
      )}
      {!!value && (
        <View style={[styles.valueBadge, { backgroundColor: colors.primary }]}>
          <Text style={[styles.valueText, { color: colors.primaryForeground }]}>{value}</Text>
        </View>
      )}
      {!value && badge == null && (
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      )}
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
  const { data: profile } = useGetUserProfile();
  const { data: notifications } = useListNotifications();
  const { data: pricing } = useGetMembershipPricing();
  const updateProfile = useUpdateUserProfile();
  const { mutateAsync: createPortal } = useCreatePortalSession();

  const membershipPlan = membership?.plan ?? "free";
  const isPro = membershipPlan !== "free" && (membership as any)?.status === "active";
  const [portalLoading, setPortalLoading] = useState(false);

  const storedDisplayName = (profile as any)?.displayName ?? (membership as any)?.displayName ?? "";
  const storedAvatarUrl = (profile as any)?.avatarUrl ?? (membership as any)?.avatarUrl ?? "";

  const [editDisplayName, setEditDisplayName] = useState(
    storedDisplayName || user?.firstName || "",
  );
  const [editAvatarUrl, setEditAvatarUrl] = useState(storedAvatarUrl);
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [pickingPhoto, setPickingPhoto] = useState(false);

  const handleManageSubscription = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPortalLoading(true);
    try {
      const result = await createPortal();
      if (result.url) await WebBrowser.openBrowserAsync(result.url);
    } catch {
      Alert.alert("Error", "Could not open subscription portal. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  };

  const handlePickPhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPickingPhoto(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow photo library access to set a profile picture.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          const dataUri = `data:image/jpeg;base64,${asset.base64}`;
          setEditAvatarUrl(dataUri);
        } else if (asset.uri) {
          setEditAvatarUrl(asset.uri);
        }
      }
    } finally {
      setPickingPhoto(false);
    }
  };

  const handleSaveProfile = () => {
    if (!editDisplayName.trim()) {
      setUsernameError("Username cannot be empty.");
      return;
    }
    setUsernameError("");
    setSaving(true);
    updateProfile.mutate(
      {
        data: {
          displayName: editDisplayName.trim(),
          avatarUrl: editAvatarUrl || null,
        },
      },
      {
        onSuccess: () => {
          setSaving(false);
          Alert.alert("Saved", "Profile updated successfully.");
        },
        onError: (err: any) => {
          setSaving(false);
          const msg =
            err?.response?.data?.error ??
            err?.message ??
            "Could not save profile. Please try again.";
          if (msg.toLowerCase().includes("taken")) {
            setUsernameError("Username already taken. Choose a different one.");
          } else {
            Alert.alert("Error", msg);
          }
        },
      },
    );
  };

  const unreadCount = ((notifications as any[]) ?? []).filter((n: any) => !n.isRead).length;
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

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>
        {/* Avatar — tap to change photo */}
        <View style={styles.avatarArea}>
          <Pressable
            onPress={handlePickPhoto}
            disabled={pickingPhoto}
            style={styles.avatarWrapper}
          >
            {editAvatarUrl ? (
              <Image
                source={{ uri: editAvatarUrl }}
                style={[styles.avatar, { borderColor: colors.primary }]}
                onError={() => setEditAvatarUrl("")}
              />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.secondary, borderColor: colors.primary }]}>
                <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                  {(editDisplayName || user?.firstName || "C")[0]?.toUpperCase()}
                </Text>
              </View>
            )}
            <View style={[styles.cameraOverlay, { backgroundColor: colors.primary }]}>
              {pickingPhoto ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="camera" size={14} color="#fff" />
              )}
            </View>
          </Pressable>

          <Text style={[styles.name, { color: colors.foreground }]}>
            {editDisplayName || user?.firstName || "Citizen"}
          </Text>
          <Text style={[styles.email, { color: colors.mutedForeground }]}>
            {user?.emailAddresses?.[0]?.emailAddress ?? ""}
          </Text>
          {membershipLoading ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <View
              style={[
                styles.tierBadge,
                {
                  backgroundColor: isPro ? colors.green : colors.secondary,
                  borderColor: isPro ? colors.green : colors.border,
                },
              ]}
            >
              <Feather
                name={isPro ? "star" : "user"}
                size={12}
                color={isPro ? colors.greenForeground : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.tierText,
                  { color: isPro ? colors.greenForeground : colors.mutedForeground },
                ]}
              >
                {isPro ? "Pro Member" : "Free"}
              </Text>
            </View>
          )}
        </View>

        {/* Identity / Edit Profile */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Identity</Text>
        <View style={[styles.editCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.editRow}>
            <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>Username</Text>
            <TextInput
              style={[
                styles.editInput,
                { color: colors.foreground, borderColor: usernameError ? colors.destructive : colors.border },
              ]}
              value={editDisplayName}
              onChangeText={(t) => { setEditDisplayName(t); setUsernameError(""); }}
              placeholder="Choose a unique username"
              placeholderTextColor={colors.mutedForeground}
              maxLength={40}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
            />
            {!!usernameError && (
              <Text style={[styles.errorHint, { color: colors.destructive }]}>{usernameError}</Text>
            )}
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: colors.primary, opacity: pressed || saving ? 0.7 : 1 },
            ]}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save Profile</Text>
            )}
          </Pressable>
        </View>

        {!isPro && (
          <Pressable
            style={[styles.upgradeCard, { backgroundColor: colors.card, borderColor: colors.primary }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.back(); }}
          >
            <View style={[styles.upgradeIcon, { backgroundColor: colors.primary }]}>
              <Feather name="star" size={18} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.upgradeTitle, { color: colors.foreground }]}>Upgrade to Pro</Text>
              <Text style={[styles.upgradeSub, { color: colors.mutedForeground }]}>
                Unlock all 26+ Pro sites & tab customization
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.primary} />
          </Pressable>
        )}

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Browsing</Text>
        <View style={[styles.section, { borderColor: colors.border }]}>
          <SettingRow
            icon="sliders"
            label="Manage Tabs"
            onPress={() => router.push("/manage-tabs")}
          />
          <SettingRow
            icon="message-circle"
            label="Discussion Settings"
            onPress={() => router.push("/manage-talks-categories")}
          />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Marketplace</Text>
        <View style={[styles.section, { borderColor: colors.border }]}>
          <SettingRow icon="shopping-bag" label="Items Listed" onPress={() => {}} />
          <SettingRow icon="star" label="My Reviews" onPress={() => {}} />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Gigs</Text>
        <View style={[styles.section, { borderColor: colors.border }]}>
          <SettingRow icon="briefcase" label="My Posted Gigs" onPress={() => {}} />
          <SettingRow icon="check-square" label="My Applications" onPress={() => {}} />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Freelance</Text>
        <View style={[styles.section, { borderColor: colors.border }]}>
          <SettingRow icon="layers" label="My Projects" onPress={() => {}} />
          <SettingRow icon="send" label="My Bids" onPress={() => {}} />
          <SettingRow icon="award" label="Active Skill Posts" onPress={() => {}} />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Jobs</Text>
        <View style={[styles.section, { borderColor: colors.border }]}>
          <SettingRow icon="file-text" label="Resume" onPress={() => {}} />
          <SettingRow icon="inbox" label="Jobs Applied" onPress={() => {}} />
          <SettingRow icon="list" label="Jobs Listed" onPress={() => {}} />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Account</Text>
        <View style={[styles.section, { borderColor: colors.border }]}>
          <SettingRow
            icon="bell"
            label="Notifications"
            badge={unreadCount}
            onPress={() => router.push("/notifications")}
          />
          <SettingRow icon="message-square" label="Messages" onPress={() => {}} />
          <SettingRow icon="credit-card" label="Payment Method" onPress={() => {}} />
          <SettingRow
            icon="help-circle"
            label="Support"
            onPress={() => router.push("/support")}
          />
          <SettingRow icon="shield" label="Terms & Privacy" onPress={() => {}} />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Membership</Text>
        <View style={[styles.section, { borderColor: colors.border }]}>
          {membership?.tier === "free" ? (
            <SettingRow
              icon="star"
              label="Upgrade Plan"
              value={pricing ? `Web $${(pricing.webMonthlyCents / 100).toFixed(2)}/mo` : "from $2.99/mo"}
              onPress={() => router.back()}
            />
          ) : (
            <SettingRow
              icon="credit-card"
              label={portalLoading ? "Opening portal…" : "Manage Subscription"}
              onPress={handleManageSubscription}
            />
          )}
          <SettingRow
            icon="percent"
            label="Platform Charges"
            onPress={() => router.push("/platform-charges")}
          />
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
  avatarWrapper: { position: "relative" },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  avatarInitial: { fontSize: 34, fontWeight: "700" },
  cameraOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
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
  upgradeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
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
  badgePill: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
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
  editCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginBottom: 4,
  },
  editRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  editLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.3 },
  editInput: {
    fontSize: 15,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  errorHint: { fontSize: 12, marginTop: 2 },
  saveBtn: {
    margin: 12,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  saveBtnText: { color: "#ffffff", fontSize: 14, fontWeight: "700" },
});
