import React, { useRef, useState } from "react";
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

function NativeWebView({ tabId, url, isVisible }: Props) {
  const colors = useColors();
  const { setUrlForTab } = useBrowser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [key, setKey] = useState(0);

  if (!isVisible) return null;

  try {
    const WebView = require("react-native-webview").WebView;

    return (
      <View style={styles.webviewContainer}>
        {loading && (
          <View style={[StyleSheet.absoluteFill, styles.loadingOverlay, { backgroundColor: colors.background }]}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        )}
        {error ? (
          <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
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
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
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

  if (!isVisible) return null;

  return (
    <View style={styles.webviewContainer}>
      {loading && (
        <View style={[StyleSheet.absoluteFill, styles.loadingOverlay, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}
      <iframe
        src={url}
        style={{ flex: 1, border: "none", width: "100%", height: "100%" }}
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
