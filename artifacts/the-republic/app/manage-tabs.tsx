import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBrowser, type WebsiteTab } from "@/contexts/BrowserContext";
import { useColors } from "@/hooks/useColors";
import { useGetUserMembership } from "@workspace/api-client-react";

const TAB_COLORS = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#7c3aed",
  "#ea580c",
  "#0891b2",
  "#db2777",
  "#ca8a04",
  "#0f766e",
  "#1d4ed8",
];

export default function ManageTabsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: membership } = useGetUserMembership();
  const isPro = (membership as any)?.tier === "pro";

  const {
    tabs,
    tabOrder,
    hiddenTabIds,
    tabColors,
    toggleTabVisibility,
    setTabColor,
    moveTab,
  } = useBrowser();

  const MAX_VISIBLE_TABS = 10;

  const siteTabs = tabs.filter((t) => !t.isCitizenVote);
  const orderedTabs =
    tabOrder.length > 0
      ? [
          ...tabOrder
            .map((id) => siteTabs.find((t) => t.id === id))
            .filter(Boolean) as WebsiteTab[],
          ...siteTabs.filter((t) => !tabOrder.includes(t.id)),
        ]
      : siteTabs;

  const visibleCount = orderedTabs.filter((t) => !hiddenTabIds.includes(t.id)).length;

  const handleToggle = (id: string) => {
    const isCurrentlyHidden = hiddenTabIds.includes(id);
    if (isCurrentlyHidden && visibleCount >= MAX_VISIBLE_TABS) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        "Tab Limit Reached",
        `You can show up to ${MAX_VISIBLE_TABS} tabs at a time. Hide another tab first.`,
        [{ text: "OK" }]
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleTabVisibility(id);
  };

  const handleMove = (id: string, dir: "up" | "down") => {
    Haptics.selectionAsync();
    moveTab(id, dir);
  };

  const handleColorCycle = (id: string) => {
    if (!isPro) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const current = tabColors[id];
    const idx = current ? TAB_COLORS.indexOf(current) : -1;
    const next = TAB_COLORS[(idx + 1) % TAB_COLORS.length];
    setTabColor(id, next);
  };

  const renderItem = ({ item, index }: { item: WebsiteTab; index: number }) => {
    const isHidden = hiddenTabIds.includes(item.id);
    const customColor = tabColors[item.id];
    const initial = item.name[0]?.toUpperCase() ?? "?";

    return (
      <View
        style={[
          styles.row,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: isHidden ? 0.5 : 1,
          },
        ]}
      >
        <View style={[styles.avatar, { backgroundColor: customColor ?? colors.primary }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.siteName, { color: colors.foreground }]} numberOfLines={1}>
            {item.name}
          </Text>
          {!item.isFree && (
            <Text style={[styles.proTag, { color: colors.green }]}>Pro</Text>
          )}
        </View>

        {isPro && (
          <Pressable
            onPress={() => handleColorCycle(item.id)}
            style={[styles.colorDot, { backgroundColor: customColor ?? colors.primary }]}
            hitSlop={8}
          />
        )}

        <View style={styles.arrowCol}>
          <Pressable
            onPress={() => handleMove(item.id, "up")}
            hitSlop={6}
            style={styles.arrowBtn}
            disabled={index === 0}
          >
            <Feather name="chevron-up" size={16} color={index === 0 ? colors.border : colors.mutedForeground} />
          </Pressable>
          <Pressable
            onPress={() => handleMove(item.id, "down")}
            hitSlop={6}
            style={styles.arrowBtn}
            disabled={index === orderedTabs.length - 1}
          >
            <Feather
              name="chevron-down"
              size={16}
              color={index === orderedTabs.length - 1 ? colors.border : colors.mutedForeground}
            />
          </Pressable>
        </View>

        <Pressable onPress={() => handleToggle(item.id)} hitSlop={8}>
          <Feather
            name={isHidden ? "eye-off" : "eye"}
            size={18}
            color={isHidden ? colors.mutedForeground : colors.primary}
          />
        </Pressable>
      </View>
    );
  };

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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Manage Tabs{" "}
          <Text style={{ color: visibleCount >= MAX_VISIBLE_TABS ? colors.green : colors.mutedForeground, fontSize: 13 }}>
            ({visibleCount}/{MAX_VISIBLE_TABS})
          </Text>
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={[styles.info, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <Feather name="info" size={14} color={colors.mutedForeground} />
        <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
          Use ↑↓ to reorder • eye to show/hide • max {MAX_VISIBLE_TABS} visible
          {isPro ? " • tap color dot to change tab color" : ""}
        </Text>
      </View>

      <FlatList
        data={orderedTabs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No websites available yet</Text>
          </View>
        }
      />
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
  info: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 16,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  list: { paddingHorizontal: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#ffffff", fontSize: 14, fontWeight: "700" },
  siteName: { fontSize: 14, fontWeight: "500" },
  proTag: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
  },
  arrowCol: { gap: 0 },
  arrowBtn: { padding: 2 },
  centered: { paddingVertical: 40, alignItems: "center" },
  emptyText: { fontSize: 15 },
});
