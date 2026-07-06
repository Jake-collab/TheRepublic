import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, memo, useCallback } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CitizenVoteFeed from "@/components/CitizenVoteFeed";
import UpgradeModal from "@/components/UpgradeModal";
import WebViewPane from "@/components/WebViewPane";
import WebsiteTabBar from "@/components/WebsiteTabBar";
import { useBrowser } from "@/contexts/BrowserContext";
import { useColors } from "@/hooks/useColors";
import {
  useListWebsites,
  useGetUserMembership,
} from "@workspace/api-client-react";

interface HeaderProps {
  topPad: number;
  isCVTab: boolean;
  isFullscreen: boolean;
  setIsFullscreen: (v: boolean) => void;
}

const BrowserHeader = memo(function BrowserHeader({ topPad, isCVTab, isFullscreen, setIsFullscreen }: HeaderProps) {
  const colors = useColors();
  const router = useRouter();

  if (isFullscreen) return null;

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
          paddingTop: topPad,
        },
      ]}
    >
      <View style={styles.logoArea}>
        <View style={[styles.logoMark, { backgroundColor: colors.primary }]}>
          <Feather name="shield" size={14} color="#ffffff" />
        </View>
        <Text style={[styles.logoText, { color: colors.foreground }]}>
          Republic
        </Text>
      </View>
      <View style={styles.headerActions}>
        {!isCVTab && (
          <Pressable
            style={styles.iconBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsFullscreen(true);
            }}
          >
            <Feather name="maximize-2" size={18} color={colors.mutedForeground} />
          </Pressable>
        )}
        <Pressable
          style={[styles.profileBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
          onPress={() => router.push("/profile")}
        >
          <Feather name="user" size={16} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
});

export default function BrowserScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    visibleTabs,
    setTabs,
    activeTabId,
    isFullscreen,
    setIsFullscreen,
  } = useBrowser();

  const { data: websites } = useListWebsites({});
  const { data: membership } = useGetUserMembership();

  const isPro = (membership as any)?.tier === "pro";

  useEffect(() => {
    if (!websites) return;
    const siteTabs = (websites as any[]).map((w: any) => ({
      id: String(w.id),
      name: w.name,
      url: w.url,
      logoUrl: w.logoUrl,
      isFree: w.isFree,
    }));
    setTabs(siteTabs);
  }, [websites, setTabs]);

  const activeTab = useMemo(
    () => visibleTabs.find((t) => t.id === activeTabId),
    [visibleTabs, activeTabId],
  );
  const isCVTab = activeTab?.isCitizenVote === true;

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  // Only mount WebViewPanes for visible (non-hidden) website tabs
  const webviewTabs = useMemo(
    () => visibleTabs.filter((t) => !t.isCitizenVote),
    [visibleTabs],
  );

  const handleMinimize = useCallback(() => {
    Haptics.selectionAsync();
    setIsFullscreen(false);
  }, [setIsFullscreen]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <BrowserHeader
        topPad={topPad}
        isCVTab={isCVTab}
        isFullscreen={isFullscreen}
        setIsFullscreen={setIsFullscreen}
      />

      {!isFullscreen && <WebsiteTabBar isPro={isPro} />}

      {isFullscreen && (
        <Pressable
          style={[styles.minimizeBtn, { backgroundColor: colors.card, top: insets.top + 8 }]}
          onPress={handleMinimize}
        >
          <Feather name="minimize-2" size={18} color={colors.foreground} />
        </Pressable>
      )}

      <View style={styles.content}>
        {isCVTab ? (
          <CitizenVoteFeed />
        ) : (
          webviewTabs.map((tab) => (
            <WebViewPane
              key={tab.id}
              tabId={tab.id}
              url={tab.url}
              isVisible={activeTabId === tab.id}
            />
          ))
        )}
      </View>

      <UpgradeModal />
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
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logoArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoMark: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  content: { flex: 1 },
  minimizeBtn: {
    position: "absolute",
    right: 16,
    zIndex: 100,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});
