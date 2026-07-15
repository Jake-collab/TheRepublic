import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export interface WebsiteTab {
  id: string;
  name: string;
  url: string;
  logoUrl?: string | null;
  isFree: boolean;
  isCitizenVote?: boolean;
}

interface BrowserContextType {
  tabs: WebsiteTab[];
  setTabs: (tabs: WebsiteTab[]) => void;
  visibleTabs: WebsiteTab[];
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  isFullscreen: boolean;
  setIsFullscreen: (v: boolean) => void;
  setUrlForTab: (tabId: string, url: string) => void;
  getInitialUrlForTab: (tabId: string, fallback: string) => string;
  upgradeModalVisible: boolean;
  setUpgradeModalVisible: (v: boolean) => void;
  pendingProTabId: string | null;
  setPendingProTabId: (id: string | null) => void;
  hiddenTabIds: string[];
  toggleTabVisibility: (id: string) => void;
  tabColors: Record<string, string>;
  setTabColor: (id: string, color: string) => void;
  tabOrder: string[];
  moveTab: (id: string, direction: "up" | "down") => void;
  recentTabIds: string[];
}

const STORAGE_KEYS = {
  activeTab: "republic_active_tab",
  hiddenTabs: "republic_hidden_tabs",
  tabColors: "republic_tab_colors",
  tabOrder: "republic_tab_order",
  tabUrls: "republic_tab_urls",
};

// How long to wait after the last navigation before writing to AsyncStorage.
const URL_PERSIST_DEBOUNCE_MS = 1500;

// Max number of WebView instances kept alive. Tabs beyond this are unmounted
// and reload from their saved URL when revisited. Dramatically cuts memory
// usage and background JS execution on devices with many Pro tabs.
const MAX_LIVE_WEBVIEWS = 6;

const BrowserContext = createContext<BrowserContextType>({
  tabs: [],
  setTabs: () => {},
  visibleTabs: [],
  activeTabId: "",
  setActiveTabId: () => {},
  isFullscreen: false,
  setIsFullscreen: () => {},
  setUrlForTab: () => {},
  getInitialUrlForTab: (_id, fallback) => fallback,
  upgradeModalVisible: false,
  setUpgradeModalVisible: () => {},
  pendingProTabId: null,
  setPendingProTabId: () => {},
  hiddenTabIds: [],
  toggleTabVisibility: () => {},
  tabColors: {},
  setTabColor: () => {},
  tabOrder: [],
  moveTab: () => {},
  recentTabIds: [],
});

