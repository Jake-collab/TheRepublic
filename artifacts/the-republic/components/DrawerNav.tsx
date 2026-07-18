/**
 * DrawerNav — slide-out left navigation with inline mode toggles.
 *
 * Toggle rows: Buy ⇄ Sell, Gigs ⇄ Work, Freelance ⇄ Work, Jobs ⇄ Hire
 * Tapping either side of a toggle navigates to that section + mode.
 */
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type AppSection = "talks" | "buysell" | "gigs" | "freelance" | "jobs" | "web";

export type SectionModes = {
  buysell: "buy" | "sell";
  gigs: "hire" | "work";
  freelance: "hire" | "work";
  jobs: "browse" | "hire";
};

const DRAWER_WIDTH = Math.min(Dimensions.get("window").width * 0.78, 320);

const D = {
  bg:         "rgba(9,9,11,0.98)",
  border:     "rgba(255,255,255,0.09)",
  text:       "#f2f2f5",
  sub:        "rgba(255,255,255,0.45)",
  activeText: "#ffffff",
  activeBg:   "rgba(255,255,255,0.10)",
  iconBg:     "rgba(255,255,255,0.08)",
  iconActive: "#2563eb",
  badgeBg:    "rgba(255,255,255,0.07)",
  badgeText:  "rgba(255,255,255,0.45)",
  modeActive: "#2563eb",
  modeInactive: "rgba(255,255,255,0.35)",
  modePillBg: "rgba(255,255,255,0.06)",
  modeDivider: "rgba(255,255,255,0.12)",
};

interface Props {
  isOpen: boolean;
  activeSection: AppSection;
  sectionModes: SectionModes;
  isPro: boolean;
  onClose: () => void;
  onSelect: (section: "talks" | "web") => void;
  onSelectWithMode: (section: AppSection, mode: string) => void;
  onOpenProfile: () => void;
}

