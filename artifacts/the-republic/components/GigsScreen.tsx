/**
 * GigsScreen — local in-person gig work section.
 *
 * Default (consumer/hire): categories displayed across the top, with a job
 * list below. No worker profiles shown — jobs are picked up by workers
 * browsing the board.
 *
 * Flip toggle switches to Work mode: shows posted jobs with category,
 * description preview, pay type (fixed or by-time), and radius filter.
 *
 * Full posting flow, location pin, private messaging, start/end
 * confirmation, and payout wiring will be built in Section 4.
 */
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState, useCallback } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

type Mode = "hire" | "work";

interface GigCategory {
  id: string;
  label: string;
  emoji: string;
  color: string;
}

const GIG_CATEGORIES: GigCategory[] = [
  { id: "moving",      label: "Moving",       emoji: "📦", color: "#f59e0b" },
  { id: "cleaning",    label: "Cleaning",     emoji: "🧹", color: "#10b981" },
  { id: "handyman",    label: "Handyman",     emoji: "🔧", color: "#3b82f6" },
  { id: "delivery",    label: "Delivery",     emoji: "🚚", color: "#8b5cf6" },
  { id: "assembly",    label: "Assembly",     emoji: "🪛", color: "#ef4444" },
  { id: "yard",        label: "Yard Work",    emoji: "🌿", color: "#22c55e" },
  { id: "painting",    label: "Painting",     emoji: "🎨", color: "#ec4899" },
  { id: "errands",     label: "Errands",      emoji: "🏃", color: "#f97316" },
];

// ─── Mode toggle ──────────────────────────────────────────────────────────────

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const colors = useColors();
  const flipAnim = useRef(new Animated.Value(0)).current;

  const handleFlip = () => {
    const next: Mode = mode === "hire" ? "work" : "hire";
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(flipAnim, {
      toValue: next === "work" ? 1 : 0,
      useNativeDriver: true,
      tension: 300,
      friction: 20,
    }).start();
    onChange(next);
  };

  const rotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <Pressable
      style={[styles.toggleWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}
      onPress={handleFlip}
      hitSlop={8}
    >
      <Text style={[styles.toggleLabel, { color: mode === "hire" ? colors.primary : colors.mutedForeground }]}>
        Hire
      </Text>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Feather name="refresh-cw" size={14} color={colors.foreground} />
      </Animated.View>
      <Text style={[styles.toggleLabel, { color: mode === "work" ? colors.primary : colors.mutedForeground }]}>
        Work
      </Text>
    </Pressable>
  );
}

// ─── Category chip (Hire mode) ────────────────────────────────────────────────

function CategoryChip({
  cat,
  isActive,
  onPress,
}: {
  cat: GigCategory;
  isActive: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      style={[
        styles.catChip,
        {
          backgroundColor: isActive ? cat.color + "22" : colors.secondary,
          borderColor: isActive ? cat.color : colors.border,
        },
      ]}
      onPress={onPress}
      hitSlop={4}
    >
      <Text style={styles.catChipEmoji}>{cat.emoji}</Text>
      <Text
        style={[
          styles.catChipLabel,
          { color: isActive ? cat.color : colors.foreground, fontWeight: isActive ? "700" : "500" },
        ]}
      >
        {cat.label}
      </Text>
    </Pressable>
  );
}

// ─── Job card (Work mode) ─────────────────────────────────────────────────────

