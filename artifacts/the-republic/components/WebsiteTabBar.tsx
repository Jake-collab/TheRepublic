import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef } from "react";
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

interface Props {
  isPro: boolean;
}

interface TabPillProps {
  tab: WebsiteTab;
  isActive: boolean;
  isPro: boolean;
  customColor?: string;
  onPress: () => void;
}

function TabPill({ tab, isActive, isPro, customColor, onPress }: TabPillProps) {
  const colors = useColors();
  const isLocked = !tab.isFree && !isPro && !tab.isCitizenVote;
  const activeColor = customColor ?? colors.primary;

  return (
    <Pressable
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
        <Feather
          name="flag"
          size={13}
          color={isActive ? "#ffffff" : colors.primary}
        />
      ) : isLocked ? (
        <Feather
          name="lock"
          size={12}
          color={isActive ? "#ffffff" : colors.mutedForeground}
        />
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
}

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

  const handleTabPress = (tab: WebsiteTab) => {
    Haptics.selectionAsync();
    const isLocked = !tab.isFree && !isPro && !tab.isCitizenVote;
    if (isLocked) {
      setPendingProTabId(tab.id);
      setUpgradeModalVisible(true);
      return;
    }
    setActiveTabId(tab.id);
    const idx = visibleTabs.findIndex((t) => t.id === tab.id);
    if (idx >= 0) {
      flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.3 });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <FlatList
        ref={flatListRef}
        data={visibleTabs}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        onScrollToIndexFailed={() => {}}
        renderItem={({ item }) => (
          <TabPill
            tab={item}
            isActive={activeTabId === item.id}
            isPro={isPro}
            customColor={tabColors[item.id]}
            onPress={() => handleTabPress(item)}
          />
        )}
      />
    </View>
  );
}

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
