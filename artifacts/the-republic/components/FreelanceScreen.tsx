/**
 * FreelanceScreen — online remote freelance section.
 *
 * Default (hire): categories across the top as horizontal tabs.
 * Tapping a category shows a list of freelancer profile cards to hire.
 *
 * Flip toggle switches to Work mode: create/manage your freelancer profile,
 * set skills, rate, portfolio, and respond to incoming hire requests.
 *
 * Full booking flow, messaging, delivery confirmation, and payout
 * wiring will be built in Section 5.
 */
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState, useCallback, useRef } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

type Mode = "hire" | "work";

interface FreelanceCategory {
  id: string;
  label: string;
  emoji: string;
}

const CATEGORIES: FreelanceCategory[] = [
  { id: "design",     label: "Design",       emoji: "🎨" },
  { id: "dev",        label: "Development",  emoji: "💻" },
  { id: "writing",    label: "Writing",      emoji: "✍️" },
  { id: "video",      label: "Video",        emoji: "🎬" },
  { id: "marketing",  label: "Marketing",    emoji: "📣" },
  { id: "music",      label: "Music",        emoji: "🎵" },
  { id: "photo",      label: "Photography",  emoji: "📷" },
  { id: "consulting", label: "Consulting",   emoji: "💡" },
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

// ─── Category tab ─────────────────────────────────────────────────────────────

function CategoryTab({
  cat,
  isActive,
  onPress,
}: {
  cat: FreelanceCategory;
  isActive: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      style={[
        styles.catTab,
        {
          borderBottomWidth: isActive ? 2 : 0,
          borderBottomColor: colors.primary,
        },
      ]}
      onPress={onPress}
      hitSlop={4}
    >
      <Text style={styles.catTabEmoji}>{cat.emoji}</Text>
      <Text
        style={[
          styles.catTabLabel,
          {
            color: isActive ? colors.primary : colors.mutedForeground,
            fontWeight: isActive ? "700" : "400",
          },
        ]}
      >
        {cat.label}
      </Text>
    </Pressable>
  );
}

// ─── Freelancer profile card ──────────────────────────────────────────────────

function FreelancerCard({
  name,
  title,
  rate,
  rating,
  jobs,
  emoji,
}: {
  name: string;
  title: string;
  rate: string;
  rating: string;
  jobs: number;
  emoji: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      style={[styles.freelancerCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={[styles.freelancerAvatar, { backgroundColor: colors.secondary }]}>
        <Text style={styles.freelancerEmoji}>{emoji}</Text>
      </View>
      <View style={styles.freelancerInfo}>
        <Text style={[styles.freelancerName, { color: colors.foreground }]}>{name}</Text>
        <Text style={[styles.freelancerTitle, { color: colors.mutedForeground }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.freelancerMeta}>
          <Feather name="star" size={11} color="#f59e0b" />
          <Text style={[styles.freelancerRating, { color: colors.foreground }]}>{rating}</Text>
          <Text style={[styles.freelancerJobs, { color: colors.mutedForeground }]}>
            · {jobs} jobs
          </Text>
        </View>
      </View>
      <View style={styles.freelancerRate}>
        <Text style={[styles.rateAmount, { color: colors.primary }]}>{rate}</Text>
        <Text style={[styles.rateLabel, { color: colors.mutedForeground }]}>/hr</Text>
      </View>
    </Pressable>
  );
}

// ─── Sample data ──────────────────────────────────────────────────────────────

const SAMPLE_FREELANCERS = [
  { name: "Jordan K.",  title: "Brand identity, UI/UX, Figma expert",      rate: "$65",  rating: "4.9", jobs: 142, emoji: "👩‍🎨" },
  { name: "Marcus T.",  title: "React, Node.js, mobile apps",              rate: "$80",  rating: "4.8", jobs: 98,  emoji: "👨‍💻" },
  { name: "Priya S.",   title: "SEO content, blog writing, copywriting",   rate: "$45",  rating: "5.0", jobs: 211, emoji: "✍️"  },
  { name: "Alex R.",    title: "YouTube edits, reels, motion graphics",    rate: "$55",  rating: "4.7", jobs: 63,  emoji: "🎬" },
  { name: "Camille D.", title: "Social ads, email campaigns, analytics",   rate: "$70",  rating: "4.9", jobs: 87,  emoji: "📣" },
];

// ─── Work mode profile builder ────────────────────────────────────────────────

function WorkProfileView() {
  const colors = useColors();
  return (
    <View style={styles.workView}>
      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.profileAvatarLg, { backgroundColor: colors.secondary }]}>
          <Feather name="user" size={36} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.profilePrompt, { color: colors.foreground }]}>
          Build your freelance profile
        </Text>
        <Text style={[styles.profileSub, { color: colors.mutedForeground }]}>
          Add your skills, portfolio, hourly rate, and a short bio.{"\n"}
          Clients can find and hire you directly.
        </Text>
        <Pressable style={[styles.ctaBtn, { backgroundColor: colors.primary }]}>
          <Feather name="edit-2" size={15} color="#ffffff" />
          <Text style={styles.ctaBtnText}>Create Profile</Text>
        </Pressable>
      </View>

      {/* Verification note */}
      <View style={[styles.verifyBanner, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <Feather name="shield" size={16} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.verifyTitle, { color: colors.foreground }]}>Identity Verification Required</Text>
          <Text style={[styles.verifySub, { color: colors.mutedForeground }]}>
            Upload your ID to receive payments
          </Text>
        </View>
        <Pressable style={[styles.verifyBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.verifyBtnText}>Verify</Text>
        </Pressable>
      </View>

      {/* Fee info */}
      <View style={[styles.feeCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <Text style={[styles.feeTitle, { color: colors.foreground }]}>Platform fees</Text>
        <View style={styles.feeTierRow}>
          <Feather name="percent" size={13} color={colors.primary} />
          <Text style={[styles.feeTierText, { color: colors.foreground }]}>
            5% taken from your pay
          </Text>
          <Text style={[styles.feeTierSub, { color: colors.mutedForeground }]}>Default</Text>
        </View>
        <View style={styles.feeTierRow}>
          <Feather name="zap" size={13} color="#f59e0b" />
          <Text style={[styles.feeTierText, { color: colors.foreground }]}>
            No fee with $4.99/mo membership
          </Text>
          <Pressable style={[styles.upgradeTag, { backgroundColor: "#f59e0b22" }]}>
            <Text style={{ fontSize: 11, color: "#f59e0b", fontWeight: "600" }}>Upgrade</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function FreelanceScreen({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("hire");
  const [activeCat, setActiveCat] = useState<string>(CATEGORIES[0].id);

  const handleCat = useCallback((id: string) => {
    Haptics.selectionAsync();
    setActiveCat(id);
  }, []);

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
          {mode === "hire" ? "Freelance" : "My Work"}
        </Text>
        <ModeToggle mode={mode} onChange={setMode} />
      </View>

      {mode === "work" ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        >
          <WorkProfileView />
        </ScrollView>
      ) : (
        <>
          {/* ── Category tabs ───────────────────────────────────────────── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.catBar, { borderBottomColor: colors.border }]}
            contentContainerStyle={styles.catBarContent}
          >
            {CATEGORIES.map((cat) => (
              <CategoryTab
                key={cat.id}
                cat={cat}
                isActive={activeCat === cat.id}
                onPress={() => handleCat(cat.id)}
              />
            ))}
          </ScrollView>

          {/* ── Freelancer list ────────────────────────────────────────── */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          >
            <Pressable style={[styles.searchBar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="search" size={15} color={colors.mutedForeground} />
              <Text style={[styles.searchPlaceholder, { color: colors.mutedForeground }]}>
                Search {CATEGORIES.find((c) => c.id === activeCat)?.label.toLowerCase()} freelancers…
              </Text>
            </Pressable>

            {SAMPLE_FREELANCERS.map((f, i) => (
              <FreelancerCard key={i} {...f} />
            ))}
          </ScrollView>
        </>
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
  catBar: { borderBottomWidth: StyleSheet.hairlineWidth, maxHeight: 52 },
  catBarContent: { paddingHorizontal: 12, alignItems: "center", gap: 4 },
  catTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  catTabEmoji: { fontSize: 14 },
  catTabLabel: { fontSize: 13 },
  listContent: { padding: 16, gap: 10 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchPlaceholder: { fontSize: 15 },
  freelancerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  freelancerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  freelancerEmoji: { fontSize: 24 },
  freelancerInfo: { flex: 1, gap: 3 },
  freelancerName: { fontSize: 15, fontWeight: "700" },
  freelancerTitle: { fontSize: 13 },
  freelancerMeta: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  freelancerRating: { fontSize: 12, fontWeight: "600" },
  freelancerJobs: { fontSize: 12 },
  freelancerRate: { alignItems: "flex-end" },
  rateAmount: { fontSize: 17, fontWeight: "700" },
  rateLabel: { fontSize: 11 },
  // Work mode
  workView: { padding: 16, gap: 14 },
  profileCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  profileAvatarLg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  profilePrompt: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  profileSub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 4,
  },
  ctaBtnText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
  verifyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  verifyTitle: { fontSize: 14, fontWeight: "600" },
  verifySub: { fontSize: 12, marginTop: 1 },
  verifyBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  verifyBtnText: { color: "#ffffff", fontSize: 13, fontWeight: "600" },
  feeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  feeTitle: { fontSize: 14, fontWeight: "700" },
  feeTierRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  feeTierText: { flex: 1, fontSize: 13 },
  feeTierSub: { fontSize: 12 },
  upgradeTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
});