function JobCard({ emoji, title, pay, payType, distance, category, color }: {
  emoji: string;
  title: string;
  pay: string;
  payType: "fixed" | "hourly";
  distance: string;
  category: string;
  color: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      style={[styles.jobCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={[styles.jobCatBadge, { backgroundColor: color + "22" }]}>
        <Text style={styles.jobEmoji}>{emoji}</Text>
      </View>
      <View style={styles.jobBody}>
        <Text style={[styles.jobTitle, { color: colors.foreground }]} numberOfLines={2}>
          {title}
        </Text>
        <View style={styles.jobMeta}>
          <View style={[styles.jobCatTag, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.jobCatText, { color: colors.mutedForeground }]}>{category}</Text>
          </View>
          <View style={styles.jobDistRow}>
            <Feather name="map-pin" size={11} color={colors.mutedForeground} />
            <Text style={[styles.jobDist, { color: colors.mutedForeground }]}>{distance}</Text>
          </View>
        </View>
      </View>
      <View style={styles.jobPay}>
        <Text style={[styles.jobPayAmount, { color: colors.primary }]}>{pay}</Text>
        <Text style={[styles.jobPayType, { color: colors.mutedForeground }]}>
          {payType === "hourly" ? "/hr" : "fixed"}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Sample data ──────────────────────────────────────────────────────────────

const SAMPLE_JOBS = [
  { emoji: "📦", title: "Help moving 1-bedroom apartment across town", pay: "$22", payType: "hourly" as const, distance: "0.8 mi", category: "Moving", color: "#f59e0b" },
  { emoji: "🧹", title: "Deep clean of 3-bed house before sale", pay: "$180", payType: "fixed" as const, distance: "1.4 mi", category: "Cleaning", color: "#10b981" },
  { emoji: "🔧", title: "Install bathroom faucet & fix leaky pipe", pay: "$35", payType: "hourly" as const, distance: "2.1 mi", category: "Handyman", color: "#3b82f6" },
  { emoji: "🌿", title: "Lawn mowing + hedge trimming for corner lot", pay: "$85", payType: "fixed" as const, distance: "0.5 mi", category: "Yard Work", color: "#22c55e" },
  { emoji: "🪛", title: "Assemble IKEA wardrobe (PAX system, 2 units)", pay: "$50", payType: "fixed" as const, distance: "3.2 mi", category: "Assembly", color: "#ef4444" },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function GigsScreen({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("hire");
  const [activeCat, setActiveCat] = useState<string | null>(null);

  const handleCat = useCallback((id: string) => {
    Haptics.selectionAsync();
    setActiveCat((prev) => (prev === id ? null : id));
  }, []);

  const filteredJobs = activeCat
    ? SAMPLE_JOBS.filter((j) => j.category === GIG_CATEGORIES.find((c) => c.id === activeCat)?.label)
    : SAMPLE_JOBS;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={onOpenDrawer} style={styles.hamburger} hitSlop={10}>
          <Feather name="menu" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {mode === "hire" ? "Gigs" : "Find Work"}
        </Text>
        <ModeToggle mode={mode} onChange={setMode} />
      </View>

      {/* ── Categories row ─────────────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.catBar, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.catBarContent}
      >
        {GIG_CATEGORIES.map((cat) => (
          <CategoryChip
            key={cat.id}
            cat={cat}
            isActive={activeCat === cat.id}
            onPress={() => handleCat(cat.id)}
          />
        ))}
      </ScrollView>

      {/* ── Content ────────────────────────────────────────────────────── */}
      {mode === "hire" ? (
        /* Hire: post a job */
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.hireContent, { paddingBottom: insets.bottom + 24 }]}
        >
          <Pressable style={[styles.postJobCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "40" }]}>
            <View style={[styles.postJobIcon, { backgroundColor: colors.primary }]}>
              <Feather name="plus" size={22} color="#ffffff" />
            </View>
            <View style={styles.postJobText}>
              <Text style={[styles.postJobTitle, { color: colors.foreground }]}>Post a Gig</Text>
              <Text style={[styles.postJobSub, { color: colors.mutedForeground }]}>
                Describe what you need · drop a pin · set your pay
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.primary} />
          </Pressable>

          {/* Active gig listings in selected/all categories */}
          <Text style={[styles.sectionHeading, { color: colors.mutedForeground }]}>
            {activeCat
              ? `Open gigs · ${GIG_CATEGORIES.find((c) => c.id === activeCat)?.label}`
              : "Open gigs near you"}
          </Text>
          <View style={styles.jobList}>
            {filteredJobs.map((job, i) => (
              <JobCard key={i} {...job} />
            ))}
          </View>
        </ScrollView>
      ) : (
        /* Work: browse jobs */
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.workContent, { paddingBottom: insets.bottom + 24 }]}
        >
          {/* Radius filter */}
          <View style={[styles.radiusBar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="map-pin" size={14} color={colors.primary} />
            <Text style={[styles.radiusLabel, { color: colors.foreground }]}>Within 5 miles</Text>
            <Pressable style={[styles.radiusBtn, { backgroundColor: colors.primary + "18" }]}>
              <Text style={[styles.radiusBtnText, { color: colors.primary }]}>Change</Text>
            </Pressable>
          </View>

          {/* Verification notice */}
          <View style={[styles.verifyBanner, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="shield" size={16} color={colors.primary} />
            <Text style={[styles.verifyText, { color: colors.foreground }]}>
              Verify your identity to accept jobs and receive payouts
            </Text>
            <Pressable style={[styles.verifyBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.verifyBtnText}>Verify</Text>
            </Pressable>
          </View>

          <Text style={[styles.sectionHeading, { color: colors.mutedForeground }]}>
            {activeCat
              ? `Jobs · ${GIG_CATEGORIES.find((c) => c.id === activeCat)?.label}`
              : "All nearby jobs"}
          </Text>
          <View style={styles.jobList}>
            {filteredJobs.map((job, i) => (
              <JobCard key={i} {...job} />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  hamburger: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 22, fontWeight: "700", flex: 1, letterSpacing: -0.4 },
  toggleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  toggleLabel: { fontSize: 13, fontWeight: "600" },
  catBar: { borderBottomWidth: StyleSheet.hairlineWidth, maxHeight: 60 },
  catBarContent: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    alignItems: "center",
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  catChipEmoji: { fontSize: 14 },
  catChipLabel: { fontSize: 13 },
  hireContent: { padding: 16, gap: 16 },
  workContent: { padding: 16, gap: 16 },
  postJobCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  postJobIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  postJobText: { flex: 1 },
  postJobTitle: { fontSize: 16, fontWeight: "700" },
  postJobSub: { fontSize: 13, marginTop: 2 },
  sectionHeading: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  jobList: { gap: 10 },
  jobCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  jobCatBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  jobEmoji: { fontSize: 22 },
  jobBody: { flex: 1, gap: 6 },
  jobTitle: { fontSize: 14, lineHeight: 19, fontWeight: "500" },
  jobMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  jobCatTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  jobCatText: { fontSize: 11, fontWeight: "500" },
  jobDistRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  jobDist: { fontSize: 11 },
  jobPay: { alignItems: "flex-end" },
  jobPayAmount: { fontSize: 16, fontWeight: "700" },
  jobPayType: { fontSize: 11 },
  radiusBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  radiusLabel: { flex: 1, fontSize: 14, fontWeight: "500" },
  radiusBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  radiusBtnText: { fontSize: 13, fontWeight: "600" },
  verifyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  verifyText: { flex: 1, fontSize: 13, lineHeight: 18 },
  verifyBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  verifyBtnText: { color: "#ffffff", fontSize: 13, fontWeight: "600" },
});
