/**
 * manage-talks-categories — lets users choose which Talks discussion
 * categories appear in their pill bar and in what order.
 *
 * Citizen Vote is always pinned at the front and cannot be hidden or moved.
 * All other categories from the API can be toggled on/off and reordered
 * with the ↑↓ arrows. Changes are written to AsyncStorage immediately via
 * TalksCategoryContext, so TalksScreen reflects them without a page reload.
 */
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTalksCategory } from "@/contexts/TalksCategoryContext";
import { useColors } from "@/hooks/useColors";
import { useListTalkCategories } from "@workspace/api-client-react";

type TalkCategory = {
  id: number;
  name: string;
  emoji: string;
  sortOrder: number;
  isActive: boolean;
};

export default function ManageTalkCategoriesScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const topPad  = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading } = useListTalkCategories();
  const { hiddenCatIds, catOrder, toggleCatVisibility, moveCat } =
    useTalksCategory();

  // Server categories, excluding the special "Citizen Vote" DB entry
  // (CV is always shown and handled separately as a hardcoded pill).
  const serverCats: TalkCategory[] = useMemo(
    () =>
      ((data as TalkCategory[]) ?? []).filter(
        (c) => c.isActive && c.name !== "Citizen Vote",
      ),
    [data],
  );

  const allIds = useMemo(() => serverCats.map((c) => c.id), [serverCats]);

  // Apply saved order, then append any new categories at the end.
  const orderedCats: TalkCategory[] = useMemo(() => {
    if (catOrder.length === 0) return serverCats;
    return [
      ...catOrder
        .map((id) => serverCats.find((c) => c.id === id))
        .filter(Boolean) as TalkCategory[],
      ...serverCats.filter((c) => !catOrder.includes(c.id)),
    ];
  }, [serverCats, catOrder]);

  const visibleCount = orderedCats.filter((c) => !hiddenCatIds.includes(c.id)).length;

  const handleToggle = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleCatVisibility(id);
  };

  const handleMove = (id: number, dir: "up" | "down") => {
    Haptics.selectionAsync();
    moveCat(id, dir, allIds);
  };

  // ── Row renderer ────────────────────────────────────────────────────────────

  const renderItem = ({
    item,
    index,
  }: {
    item: TalkCategory;
    index: number;
  }) => {
    const isHidden = hiddenCatIds.includes(item.id);

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
        {/* Emoji avatar */}
        <View style={[styles.emojiWrap, { backgroundColor: colors.secondary }]}>
          <Text style={styles.emoji}>{item.emoji}</Text>
        </View>

        {/* Name */}
        <Text
          style={[styles.catName, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {item.name}
        </Text>

        {/* Up / Down arrows */}
        <View style={styles.arrowCol}>
          <Pressable
            onPress={() => handleMove(item.id, "up")}
            hitSlop={6}
            style={styles.arrowBtn}
            disabled={index === 0}
          >
            <Feather
              name="chevron-up"
              size={16}
              color={index === 0 ? colors.border : colors.mutedForeground}
            />
          </Pressable>
          <Pressable
            onPress={() => handleMove(item.id, "down")}
            hitSlop={6}
            style={styles.arrowBtn}
            disabled={index === orderedCats.length - 1}
          >
            <Feather
              name="chevron-down"
              size={16}
              color={
                index === orderedCats.length - 1
                  ? colors.border
                  : colors.mutedForeground
              }
            />
          </Pressable>
        </View>

        {/* Eye toggle */}
        <Pressable onPress={() => handleToggle(item.id)} hitSlop={10}>
          <Feather
            name={isHidden ? "eye-off" : "eye"}
            size={19}
            color={isHidden ? colors.mutedForeground : colors.primary}
          />
        </Pressable>
      </View>
    );
  };

  // ── Pinned CV row (always first, non-interactive) ────────────────────────────

  const CVRow = (
    <View
      style={[
        styles.row,
        styles.pinnedRow,
        { backgroundColor: colors.secondary, borderColor: colors.border },
      ]}
    >
      <View style={[styles.emojiWrap, { backgroundColor: colors.card }]}>
        <Text style={styles.emoji}>🗳</Text>
      </View>
      <Text style={[styles.catName, { color: colors.foreground }]}>
        Citizen Vote
      </Text>
      <View style={styles.pinnedBadge}>
        <Feather name="lock" size={10} color={colors.mutedForeground} style={{ marginRight: 3 }} />
        <Text style={[styles.pinnedText, { color: colors.mutedForeground }]}>
          always shown
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
            paddingTop: topPad + 8,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={[styles.closeBtn, { backgroundColor: colors.secondary }]}
        >
          <Feather name="x" size={18} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Manage Discussions
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {visibleCount} of {orderedCats.length} showing
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Info bar ────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.info,
          { backgroundColor: colors.secondary, borderColor: colors.border },
        ]}
      >
        <Feather name="info" size={14} color={colors.mutedForeground} />
        <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
          Use ↑↓ to reorder · tap the eye to show/hide a category
        </Text>
      </View>

      {/* ── List ────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={orderedCats}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ListHeaderComponent={
            <>
              {CVRow}
              <View style={{ height: 8 }} />
              {orderedCats.length > 0 && (
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: colors.mutedForeground },
                  ]}
                >
                  DISCUSSION CATEGORIES
                </Text>
              )}
            </>
          }
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 32 },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyCenter}>
              <Feather
                name="message-circle"
                size={36}
                color={colors.mutedForeground}
              />
              <Text
                style={[styles.emptyText, { color: colors.mutedForeground }]}
              >
                No discussion categories yet
              </Text>
            </View>
          }
        />
      )}
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
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: { alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  headerSub: { fontSize: 12, marginTop: 2 },
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  pinnedRow: {
    borderStyle: "dashed",
  },
  emojiWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  emoji: { fontSize: 18 },
  catName: { fontSize: 15, fontWeight: "500", flex: 1 },
  arrowCol: { gap: 0 },
  arrowBtn: { padding: 2 },
  pinnedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pinnedText: { fontSize: 11, fontWeight: "500" },
  loadingCenter: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyCenter: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 12,
  },
  emptyText: { fontSize: 15 },
});
