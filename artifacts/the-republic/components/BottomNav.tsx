import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type Section = "web" | "talks";

interface Props {
  activeSection: Section;
  onChange: (s: Section) => void;
}

const HANDLE_H = 28;
const TABS_H = 36;

export default function BottomNav({ activeSection, onChange }: Props) {
  const insets = useSafeAreaInsets();
  const insetsRef = useRef(insets);
  useEffect(() => { insetsRef.current = insets; }, [insets]);

  const collapseAnim = useRef(new Animated.Value(0)).current;
  const [collapsed, setCollapsed] = useState(false);
  const collapsedRef = useRef(false);

  const toggleCollapse = useCallback(() => {
    Haptics.selectionAsync();
    const next = !collapsedRef.current;
    collapsedRef.current = next;
    setCollapsed(next);
    Animated.spring(collapseAnim, {
      toValue: next ? TABS_H + insetsRef.current.bottom : 0,
      useNativeDriver: true,
      tension: 200,
      friction: 22,
    }).start();
  }, [collapseAnim]);

  const barContent = (
    <View style={styles.barInner}>
      {/* Collapse / expand handle zone at top — taller for easier tapping */}
      <Pressable onPress={toggleCollapse} style={styles.handleZone} hitSlop={16}>
        <View style={styles.handlePill} />
        <Feather
          name={collapsed ? "chevron-up" : "chevron-down"}
          size={9}
          color="rgba(255,255,255,0.3)"
          style={styles.handleChevron}
        />
      </Pressable>

      {/* Tab row */}
      <View style={[styles.tabRow, { paddingBottom: insets.bottom }]}>
        <Pressable
          style={styles.tabBtn}
          onPress={() => { if (!collapsed) onChange("web"); else { toggleCollapse(); onChange("web"); } }}
        >
          <Feather
            name="globe"
            size={16}
            color={activeSection === "web" ? "#ffffff" : "rgba(255,255,255,0.42)"}
          />
          <Text style={[
            styles.tabLabel,
            { color: activeSection === "web" ? "#ffffff" : "rgba(255,255,255,0.42)" },
            activeSection === "web" && styles.tabLabelActive,
          ]}>
            Web
          </Text>
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          style={styles.tabBtn}
          onPress={() => { if (!collapsed) onChange("talks"); else { toggleCollapse(); onChange("talks"); } }}
        >
          <Feather
            name="message-circle"
            size={16}
            color={activeSection === "talks" ? "#ffffff" : "rgba(255,255,255,0.42)"}
          />
          <Text style={[
            styles.tabLabel,
            { color: activeSection === "talks" ? "#ffffff" : "rgba(255,255,255,0.42)" },
            activeSection === "talks" && styles.tabLabelActive,
          ]}>
            Talks
          </Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <Animated.View style={{ transform: [{ translateY: collapseAnim }] }}>
        {Platform.OS === "ios" ? (
          <View style={styles.barIos} pointerEvents="auto">
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
            {barContent}
          </View>
        ) : (
          <View style={styles.barAndroid} pointerEvents="auto">
            {barContent}
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 200,
  } as any,
  barIos: {
    overflow: "hidden",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.10)",
  },
  barAndroid: {
    backgroundColor: "rgba(8,8,8,0.86)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.10)",
  },
  barInner: {
    flexDirection: "column",
  },
  handleZone: {
    height: HANDLE_H,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    gap: 1,
  },
  handlePill: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  handleChevron: {
    marginTop: 2,
  },
  tabRow: {
    height: TABS_H,
    flexDirection: "row",
    alignItems: "center",
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    height: TABS_H,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 18,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  tabLabelActive: {
    fontWeight: "700",
  },
});
