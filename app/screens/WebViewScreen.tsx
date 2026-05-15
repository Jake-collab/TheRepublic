import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../contexts/ThemeContext';
import { useAppStore } from '../contexts/store';
import type { Website } from '../types/supabase';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { WebViewNavigation } from 'react-native-webview';

type WebViewScreenProps = {
  navigation: NativeStackNavigationProp<any>;
  route: {
    params: {
      website: Website;
    };
  };
};

export const WebViewScreen: React.FC<WebViewScreenProps> = ({ navigation, route }) => {
  const { website } = route.params;
  const { colors } = useTheme();
  const { isWebViewExpanded, setWebViewExpanded } = useAppStore();

  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(website.url);
  const [error, setError] = useState<string | null>(null);

  // Generate injected JavaScript to hide app-install banners
  const getInjectedScript = useCallback(() => {
    const selectors = website.app_banner_hide_selectors;
    
    if (!selectors) return '';

    // Parse selectors and create CSS to hide them
    const selectorList = selectors.split(',').map((s) => s.trim()).filter(Boolean);
    
    if (selectorList.length === 0) return '';

    return `
      (function() {
        var style = document.createElement('style');
        style.textContent = '${selectorList.map((s) => `${s} { display: none !important; visibility: hidden !important; }`).join(' ')}';
        document.head.appendChild(style);
      })();
    `;
  }, [website.app_banner_hide_selectors]);

  // Custom JS from admin
  const getCustomJS = useCallback(() => {
    return website.injected_js || '';
  }, [website.injected_js]);

  // Combined injected script
  const injectedJavaScript = useCallback(() => {
    return `${getInjectedScript()}\n${getCustomJS()}`;
  }, [getInjectedScript, getCustomJS]);

  // Handle navigation state change
  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);
    setCurrentUrl(navState.url);
    setIsLoading(navState.loading);
    
    if (navState.title) {
      // Update header with website title
    }
  };

  // Handle load error
  const handleLoadError = (error: any) => {
    console.error('WebView load error:', error);
    setError('Failed to load website');
  };

  // Handle load finish
  const handleLoadEnd = () => {
    setIsLoading(false);
    setError(null);
  };

  // Navigation functions
  const handleGoBack = () => {
    webViewRef.current?.goBack();
  };

  const handleGoForward = () => {
    webViewRef.current?.goForward();
  };

  const handleRefresh = () => {
    webViewRef.current?.reload();
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const handleOpenExternal = async () => {
    try {
      await Linking.openURL(currentUrl);
    } catch (err) {
      console.error('Error opening external browser:', err);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${website.name}: ${currentUrl}`,
        url: currentUrl,
      });
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  // Toggle expanded mode
  const handleExpand = () => {
    setWebViewExpanded(!isWebViewExpanded);
  };

  // Render expanded header
  const renderExpandedHeader = () => (
    <View style={[styles.expandedHeader, { backgroundColor: colors.surface }]}>
      <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
        <Text style={[styles.headerButtonText, { color: colors.primary }]}>
          Close
        </Text>
      </TouchableOpacity>
      
      <Text 
        style={[styles.websiteTitle, { color: colors.text }]}
        numberOfLines={1}
      >
        {website.name}
      </Text>
      
      <TouchableOpacity onPress={handleExpand} style={styles.headerButton}>
        <Text style={[styles.headerButtonText, { color: colors.primary }]}>
          Minimize
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render normal header
  const renderNormalHeader = () => (
    <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <TouchableOpacity onPress={handleClose} style={styles.navButton}>
        <Text style={[styles.navButtonText, { color: colors.primary }]}>
          ←
        </Text>
      </TouchableOpacity>
      
      <Text 
        style={[styles.title, { color: colors.text }]}
        numberOfLines={1}
      >
        {website.name}
      </Text>
      
      <TouchableOpacity onPress={handleExpand} style={styles.navButton}>
        <Text style={[styles.navButtonText, { color: colors.primary }]}>
          ⛶
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render navigation bar
  const renderNavBar = () => (
    <View style={[styles.navBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      <TouchableOpacity 
        onPress={handleGoBack} 
        disabled={!canGoBack}
        style={[styles.navButton, !canGoBack && styles.disabled]}
      >
        <Text style={[styles.navIcon, !canGoBack && { color: colors.textTertiary }]}>
          ←
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        onPress={handleGoForward} 
        disabled={!canGoForward}
        style={[styles.navButton, !canGoForward && styles.disabled]}
      >
        <Text style={[styles.navIcon, !canGoForward && { color: colors.textTertiary }]}>
          →
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={handleRefresh} style={styles.navButton}>
        <Text style={[styles.navIcon, { color: colors.primary }]}>↻</Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={handleShare} style={styles.navButton}>
        <Text style={[styles.navIcon, { color: colors.primary }]}>📤</Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={handleOpenExternal} style={styles.navButton}>
        <Text style={[styles.navIcon, { color: colors.primary }]}>🌐</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isWebViewExpanded ? renderExpandedHeader() : renderNormalHeader()}
      
      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: website.url }}
        style={styles.webView}
        userAgent={website.custom_user_agent || undefined}
        injectedJavaScript={injectedJavaScript()}
        onNavigationStateChange={handleNavigationStateChange}
        onError={handleLoadError}
        onHttpError={handleLoadError}
        onLoadEnd={handleLoadEnd}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={true}
        scalesPageToFit={true}
        bounce={true}
        decelerationRate="normal"
        viewportContent="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
      />
      
      {/* Error display */}
      {error && (
        <View style={[styles.errorContainer, { backgroundColor: colors.error }]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      {/* Navigation bar */}
      {!isWebViewExpanded && renderNavBar()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  websiteTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  navButton: {
    padding: 8,
  },
  navButtonText: {
    fontSize: 24,
  },
  headerButton: {
    padding: 8,
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  navIcon: {
    fontSize: 24,
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  errorContainer: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
});