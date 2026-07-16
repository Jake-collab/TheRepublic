/**
 * BrowserScreen — main tab browser with a 3-slot LRU WebView pool.
 *
 * Pool architecture (POOL_SIZE = 3):
 *   Slot 0 — active tab      (always rendered, full priority)
 *   Slot 1 — most-recently-used tab (preserved, hidden)
 *   Slot 2 — predicted next tab (loaded after active is visually ready)
 *
 * WebViewPanes outside the pool are NOT mounted. Evicted tabs save their
 * navigated URL; re-entry loads from that URL — WKWebView's HTTP cache
 * makes repeat visits nearly instant without keeping idle WebViews alive.
 *
 * No background tabs compete with the active tab for bandwidth or CPU.
 * The single predicted tab only starts after onLoadEnd fires on the active.
 */
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, {
  useEffect,
  useMemo,
  memo,
  useCallback,
  useState,
  useRef,
  startTransition,
} from "react";
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
import SplashOverlay from "@/components/SplashOverlay";
import TalksScreen from "@/components/TalksScreen";
import UpgradeModal from "@/components/UpgradeModal";
import WebViewPane from "@/components/WebViewPane";
import WebsiteTabBar from "@/components/WebsiteTabBar";
import { useBrowser } from "@/contexts/BrowserContext";
import { useColors } from "@/hooks/useColors";
import {
  useListWebsites,
  useGetUserMembership,
  useUpdateUserProfile,
} from "@workspace/api-client-react";

// ─── Pool size ────────────────────────────────────────────────────────────────
// 3 live WebViews: active + MRU + one predicted neighbor.
// Increase to 4 on high-memory devices if needed in the future.
const POOL_SIZE = 3;

// ─── Header ──────────────────────────────────────────────────────────────────

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
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
          paddingTop: topPad,
        },
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
          style={[
            styles.profileBtn,
            { backgroundColor: colors.secondary, borderColor: colors.border },
          ]}
          onPress={() => router.push("/profile")}
        >
          <Feather name="user" size={16} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
});

// ─── Main screen ─────────────────────────────────────────────────────────────

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
  const [showSplash, setShowSplash] = useState(true);

  // ── LRU pool ────────────────────────────────────────────────────────────
  // Only tabs in this array have a WebViewPane mounted.
  const [pool, setPool] = useState<string[]>([]);

  // Tracks whether the current active tab has finished its initial load.
  // Reset on every tab switch so the prediction only fires once per visit.
  const activeReadyRef = useRef(false);

  // Stable refs so WebView callbacks (which are captured closures) can
  // read the latest values without being listed as effect deps.
  const activeTabIdRef = useRef(activeTabId);
  useEffect(() => { activeTabIdRef.current = activeTabId; }, [activeTabId]);

  const webviewTabsRef = useRef<typeof webviewTabs>([]);

  // ── Data loading ─────────────────────────────────────────────────────────

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
    // No boot-time preloads — active tab gets exclusive bandwidth.
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

  // ── Tab list ─────────────────────────────────────────────────────────────

  const webviewTabs = useMemo(
    () => visibleTabs.filter((t) => !t.isCitizenVote),
    [visibleTabs],
  );

  // Keep ref in sync for stable callbacks
  useEffect(() => { webviewTabsRef.current = webviewTabs; }, [webviewTabs]);

  // ── Pool management ──────────────────────────────────────────────────────

  // Promote active tab to pool head on every tab switch.
  // Evicts the oldest non-active entry if pool is full.
  useEffect(() => {
    if (!activeTabId) return;
    activeReadyRef.current = false;
    setPool((prev) => {
      const without = prev.filter((id) => id !== activeTabId);
      return [activeTabId, ...without].slice(0, POOL_SIZE);
    });
  }, [activeTabId]);

  // Called by active WebViewPane's onPageReady (onLoadEnd).
  // Adds the right neighbor as a predicted tab — one background load at a time.
  const handleActivePageReady = useCallback(() => {
    if (activeReadyRef.current) return;
    activeReadyRef.current = true;

    // Dismiss splash as soon as real content is ready
    setShowSplash(false);

    // Predict: prefer right neighbor, fall back to left
    const tabs = webviewTabsRef.current;
    const idx = tabs.findIndex((t) => t.id === activeTabIdRef.current);
    const neighbor = tabs[idx + 1] ?? tabs[idx - 1];
    if (!neighbor) return;

    setPool((prev) => {
      if (prev.includes(neighbor.id)) return prev; // already pooled
      // Add neighbor at the end (lowest LRU priority).
      // Slice to POOL_SIZE, but active tab is always at index 0 so it's safe.
      return [...prev, neighbor.id].slice(0, POOL_SIZE);
    });
  }, []);

  // Fallback: dismiss splash after 1.5 s even if onLoadEnd never fires
  // (e.g. web/Expo Go where iframe onLoad timing is unreliable).
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1500);
    return () => clearTimeout(t);
  }, []);

  // ── UI helpers ───────────────────────────────────────────────────────────

  const topPad = Platform.OS === "web" ? 67 : insets.top;

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

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Web section — always mounted so pool WebViews stay alive */}
      <View
        style={[styles.section, webHidden && styles.sectionInvisible]}
        pointerEvents={webHidden ? "none" : "auto"}
      >
        <BrowserHeader
          topPad={topPad}
          isFullscreen={isFullscreen}
          setIsFullscreen={setIsFullscreen}
        />
        {!isFullscreen && <WebsiteTabBar isPro={isPro} />}

        {/* WebView pool — only pool members are mounted */}
        <View style={styles.content}>
          {webviewTabs
            .filter((tab) => pool.includes(tab.id))
            .map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <WebViewPane
                  key={tab.id}
                  tabId={tab.id}
                  url={tab.url}
                  initialUrl={getInitialUrlForTab(tab.id, tab.url)}
                  isVisible={isActive && !webHidden}
                  // Only wire onPageReady for the active tab so background
                  // loads don't accidentally trigger pool expansion.
                  onPageReady={isActive ? handleActivePageReady : undefined}
                />
              );
            })}

          {/* Minimize button — after WebViews in JSX so it paints on top */}
          {isFullscreen && (
            <Pressable
              style={[
                styles.minimizeBtn,
                { backgroundColor: colors.card, top: insets.top + 8 },
              ]}
              onPress={handleMinimize}
            >
              <Feather name="minimize-2" size={18} color={colors.foreground} />
            </Pressable>
          )}
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

      {/* Branded boot splash — dismissed as soon as active page is ready,
          or after 1.5 s fallback timer, whichever is first. */}
      {showSplash && <SplashOverlay onDone={() => setShowSplash(false)} />}
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
  logoMark: {
    width: 28,
    height: 28,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
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
