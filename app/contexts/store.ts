import { create } from 'zustand';
import { Appearance } from 'react-native';
import type { Profile, Category, Website, UserCategoryPreference, UserWebsitePreference, Notification } from '../types/supabase';

interface AppState {
  // User
  user: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Theme
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  
  // Categories & Websites
  categories: Category[];
  selectedCategoryId: string | null;
  websites: Website[];
  
  // Preferences
  categoryPreferences: UserCategoryPreference[];
  websitePreferences: UserWebsitePreference[];
  recentWebsites: Website[];
  
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  
  // WebView State
  isWebViewExpanded: boolean;
  lastWebViewUrl: string | null;
  
  // Actions
  setUser: (user: Profile | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setLoading: (loading: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setResolvedTheme: () => void;
  setCategories: (categories: Category[]) => void;
  setSelectedCategoryId: (categoryId: string | null) => void;
  setWebsites: (websites: Website[]) => void;
  setCategoryPreferences: (preferences: UserCategoryPreference[]) => void;
  setWebsitePreferences: (preferences: UserWebsitePreference[]) => void;
  setRecentWebsites: (websites: Website[]) => void;
  setNotifications: (notifications: Notification[]) => void;
  setUnreadCount: (count: number) => void;
  setWebViewExpanded: (expanded: boolean) => void;
  setLastWebViewUrl: (url: string | null) => void;
  reset: () => void;
}

const getSystemTheme = (): 'light' | 'dark' => {
  const colorScheme = Appearance.getColorScheme();
  return colorScheme === 'dark' ? 'dark' : 'light';
};

export const useAppStore = create<AppState>((set) => ({
  // Initial State
  user: null,
  isAuthenticated: false,
  isLoading: true,
  
  theme: 'system',
  resolvedTheme: getSystemTheme(),
  
  categories: [],
  selectedCategoryId: null,
  websites: [],
  
  categoryPreferences: [],
  websitePreferences: [],
  recentWebsites: [],
  
  notifications: [],
  unreadCount: 0,
  
  isWebViewExpanded: false,
  lastWebViewUrl: null,
  
  // Actions
  setUser: (user) => set({ user }),
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setLoading: (isLoading) => set({ isLoading }),
  setTheme: (theme) => {
    set({ theme });
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    set({ resolvedTheme: resolved });
  },
  setResolvedTheme: () => {
    const { theme } = useAppStore.getState();
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    set({ resolvedTheme: resolved });
  },
  setCategories: (categories) => set({ categories }),
  setSelectedCategoryId: (categoryId) => set({ selectedCategoryId: categoryId }),
  setWebsites: (websites) => set({ websites }),
  setCategoryPreferences: (categoryPreferences) => set({ categoryPreferences }),
  setWebsitePreferences: (websitePreferences) => set({ websitePreferences }),
  setRecentWebsites: (recentWebsites) => set({ recentWebsites }),
  setNotifications: (notifications) => set({ notifications }),
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  setWebViewExpanded: (isWebViewExpanded) => set({ isWebViewExpanded }),
  setLastWebViewUrl: (lastWebViewUrl) => set({ lastWebViewUrl }),
  reset: () => set({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    categories: [],
    selectedCategoryId: null,
    websites: [],
    categoryPreferences: [],
    websitePreferences: [],
    recentWebsites: [],
    notifications: [],
    unreadCount: 0,
    isWebViewExpanded: false,
    lastWebViewUrl: null,
  }),
}));

// Listen for system theme changes
Appearance.addChangeListener(({ colorScheme }) => {
  const { theme } = useAppStore.getState();
  if (theme === 'system') {
    useAppStore.setState({ resolvedTheme: colorScheme === 'dark' ? 'dark' : 'light' });
  }
});