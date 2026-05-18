import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  isFullscreen: boolean;
  setIsFullscreen: (v: boolean) => void;
  urlState: Record<string, string>;
  setUrlForTab: (tabId: string, url: string) => void;
  upgradeModalVisible: boolean;
  setUpgradeModalVisible: (v: boolean) => void;
  pendingProTabId: string | null;
  setPendingProTabId: (id: string | null) => void;
}

const CITIZEN_VOTE_TAB: WebsiteTab = {
  id: "citizen-vote",
  name: "Citizen Vote",
  url: "",
  isFree: true,
  isCitizenVote: true,
};

const BrowserContext = createContext<BrowserContextType>({
  tabs: [CITIZEN_VOTE_TAB],
  setTabs: () => {},
  activeTabId: "citizen-vote",
  setActiveTabId: () => {},
  isFullscreen: false,
  setIsFullscreen: () => {},
  urlState: {},
  setUrlForTab: () => {},
  upgradeModalVisible: false,
  setUpgradeModalVisible: () => {},
  pendingProTabId: null,
  setPendingProTabId: () => {},
});

export function BrowserProvider({ children }: { children: React.ReactNode }) {
  const [tabs, setTabsState] = useState<WebsiteTab[]>([CITIZEN_VOTE_TAB]);
  const [activeTabId, setActiveTabId] = useState("citizen-vote");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [urlState, setUrlState] = useState<Record<string, string>>({});
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [pendingProTabId, setPendingProTabId] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    AsyncStorage.getItem("republic_active_tab").then((val) => {
      if (val) setActiveTabId(val);
    });
  }, []);

  const setTabs = useCallback((newTabs: WebsiteTab[]) => {
    const withCV = newTabs.some((t) => t.isCitizenVote)
      ? newTabs
      : [CITIZEN_VOTE_TAB, ...newTabs];
    setTabsState(withCV);
  }, []);

  const handleSetActiveTabId = useCallback((id: string) => {
    setActiveTabId(id);
    AsyncStorage.setItem("republic_active_tab", id);
  }, []);

  const setUrlForTab = useCallback((tabId: string, url: string) => {
    setUrlState((prev) => ({ ...prev, [tabId]: url }));
  }, []);

  return (
    <BrowserContext.Provider
      value={{
        tabs,
        setTabs,
        activeTabId,
        setActiveTabId: handleSetActiveTabId,
        isFullscreen,
        setIsFullscreen,
        urlState,
        setUrlForTab,
        upgradeModalVisible,
        setUpgradeModalVisible,
        pendingProTabId,
        setPendingProTabId,
      }}
    >
      {children}
    </BrowserContext.Provider>
  );
}

export function useBrowser() {
  return useContext(BrowserContext);
}
