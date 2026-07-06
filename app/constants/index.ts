// App Constants

export const APP_NAME = 'The Republic';

// Deep Link Schemes
export const DEEPLINK_SCHEME = 'therepublic';
export const CHECKOUT_SUCCESS = `${DEEPLINK_SCHEME}://checkout-success`;
export const CHECKOUT_CANCEL = `${DEEPLINK_SCHEME}://checkout-cancel`;

// Theme Colors
export const COLORS = {
  light: {
    primary: '#000000',
    secondary: '#333333',
    background: '#FFFFFF',
    surface: '#F5F5F5',
    border: '#E0E0E0',
    text: '#000000',
    textSecondary: '#666666',
    textTertiary: '#999999',
    success: '#34C759',
    error: '#FF3B30',
    warning: '#FF9500',
    info: '#007AFF',
    white: '#FFFFFF',
    black: '#000000',
  },
  dark: {
    primary: '#FFFFFF',
    secondary: '#AAAAAA',
    background: '#000000',
    surface: '#1C1C1E',
    border: '#38383A',
    text: '#FFFFFF',
    textSecondary: '#AAAAAA',
    textTertiary: '#777777',
    success: '#34C759',
    error: '#FF3B30',
    warning: '#FF9500',
    info: '#0A84FF',
    white: '#FFFFFF',
    black: '#000000',
  },
};

// Default pill colors for categories
export const DEFAULT_PILL_COLORS = {
  light: [
    '#000000', // Black
    '#333333', // Dark Gray
    '#666666', // Gray
    '#007AFF', // Blue
    '#34C759', // Green
    '#FF9500', // Orange
    '#FF3B30', // Red
    '#AF52DE', // Purple
  ],
  dark: [
    '#FFFFFF', // White
    '#AAAAAA', // Light Gray
    '#777777', // Medium Gray
    '#0A84FF', // Blue
    '#30D158', // Green
    '#FFD60A', // Yellow
    '#FF453A', // Red
    '#BF5AF2', // Purple
  ],
};

// API Configuration
export const API_CONFIG = {
  timeout: 30000,
  retries: 3,
};

// Pagination
export const PAGINATION = {
  pageSize: 20,
  maxPages: 10,
};

// WebView Configuration
export const WEBVIEW_CONFIG = {
  defaultUserAgent: 'Mozilla/5.0 (Linux; Android 14; Build/UP1A.231105.001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.124 Mobile Safari/537.36',
  maxPreloadedViews: 3,
  cacheSize: 50 * 1024 * 1024, // 50MB
};

// Support Ticket Categories
export const SUPPORT_CATEGORIES = {
  SUPPORT: 'support',
  BUG: 'bug',
  FEATURE: 'feature',
} as const;

// Membership Status
export const MEMBERSHIP_STATUS = {
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  CANCELED: 'canceled',
  INCOMPLETE: 'incomplete',
  TRIALING: 'trialing',
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  enablePreloading: true,
  enableExpandedMode: true,
  enableColorCustomization: true,
  enableReorderCategories: true,
};