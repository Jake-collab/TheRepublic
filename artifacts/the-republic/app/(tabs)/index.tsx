/**
 * Root app screen.
 *
 * Navigation is handled by a slide-out left drawer (DrawerNav). The bottom
 * nav has been removed. Five sections are available:
 *
 *   Talks      — default section on launch (Chat feed)
 *   Buy/Sell   — marketplace
 *   Gigs/Work  — local in-person gig board
 *   Freelance  — online remote freelance
 *   Web        — curated WebView browser (requires $2.99+ membership)
 *
 * Each section mounts lazily on first visit and stays alive thereafter.
 * The WebView LRU pool (POOL_SIZE = 3) lives here and feeds the Web section.
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

import DrawerNav, { type AppSection } from "@/components/DrawerNav";
import SplashOverlay from "@/components/SplashOverlay";
import TalksScreen from "@/components/TalksScreen";
import BuySellScreen from "@/components/BuySellScreen";
import GigsScreen from "@/components/GigsScreen";
import FreelanceScreen from "@/components/FreelanceScreen";
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
const POOL_SIZE = 3;

// ─── Web section sub-components ───────────────────────────────────────────────

/** Header shown inside the Web browser section. */
const WebHeader = memo(function WebHeader({
  topPad,
  isFullscreen,
  onOpenDrawer,
  onMinimize,
}: {
  topPad: number;
  isFullscreen: boolean;
  onOpenDrawer: () => void;
  onMinimize: () => void;
}) {
  const colors = useColors();
  const router = useRouter();
  if (isFullscreen) return null;
  return (
    <View
      style={[
        styles.webHeader,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
          paddingTop: topPad,
        },
      ]}
    >
      <Pressable onPress={onOpenDrawer} style={styles.hamburger} hitSlop={10}>
        <Feather name="menu" size={22} color={colors.foreground} />
      </Pressable>
      <View style={styles.webLogoRow}>
        <View style={[styles.webLogoMark, { backgroundColor: "#ffffff" }]}>
          <Image
            source={require("../../assets/images/republic-logo.png")}
            style={styles.webLogoImg}
            resizeMode="contain"
          />
        </View>
        <Text style={[styles.webLogoText, { color: colors.foreground }]}>Web</Text>
      </View>
      <View style={styles.webHeaderRight}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onMinimize();
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

/** Shown to non-members who open the Web section. */
const WebMembershipGate = memo(function WebMembershipGate({
  topPad,
  onOpenDrawer,
}: {
  topPad: number;
  onOpenDrawer: () => void;
}) {
  const colors = useColors();
  const router = useRouter();
  const UNLOCKS = [
    "Stock & crypto investing exchanges",
    "Rental platforms (Airbnb, Vrbo, Expedia)",
    "Ticket services (SeatGeek, StubHub, Ticketmaster)",
    "Retail stores (Walmart, Amazon, Target)",
    "Streaming (Netflix, YouTube)",
    "And 20+ more curated sites",
  ];
  return (
    <View style={[styles.gateContainer, { backgroundColor: colors.background }]}>
      {/* Mini header */}
      <View style={[styles.gateHeader, { paddingTop: topPad }]}>
        <Pressable onPress={onOpenDrawer} style={styles.hamburger} hitSlop={10}>
          <Feather name="menu" size={22} color={colors.foreground} />
        </Pressable>
      </View>

      <View style={styles.gateContent}>
        <View style={[styles.gateLockIcon, { backgroundColor: colors.secondary }]}>
          <Feather name="globe" size={40} color={colors.primary} />
        </View>
        <Text style={[styles.gateTitle, { color: colors.foreground }]}>Republic Web</Text>
        <Text style={[styles.gateSub, { color: colors.mutedForeground }]}>
          Curated access to the best sites on the internet — all in one place.
        </Text>

        <View style={[styles.gateUnlockList, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {UNLOCKS.map((item, i) => (
            <View key={i} style={styles.gateUnlockRow}>
              <Feather name="check-circle" size={14} color={colors.primary} />
              <Text style={[styles.gateUnlockText, { color: colors.foreground }]}>{item}</Text>
            </View>
          ))}
        </View>

        <Pressable
          style={[styles.gateCtaBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/profile")}
        >
          <Feather name="unlock" size={16} color="#ffffff" />
          <Text style={styles.gateCtaText}>Unlock for $2.99/mo</Text>
        </Pressable>
        <Text style={[styles.gateFineprint, { color: colors.mutedForeground }]}>
          Includes $4.99 worker plan · cancel any time
        </Text>
      </View>
    </View>
  );
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BrowserScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    visibleTabs,
    setTabs,
    activeTabId,
    isFullscreen,
    setIsFullscreen,
    getInitialUrlForTab,
  } = useBrowser();

  // ── Navigation state ────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<AppSection>("talks");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Lazy-mount: each section stays in the React tree after first visit
  // so its state (scroll position, data cache) is preserved on return.
  const [mountedSections, setMountedSections] = useState<Set<AppSection>>(
    () => new Set<AppSection>(["talks"]),
  );

  useEffect(() => {
    setMountedSections((prev) => {
      if (prev.has(activeSection)) return prev;
      return new Set([...prev, activeSection]);
    });
  }, [activeSection]);

  const openDrawer = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDrawerOpen(true);
  }, []);

  const handleSectionSelect = useCallback((section: AppSection) => {
    startTransition(() => setActiveSection(section));
  }, []);

  // ── Boot splash ──────────────────────────────────────────────────────────
  const [showSplash, setShowSplash] = useState(true);

  // Fallback: always dismiss after 1.5s (Web WebView fires onLoadEnd
  // separately; for Talks / other sections this timer is the trigger)
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1500);
    return () => clearTimeout(t);
  }, []);

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

  // ── WebView pool (feeds Web section) ────────────────────────────────────
  const [pool, setPool] = useState<string[]>([]);
  const activeReadyRef = useRef(false);
  const activeTabIdRef = useRef(activeTabId);
  useEffect(() => { activeTabIdRef.current = activeTabId; }, [activeTabId]);

  const webviewTabs = useMemo(
    () => visibleTabs.filter((t) => !t.isCitizenVote),
    [visibleTabs],
  );
  const webviewTabsRef = useRef(webviewTabs);
  useEffect(() => { webviewTabsRef.current = webviewTabs; }, [webviewTabs]);

  // Promote active tab to pool head on every tab switch
  useEffect(() => {
    if (!activeTabId) return;
    activeReadyRef.current = false;
    setPool((prev) => {
      const without = prev.filter((id) => id !== activeTabId);
      return [activeTabId, ...without].slice(0, POOL_SIZE);
    });
  }, [activeTabId]);

  // Fired by active WebViewPane onLoadEnd: add right-neighbor, dismiss splash
  const handleActivePageReady = useCallback(() => {
    if (activeReadyRef.current) return;
    activeReadyRef.current = true;
    setShowSplash(false);
    const tabs = webviewTabsRef.current;
    const idx = tabs.findIndex((t) => t.id === activeTabIdRef.current);
    const neighbor = tabs[idx + 1] ?? tabs[idx - 1];
    if (!neighbor) return;
    setPool((prev) => {
      if (prev.includes(neighbor.id)) return prev;
      return [...prev, neighbor.id].slice(0, POOL_SIZE);
    });
  }, []);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleMinimize = useCallback(() => {
    Haptics.selectionAsync();
    setIsFullscreen(false);
  }, [setIsFullscreen]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* ── Talks ─────────────────────────────────────────────────────── */}
      {mountedSections.has("talks") && (
        <View style={[styles.section, activeSection !== "talks" && styles.sectionHidden]}>
          <TalksScreen onOpenDrawer={openDrawer} />
        </View>
      )}

      {/* ── Buy / Sell ────────────────────────────────────────────────── */}
      {mountedSections.has("buysell") && (
        <View style={[styles.section, activeSection !== "buysell" && styles.sectionHidden]}>
          <BuySellScreen onOpenDrawer={openDrawer} />
        </View>
      )}

      {/* ── Gigs / Work ───────────────────────────────────────────────── */}
      {mountedSections.has("gigs") && (
        <View style={[styles.section, activeSection !== "gigs" && styles.sectionHidden]}>
          <GigsScreen onOpenDrawer={openDrawer} />
        </View>
      )}

      {/* ── Freelance / Hire ──────────────────────────────────────────── */}
      {mountedSections.has("freelance") && (
        <View style={[styles.section, activeSection !== "freelance" && styles.sectionHidden]}>
          <FreelanceScreen onOpenDrawer={openDrawer} />
        </View>
      )}

      {/* ── Web (curated browser) ─────────────────────────────────────── */}
      {/* Mounted lazily on first visit; stays alive for LRU pool.
          Non-members see the membership gate instead of the browser. */}
      {mountedSections.has("web") && (
        <View style={[styles.section, activeSection !== "web" && styles.sectionHidden]}>
          {!isPro ? (
            <WebMembershipGate topPad={topPad} onOpenDrawer={openDrawer} />
          ) : (
            <>
              <WebHeader
                topPad={topPad}
                isFullscreen={isFullscreen}
                onOpenDrawer={openDrawer}
                onMinimize={handleMinimize}
              />
              {!isFullscreen && <WebsiteTabBar isPro={isPro} />}

              <View style={styles.webContent}>
                {/* Only pool members are mounted — LRU eviction controls memory */}
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
                        isVisible={isActive && activeSection === "web"}
                        onPageReady={isActive ? handleActivePageReady : undefined}
                      />
                    );
                  })}

                {/* Minimize button — after WebViews in JSX so it renders above */}
                {isFullscreen && (
                  <Pressable
                    style={[styles.minimizeBtn, { backgroundColor: colors.card, top: insets.top + 8 }]}
                    onPress={handleMinimize}
                  >
                    <Feather name="minimize-2" size={18} color={colors.foreground} />
                  </Pressable>
                )}
              </View>
            </>
          )}
        </View>
      )}

      {/* ── Upgrade modal (pro tab locked) ────────────────────────────── */}
      <UpgradeModal />

      {/* ── Drawer ────────────────────────────────────────────────────── */}
      <DrawerNav
        isOpen={drawerOpen}
        activeSection={activeSection}
        isPro={isPro}
        onClose={() => setDrawerOpen(false)}
        onSelect={handleSectionSelect}
        onOpenProfile={() => {
          setDrawerOpen(false);
          router.push("/profile");
        }}
      />

      {/* ── Splash ────────────────────────────────────────────────────── */}
      {showSplash && <SplashOverlay onDone={() => setShowSplash(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Each section fills the screen; hidden ones are invisible + non-interactive
  section: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  sectionHidden: {
    opacity: 0,
    zIndex: 0,
    // pointerEvents none applied via View prop below isn't possible with
    // absoluteFill + zIndex layering, but zIndex:0 + opacity:0 effectively
    // removes interaction since the visible section (zIndex:1) is on top.
  } as any,

  // ── Web section ──────────────────────────────────────────────────────────
  webHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  hamburger: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  webLogoRow: { flexDirection: "row", alignItems: "center", gap: 7, flex: 1 },
  webLogoMark: {
    width: 26,
    height: 26,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  webLogoImg: { width: 20, height: 20 },
  webLogoText: { fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
  webHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  webContent: { flex: 1, overflow: "hidden" },
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

  // ── Membership gate ──────────────────────────────────────────────────────
  gateContainer: { flex: 1 },
  gateHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  gateContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 16,
    paddingBottom: 40,
  },
  gateLockIcon: {
    width: 88,
    height: 88,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  gateTitle: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  gateSub: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  gateUnlockList: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  gateUnlockRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  gateUnlockText: { fontSize: 14, flex: 1 },
  gateCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 36,
    paddingVertical: 15,
    borderRadius: 28,
    marginTop: 4,
  },
  gateCtaText: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
  gateFineprint: { fontSize: 12, textAlign: "center" },
});
