import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, View } from "react-native";

interface Props {
  onDone: () => void;
  /** Milliseconds to show the splash before fading out. Default 1800. */
  duration?: number;
}

/**
 * Branded loading overlay shown when the app first opens.
 * During its lifetime the app is quietly prewarming DNS + loading website data
 * in the background — by the time it fades, most of the network work is done.
 */
export default function SplashOverlay({ onDone, duration = 1800 }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    // Fade + scale in quickly
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 180, friction: 14, useNativeDriver: true }),
    ]).start();

    // Hold, then fade out
    const holdTimer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(() => onDone());
    }, duration);

    return () => clearTimeout(holdTimer);
  }, [opacity, scale, duration, onDone]);

  return (
    <Animated.View style={[styles.container, { opacity }]} pointerEvents="none">
      <Animated.View style={[styles.logoWrap, { transform: [{ scale }] }]}>
        <View style={styles.logoCircle}>
          <Image
            source={require("../assets/images/republic-logo.png")}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  logoWrap: {
    alignItems: "center",
    gap: 18,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#ffffff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 12,
  },
  logoImg: {
    width: 72,
    height: 72,
  },
});
