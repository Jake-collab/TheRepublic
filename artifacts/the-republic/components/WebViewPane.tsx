import React, { useState, useEffect, useRef, memo } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";

import { useBrowser } from "@/contexts/BrowserContext";
import { useColors } from "@/hooks/useColors";
import { registerTabPreload, unregisterTabPreload, registerTabUrl } from "@/utils/preloadRegistry";

interface Props {
  tabId: string;
  url: string;
  initialUrl?: string;
  isVisible: boolean;
}

const SUPPRESS_APP_PROMPTS_JS = `
(function() {
  try {
    document.querySelectorAll('meta[name="apple-itunes-app"],meta[name="google-play-app"]').forEach(function(m){m.remove&&m.remove();});
    window.addEventListener('beforeinstallprompt',function(e){e.preventDefault&&e.preventDefault();},true);
    window.open = function(url) {
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        window.location.href = url;
      }
      return null;
    };
    var obs = new MutationObserver(function(mutations) {
      mutations.forEach(function(m) {
        m.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) {
            var el = node;
            var id = el.id || '';
            var cls = (el.className || '').toString();
            if (/smart.?app.?banner|app.?banner|branch-banner|deeplink/i.test(id + ' ' + cls)) {
              el.remove && el.remove();
            }
          }
        });
      });
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  } catch(e) {}
  true;
})();
`;

function shouldAllowNavigation(url: string): boolean {
  if (url.startsWith("http://") || url.startsWith("https://")) return true;
  if (url.startsWith("about:")) return true;
  if (url.startsWith("data:")) return true;
  return false;
}

const NativeWebView = memo(function NativeWebView({ tabId, url, initialUrl, isVisible }: Props) {
  const colors = useColors();
  const { setUrlForTab } = useBrowser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [key, setKey] = useState(0);
  const [hasEverBeenVisible, setHasEverBeenVisible] = useState(isVisible);

  // Capture the starting URL once at mount time.
  // Using a ref means it never triggers a WebView reload when the canonical
  // `url` prop changes (e.g., after an API refresh). Subsequent navigation
  // is the WebView's own business.
  const initialSource = useRef({ uri: initialUrl ?? url }).current;

  // A mobile-style user-agent nudges sites to serve lighter, mobile-optimised
  // pages. Appended to the system UA so Expo/React-Native fingerprinting is
  // preserved; we do NOT spoof desktop UAs because many sites detect that.
  const mobileUA =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
    "AppleWebKit/605.1.15 (KHTML, like Gecko) " +
    "Version/17.0 Mobile/15E148 Safari/604.1 RepublicApp/1.0";

  useEffect(() => {
    registerTabPreload(tabId, () => setHasEverBeenVisible(true));
    registerTabUrl(tabId, initialUrl ?? url);
    return () => unregisterTabPreload(tabId);
  }, [tabId, url, initialUrl]);

  useEffect(() => {
    if (isVisible && !hasEverBeenVisible) {
      setHasEverBeenVisible(true);
    }
  }, [isVisible, hasEverBeenVisible]);

  if (!hasEverBeenVisible) {
    return <View style={styles.hiddenView} />;
  }

  try {
    const WebView = require("react-native-webview").WebView;

    return (
      <View
        style={isVisible ? styles.webviewVisible : styles.hiddenView}
        pointerEvents={isVisible ? "auto" : "none"}
      >
        {loading && isVisible && (
          <View style={[StyleSheet.absoluteFill, styles.loadingOverlay, { backgroundColor: colors.background }]}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        )}
        {error && isVisible ? (
          <View style={[StyleSheet.absoluteFill, styles.errorContainer, { backgroundColor: colors.background }]}>
            <Feather name="wifi-off" size={40} color={colors.mutedForeground} />
            <Text style={[styles.errorText, { color: colors.foreground }]}>
              Couldn't load this site
            </Text>
            <Pressable
              style={[styles.retryBtn, { backgroundColor: colors.primary }]}
              onPress={() => { setError(false); setKey((k) => k + 1); }}
            >
              <Text style={[styles.retryText, { color: colors.primaryForeground }]}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <WebView
            key={key}
            source={initialSource}
            style={styles.webview}
            userAgent={mobileUA}
            onLoadStart={() => { setLoading(true); setError(false); }}
            onLoadEnd={() => setLoading(false)}
            onError={() => { setLoading(false); setError(true); }}
            onNavigationStateChange={(s: { url: string }) => setUrlForTab(tabId, s.url)}
            onShouldStartLoadWithRequest={(request: { url: string }) => shouldAllowNavigation(request.url)}
            injectedJavaScript={SUPPRESS_APP_PROMPTS_JS}
            injectedJavaScriptBeforeContentLoaded={SUPPRESS_APP_PROMPTS_JS}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
            cacheEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            setSupportMultipleWindows={false}
            allowsLinkPreview={false}
            startInLoadingState={false}
            decelerationRate="normal"
            dataDetectorTypes="none"
            automaticallyAdjustContentInsets={false}
            contentInsetAdjustmentBehavior="never"
            renderToHardwareTextureAndroid={true}
            overScrollMode="never"
          />
        )}
      </View>
    );
  } catch {
    // react-native-webview is unavailable (Expo Go). Show a functional
    // per-tab launcher — users can open the site in the system browser.
    const safeHost = (() => {
      try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
    })();
    return (
      <View style={[isVisible ? styles.webviewVisible : styles.hiddenView, styles.errorContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.expoGoIconWrap, { backgroundColor: colors.card }]}>
          <Feather name="globe" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.errorText, { color: colors.foreground }]}>
          {safeHost}
        </Text>
        <Text style={[styles.errorSub, { color: colors.mutedForeground }]}>
          WebView isn't available in Expo Go. Open the site in your browser instead.
        </Text>
        <Pressable
          style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          onPress={() => { WebBrowser.openBrowserAsync(url).catch(() => {}); }}
        >
          <Text style={[styles.retryText, { color: colors.primaryForeground }]}>
            Open {safeHost} ↗
          </Text>
        </Pressable>
      </View>
    );
  }
});