export default function DrawerNav({
  isOpen,
  activeSection,
  sectionModes,
  isPro,
  onClose,
  onSelect,
  onSelectWithMode,
  onOpenProfile,
}: Props) {
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Keep the Modal mounted during the close animation so it doesn't vanish
  // mid-slide. Set true immediately on open, false only after close animation ends.
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (isOpen) setModalVisible(true);

    Animated.parallel([
      Animated.spring(translateX, {
        toValue: isOpen ? 0 : -DRAWER_WIDTH,
        useNativeDriver: true,
        tension: 280,
        friction: 26,
      }),
      Animated.timing(backdropOpacity, {
        toValue: isOpen ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished && !isOpen) setModalVisible(false);
    });
  }, [isOpen, translateX, backdropOpacity]);

  const handleSimpleSelect = (section: "talks" | "web") => {
    Haptics.selectionAsync();
    onSelect(section);
    onClose();
  };

  const handleModeSelect = (section: AppSection, mode: string) => {
    Haptics.selectionAsync();
    onSelectWithMode(section, mode);
    onClose();
  };

  const handleProfile = () => {
    onClose();
    onOpenProfile();
  };

  // ── Toggle pill row ────────────────────────────────────────────────────────
  function ToggleRow({
    section,
    icon,
    leftLabel,
    leftMode,
    rightLabel,
    rightMode,
    currentMode,
  }: {
    section: AppSection;
    icon: string;
    leftLabel: string;
    leftMode: string;
    rightLabel: string;
    rightMode: string;
    currentMode: string;
  }) {
    const isActive = activeSection === section;
    const leftActive = currentMode === leftMode;
    const rightActive = currentMode === rightMode;

    return (
      <View style={[styles.navItem, isActive && styles.navItemActive]}>
        {isActive && <View style={styles.activeBar} />}
        <View style={[styles.navIcon, { backgroundColor: isActive ? D.iconActive : D.iconBg }]}>
          <Feather name={icon as any} size={16} color={isActive ? "#ffffff" : D.sub} />
        </View>

        <View style={styles.modePill}>
          <Pressable
            style={styles.modeHalf}
            onPress={() => handleModeSelect(section, leftMode)}
            hitSlop={6}
          >
            <Text style={[styles.modeLabel, { color: leftActive ? D.modeActive : D.modeInactive, fontWeight: leftActive ? "700" : "400" }]}>
              {leftLabel}
            </Text>
            {leftActive && <View style={styles.modeDot} />}
          </Pressable>

          <View style={styles.modeSlash} />

          <Pressable
            style={styles.modeHalf}
            onPress={() => handleModeSelect(section, rightMode)}
            hitSlop={6}
          >
            {rightActive && <View style={styles.modeDot} />}
            <Text style={[styles.modeLabel, { color: rightActive ? D.modeActive : D.modeInactive, fontWeight: rightActive ? "700" : "400" }]}>
              {rightLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Simple full-width nav row ──────────────────────────────────────────────
  function SimpleRow({
    section,
    icon,
    label,
    locked,
    lockLabel,
  }: {
    section: "talks" | "web";
    icon: string;
    label: string;
    locked?: boolean;
    lockLabel?: string;
  }) {
    const isActive = activeSection === section;
    return (
      <Pressable
        style={({ pressed }) => [styles.navItem, isActive && styles.navItemActive, pressed && { opacity: 0.75 }]}
        onPress={() => handleSimpleSelect(section)}
        hitSlop={4}
      >
        {isActive && <View style={styles.activeBar} />}
        <View style={[styles.navIcon, { backgroundColor: isActive ? D.iconActive : D.iconBg }]}>
          <Feather name={icon as any} size={16} color={isActive ? "#ffffff" : D.sub} />
        </View>
        <Text style={[styles.navLabel, { color: isActive ? D.activeText : D.text }, isActive && styles.navLabelActive]}>
          {label}
        </Text>
        {locked && (
          <View style={styles.lockBadge}>
            <Feather name="lock" size={9} color={D.badgeText} style={{ marginRight: 3 }} />
            <Text style={styles.lockBadgeText}>{lockLabel}</Text>
          </View>
        )}
      </Pressable>
    );
  }

  const drawerInner = (
    <View style={styles.drawerInner} pointerEvents="auto">
      {/* ── Brand header ─────────────────────────────────────────────── */}
      <View style={[styles.brandRow, { paddingTop: insets.top + 18 }]}>
        <View style={styles.logoWrap}>
          <Image
            source={require("../assets/images/republic-logo.png")}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>
        <View>
          <Text style={styles.brandName}>Republic</Text>
          <Text style={styles.brandSub}>Your platform</Text>
        </View>
      </View>

      <View style={[styles.divider, { marginTop: 20, marginBottom: 12 }]} />

      {/* ── Nav items ───────────────────────────────────────────────── */}
      <View style={styles.navList}>
        {/* Talks — simple row */}
        <SimpleRow section="talks" icon="message-circle" label="Talks" />

        {/* Buy / Sell toggle */}
        <ToggleRow
          section="buysell"
          icon="shopping-bag"
          leftLabel="Buy"
          leftMode="buy"
          rightLabel="Sell"
          rightMode="sell"
          currentMode={sectionModes.buysell}
        />

        {/* Gigs / Work toggle */}
        <ToggleRow
          section="gigs"
          icon="tool"
          leftLabel="Gigs"
          leftMode="hire"
          rightLabel="Work"
          rightMode="work"
          currentMode={sectionModes.gigs}
        />

        {/* Freelance / Work toggle */}
        <ToggleRow
          section="freelance"
          icon="briefcase"
          leftLabel="Freelance"
          leftMode="hire"
          rightLabel="Work"
          rightMode="work"
          currentMode={sectionModes.freelance}
        />

        {/* Jobs / Hire toggle */}
        <ToggleRow
          section="jobs"
          icon="map-pin"
          leftLabel="Jobs"
          leftMode="browse"
          rightLabel="Hire"
          rightMode="hire"
          currentMode={sectionModes.jobs}
        />

        {/* Web — simple locked row */}
        <SimpleRow
          section="web"
          icon="globe"
          label="Web"
          locked={!isPro}
          lockLabel="from $2.99"
        />
      </View>

      {/* ── Bottom: profile ─────────────────────────────────────────── */}
      <View style={styles.spacer} />
      <View style={[styles.divider, { marginBottom: 8 }]} />
      <Pressable
        style={({ pressed }) => [
          styles.profileRow,
          { paddingBottom: insets.bottom + 16 },
          pressed && { opacity: 0.75 },
        ]}
        onPress={handleProfile}
        hitSlop={8}
      >
        <View style={styles.profileAvatar}>
          <Feather name="user" size={18} color={D.sub} />
        </View>
        <Text style={styles.profileLabel}>My Account</Text>
        <Feather name="chevron-right" size={16} color={D.sub} />
      </Pressable>
    </View>
  );

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
          pointerEvents="auto"
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[styles.drawerOuter, { width: DRAWER_WIDTH, transform: [{ translateX }] }]}
          pointerEvents="box-none"
        >
          {Platform.OS === "ios" ? (
            <>
              <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, styles.blurOverlay]} />
              {drawerInner}
            </>
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: D.bg }]}>
              {drawerInner}
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.52)",
  },
  drawerOuter: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    overflow: "hidden",
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: D.border,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 24,
  },
  blurOverlay: { backgroundColor: "rgba(0,0,0,0.28)" },
  drawerInner: { flex: 1 },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 2,
  },
  logoWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  logoImg: { width: 30, height: 30 },
  brandName: { fontSize: 17, fontWeight: "700", color: D.text, letterSpacing: 0.3 },
  brandSub: { fontSize: 12, color: D.sub, marginTop: 1 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: D.border,
    marginHorizontal: 16,
  },

  navList: { paddingHorizontal: 8, gap: 2 },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    position: "relative",
    overflow: "hidden",
  },
  navItemActive: { backgroundColor: D.activeBg },
  activeBar: {
    position: "absolute",
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderRadius: 2,
    backgroundColor: D.iconActive,
  },
  navIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  navLabel: { fontSize: 15, flex: 1, letterSpacing: 0.1 },
  navLabelActive: { fontWeight: "700", color: D.activeText },

  // Mode toggle pill (replaces nav label for toggleable sections)
  modePill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: D.modePillBg,
    borderRadius: 10,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  modeHalf: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  modeLabel: { fontSize: 13, letterSpacing: 0.1 },
  modeSlash: {
    width: StyleSheet.hairlineWidth,
    height: 16,
    backgroundColor: D.modeDivider,
  },
  modeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: D.modeActive,
  },

  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: D.badgeBg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  lockBadgeText: { fontSize: 10, color: D.badgeText, fontWeight: "500" },

  spacer: { flex: 1 },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  profileAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: D.iconBg,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: D.border,
  },
  profileLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: D.text },
});
