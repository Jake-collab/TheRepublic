import React, { useRef, useState, useEffect } from "react";
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

interface Props {
  tabId: string;
  url: string;
  isVisible: boolean;
}

const SUPPRESS_APP_PROMPTS_JS = `
(function() {
  try {
    // Remove Apple smart app banners
    document.querySelectorAll('meta[name="apple-itunes-app"],meta[name="google-play-app"]').forEach(function(m){m.remove&&m.remove();});
    // Suppress install prompts
    window.addEventListener('beforeinstallprompt',function(e){e.preventDefault&&e.preventDefault();},true);
    // Override window.open to stay in-app
    var _nativeOpen = window.open;
    window.open = function(url, target, features) {
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        window.location.href = url;
      }
      return null;
    };
    // Suppress smart-app-banner style divs added by JS
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

function NativeWebView({ tabId, url, isVisible }: Props) {
  const colors = useColors();
  const { setUrlForTab } = useBrowser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [key, setKey] = useState(0);
  const [hasEverBeenVisible, setHasEverBeenVisible] = useState(isVisible);

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
}

function WebIframe({ url, isVisible }: { url: string; isVisible: boolean }) {
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [hasEverBeenVisible, setHasEverBeenVisible] = useState(isVisible);

  useEffect(() => {
    if (isVisible && !hasEverBeenVisible) {
      setHasEverBeenVisible(true);
    }
  }, [isVisible, hasEverBeenVisible]);

  if (!hasEverBeenVisible) {
    return <View style={styles.hiddenView} />;
  }

  return (
    <View style={isVisible ? styles.webviewContainer : styles.hiddenView}>
      {loading && isVisible && (
        <View style={[StyleSheet.absoluteFill, styles.loadingOverlay, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}
      <iframe
        src={url}
        style={{ flex: 1, border: "none", width: "100%", height: "100%", display: isVisible ? "block" : "none" }}
        onLoad={() => setLoading(false)}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
        title="Republic Browser"
      />
    </View>
  );
}

export default function WebViewPane({ tabId, url, isVisible }: Props) {
  if (Platform.OS === "web") {
    return <WebIframe url={url} isVisible={isVisible} />;
  }
  return <NativeWebView tabId={tabId} url={url} isVisible={isVisible} />;
}

const styles = StyleSheet.create({
  webviewContainer: {
    flex: 1,
  },
  hiddenView: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
  },
  webview: {
    flex: 1,
  },
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
});
