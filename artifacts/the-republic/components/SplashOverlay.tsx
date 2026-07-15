import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";

interface Props {
  onDone: () => void;
  duration?: number;
}

/**
 * Branded boot overlay. Appears immediately (no fade-in delay) while WebViews
 * preload silently in the background. Fades out after `duration` ms.
 */
export default function SplashOverlay({ onDone, duration = 2200 }: Props) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => onDone());
    }, duration);
    return () => clearTimeout(t);
  }, [opacity, duration, onDone]);

  return (
    <Animated.View style={[styles.container, { opacity }]} pointerEvents="none">
      <View style={styles.logoWrap}>
        <View style={styles.logoMark}>
          <Image
            source={require("../assets/images/republic-logo.png")}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.wordmark}>THE REPUBLIC</Text>
        <Text style={styles.tagline}>Loading your sites…</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  logoWrap: {
    alignItems: "center",
    gap: 14,
  },
  logoMark: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  logoImg: {
    width: 64,
    height: 64,
  },
  wordmark: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 4,
  },
  tagline: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    letterSpacing: 0.3,
  },
});
