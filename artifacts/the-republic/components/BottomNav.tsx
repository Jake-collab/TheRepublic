import { BlurView } from "expo-blur";
import React, { useRef, useEffect } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

export type Section = "web" | "talks";

interface Props {
  activeSection: Section;
  onChange: (s: Section) => void;
}

const PILL_WIDTH = 200;
const BUTTON_WIDTH = 92;

export default function BottomNav({ activeSection, onChange }: Props) {
  const slideAnim = useRef(new Animated.Value(activeSection === "web" ? 0 : 1)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: activeSection === "web" ? 0 : 1,
      useNativeDriver: true,
      tension: 180,
      friction: 18,
    }).start();
  }, [activeSection, slideAnim]);

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, PILL_WIDTH / 2 - 4],
  });

  const content = (
    <View style={styles.pill} pointerEvents="box-none">
      {/* Sliding highlight */}
      <Animated.View
        style={[
          styles.slider,
          { transform: [{ translateX }] },
        ]}
      />
      <Pressable
        style={styles.button}
        onPress={() => onChange("web")}
      >
        <Feather
          name="globe"
          size={18}
          color={activeSection === "web" ? "#ffffff" : "rgba(255,255,255,0.5)"}
        />
        <Text style={[styles.label, activeSection === "web" && styles.labelActive]}>
          Web
        </Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={() => onChange("talks")}
      >
        <Feather
          name="message-circle"
          size={18}
          color={activeSection === "talks" ? "#ffffff" : "rgba(255,255,255,0.5)"}
        />
        <Text style={[styles.label, activeSection === "talks" && styles.labelActive]}>
          Talks
        </Text>
      </Pressable>
    </View>
  );

  if (Platform.OS === "ios") {
    return (
      <View style={styles.wrapper} pointerEvents="box-none">
        <View style={styles.blurWrapper}>
          <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
          {content}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.androidPill}>{content}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 22,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 200,
    pointerEvents: "box-none",
  } as any,
  blurWrapper: {
    width: PILL_WIDTH,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  androidPill: {
    width: PILL_WIDTH,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(20,20,20,0.88)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  slider: {
    position: "absolute",
    left: 0,
    width: BUTTON_WIDTH,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  button: {
    width: BUTTON_WIDTH,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 22,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.5)",
  },
  labelActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