const WebIframe = memo(function WebIframe({ url, isVisible }: { url: string; isVisible: boolean }) {
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [hasEverBeenVisible, setHasEverBeenVisible] = useState(isVisible);
  const blockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isVisible && !hasEverBeenVisible) {
      setHasEverBeenVisible(true);
    }
  }, [isVisible, hasEverBeenVisible]);

  // Show "open in browser" bar after 4s — can't reliably detect X-Frame-Options blocking
  useEffect(() => {
    if (!hasEverBeenVisible) return;
    blockTimerRef.current = setTimeout(() => setBlocked(true), 4000);
    return () => { if (blockTimerRef.current) clearTimeout(blockTimerRef.current); };
  }, [hasEverBeenVisible, url]);

  useEffect(() => {
    setLoading(true);
    setBlocked(false);
    if (blockTimerRef.current) clearTimeout(blockTimerRef.current);
    blockTimerRef.current = setTimeout(() => setBlocked(true), 4000);
    return () => { if (blockTimerRef.current) clearTimeout(blockTimerRef.current); };
  }, [url]);

  if (!hasEverBeenVisible) {
    return <View style={styles.hiddenView} />;
  }

  const displayHost = (() => {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
  })();

  return (
    <View style={isVisible ? styles.webviewVisible : styles.hiddenView}>
      {loading && isVisible && (
        <View style={[StyleSheet.absoluteFill, styles.loadingOverlay, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}
      <iframe
        src={url}
        style={{ border: "none", width: "100%", height: "100%", display: isVisible ? "block" : "none" } as React.CSSProperties}
        onLoad={() => setLoading(false)}
        title="Republic Browser"
        referrerPolicy="no-referrer-when-downgrade"
      />
      {blocked && isVisible && (
        <View style={[styles.openBarContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <Text style={[styles.openBarText, { color: colors.mutedForeground }]}>
            {displayHost} may block preview
          </Text>
          <Pressable
            style={[styles.openBarBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
            }}
          >
            <Text style={[styles.openBarBtnText, { color: colors.primaryForeground }]}>Open site ↗</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
});

const WebViewPane = memo(function WebViewPane({ tabId, url, initialUrl, isVisible }: Props) {
  if (Platform.OS === "web") {
    return <WebIframe url={url} isVisible={isVisible} />;
  }
  return <NativeWebView tabId={tabId} url={url} initialUrl={initialUrl} isVisible={isVisible} />;
});

export default WebViewPane;

const styles = StyleSheet.create({
  // All panes use absolute fill — switching between them is a compositor-level
  // opacity change only, with zero layout recalculation.
  webviewVisible: {
    ...StyleSheet.absoluteFillObject,
    opacity: 1,
  },
  hiddenView: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
    pointerEvents: "none",
  } as any,
  webview: { flex: 1 },
  loadingOverlay: {
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  errorSub: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  expoGoIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  retryText: {
    fontSize: 15,
    fontWeight: "600",
  },
  openBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    zIndex: 20,
  },
  openBarText: {
    fontSize: 12,
    flex: 1,
    marginRight: 10,
  },
  openBarBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  openBarBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
