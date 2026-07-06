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
}

const STORAGE_KEYS = {
  activeTab: "republic_active_tab",
  hiddenTabs: "republic_hidden_tabs",
  tabColors: "republic_tab_colors",
  tabOrder: "republic_tab_order",
};

const BrowserContext = createContext<BrowserContextType>({
  tabs: [],
  setTabs: () => {},
  visibleTabs: [],
  activeTabId: "",
  setActiveTabId: () => {},
  isFullscreen: false,
  setIsFullscreen: () => {},
  setUrlForTab: () => {},
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
});

export function BrowserProvider({ children }: { children: React.ReactNode }) {
  const [tabs, setTabsState] = useState<WebsiteTab[]>([]);
  const [activeTabId, setActiveTabIdState] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [pendingProTabId, setPendingProTabId] = useState<string | null>(null);
  const [hiddenTabIds, setHiddenTabIds] = useState<string[]>([]);
  const [tabColors, setTabColorsState] = useState<Record<string, string>>({});
  const [tabOrder, setTabOrderState] = useState<string[]>([]);
  const initialized = useRef(false);
  // urlState is write-only tracking for navigation history — never triggers re-renders
  const urlStateRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.activeTab),
      AsyncStorage.getItem(STORAGE_KEYS.hiddenTabs),
      AsyncStorage.getItem(STORAGE_KEYS.tabColors),
      AsyncStorage.getItem(STORAGE_KEYS.tabOrder),
    ]).then(([activeTab, hidden, colors, order]) => {
      if (activeTab) setActiveTabIdState(activeTab);
      if (hidden) { try { setHiddenTabIds(JSON.parse(hidden)); } catch {} }
      if (colors) { try { setTabColorsState(JSON.parse(colors)); } catch {} }
      if (order) { try { setTabOrderState(JSON.parse(order)); } catch {} }
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
  }, []);

  // Writes to a ref — zero re-renders on every WebView page navigation
  const setUrlForTab = useCallback((tabId: string, url: string) => {
    urlStateRef.current[tabId] = url;
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
    activeTabId: activeTabId,
    setActiveTabId: handleSetActiveTabId,
    isFullscreen,
    setIsFullscreen,
    setUrlForTab,
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
  }), [
    tabs, setTabs, visibleTabs,
    activeTabId, handleSetActiveTabId,
    isFullscreen, setUrlForTab,
    upgradeModalVisible,
    pendingProTabId,
    hiddenTabIds, toggleTabVisibility,
    tabColors, setTabColor,
    tabOrder, moveTab,
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
