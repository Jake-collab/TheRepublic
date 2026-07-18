/**
 * WebViewPane — renders one website in the LRU WebView pool.
 *
 * Pool membership (controlled by the parent) determines whether this
 * component is mounted at all. When mounted it renders the WebView
 * immediately — there is no internal lazy-mount guard. Evicting a tab
 * from the pool unmounts the component; the browser cache makes
 * re-entry feel instant on repeat visits.
 *
 * Loading UX: a thin top progress bar replaces the full-screen spinner
 * so the user always sees partial content as it arrives.
 */
import React, { useState, useRef, memo, useCallback, useEffect } from "react";
import {
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

interface Props {
  tabId: string;
  url: string;
  initialUrl?: string;
  isVisible: boolean;
  /** Called once when this tab's page finishes loading (onLoadEnd). */
  onPageReady?: () => void;
}

// Injected once after page load — removes smart-app banners and prevents
// window.open from launching the native app store.
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

// iOS Safari mobile UA — tells sites to serve lighter mobile-optimised pages.
const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
  "AppleWebKit/605.1.15 (KHTML, like Gecko) " +
  "Version/17.0 Mobile/15E148 Safari/604.1 RepublicApp/1.0";

// ─────────────────────────────────────────────────────────────────────────────
// Native WebView (dev/production builds only)
// ─────────────────────────────────────────────────────────────────────────────

const NativeWebView = memo(function NativeWebView({
  tabId,
  url,
  initialUrl,
  isVisible,
  onPageReady,
}: Props) {
  const colors = useColors();
  const { setUrlForTab } = useBrowser();
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Stable source ref — captured once at mount.
  // Never reassigned so the WebView never reloads due to prop changes.
  const source = useRef({ uri: initialUrl ?? url }).current;

  // Keep the latest onPageReady in a ref so WebView callbacks always call
  // the current version without needing to be listed in dep arrays.
  const onPageReadyRef = useRef(onPageReady);
  useEffect(() => { onPageReadyRef.current = onPageReady; }, [onPageReady]);

  // ── Stable event handlers (no deps that change) ──────────────────────────

  const handleLoadProgress = useCallback(({ nativeEvent }: any) => {
    setLoadProgress(nativeEvent.progress as number);
  }, []);

  const handleLoadEnd = useCallback(() => {
    setLoadProgress(1);
    onPageReadyRef.current?.();
  }, []);

  const handleError = useCallback(() => {
    setLoadProgress(0);
    setError(true);
  }, []);

  const handleNavigationStateChange = useCallback(
    (s: { url: string }) => {
      if (s.url && shouldAllowNavigation(s.url)) {
        setUrlForTab(tabId, s.url);
      }
    },
    [tabId, setUrlForTab],
  );

  const handleShouldStartLoad = useCallback(
    ({ url: reqUrl }: { url: string }) => shouldAllowNavigation(reqUrl),
    [],
  );

  try {
    const { WebView } = require("react-native-webview");

    return (
      <View
        style={isVisible ? styles.visible : styles.hidden}
        pointerEvents={isVisible ? "auto" : "none"}
      >
        {/* Thin progress bar at top — shows as content streams in.
            Only rendered on the active (visible) tab. */}
        {isVisible && loadProgress > 0 && loadProgress < 1 && (
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.round(loadProgress * 100)}%` as any,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>
        )}

        {error && isVisible ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.errorContainer,
              { backgroundColor: colors.background },
            ]}
          >
            <Feather name="wifi-off" size={40} color={colors.mutedForeground} />
            <Text style={[styles.errorText, { color: colors.foreground }]}>
              Couldn't load this page
            </Text>
            <Pressable
              style={[styles.retryBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                setError(false);
                setRetryKey((k) => k + 1);
              }}
            >
              <Text style={[styles.retryText, { color: colors.primaryForeground }]}>
                Retry
              </Text>
            </Pressable>
          </View>
        ) : (
          <WebView
            key={retryKey}
            source={source}
            style={styles.webview}
            userAgent={MOBILE_UA}
            // ── Caching & storage ─────────────────────────────────────
            // cacheEnabled + LOAD_DEFAULT: use HTTP cache headers as-is,
            // which gives fast repeat loads for properly cached sites.
            cacheEnabled={true}
            cacheMode="LOAD_DEFAULT"
            domStorageEnabled={true}
            javaScriptEnabled={true}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            incognito={false}
            // ── Progress & navigation ─────────────────────────────────
            onLoadProgress={handleLoadProgress}
            onLoadEnd={handleLoadEnd}
            onError={handleError}
            onNavigationStateChange={handleNavigationStateChange}
            onShouldStartLoadWithRequest={handleShouldStartLoad}
            // ── Rendering performance ─────────────────────────────────
            renderToHardwareTextureAndroid={true}
            injectedJavaScript={SUPPRESS_APP_PROMPTS_JS}
            injectedJavaScriptBeforeContentLoaded={SUPPRESS_APP_PROMPTS_JS}
            // ── UX / media ────────────────────────────────────────────
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            setSupportMultipleWindows={false}
            allowsLinkPreview={false}
            startInLoadingState={false}
            decelerationRate="normal"
            dataDetectorTypes="none"
            automaticallyAdjustContentInsets={false}
            contentInsetAdjustmentBehavior="never"
            overScrollMode="never"
          />
        )}
      </View>
    );
  } catch {
    // react-native-webview not available (Expo Go).
    // Show a per-tab launcher instead of a dead error screen.
    const safeHost = (() => {
      try {
        return new URL(url).hostname.replace(/^www\./, "");
      } catch {
        return url;
      }
    })();

    return (
      <View
        style={[
          isVisible ? styles.visible : styles.hidden,
          styles.errorContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <View style={[styles.expoGoIconWrap, { backgroundColor: colors.card }]}>
          <Feather name="globe" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.errorText, { color: colors.foreground }]}>
          {safeHost}
        </Text>
        <Text style={[styles.errorSub, { color: colors.mutedForeground }]}>
          WebView isn't available in Expo Go.{"\n"}Open the site in your browser instead.
        </Text>
        <Pressable
          style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          onPress={() => WebBrowser.openBrowserAsync(url).catch(() => {})}
        >
          <Text style={[styles.retryText, { color: colors.primaryForeground }]}>
            Open {safeHost} ↗
          </Text>
        </Pressable>
      </View>
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Web iframe fallback (Expo Go web preview / browser)
// ─────────────────────────────────────────────────────────────────────────────

const WebIframe = memo(function WebIframe({
  url,
  isVisible,
  onPageReady,
}: {
  url: string;
  isVisible: boolean;
  onPageReady?: () => void;
}) {
  const colors = useColors();
  const [blocked, setBlocked] = useState(false);
  const onPageReadyRef = useRef(onPageReady);
  useEffect(() => { onPageReadyRef.current = onPageReady; }, [onPageReady]);

  // 4 s heuristic — fires only if onLoad never fires (iframe blocked by X-Frame-Options)
  const blockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setBlocked(false);
    blockTimerRef.current = setTimeout(() => setBlocked(true), 4000);
    return () => {
      if (blockTimerRef.current) clearTimeout(blockTimerRef.current);
    };
  }, [url]);

  const displayHost = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  })();

  return (
    <View style={isVisible ? styles.visible : styles.hidden}>
      <iframe
        src={url}
        style={{
          border: "none",
          width: "100%",
          height: "100%",
          display: isVisible ? "block" : "none",
        } as React.CSSProperties}
        onLoad={() => {
          if (blockTimerRef.current) {
            clearTimeout(blockTimerRef.current);
            blockTimerRef.current = null;
          }
          setBlocked(false);
          onPageReadyRef.current?.();
        }}
        title="Republic Browser"
        referrerPolicy="no-referrer-when-downgrade"
      />
      {blocked && isVisible && (
        <View
          style={[
            styles.openBarContainer,
            { backgroundColor: colors.card, borderTopColor: colors.border },
          ]}
        >
          <Feather name="alert-circle" size={14} color={colors.mutedForeground} />
          <Text style={[styles.openBarText, { color: colors.mutedForeground }]}>
            {displayHost} restricts embedding — open in browser for full access
          </Text>
          <Pressable
            style={[styles.openBarBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              if (typeof window !== "undefined")
                window.open(url, "_blank", "noopener,noreferrer");
            }}
          >
            <Text style={[styles.openBarBtnText, { color: colors.primaryForeground }]}>
              Open ↗
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Public export — dispatches to native or web implementation
// ─────────────────────────────────────────────────────────────────────────────

const WebViewPane = memo(function WebViewPane({
  tabId,
  url,
  initialUrl,
  isVisible,
  onPageReady,
}: Props) {
  if (Platform.OS === "web") {
    return <WebIframe url={url} isVisible={isVisible} onPageReady={onPageReady} />;
  }
  return (
    <NativeWebView
      tabId={tabId}
      url={url}
      initialUrl={initialUrl}
      isVisible={isVisible}
      onPageReady={onPageReady}
    />
  );
});

export default WebViewPane;

const styles = StyleSheet.create({
  visible: {
    ...StyleSheet.absoluteFillObject,
    opacity: 1,
  },
  hidden: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
    pointerEvents: "none",
  } as any,
  webview: { flex: 1 },
  // Thin progress bar at the very top of the viewport
  progressTrack: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    zIndex: 50,
    backgroundColor: "transparent",
  },
  progressFill: {
    height: 3,
    borderRadius: 1.5,
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
