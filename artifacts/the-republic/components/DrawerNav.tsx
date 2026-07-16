/**
 * DrawerNav — slide-out left navigation drawer.
 *
 * Slides in from left with a spring animation. A dark-tinted backdrop
 * appears behind it and can be tapped to close. On iOS the drawer uses
 * BlurView for a native glass look; Android falls back to a solid dark card.
 *
 * Sections (top → bottom): Talks, Buy/Sell, Gigs/Work, Freelance/Hire, Web.
 * The Web item is membership-gated and shows a lock badge for non-members.
 */
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type AppSection = "talks" | "buysell" | "gigs" | "freelance" | "web";

interface NavItem {
  id: AppSection;
  label: string;
  icon: string;
  membershipGated?: boolean;
  membershipLabel?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "talks",     label: "Talks",           icon: "message-circle" },
  { id: "buysell",   label: "Buy / Sell",       icon: "shopping-bag" },
  { id: "gigs",      label: "Gigs / Work",      icon: "tool" },
  { id: "freelance", label: "Freelance / Hire",  icon: "briefcase" },
  { id: "web",       label: "Web",              icon: "globe", membershipGated: true, membershipLabel: "from $2.99" },
];

const DRAWER_WIDTH = Math.min(Dimensions.get("window").width * 0.78, 320);

// Hardcoded dark palette for the drawer so it contrasts clearly against any
// content behind it regardless of the app's light/dark color scheme.
const D = {
  bg:          "rgba(9,9,11,0.98)",
  border:      "rgba(255,255,255,0.09)",
  text:        "#f2f2f5",
  sub:         "rgba(255,255,255,0.45)",
  activeText:  "#ffffff",
  activeBg:    "rgba(255,255,255,0.10)",
  iconBg:      "rgba(255,255,255,0.08)",
  iconActive:  "#2563eb",          // primary blue
  badgeBg:     "rgba(255,255,255,0.07)",
  badgeText:   "rgba(255,255,255,0.45)",
};

interface Props {
  isOpen: boolean;
  activeSection: AppSection;
  isPro: boolean;
  onClose: () => void;
  onSelect: (section: AppSection) => void;
  onOpenProfile: () => void;
}

export default function DrawerNav({
  isOpen,
  activeSection,
  isPro,
  onClose,
  onSelect,
  onOpenProfile,
}: Props) {
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
    ]).start();
  }, [isOpen, translateX, backdropOpacity]);

  const handleSelect = (item: NavItem) => {
    Haptics.selectionAsync();
    onSelect(item.id);
    onClose();
  };

  const handleProfile = () => {
    onClose();
    onOpenProfile();
  };

  const drawerInner = (
    <View style={styles.drawerInner} pointerEvents="auto">
      {/* ── Logo / brand header ─────────────────────────────────────────── */}
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

      {/* ── Nav items ───────────────────────────────────────────────────── */}
      <View style={styles.navList}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.id;
          const isLocked = item.membershipGated && !isPro;

          return (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.navItem,
                isActive && styles.navItemActive,
                pressed && { opacity: 0.75 },
              ]}
              onPress={() => handleSelect(item)}
              hitSlop={4}
            >
              {/* Left color bar for active item */}
              {isActive && <View style={styles.activeBar} />}

              {/* Icon */}
              <View
                style={[
                  styles.navIcon,
                  { backgroundColor: isActive ? D.iconActive : D.iconBg },
                ]}
              >
                <Feather
                  name={item.icon as any}
                  size={16}
                  color={isActive ? "#ffffff" : D.sub}
                />
              </View>

              {/* Label */}
              <Text
                style={[
                  styles.navLabel,
                  { color: isActive ? D.activeText : D.text },
                  isActive && styles.navLabelActive,
                ]}
              >
                {item.label}
              </Text>

              {/* Lock badge */}
              {isLocked && (
                <View style={styles.lockBadge}>
                  <Feather name="lock" size={9} color={D.badgeText} style={{ marginRight: 3 }} />
                  <Text style={styles.lockBadgeText}>{item.membershipLabel}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* ── Bottom: profile ─────────────────────────────────────────────── */}
      <View style={styles.spacer} />
      <View style={[styles.divider, { marginBottom: 8 }]} />
      <Pressable
        style={({ pressed }) => [styles.profileRow, { paddingBottom: insets.bottom + 16 }, pressed && { opacity: 0.75 }]}
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
    // Always in tree so the spring animation plays in and out smoothly.
    <View style={StyleSheet.absoluteFill} pointerEvents={isOpen ? "auto" : "none"}>
      {/* Semi-transparent backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
        pointerEvents={isOpen ? "auto" : "none"}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Drawer panel */}
      <Animated.View
        style={[
          styles.drawerOuter,
          { width: DRAWER_WIDTH, transform: [{ translateX }] },
        ]}
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
  blurOverlay: {
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  drawerInner: {
    flex: 1,
  },
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
  brandName: {
    fontSize: 17,
    fontWeight: "700",
    color: D.text,
    letterSpacing: 0.3,
  },
  brandSub: {
    fontSize: 12,
    color: D.sub,
    marginTop: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: D.border,
    marginHorizontal: 16,
  },
  navList: {
    paddingHorizontal: 8,
    gap: 2,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: 12,
    position: "relative",
    overflow: "hidden",
  },
  navItemActive: {
    backgroundColor: D.activeBg,
  },
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
  navLabel: {
    fontSize: 15,
    flex: 1,
    letterSpacing: 0.1,
  },
  navLabelActive: {
    fontWeight: "700",
    color: D.activeText,
  },
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: D.badgeBg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  lockBadgeText: {
    fontSize: 10,
    color: D.badgeText,
    fontWeight: "500",
  },
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
  profileLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: D.text,
  },
});
