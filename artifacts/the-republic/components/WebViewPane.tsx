import React, { useState, useEffect, memo } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { useBrowser } from "@/contexts/BrowserContext";
import { useColors } from "@/hooks/useColors";
import { registerTabPreload, unregisterTabPreload } from "@/utils/preloadRegistry";

interface Props {
  tabId: string;
  url: string;
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

const NativeWebView = memo(function NativeWebView({ tabId, url, isVisible }: Props) {
  const colors = useColors();
  const { setUrlForTab } = useBrowser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [key, setKey] = useState(0);
  const [hasEverBeenVisible, setHasEverBeenVisible] = useState(isVisible);

  // Register with the preload registry so onPressIn in TabBar can fire us early
  useEffect(() => {
    registerTabPreload(tabId, () => setHasEverBeenVisible(true));
    return () => unregisterTabPreload(tabId);
  }, [tabId]);

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
        style={isVisible ? styles.webviewContainer : styles.hiddenView}
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
            source={{ uri: url }}
            style={styles.webview}
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
          />
        )}
      </View>
    );
  } catch {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Feather name="smartphone" size={40} color={colors.mutedForeground} />
        <Text style={[styles.errorText, { color: colors.foreground }]}>
          WebView requires a development build
        </Text>
        <Text style={[styles.errorSub, { color: colors.mutedForeground }]}>
          Use the web preview or scan the QR from a dev build
        </Text>
      </View>
    );
  }
});

const WebIframe = memo(function WebIframe({ url, isVisible }: { url: string; isVisible: boolean }) {
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [hasEverBeenVisible, setHasEverBeenVisible] = useState(isVisible);
  const blockTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isVisible && !hasEverBeenVisible) {
      setHasEverBeenVisible(true);
    }
  }, [isVisible, hasEverBeenVisible]);

  // After load fires, wait 2s — if the iframe shows a blank/error page (X-Frame-Options),
  // we can't detect it directly, so we always show the open-in-browser hint.
  useEffect(() => {
    if (!hasEverBeenVisible) return;
    blockTimerRef.current = setTimeout(() => setBlocked(true), 4000);
    return () => { if (blockTimerRef.current) clearTimeout(blockTimerRef.current); };
  }, [hasEverBeenVisible, url]);

  // Reset state when URL changes (tab switch)
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
    <View style={isVisible ? styles.webviewContainer : styles.hiddenView}>
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
      {/* Most major sites block iframe embedding — show a direct link after load */}
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

const WebViewPane = memo(function WebViewPane({ tabId, url, isVisible }: Props) {
  if (Platform.OS === "web") {
    return <WebIframe url={url} isVisible={isVisible} />;
  }
  return <NativeWebView tabId={tabId} url={url} isVisible={isVisible} />;
});

export default WebViewPane;

const styles = StyleSheet.create({
  webviewContainer: { flex: 1 },
  hiddenView: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
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
