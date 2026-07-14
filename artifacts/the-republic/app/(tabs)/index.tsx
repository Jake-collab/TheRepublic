import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, memo, useCallback, useState, startTransition } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import BottomNav, { type Section } from "@/components/BottomNav";
import TalksScreen from "@/components/TalksScreen";
import UpgradeModal from "@/components/UpgradeModal";
import WebViewPane from "@/components/WebViewPane";
import WebsiteTabBar from "@/components/WebsiteTabBar";
import { useBrowser } from "@/contexts/BrowserContext";
import { useColors } from "@/hooks/useColors";
import { triggerTabPreload } from "@/utils/preloadRegistry";
import {
  useListWebsites,
  useGetUserMembership,
  useUpdateUserProfile,
} from "@workspace/api-client-react";

const BrowserHeader = memo(function BrowserHeader({
  topPad,
  isFullscreen,
  setIsFullscreen,
}: {
  topPad: number;
  isFullscreen: boolean;
  setIsFullscreen: (v: boolean) => void;
}) {
  const colors = useColors();
  const router = useRouter();
  if (isFullscreen) return null;
  return (
    <View
      style={[
        styles.header,
        { backgroundColor: colors.background, borderBottomColor: colors.border, paddingTop: topPad },
      ]}
    >
      <View style={styles.logoArea}>
        <View style={[styles.logoMark, { backgroundColor: "#ffffff" }]}>
          <Image
            source={require("../../assets/images/republic-logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <Text style={[styles.logoText, { color: colors.foreground }]}>Republic</Text>
      </View>
      <View style={styles.headerActions}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsFullscreen(true);
          }}
        >
          <Feather name="maximize-2" size={18} color={colors.mutedForeground} />
        </Pressable>
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
    getInitialUrlForTab,
  } = useBrowser();

  const [activeSection, setActiveSection] = useState<Section>("web");
  const [showTalks, setShowTalks] = useState(false);

  const { data: websites } = useListWebsites({});
  const { data: membership } = useGetUserMembership();
  const updateProfile = useUpdateUserProfile();

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
    AsyncStorage.setItem("rq:websites", JSON.stringify(websites));
  }, [websites, setTabs]);

  useEffect(() => {
    if (membership) AsyncStorage.setItem("rq:membership", JSON.stringify(membership));
  }, [membership]);

  useEffect(() => {
    AsyncStorage.getItem("pending_username").then((username) => {
      if (!username) return;
      updateProfile.mutate(
        { data: { displayName: username } },
        { onSettled: () => AsyncStorage.removeItem("pending_username") },
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const webviewTabs = useMemo(() => visibleTabs.filter((t) => !t.isCitizenVote), [visibleTabs]);

  const activeIndex = useMemo(
    () => webviewTabs.findIndex((t) => t.id === activeTabId),
    [webviewTabs, activeTabId],
  );

  // Preload the next tab 2.5s after switching so it warms up invisibly
  useEffect(() => {
    const nextTab = webviewTabs[activeIndex + 1];
    if (!nextTab) return;
    const timer = setTimeout(() => triggerTabPreload(nextTab.id), 2500);
    return () => clearTimeout(timer);
  }, [activeIndex, webviewTabs]);

  const handleMinimize = useCallback(() => {
    Haptics.selectionAsync();
    setIsFullscreen(false);
  }, [setIsFullscreen]);

  const handleSectionChange = useCallback((section: Section) => {
    startTransition(() => {
      setActiveSection(section);
      if (section === "talks") setShowTalks(true);
    });
  }, []);

  const webHidden = activeSection !== "web";
  const talksHidden = activeSection !== "talks";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Web section — always mounted so WebViews stay alive */}
      <View
        style={[styles.section, webHidden && styles.sectionInvisible]}
        pointerEvents={webHidden ? "none" : "auto"}
      >
        <BrowserHeader topPad={topPad} isFullscreen={isFullscreen} setIsFullscreen={setIsFullscreen} />
        {!isFullscreen && <WebsiteTabBar isPro={isPro} />}
        {isFullscreen && (
          <Pressable
            style={[styles.minimizeBtn, { backgroundColor: colors.card, top: insets.top + 8 }]}
            onPress={handleMinimize}
          >
            <Feather name="minimize-2" size={18} color={colors.foreground} />
          </Pressable>
        )}
        {/* content is the stacking context — all WebViewPanes are position:absolute inside */}
        <View style={styles.content}>
          {webviewTabs.map((tab) => (
            <WebViewPane
              key={tab.id}
              tabId={tab.id}
              url={tab.url}
              initialUrl={getInitialUrlForTab(tab.id, tab.url)}
              isVisible={activeTabId === tab.id && !webHidden}
            />
          ))}
        </View>
        <UpgradeModal />
      </View>

      {/* Talks section — lazy mounted on first switch */}
      {showTalks && (
        <View
          style={[styles.sectionOverlay, talksHidden && styles.sectionInvisible]}
          pointerEvents={talksHidden ? "none" : "auto"}
        >
          <TalksScreen />
        </View>
      )}

      {!isFullscreen && (
        <BottomNav activeSection={activeSection} onChange={handleSectionChange} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { flex: 1 },
  sectionOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  sectionInvisible: { opacity: 0 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logoArea: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoMark: { width: 28, height: 28, borderRadius: 7, justifyContent: "center", alignItems: "center", overflow: "hidden" },
  logoImage: { width: 22, height: 22 },
  logoText: { fontSize: 15, fontWeight: "700", letterSpacing: 0.5 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  // flex:1 so absolute-fill children naturally cover it
  content: { flex: 1, overflow: "hidden" },
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