export function BrowserProvider({ children }: { children: React.ReactNode }) {
  const [tabs, setTabsState] = useState<WebsiteTab[]>([]);
  const [activeTabId, setActiveTabIdState] = useState("");
  const [recentTabIds, setRecentTabIds] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [pendingProTabId, setPendingProTabId] = useState<string | null>(null);
  const [hiddenTabIds, setHiddenTabIds] = useState<string[]>([]);
  const [tabColors, setTabColorsState] = useState<Record<string, string>>({});
  const [tabOrder, setTabOrderState] = useState<string[]>([]);
  const initialized = useRef(false);

  // urlStateRef: tracks the current navigated URL per tab.
  // Write-only from React's perspective — zero re-renders on navigation.
  const urlStateRef = useRef<Record<string, string>>({});
  // savedUrlsRef: populated once from AsyncStorage on startup.
  // Used to restore each WebView to where the user last was.
  const savedUrlsRef = useRef<Record<string, string>>({});
  // Timer ref for debounced persistence
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.activeTab),
      AsyncStorage.getItem(STORAGE_KEYS.hiddenTabs),
      AsyncStorage.getItem(STORAGE_KEYS.tabColors),
      AsyncStorage.getItem(STORAGE_KEYS.tabOrder),
      AsyncStorage.getItem(STORAGE_KEYS.tabUrls),
    ]).then(([activeTab, hidden, colors, order, tabUrls]) => {
      if (activeTab) {
        setActiveTabIdState(activeTab);
        setRecentTabIds([activeTab]);
      }
      if (hidden) { try { setHiddenTabIds(JSON.parse(hidden)); } catch {} }
      if (colors) { try { setTabColorsState(JSON.parse(colors)); } catch {} }
      if (order) { try { setTabOrderState(JSON.parse(order)); } catch {} }
      if (tabUrls) { try { savedUrlsRef.current = JSON.parse(tabUrls); } catch {} }
    });
  }, []);

  const setTabs = useCallback((newTabs: WebsiteTab[]) => {
    const siteTabs = newTabs.filter((t) => !t.isCitizenVote);
    setTabsState(siteTabs);
    setActiveTabIdState((prev) => {
      const validIds = new Set(siteTabs.map((t) => t.id));
      if (!prev || !validIds.has(prev)) {
        const firstId = siteTabs[0]?.id ?? "";
        if (firstId) AsyncStorage.setItem(STORAGE_KEYS.activeTab, firstId);
        return firstId;
      }
      return prev;
    });
    setTabOrderState((prev) => {
      if (prev.length === 0) return siteTabs.map((t) => t.id);
      const newIds = siteTabs.map((t) => t.id);
      const ordered = prev.filter((id) => newIds.includes(id));
      const appended = newIds.filter((id) => !ordered.includes(id));
      return [...ordered, ...appended];
    });
  }, []);

  const visibleTabs = useMemo(() => {
    const orderedTabs =
      tabOrder.length > 0
        ? [
            ...tabOrder
              .map((id) => tabs.find((t) => t.id === id))
              .filter(Boolean) as WebsiteTab[],
            ...tabs.filter((t) => !tabOrder.includes(t.id)),
          ]
        : tabs;
    return orderedTabs.filter((t) => !hiddenTabIds.includes(t.id));
  }, [tabs, hiddenTabIds, tabOrder]);

  const handleSetActiveTabId = useCallback((id: string) => {
    setActiveTabIdState(id);
    AsyncStorage.setItem(STORAGE_KEYS.activeTab, id);
    // LRU: keep the last MAX_LIVE_WEBVIEWS tabs mounted. Evicted tabs unmount
    // and reload from saved URL when revisited — saves memory + background JS.
    setRecentTabIds(prev => {
      const filtered = prev.filter(x => x !== id);
      return [id, ...filtered].slice(0, MAX_LIVE_WEBVIEWS);
    });
  }, []);

  // Writes to ref (zero re-renders) and debounces persistence to AsyncStorage.
  // This keeps the user's navigated URL across app restarts without
  // causing any re-renders during normal navigation.
  const setUrlForTab = useCallback((tabId: string, url: string) => {
    urlStateRef.current[tabId] = url;
    // Also update savedUrls so getInitialUrlForTab returns the latest URL
    // within the same session (handles tab dealloc/realloc)
    savedUrlsRef.current[tabId] = url;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      AsyncStorage.setItem(
        STORAGE_KEYS.tabUrls,
        JSON.stringify(urlStateRef.current),
      );
    }, URL_PERSIST_DEBOUNCE_MS);
  }, []);

  // Stable getter — reads from a mutable ref, never causes re-renders.
  // Call this once per WebViewPane on mount to get the initial URL.
  const getInitialUrlForTab = useCallback((tabId: string, fallback: string) => {
    return savedUrlsRef.current[tabId] ?? fallback;
  }, []);

  const toggleTabVisibility = useCallback((id: string) => {
    setHiddenTabIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      AsyncStorage.setItem(STORAGE_KEYS.hiddenTabs, JSON.stringify(next));
      return next;
    });
  }, []);

  const setTabColor = useCallback((id: string, color: string) => {
    setTabColorsState((prev) => {
      const next = { ...prev, [id]: color };
      AsyncStorage.setItem(STORAGE_KEYS.tabColors, JSON.stringify(next));
      return next;
    });
  }, []);

  const moveTab = useCallback((id: string, direction: "up" | "down") => {
    setTabOrderState((prev) => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const next = [...prev];
      if (direction === "up" && idx > 0) {
        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      } else if (direction === "down" && idx < next.length - 1) {
        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      }
      AsyncStorage.setItem(STORAGE_KEYS.tabOrder, JSON.stringify(next));
      return next;
    });
  }, []);

  const contextValue = useMemo<BrowserContextType>(() => ({
    tabs,
    setTabs,
    visibleTabs,
    activeTabId,
    setActiveTabId: handleSetActiveTabId,
    isFullscreen,
    setIsFullscreen,
    setUrlForTab,
    getInitialUrlForTab,
    upgradeModalVisible,
    setUpgradeModalVisible,
    pendingProTabId,
    setPendingProTabId,
    hiddenTabIds,
    toggleTabVisibility,
    tabColors,
    setTabColor,
    tabOrder,
    moveTab,
    recentTabIds,
  }), [
    tabs, setTabs, visibleTabs,
    activeTabId, handleSetActiveTabId,
    isFullscreen, setUrlForTab, getInitialUrlForTab,
    upgradeModalVisible,
    pendingProTabId,
    hiddenTabIds, toggleTabVisibility,
    tabColors, setTabColor,
    tabOrder, moveTab,
    recentTabIds,
  ]);

  return (
    <BrowserContext.Provider value={contextValue}>
      {children}
    </BrowserContext.Provider>
  );
}

export function useBrowser() {
  return useContext(BrowserContext);
}
