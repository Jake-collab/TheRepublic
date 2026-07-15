import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useCallback, memo, startTransition } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useBrowser, type WebsiteTab } from "@/contexts/BrowserContext";
import { useColors } from "@/hooks/useColors";
import { triggerTabPreload, prewarmConnection } from "@/utils/preloadRegistry";

interface Props {
  isPro: boolean;
}

interface TabPillProps {
  tab: WebsiteTab;
  isActive: boolean;
  isPro: boolean;
  customColor?: string;
  onPress: () => void;
  onPressIn: () => void;
}

const TabPill = memo(function TabPill({ tab, isActive, isPro, customColor, onPress, onPressIn }: TabPillProps) {
  const colors = useColors();
  const isLocked = !tab.isFree && !isPro && !tab.isCitizenVote;
  const activeColor = customColor ?? colors.primary;

  return (
    <Pressable
      onPressIn={onPressIn}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: isActive ? activeColor : colors.secondary,
          borderColor: isActive ? activeColor : colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      {tab.isCitizenVote ? (
        <Feather name="flag" size={13} color={isActive ? "#ffffff" : colors.primary} />
      ) : isLocked ? (
        <Feather name="lock" size={12} color={isActive ? "#ffffff" : colors.mutedForeground} />
      ) : null}
      <Text
        style={[
          styles.pillText,
          {
            color: isActive
              ? "#ffffff"
              : tab.isCitizenVote
                ? colors.primary
                : colors.foreground,
            fontWeight: isActive ? "600" : "400",
          },
        ]}
        numberOfLines={1}
      >
        {tab.name}
      </Text>
    </Pressable>
  );
});

export default function WebsiteTabBar({ isPro }: Props) {
  const colors = useColors();
  const {
    visibleTabs,
    activeTabId,
    setActiveTabId,
    setUpgradeModalVisible,
    setPendingProTabId,
    tabColors,
  } = useBrowser();
  const flatListRef = useRef<FlatList>(null);

  // Keep a mutable ref so renderItem can read the latest value without being
  // recreated on every tab switch. This is the key to preventing full FlatList re-renders.
  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;

  const isPropRef = useRef(isPro);
  isPropRef.current = isPro;

  const tabColorsRef = useRef(tabColors);
  tabColorsRef.current = tabColors;

  const handleTabPress = useCallback((tab: WebsiteTab) => {
    Haptics.selectionAsync();
    const isLocked = !tab.isFree && !isPropRef.current && !tab.isCitizenVote;
    if (isLocked) {
      setPendingProTabId(tab.id);
      setUpgradeModalVisible(true);
      return;
    }
    // startTransition: the active-tab visual update is non-urgent —
    // React can let the press animation complete first, then apply the layout change.
    startTransition(() => {
      setActiveTabId(tab.id);
      flatListRef.current?.scrollToIndex({
        index: visibleTabs.findIndex((t) => t.id === tab.id),
        animated: true,
        viewPosition: 0.3,
      });
    });
  }, [setPendingProTabId, setUpgradeModalVisible, setActiveTabId, visibleTabs]);

  const handleTabPressIn = useCallback((tab: WebsiteTab) => {
    if (!tab.isCitizenVote) {
      // Prime DNS + TCP connection before WebView opens (saves 100-500ms)
      prewarmConnection(tab.id);
      // Fire WebView load on finger-down — 100–200ms before onPress resolves
      triggerTabPreload(tab.id);
    }
  }, []);

  // Stable renderItem — does NOT capture activeTabId in its closure.
  // Reads from activeTabIdRef instead. extraData on FlatList triggers a
  // re-render pass; TabPill.memo then only re-renders the two pills whose
  // isActive prop actually changed. All other pills are skipped.
  const renderItem = useCallback(({ item }: { item: WebsiteTab }) => (
    <TabPill
      tab={item}
      isActive={item.id === activeTabIdRef.current}
      isPro={isPropRef.current}
      customColor={tabColorsRef.current[item.id]}
      onPress={() => handleTabPress(item)}
      onPressIn={() => handleTabPressIn(item)}
    />
  ), [handleTabPress, handleTabPressIn]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <FlatList
        ref={flatListRef}
        data={visibleTabs}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        onScrollToIndexFailed={noop}
        renderItem={renderItem}
        // extraData signals FlatList to re-evaluate renderItem when activeTabId changes,
        // while keeping the renderItem function itself stable (no recreation on every press).
        extraData={activeTabId}
      />
    </View>
  );
}

const keyExtractor = (item: WebsiteTab) => item.id;
const noop = () => {};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...(Platform.OS === "web" ? { zIndex: 10 } : {}),
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
    maxWidth: 120,
  },
});
