/**
 * GigsScreen — Section 4: full gig work flow.
 *
 * Hire mode  → post jobs, view applicants, accept a worker, start & complete.
 * Work mode  → browse open jobs, apply, track your applications, message hirer.
 */
import { Feather } from "@expo/vector-icons";
import { useAuth, useUser } from "@clerk/expo";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListGigJobs,
  useListMyGigJobs,
  useListMyGigApplications,
  useGetGigJob,
  useCreateGigJob,
  useApplyToGigJob,
  useAcceptGigApplication,
  useStartGigJob,
  useCompleteGigJob,
  getListGigJobsQueryKey,
  getListMyGigJobsQueryKey,
  getListMyGigApplicationsQueryKey,
  getGetGigJobQueryKey,
  useGetUserIdentity,
  getGetUserIdentityQueryKey,
} from "@workspace/api-client-react";
import type {
  GigJob,
  GigApplication,
  GigApplicationWithJob,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import LeaveReviewModal from "@/components/LeaveReviewModal";

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = "hire" | "work";

// ── Category constants ────────────────────────────────────────────────────────

const GIG_CATS = [
  { id: "moving",   label: "Moving",    emoji: "📦", color: "#f59e0b" },
  { id: "cleaning", label: "Cleaning",  emoji: "🧹", color: "#10b981" },
  { id: "handyman", label: "Handyman",  emoji: "🔧", color: "#3b82f6" },
  { id: "delivery", label: "Delivery",  emoji: "🚚", color: "#8b5cf6" },
  { id: "assembly", label: "Assembly",  emoji: "🪛", color: "#ef4444" },
  { id: "yard",     label: "Yard Work", emoji: "🌿", color: "#22c55e" },
  { id: "painting", label: "Painting",  emoji: "🎨", color: "#ec4899" },
  { id: "errands",  label: "Errands",   emoji: "🏃", color: "#f97316" },
] as const;

function getCat(id: string) {
  return GIG_CATS.find((c) => c.id === id) ?? {
    id,
    label: id,
    emoji: "💼",
    color: "#64748b",
  };
}

// ── Skeleton loading row ──────────────────────────────────────────────────────

function SkeletonRow() {
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.85, duration: 850, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 850, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return (
    <Animated.View style={[gigSkStyles.row, { opacity: anim }]}>
      <View style={gigSkStyles.icon} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={gigSkStyles.line80} />
        <View style={gigSkStyles.line50} />
        <View style={gigSkStyles.line35} />
      </View>
      <View style={gigSkStyles.badge} />
    </Animated.View>
  );
}

function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <View style={{ paddingTop: 8, gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => <SkeletonRow key={i} />)}
    </View>
  );
}

const gigSkStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#8882",
    marginHorizontal: 16,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#8882",
    flexShrink: 0,
  },
  line80: { height: 13, borderRadius: 6, backgroundColor: "#8882", width: "80%" },
  line50: { height: 10, borderRadius: 5, backgroundColor: "#8882", width: "50%" },
  line35: { height: 10, borderRadius: 5, backgroundColor: "#8882", width: "35%" },
  badge: {
    width: 52,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#8882",
    flexShrink: 0,
  },
});

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmtPay(cents: number, payType: string) {
  const d = (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return payType === "hourly" ? `$${d}/hr` : `$${d}`;
}

function fmtDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtPayout(cents: number, payType: string, durationMinutes: number | null) {
  if (payType === "fixed") {
    return "$" + (cents / 100).toFixed(2);
  }
  if (durationMinutes == null) return "—";
  return "$" + ((cents / 100) * (durationMinutes / 60)).toFixed(2);
}

function jobStatusColor(status: string) {
  switch (status) {
    case "open":         return "#22c55e";
    case "in_progress":  return "#f59e0b";
    case "completed":    return "#64748b";
    case "cancelled":    return "#ef4444";
    default:             return "#64748b";
  }
}

function jobStatusLabel(status: string) {
  switch (status) {
    case "open":         return "Open";
    case "in_progress":  return "In Progress";
    case "completed":    return "Completed";
    case "cancelled":    return "Cancelled";
    default:             return status;
  }
}

function appStatusColor(status: string) {
  switch (status) {
    case "pending":  return "#f59e0b";
    case "accepted": return "#22c55e";
    case "rejected": return "#ef4444";
    default:         return "#64748b";
  }
}

// ── ModeToggle ────────────────────────────────────────────────────────────────

function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  const colors = useColors();
  const handleFlip = () => {
    const next: Mode = mode === "hire" ? "work" : "hire";
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(next);
  };
  return (
    <Pressable
      style={[
        styles.toggleWrap,
        { backgroundColor: colors.secondary, borderColor: colors.border },
      ]}
      onPress={handleFlip}
      hitSlop={8}
    >
      <Text
        style={[
          styles.toggleLabel,
          { color: mode === "hire" ? colors.primary : colors.mutedForeground },
        ]}
      >
        Hire
      </Text>
      <Feather name="refresh-cw" size={13} color={colors.foreground} />
      <Text
        style={[
          styles.toggleLabel,
          { color: mode === "work" ? colors.primary : colors.mutedForeground },
        ]}
      >
        Work
      </Text>
    </Pressable>
  );
}

// ── CategoryChip ──────────────────────────────────────────────────────────────

function CategoryChip({
  cat,
  isActive,
  onPress,
}: {
  cat: (typeof GIG_CATS)[number];
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
          {
            color: isActive ? cat.color : colors.foreground,
            fontWeight: isActive ? "700" : "500",
          },
        ]}
      >
        {cat.label}
      </Text>
    </Pressable>
  );
}

// ── GigJobCard ────────────────────────────────────────────────────────────────

function GigJobCard({
  job,
  showStatus,
  onPress,
}: {
  job: GigJob;
  showStatus?: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const cat = getCat(job.category);
  return (
    <Pressable
      style={[styles.jobCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
    >
      <View style={[styles.jobCatBadge, { backgroundColor: cat.color + "22" }]}>
        <Text style={styles.jobEmoji}>{cat.emoji}</Text>
      </View>
      <View style={styles.jobBody}>
        <Text style={[styles.jobTitle, { color: colors.foreground }]} numberOfLines={2}>
          {job.title}
        </Text>
        <View style={styles.jobMeta}>
          {showStatus && (
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: jobStatusColor(job.status) + "22" },
              ]}
            >
              <Text style={[styles.statusText, { color: jobStatusColor(job.status) }]}>
                {jobStatusLabel(job.status)}
              </Text>
            </View>
          )}
          <View style={[styles.catTag, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.catTagText, { color: colors.mutedForeground }]}>
              {cat.label}
            </Text>
          </View>
          {(job.locationText || job.city) ? (
            <View style={styles.locRow}>
              <Feather name="map-pin" size={10} color={colors.mutedForeground} />
              <Text style={[styles.locText, { color: colors.mutedForeground }]}>
                {job.locationText || `${job.city}${job.stateCode ? `, ${job.stateCode}` : ""}`}
              </Text>
            </View>
          ) : null}
        </View>
        {showStatus && job.applicationCount > 0 && (
          <Text style={[styles.appCount, { color: colors.mutedForeground }]}>
            {job.applicationCount} applicant{job.applicationCount !== 1 ? "s" : ""}
          </Text>
        )}
      </View>
      <View style={styles.jobPay}>
        <Text style={[styles.jobPayAmount, { color: colors.primary }]}>
          {fmtPay(job.payAmountCents, job.payType)}
        </Text>
        <Text style={[styles.jobPayType, { color: colors.mutedForeground }]}>
          {job.payType === "hourly" ? "per hr" : "fixed"}
        </Text>
      </View>
    </Pressable>
  );
}

// ── WorkDailyLimit ────────────────────────────────────────────────────────────
// Small badge in the Work-mode header showing today's accepted gig count.

function WorkDailyLimit() {
  const colors = useColors();
  const { getToken } = useAuth();
  const [info, setInfo] = useState<{ count: number; remaining: number } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/gig-tracking/check-limit", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok && active) setInfo(await res.json());
    })();
    return () => { active = false; };
  }, [getToken]);

  if (!info) return <View style={{ width: 36 }} />;
  const full = info.remaining === 0;
  return (
    <View style={[styles.dailyLimitBadge, { borderColor: full ? "#ef444444" : colors.border, backgroundColor: full ? "#ef444411" : colors.secondary }]}>
      <Feather name="briefcase" size={12} color={full ? "#ef4444" : colors.mutedForeground} />
      <Text style={[styles.dailyLimitText, { color: full ? "#ef4444" : colors.mutedForeground }]}>
        {info.count}/4
      </Text>
    </View>
  );
}

// ── Tracking types & panels ───────────────────────────────────────────────────

type TrackingRecord = {
  id: number;
  status: string;
  sceneConfirmed: boolean;
  completionConfirmed: boolean;
  jobStartedAt?: string | null;
};

/** Format elapsed minutes since a timestamp into "Xh Ym" or "Ym". */
function fmtElapsed(sinceIso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(sinceIso).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const TRACK_STEPS = ["on_way", "on_scene", "scene_confirmed", "completed"] as const;
const TRACK_LABELS = ["On the Way", "On Scene", "Working", "Complete"];

const ACTIVE_STAGE_LABEL: Record<string, string> = {
  on_way:          "On the Way",
  on_scene:        "On Scene — awaiting confirmation",
  scene_confirmed: "Working",
};
const ACTIVE_STAGE_COLOR: Record<string, string> = {
  on_way:          "#f59e0b",
  on_scene:        "#3b82f6",
  scene_confirmed: "#22c55e",
  completed:       "#8b5cf6",
  disputed:        "#ef4444",
};

type ActiveGigData = {
  tracking: TrackingRecord & { jobId: number };
  job: {
    id: number;
    title: string;
    category: string;
    payAmountCents: number;
    payType: string;
    startedAt: string | null;
  };
};

function GigActiveBanner({ onOpen }: { onOpen: (jobId: number) => void }) {
  const colors = useColors();
  const { getToken } = useAuth();
  const [data, setData] = useState<ActiveGigData | null>(null);
  const pulse = useRef(new Animated.Value(1)).current;

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const r = await fetch("/api/gig-tracking/my-active", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.status === 404) { setData(null); return; }
      if (r.ok) setData(await r.json());
    } catch { /* silent */ }
  }, [getToken]);

  useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!data) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [data, pulse]);

  if (!data) return null;

  const { tracking, job } = data;
  const isDenied    = tracking.status === "disputed";
  const isCompleted = tracking.completionConfirmed;
  const accentColor = ACTIVE_STAGE_COLOR[tracking.status] ?? colors.primary;
  const stageLabel  = isDenied
    ? "Request Denied by Hirer"
    : isCompleted
    ? "Job Complete 🎉"
    : (ACTIVE_STAGE_LABEL[tracking.status] ?? tracking.status);

  return (
    <Pressable
      style={[
        styles.activeBanner,
        { backgroundColor: accentColor + "18", borderColor: accentColor + "55" },
      ]}
      onPress={() => onOpen(job.id)}
    >
      <Animated.View
        style={[styles.activeDot, { backgroundColor: accentColor, opacity: pulse }]}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.activeBannerLabel, { color: accentColor }]}>
          {isDenied || isCompleted ? stageLabel : `LIVE · ${stageLabel}`}
        </Text>
        <Text style={[styles.activeBannerJob, { color: colors.foreground }]} numberOfLines={1}>
          {job.title}
        </Text>
      </View>
      {!isDenied && !isCompleted && (
        <Feather name="chevron-right" size={16} color={accentColor} />
      )}
    </Pressable>
  );
}

function GigWorkerTrackingPanel({ jobId, onRefresh }: { jobId: number; onRefresh: () => void }) {
  const colors = useColors();
  const { getToken } = useAuth();
  const [tracking, setTracking] = useState<TrackingRecord | null>(null);
  const [limit, setLimit] = useState<{ canAccept: boolean; remaining: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const fetchData = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const [tRes, lRes] = await Promise.all([
      fetch(`/api/gig-tracking/${jobId}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/gig-tracking/check-limit", { method: "POST", headers: { Authorization: `Bearer ${token}` } }),
    ]);
    setTracking(tRes.ok ? await tRes.json() : null);
    if (lRes.ok) setLimit(await lRes.json());
    setLoading(false);
  }, [jobId, getToken]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 8000);
    return () => clearInterval(id);
  }, [fetchData]);

  const post = useCallback(async (path: string, body?: object) => {
    setActing(true);
    try {
      const token = await getToken();
      await fetch(path, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      await fetchData();
      onRefresh();
    } finally { setActing(false); }
  }, [getToken, fetchData, onRefresh]);

  if (loading) return <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />;

  if (!tracking) {
    const canAccept = limit?.canAccept ?? true;
    return (
      <View style={[styles.trackPanel, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <Text style={[styles.trackTitle, { color: colors.foreground }]}>Start this gig</Text>
        {limit && (
          <Text style={[styles.trackSub, { color: colors.mutedForeground }]}>
            {limit.remaining} of 4 daily gig slots remaining
          </Text>
        )}
        <Pressable
          style={[styles.trackActionBtn, { backgroundColor: canAccept ? colors.primary : colors.border, opacity: acting ? 0.6 : 1 }]}
          onPress={() => post("/api/gig-tracking/accept", { jobId })}
          disabled={acting || !canAccept}
        >
          {acting
            ? <ActivityIndicator size="small" color="#fff" />
            : <><Feather name="navigation" size={16} color="#fff" /><Text style={styles.trackBtnText}>Accept & Head Out</Text></>}
        </Pressable>
        {!canAccept && (
          <Text style={[styles.trackSub, { color: "#ef4444", marginTop: 4 }]}>Daily limit reached (4/4). Resets in 24 h.</Text>
        )}
      </View>
    );
  }

  const currentIdx = TRACK_STEPS.indexOf(tracking.status as (typeof TRACK_STEPS)[number]);

  return (
    <View style={[styles.trackPanel, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      <Text style={[styles.trackTitle, { color: colors.foreground }]}>Live Tracking</Text>

      <View style={styles.trackStepsRow}>
        {TRACK_STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <View style={styles.trackStepCol}>
              <View style={[styles.trackStepDot, { backgroundColor: i <= currentIdx ? colors.primary : colors.border }]}>
                {i < currentIdx
                  ? <Feather name="check" size={10} color="#fff" />
                  : <Text style={{ color: i === currentIdx ? "#fff" : colors.mutedForeground, fontSize: 9, fontWeight: "700" }}>{i + 1}</Text>}
              </View>
              <Text style={[styles.trackStepLabel, { color: i <= currentIdx ? colors.foreground : colors.mutedForeground }]} numberOfLines={1}>
                {TRACK_LABELS[i]}
              </Text>
            </View>
            {i < TRACK_STEPS.length - 1 && (
              <View style={[styles.trackStepConnector, { backgroundColor: i < currentIdx ? colors.primary : colors.border }]} />
            )}
          </React.Fragment>
        ))}
      </View>

      {tracking.status === "on_way" && (
        <Pressable style={[styles.trackActionBtn, { backgroundColor: "#f59e0b", opacity: acting ? 0.6 : 1 }]} onPress={() => post(`/api/gig-tracking/${jobId}/on-scene`)} disabled={acting}>
          {acting ? <ActivityIndicator size="small" color="#fff" /> : <><Feather name="map-pin" size={16} color="#fff" /><Text style={styles.trackBtnText}>I'm On Scene</Text></>}
        </Pressable>
      )}
      {tracking.status === "on_scene" && (
        <View style={[styles.trackWaitRow, { backgroundColor: "#f59e0b18", borderColor: "#f59e0b44" }]}>
          <Feather name="clock" size={15} color="#f59e0b" />
          <Text style={[styles.trackWaitText, { color: colors.foreground }]}>Waiting for hirer to confirm you're on scene…</Text>
        </View>
      )}
      {tracking.status === "scene_confirmed" && (
        <View style={{ gap: 8 }}>
          {tracking.jobStartedAt && (
            <ElapsedTimer sinceIso={tracking.jobStartedAt} />
          )}
          <Pressable style={[styles.trackActionBtn, { backgroundColor: "#22c55e", opacity: acting ? 0.6 : 1 }]} onPress={() => post(`/api/gig-tracking/${jobId}/complete`)} disabled={acting}>
            {acting ? <ActivityIndicator size="small" color="#fff" /> : <><Feather name="check-circle" size={16} color="#fff" /><Text style={styles.trackBtnText}>Mark Job Complete</Text></>}
          </Pressable>
        </View>
      )}
      {tracking.status === "completed" && (
        <View style={[styles.trackWaitRow, { backgroundColor: "#22c55e18", borderColor: "#22c55e44" }]}>
          <Feather name="clock" size={15} color="#22c55e" />
          <Text style={[styles.trackWaitText, { color: colors.foreground }]}>Waiting for hirer to confirm completion…</Text>
        </View>
      )}
      {tracking.status === "disputed" && (
        <View style={[styles.trackWaitRow, { backgroundColor: "#ef444418", borderColor: "#ef444444" }]}>
          <Feather name="alert-circle" size={15} color="#ef4444" />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.trackWaitText, { color: "#ef4444", fontWeight: "700" }]}>Request Denied</Text>
            <Text style={[styles.trackWaitText, { color: colors.mutedForeground }]}>The hirer declined your acceptance. This gig is back on the open list — your daily slot has been returned.</Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ── ElapsedTimer ──────────────────────────────────────────────────────────────
// Self-updating elapsed time display, ticking every minute.

function ElapsedTimer({ sinceIso }: { sinceIso: string }) {
  const colors = useColors();
  const [display, setDisplay] = useState(() => fmtElapsed(sinceIso));

  useEffect(() => {
    const id = setInterval(() => setDisplay(fmtElapsed(sinceIso)), 60000);
    return () => clearInterval(id);
  }, [sinceIso]);

  return (
    <View style={[styles.trackWaitRow, { backgroundColor: "#22c55e18", borderColor: "#22c55e44" }]}>
      <Feather name="clock" size={15} color="#22c55e" />
      <Text style={[styles.trackWaitText, { color: colors.foreground }]}>
        Working · <Text style={{ fontWeight: "700", color: "#22c55e" }}>{display}</Text>
      </Text>
    </View>
  );
}

// ── GigHirerTrackingPanel ─────────────────────────────────────────────────────
// Shows in MyJobModal (hire mode) for the hirer to confirm tracking steps.
// Falls back to old Start/Complete buttons if tracking hasn't begun.

function GigHirerTrackingPanel({
  jobId,
  jobStatus,
  onRefresh,
  onFallbackStart,
  onFallbackComplete,
  startDisabled,
  completeDisabled,
  onComplete,
}: {
  jobId: number;
  jobStatus: string;
  onRefresh: () => void;
  onFallbackStart?: () => void;
  onFallbackComplete?: () => void;
  startDisabled?: boolean;
  completeDisabled?: boolean;
  onComplete?: () => void;
}) {
  const colors = useColors();
  const { getToken } = useAuth();
  const [tracking, setTracking] = useState<TrackingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const fetchData = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const res = await fetch(`/api/gig-tracking/${jobId}`, { headers: { Authorization: `Bearer ${token}` } });
    setTracking(res.ok ? await res.json() : null);
    setLoading(false);
  }, [jobId, getToken]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 8000);
    return () => clearInterval(id);
  }, [fetchData]);

  const post = useCallback(async (path: string) => {
    setActing(true);
    try {
      const token = await getToken();
      await fetch(path, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      await fetchData();
      onRefresh();
    } finally { setActing(false); }
  }, [getToken, fetchData, onRefresh]);

  if (loading) return null;

  if (!tracking) {
    return (
      <>
        {jobStatus === "open" && onFallbackStart && (
          <Pressable style={[styles.actionBtn, { backgroundColor: "#f59e0b" }]} onPress={onFallbackStart} disabled={startDisabled}>
            {startDisabled ? <ActivityIndicator size="small" color="#fff" /> : <><Feather name="play" size={16} color="#fff" /><Text style={styles.actionBtnText}>Confirm Start</Text></>}
          </Pressable>
        )}
        {jobStatus === "in_progress" && onFallbackComplete && (
          <Pressable style={[styles.actionBtn, { backgroundColor: "#22c55e" }]} onPress={onFallbackComplete} disabled={completeDisabled}>
            {completeDisabled ? <ActivityIndicator size="small" color="#fff" /> : <><Feather name="check" size={16} color="#fff" /><Text style={styles.actionBtnText}>Mark Complete</Text></>}
          </Pressable>
        )}
      </>
    );
  }

  const STATUS_LABEL: Record<string, string> = {
    on_way:          "Worker is on the way",
    on_scene:        "Worker arrived — confirm on scene",
    scene_confirmed: "Worker is on scene & working",
    completed:       "Worker marked job done",
    disputed:        "Request was denied",
  };
  const dotColor = tracking.status === "scene_confirmed" ? "#22c55e" : tracking.status === "on_way" ? "#f59e0b" : colors.primary;

  return (
    <View style={[styles.trackPanel, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <View style={[styles.trackStatusDot, { backgroundColor: dotColor }]} />
        <Text style={[styles.trackTitle, { color: colors.foreground, marginBottom: 0, flex: 1 }]}>
          {STATUS_LABEL[tracking.status] ?? tracking.status}
        </Text>
      </View>

      {tracking.status === "on_way" && (
        <Pressable style={[styles.trackActionBtn, { backgroundColor: "#ef4444", opacity: acting ? 0.6 : 1 }]} onPress={() => post(`/api/gig-tracking/${jobId}/deny-request`)} disabled={acting}>
          {acting ? <ActivityIndicator size="small" color="#fff" /> : <><Feather name="x" size={16} color="#fff" /><Text style={styles.trackBtnText}>Deny Request</Text></>}
        </Pressable>
      )}
      {tracking.status === "on_scene" && (
        <Pressable style={[styles.trackActionBtn, { backgroundColor: colors.primary, opacity: acting ? 0.6 : 1 }]} onPress={() => post(`/api/gig-tracking/${jobId}/confirm-scene`)} disabled={acting}>
          {acting ? <ActivityIndicator size="small" color="#fff" /> : <><Feather name="user-check" size={16} color="#fff" /><Text style={styles.trackBtnText}>Confirm On Scene</Text></>}
        </Pressable>
      )}
      {tracking.status === "scene_confirmed" && (
        <>
          {tracking.jobStartedAt && (
            <ElapsedTimer sinceIso={tracking.jobStartedAt} />
          )}
          <View style={[styles.trackWaitRow, { backgroundColor: "#22c55e18", borderColor: "#22c55e44" }]}>
            <Feather name="check" size={15} color="#22c55e" />
            <Text style={[styles.trackWaitText, { color: colors.foreground }]}>Worker is on site — waiting for them to mark complete</Text>
          </View>
        </>
      )}
      {tracking.status === "completed" && !tracking.completionConfirmed && (
        <Pressable style={[styles.trackActionBtn, { backgroundColor: "#22c55e", opacity: acting ? 0.6 : 1 }]} onPress={async () => {
          setActing(true);
          try {
            const token = await getToken();
            await fetch(`/api/gig-tracking/${jobId}/confirm-complete`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
            await fetchData();
            onRefresh();
            onComplete?.();
          } finally { setActing(false); }
        }} disabled={acting}>
          {acting ? <ActivityIndicator size="small" color="#fff" /> : <><Feather name="check-circle" size={16} color="#fff" /><Text style={styles.trackBtnText}>Confirm Completion</Text></>}
        </Pressable>
      )}
      {tracking.completionConfirmed && (
        <View style={[styles.trackWaitRow, { backgroundColor: "#8b5cf618", borderColor: "#8b5cf644" }]}>
          <Feather name="star" size={15} color="#8b5cf6" />
          <Text style={[styles.trackWaitText, { color: colors.foreground }]}>Job complete! Payment will be processed shortly.</Text>
        </View>
      )}
    </View>
  );
}

// ── JobDetailModal (Work mode) ────────────────────────────────────────────────

function JobDetailModal({
  jobId,
  meId,
  onClose,
}: {
  jobId: number;
  meId: string;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const router = useRouter();
  const [applyMsg, setApplyMsg] = useState("");
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const { getToken } = useAuth();

  const { data: job, isLoading } = useGetGigJob(jobId);
  const { mutateAsync: applyMut, isPending: applying } = useApplyToGigJob();

  const applications: GigApplication[] = (job as any)?.applications ?? [];
  const myApp = applications.find((a) => a.workerId === meId);
  const cat = job ? getCat(job.category) : null;
  const isMyJob = job?.hirerId === meId;
  const isWorker = job?.workerId === meId;

  const handleApply = async () => {
    const msg = applyMsg.trim();
    try {
      await applyMut({ id: jobId, data: { message: msg } });
      qc.invalidateQueries({ queryKey: getGetGigJobQueryKey(jobId) });
      qc.invalidateQueries({ queryKey: getListMyGigApplicationsQueryKey() });
      setShowApplyForm(false);
      setApplyMsg("");
      Alert.alert("Applied!", "Your application has been submitted.");
    } catch (e: any) {
      const msg2 = e?.message || "Failed to apply.";
      Alert.alert("Error", msg2);
    }
  };

  if (isLoading || !job || !cat) {
    return (
      <View style={[styles.detailSheet, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.detailSheet,
        { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 },
      ]}
    >
      {/* Handle */}
      <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailContent}>
          {/* Cat badge + title */}
          <View style={styles.detailHeader}>
            <View style={[styles.detailCatBadge, { backgroundColor: cat.color + "22" }]}>
              <Text style={{ fontSize: 28 }}>{cat.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={[styles.statusBadge, { backgroundColor: jobStatusColor(job.status) + "22", alignSelf: "flex-start" }]}>
                <Text style={[styles.statusText, { color: jobStatusColor(job.status) }]}>
                  {jobStatusLabel(job.status)}
                </Text>
              </View>
              <Text style={[styles.detailTitle, { color: colors.foreground }]}>{job.title}</Text>
            </View>
          </View>

          {/* Pay + location */}
          <View style={[styles.detailMetaRow, { borderColor: colors.border }]}>
            <View style={styles.detailMetaItem}>
              <Text style={[styles.detailMetaLabel, { color: colors.mutedForeground }]}>Pay</Text>
              <Text style={[styles.detailMetaValue, { color: colors.primary }]}>
                {fmtPay(job.payAmountCents, job.payType)}
              </Text>
            </View>
            <View style={[styles.detailMetaDivider, { backgroundColor: colors.border }]} />
            <View style={styles.detailMetaItem}>
              <Text style={[styles.detailMetaLabel, { color: colors.mutedForeground }]}>Location</Text>
              <Text style={[styles.detailMetaValue, { color: colors.foreground }]}>
                {job.city || "—"}{job.stateCode ? `, ${job.stateCode}` : ""}
              </Text>
            </View>
            <View style={[styles.detailMetaDivider, { backgroundColor: colors.border }]} />
            <View style={styles.detailMetaItem}>
              <Text style={[styles.detailMetaLabel, { color: colors.mutedForeground }]}>Posted by</Text>
              <Text style={[styles.detailMetaValue, { color: colors.foreground }]} numberOfLines={1}>
                {job.hirerName}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text style={[styles.detailSectionLabel, { color: colors.mutedForeground }]}>Description</Text>
          <Text style={[styles.detailDesc, { color: colors.foreground }]}>{job.description}</Text>

          {/* Applicants count */}
          {job.applicationCount > 0 && (
            <Text style={[styles.detailApplicants, { color: colors.mutedForeground }]}>
              {job.applicationCount} {job.applicationCount === 1 ? "person" : "people"} applied
            </Text>
          )}

          {/* ─ My application status ─ */}
          {myApp && (
            <View
              style={[
                styles.myAppBanner,
                { backgroundColor: appStatusColor(myApp.status) + "18", borderColor: appStatusColor(myApp.status) + "44" },
              ]}
            >
              <Feather name="check-circle" size={15} color={appStatusColor(myApp.status)} />
              <Text style={[styles.myAppText, { color: appStatusColor(myApp.status) }]}>
                Application {myApp.status === "pending" ? "pending review" : myApp.status}
              </Text>
            </View>
          )}

          {/* ─ Apply form ─ */}
          {!isMyJob && !myApp && job.status === "open" && (
            <>
              {showApplyForm ? (
                <View>
                  <Text style={[styles.detailSectionLabel, { color: colors.mutedForeground }]}>
                    Your message (optional)
                  </Text>
                  <TextInput
                    style={[
                      styles.applyInput,
                      { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border },
                    ]}
                    value={applyMsg}
                    onChangeText={setApplyMsg}
                    placeholder="Why are you a good fit?"
                    placeholderTextColor={colors.mutedForeground}
                    multiline
                    numberOfLines={3}
                  />
                  <View style={styles.applyRow}>
                    <Pressable
                      onPress={() => setShowApplyForm(false)}
                      style={[styles.applyCancel, { borderColor: colors.border }]}
                    >
                      <Text style={[styles.applyCancelText, { color: colors.foreground }]}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleApply}
                      style={[styles.applyBtn, { backgroundColor: colors.primary, opacity: applying ? 0.6 : 1 }]}
                      disabled={applying}
                    >
                      {applying ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.applyBtnText}>Submit Application</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  style={[styles.applyBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setShowApplyForm(true)}
                >
                  <Text style={styles.applyBtnText}>Apply for this Gig</Text>
                </Pressable>
              )}
            </>
          )}

          {/* ─ Worker tracking panel ─ */}
          {isWorker && (
            <GigWorkerTrackingPanel
              jobId={job.id}
              onRefresh={() => {
                qc.invalidateQueries({ queryKey: getGetGigJobQueryKey(jobId) });
                qc.invalidateQueries({ queryKey: getListMyGigJobsQueryKey() });
              }}
            />
          )}

          {/* ─ Chat (always available to assigned worker) ─ */}
          {isWorker && (
            <Pressable
              style={[styles.msgCTA, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={async () => {
                setStartingChat(true);
                try {
                  const token = await getToken();
                  const res = await fetch("/api/messages/conversations/start", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ contextType: "gig", contextId: job.id, contextTitle: job.title, otherUserId: job.hirerId }),
                  });
                  if (res.ok) {
                    const conv = await res.json();
                    router.push(`/conversation?id=${conv.id}&title=${encodeURIComponent(job.hirerName ?? "Hirer")}` as never);
                  }
                } catch {}
                setStartingChat(false);
              }}
              disabled={startingChat}
            >
              <Feather name="message-circle" size={18} color={colors.primary} />
              <Text style={[styles.msgCTAText, { color: colors.foreground }]}>{startingChat ? "Opening…" : "Open Job Chat"}</Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}

          <Pressable onPress={onClose} style={[styles.closeBtn, { borderColor: colors.border }]}>
            <Text style={[styles.closeBtnText, { color: colors.foreground }]}>Close</Text>
          </Pressable>
        </ScrollView>
    </View>
  );
}

// ── MyJobModal (Hire mode) ────────────────────────────────────────────────────

function MyJobModal({
  jobId,
  meId,
  onClose,
}: {
  jobId: number;
  meId: string;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const router = useRouter();
  const [startingChat, setStartingChat] = useState(false);
  const [showCompletionPanel, setShowCompletionPanel] = useState(false);
  const [showLeaveReview, setShowLeaveReview] = useState(false);
  const { getToken } = useAuth();

  const { data: job, isLoading } = useGetGigJob(jobId);
  const { mutateAsync: accept, isPending: accepting } = useAcceptGigApplication();
  const { mutateAsync: start, isPending: starting } = useStartGigJob();
  const { mutateAsync: complete, isPending: completing } = useCompleteGigJob();

  const applications: GigApplication[] = (job as any)?.applications ?? [];
  const cat = job ? getCat(job.category) : null;

  const invalidateJob = () => {
    qc.invalidateQueries({ queryKey: getGetGigJobQueryKey(jobId) });
    qc.invalidateQueries({ queryKey: getListMyGigJobsQueryKey() });
    qc.invalidateQueries({ queryKey: getListGigJobsQueryKey() });
  };

  const handleAccept = async (appId: number) => {
    try {
      await accept({ id: jobId, appId });
      invalidateJob();
      Alert.alert("Worker accepted!", "They've been assigned to this gig.");
    } catch {
      Alert.alert("Error", "Could not accept applicant.");
    }
  };

  const handleStart = () => {
    Alert.alert("Confirm Start", "Mark this gig as started?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Start",
        onPress: async () => {
          await start({ id: jobId });
          invalidateJob();
        },
      },
    ]);
  };

  const handleComplete = () => {
    Alert.alert("Confirm Completion", "Are you happy with the work? This will record the end time and calculate payout.", [
      { text: "Not yet", style: "cancel" },
      {
        text: "Complete",
        onPress: async () => {
          const updated = await complete({ id: jobId });
          invalidateJob();
          const dur = (updated as GigJob).durationMinutes;
          const payout = fmtPayout(job!.payAmountCents, job!.payType, dur ?? null);
          Alert.alert(
            "Job Complete! 🎉",
            `Duration: ${dur != null ? fmtDuration(dur) : "—"}\nPayout: ${payout}\n\nPayout processing will be available when Stripe is connected.`,
          );
        },
      },
    ]);
  };

  if (isLoading || !job || !cat) {
    return (
      <View style={[styles.detailSheet, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.detailSheet,
        { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 },
      ]}
    >
      <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailContent}>
          {/* Header */}
          <View style={styles.detailHeader}>
            <View style={[styles.detailCatBadge, { backgroundColor: cat.color + "22" }]}>
              <Text style={{ fontSize: 28 }}>{cat.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: jobStatusColor(job.status) + "22", alignSelf: "flex-start" },
                ]}
              >
                <Text style={[styles.statusText, { color: jobStatusColor(job.status) }]}>
                  {jobStatusLabel(job.status)}
                </Text>
              </View>
              <Text style={[styles.detailTitle, { color: colors.foreground }]} numberOfLines={3}>
                {job.title}
              </Text>
            </View>
          </View>

          {/* Pay + location */}
          <View style={[styles.detailMetaRow, { borderColor: colors.border }]}>
            <View style={styles.detailMetaItem}>
              <Text style={[styles.detailMetaLabel, { color: colors.mutedForeground }]}>Pay</Text>
              <Text style={[styles.detailMetaValue, { color: colors.primary }]}>
                {fmtPay(job.payAmountCents, job.payType)}
              </Text>
            </View>
            <View style={[styles.detailMetaDivider, { backgroundColor: colors.border }]} />
            <View style={styles.detailMetaItem}>
              <Text style={[styles.detailMetaLabel, { color: colors.mutedForeground }]}>Location</Text>
              <Text style={[styles.detailMetaValue, { color: colors.foreground }]}>
                {job.city || "—"}{job.stateCode ? `, ${job.stateCode}` : ""}
              </Text>
            </View>
            {job.status === "completed" && job.durationMinutes != null && (
              <>
                <View style={[styles.detailMetaDivider, { backgroundColor: colors.border }]} />
                <View style={styles.detailMetaItem}>
                  <Text style={[styles.detailMetaLabel, { color: colors.mutedForeground }]}>Payout</Text>
                  <Text style={[styles.detailMetaValue, { color: colors.primary }]}>
                    {fmtPayout(job.payAmountCents, job.payType, job.durationMinutes)}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Worker */}
          {job.workerName && (
            <View
              style={[
                styles.workerRow,
                { backgroundColor: "#22c55e18", borderColor: "#22c55e44" },
              ]}
            >
              <Feather name="user-check" size={15} color="#22c55e" />
              <Text style={[styles.workerText, { color: colors.foreground }]}>
                Worker: <Text style={{ fontWeight: "700" }}>{job.workerName}</Text>
              </Text>
            </View>
          )}

          {/* ─ Hirer tracking panel (when worker assigned) ─ */}
          {job.workerId && (
            <GigHirerTrackingPanel
              jobId={job.id}
              jobStatus={job.status}
              onRefresh={invalidateJob}
              onFallbackStart={handleStart}
              onFallbackComplete={handleComplete}
              startDisabled={starting}
              completeDisabled={completing}
              onComplete={() => {
                invalidateJob();
                setShowCompletionPanel(true);
              }}
            />
          )}

          {/* ─ Post-completion review prompt ─ */}
          {showCompletionPanel && job.workerId && (
            <View style={[styles.trackPanel, { backgroundColor: "#8b5cf618", borderColor: "#8b5cf644" }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Feather name="star" size={16} color="#8b5cf6" />
                <Text style={[styles.trackTitle, { color: "#8b5cf6", marginBottom: 0 }]}>Job Complete 🎉</Text>
              </View>
              <Text style={[styles.trackSub, { color: "#8b5cf6", marginBottom: 12 }]}>
                Leave a review for your worker — it helps others in the community!
              </Text>
              <Pressable
                style={[styles.trackActionBtn, { backgroundColor: "#8b5cf6" }]}
                onPress={() => { setShowCompletionPanel(false); setShowLeaveReview(true); }}
              >
                <Feather name="star" size={16} color="#fff" />
                <Text style={styles.trackBtnText}>Leave a Review</Text>
              </Pressable>
            </View>
          )}

          {/* Chat button always available when worker is assigned */}
          {(job.status === "in_progress" || job.status === "open") && job.workerId && (
            <Pressable
              style={[styles.msgCTA, { backgroundColor: colors.secondary, borderColor: colors.border, opacity: startingChat ? 0.7 : 1 }]}
              onPress={async () => {
                if (!job.workerId) return;
                setStartingChat(true);
                try {
                  const token = await getToken();
                  const res = await fetch("/api/messages/conversations/start", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ contextType: "gig", contextId: job.id, contextTitle: job.title, otherUserId: job.workerId }),
                  });
                  if (res.ok) {
                    const conv = await res.json();
                    router.push(`/conversation?id=${conv.id}&title=${encodeURIComponent(job.workerName ?? "Worker")}` as never);
                  }
                } catch {}
                setStartingChat(false);
              }}
              disabled={startingChat}
            >
              <Feather name="message-circle" size={18} color={colors.primary} />
              <Text style={[styles.msgCTAText, { color: colors.foreground }]}>{startingChat ? "Opening…" : "Job Chat"}</Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}

          {job.status === "completed" && job.durationMinutes != null && (
            <View style={[styles.completedBanner, { backgroundColor: "#22c55e18", borderColor: "#22c55e44" }]}>
              <Feather name="check-circle" size={16} color="#22c55e" />
              <Text style={[styles.completedText, { color: "#22c55e" }]}>
                Completed in {fmtDuration(job.durationMinutes)} · Payout{" "}
                {fmtPayout(job.payAmountCents, job.payType, job.durationMinutes)}
              </Text>
            </View>
          )}

          {/* Applicants */}
          {applications.length > 0 && (
            <>
              <Text style={[styles.detailSectionLabel, { color: colors.mutedForeground }]}>
                Applicants ({applications.length})
              </Text>
              {applications.map((app) => (
                <View
                  key={app.id}
                  style={[
                    styles.appCard,
                    {
                      backgroundColor: colors.card,
                      borderColor:
                        app.status === "accepted" ? "#22c55e44" : colors.border,
                    },
                  ]}
                >
                  <View style={styles.appCardTop}>
                    <View
                      style={[
                        styles.appAvatar,
                        { backgroundColor: appStatusColor(app.status) + "22" },
                      ]}
                    >
                      <Text style={{ fontSize: 18 }}>👤</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.appName, { color: colors.foreground }]}>
                        {app.workerName}
                      </Text>
                      <Text
                        style={[
                          styles.appStatus,
                          { color: appStatusColor(app.status) },
                        ]}
                      >
                        {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                      </Text>
                    </View>
                    {app.status === "pending" && job.status === "open" && (
                      <Pressable
                        style={[styles.acceptBtn, { backgroundColor: "#22c55e" }]}
                        onPress={() => handleAccept(app.id)}
                        disabled={accepting}
                      >
                        <Text style={styles.acceptBtnText}>Accept</Text>
                      </Pressable>
                    )}
                  </View>
                  {!!app.message && (
                    <Text style={[styles.appMessage, { color: colors.mutedForeground }]}>
                      "{app.message}"
                    </Text>
                  )}
                </View>
              ))}
            </>
          )}

          {applications.length === 0 && job.status === "open" && (
            <Text style={[styles.detailApplicants, { color: colors.mutedForeground }]}>
              No applications yet — workers can browse and apply.
            </Text>
          )}

          <Pressable onPress={onClose} style={[styles.closeBtn, { borderColor: colors.border }]}>
            <Text style={[styles.closeBtnText, { color: colors.foreground }]}>Close</Text>
          </Pressable>
        </ScrollView>

      {/* ─ Leave-review modal overlay ─ */}
      {job?.workerId && (
        <LeaveReviewModal
          visible={showLeaveReview}
          revieweeId={job.workerId}
          revieweeName={(job as any).workerName ?? "Worker"}
          contextType="gig_job"
          contextId={job.id}
          onClose={() => setShowLeaveReview(false)}
          onSubmitted={() => setShowLeaveReview(false)}
        />
      )}
    </View>
  );
}

// ── PostGigModal ──────────────────────────────────────────────────────────────

const POST_STEPS = ["Category", "Details", "Location"];

function PostGigModal({
  meId,
  meDisplayName,
  onClose,
  onPosted,
}: {
  meId: string;
  meDisplayName: string;
  onClose: () => void;
  onPosted: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [catId, setCatId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [payType, setPayType] = useState<"fixed" | "hourly">("fixed");
  const [payDollars, setPayDollars] = useState("");
  const [city, setCity] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [locationText, setLocationText] = useState("");
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [postLat, setPostLat] = useState<string | null>(null);
  const [postLon, setPostLon] = useState<string | null>(null);

  const { mutateAsync: create, isPending: posting } = useCreateGigJob();

  const selectedCat = GIG_CATS.find((c) => c.id === catId);

  const validateStep = () => {
    if (step === 0 && !catId) { Alert.alert("Pick a category"); return false; }
    if (step === 1) {
      if (!title.trim()) { Alert.alert("Add a title"); return false; }
      if (!desc.trim()) { Alert.alert("Add a description"); return false; }
      const pay = parseFloat(payDollars);
      if (isNaN(pay) || pay <= 0) { Alert.alert("Enter a valid pay amount"); return false; }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < POST_STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      handlePost();
    }
  };

  const handleDetectLocation = async () => {
    setDetectingLoc(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { Alert.alert("Permission denied", "Enable location to auto-fill."); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPostLat(String(pos.coords.latitude));
      setPostLon(String(pos.coords.longitude));
      const [geo] = await Location.reverseGeocodeAsync(pos.coords);
      if (geo) {
        if (geo.city) setCity(geo.city);
        if (geo.region) setStateCode(geo.region.slice(0, 2).toUpperCase());
        if (geo.street) setLocationText(geo.street);
        else if (geo.city && geo.region) setLocationText(`${geo.city}, ${geo.region}`);
      }
    } catch { Alert.alert("Could not detect location"); }
    finally { setDetectingLoc(false); }
  };

  const handlePost = async () => {
    const pay = Math.round(parseFloat(payDollars) * 100);
    try {
      await create({
        data: {
          hirerId: meId,
          hirerName: meDisplayName,
          title: title.trim(),
          description: desc.trim(),
          category: catId,
          payType,
          payAmountCents: pay,
          city: city.trim(),
          stateCode: stateCode.trim().toUpperCase().slice(0, 2),
          locationText: locationText.trim() || undefined,
          latitude: postLat ?? undefined,
          longitude: postLon ?? undefined,
        },
      });
      qc.invalidateQueries({ queryKey: getListMyGigJobsQueryKey() });
      qc.invalidateQueries({ queryKey: getListGigJobsQueryKey() });
      onPosted();
      Alert.alert("Gig Posted!", "Workers near you can now see and apply.");
    } catch {
      Alert.alert("Error", "Could not post gig. Try again.");
    }
  };

  return (
    <View
      style={[
        styles.detailSheet,
        { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 },
      ]}
    >
      <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

      {/* Step indicator */}
      <View style={[styles.sheetTopRow, { borderBottomColor: colors.border }]}>
        {step > 0 ? (
          <Pressable onPress={() => setStep((s) => s - 1)} style={styles.sheetBack}>
            <Feather name="chevron-left" size={22} color={colors.foreground} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
              Post a Gig
            </Text>
          </Pressable>
        ) : (
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Post a Gig</Text>
        )}
        <View style={{ width: 30 }} />
      </View>

      {/* Step pills */}
      <View style={styles.stepPills}>
        {POST_STEPS.map((label, i) => (
          <View key={i} style={styles.stepPillWrap}>
            <View
              style={[
                styles.stepPillDot,
                { backgroundColor: i <= step ? colors.primary : colors.border },
              ]}
            >
              <Text style={[styles.stepPillNum, { color: i <= step ? "#fff" : colors.mutedForeground }]}>
                {i + 1}
              </Text>
            </View>
            <Text style={[styles.stepPillLabel, { color: i === step ? colors.foreground : colors.mutedForeground }]}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.detailContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Step 0: Category ── */}
        {step === 0 && (
          <View style={styles.catGrid}>
            {GIG_CATS.map((cat) => (
              <Pressable
                key={cat.id}
                style={[
                  styles.catGridItem,
                  {
                    backgroundColor: catId === cat.id ? cat.color + "22" : colors.secondary,
                    borderColor: catId === cat.id ? cat.color : colors.border,
                  },
                ]}
                onPress={() => { Haptics.selectionAsync(); setCatId(cat.id); }}
              >
                <Text style={styles.catGridEmoji}>{cat.emoji}</Text>
                <Text style={[styles.catGridLabel, { color: catId === cat.id ? cat.color : colors.foreground }]}>
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* ── Step 1: Details ── */}
        {step === 1 && (
          <View style={styles.formFields}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Help moving 1-bed apartment"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Description *</Text>
            <TextInput
              style={[styles.inputMulti, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
              value={desc}
              onChangeText={setDesc}
              placeholder="What needs doing? Any requirements?"
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={4}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Pay type</Text>
            <View style={styles.payTypeRow}>
              {(["fixed", "hourly"] as const).map((t) => (
                <Pressable
                  key={t}
                  style={[
                    styles.payTypeBtn,
                    {
                      backgroundColor: payType === t ? colors.primary + "18" : colors.secondary,
                      borderColor: payType === t ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setPayType(t)}
                >
                  <Text style={[styles.payTypeBtnText, { color: payType === t ? colors.primary : colors.foreground }]}>
                    {t === "fixed" ? "Fixed total" : "Per hour"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              {payType === "fixed" ? "Total pay ($) *" : "Hourly rate ($/hr) *"}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
              value={payDollars}
              onChangeText={setPayDollars}
              placeholder="0.00"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
            />
          </View>
        )}

        {/* ── Step 2: Location + Review ── */}
        {step === 2 && (
          <View style={styles.formFields}>
            <Pressable
              style={[styles.detectLocBtn, { backgroundColor: colors.secondary, borderColor: colors.border, opacity: detectingLoc ? 0.6 : 1 }]}
              onPress={handleDetectLocation}
              disabled={detectingLoc}
            >
              {detectingLoc
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Feather name="crosshair" size={15} color={colors.primary} />}
              <Text style={[styles.detectLocText, { color: colors.primary }]}>
                {detectingLoc ? "Detecting…" : "Use My Location"}
              </Text>
            </Pressable>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>City</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
              value={city}
              onChangeText={setCity}
              placeholder="e.g. Austin"
              placeholderTextColor={colors.mutedForeground}
            />
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>State (2-letter code)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
              value={stateCode}
              onChangeText={(t) => setStateCode(t.toUpperCase().slice(0, 2))}
              placeholder="TX"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="characters"
              maxLength={2}
            />
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Location details (optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
              value={locationText}
              onChangeText={setLocationText}
              placeholder="e.g. 123 Main St, Apt 4B, blue gate"
              placeholderTextColor={colors.mutedForeground}
            />

            {/* Review summary */}
            <View style={[styles.reviewCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Text style={[styles.reviewLabel, { color: colors.mutedForeground }]}>Review your gig</Text>
              <Text style={[styles.reviewTitle, { color: colors.foreground }]}>{title}</Text>
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewMeta, { color: colors.mutedForeground }]}>Category:</Text>
                <Text style={[styles.reviewMeta, { color: colors.foreground }]}>
                  {selectedCat ? `${selectedCat.emoji} ${selectedCat.label}` : catId}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewMeta, { color: colors.mutedForeground }]}>Pay:</Text>
                <Text style={[styles.reviewMeta, { color: colors.primary }]}>
                  {payDollars ? `$${parseFloat(payDollars).toFixed(2)}${payType === "hourly" ? "/hr" : ""}` : "—"}
                </Text>
              </View>
              {(city || stateCode) && (
                <View style={styles.reviewRow}>
                  <Text style={[styles.reviewMeta, { color: colors.mutedForeground }]}>Location:</Text>
                  <Text style={[styles.reviewMeta, { color: colors.foreground }]}>
                    {city}{stateCode ? `, ${stateCode}` : ""}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Next / Post button */}
        <Pressable
          style={[
            styles.applyBtn,
            { backgroundColor: colors.primary, opacity: posting ? 0.6 : 1, marginTop: 12 },
          ]}
          onPress={handleNext}
          disabled={posting}
        >
          {posting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.applyBtnText}>
              {step < POST_STEPS.length - 1 ? "Continue" : "Post Gig"}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ── Main GigsScreen ───────────────────────────────────────────────────────────

export default function GigsScreen({ onOpenDrawer, externalMode }: { onOpenDrawer: () => void; externalMode?: "hire" | "work" }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, isLoaded } = useUser();
  const qc = useQueryClient();

  const router = useRouter();
  const { data: identity } = useGetUserIdentity({
    query: { queryKey: getGetUserIdentityQueryKey() },
  });

  const [mode, setMode] = useState<Mode>("hire");

  useEffect(() => {
    if (externalMode) setMode(externalMode as Mode);
  }, [externalMode]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>("Detecting location…");
  const [workRadius, setWorkRadius] = useState<number | null>(null);
  const [workerLat, setWorkerLat] = useState<number | null>(null);
  const [workerLon, setWorkerLon] = useState<number | null>(null);

  const handleModeChange = useCallback(
    (m: Mode) => {
      if (m === "work" && identity?.status !== "verified") {
        Alert.alert(
          "Identity Verification Required",
          "You must verify your identity before accessing Work mode. This protects both hirers and workers on the platform.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Verify Now", onPress: () => router.push("/identity-verification") },
          ]
        );
        return;
      }
      setMode(m);
    },
    [identity?.status, router]
  );

  // modal state
  const [showPost, setShowPost] = useState(true);
  const [detailJobId, setDetailJobId] = useState<number | null>(null);
  const [myJobId, setMyJobId] = useState<number | null>(null);

  // work-mode pagination
  const [workCursor, setWorkCursor] = useState<number | undefined>(undefined);
  const [workJobs, setWorkJobs] = useState<GigJob[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

  const meId = user?.id ?? "";
  const meDisplayName = user?.fullName ?? user?.firstName ?? "User";

  // ── Location detection (Work mode) ──────────────────────────────────────────
  useEffect(() => {
    if (mode !== "work") return;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setLocationLabel("Location off"); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setWorkerLat(loc.coords.latitude);
      setWorkerLon(loc.coords.longitude);
      const [place] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (place?.city && place?.region) {
        setLocationLabel(`${place.city}, ${place.region}`);
      } else if (place?.city) {
        setLocationLabel(place.city);
      }
    })();
  }, [mode]);

  // ── Work-mode job list ───────────────────────────────────────────────────────
  const workParams = {
    category: activeCat ?? undefined,
    limit: 20,
    ...(workRadius && workerLat !== null && workerLon !== null
      ? { lat: workerLat, lon: workerLon, radius: workRadius }
      : {}),
  };
  const { data: workPage, isLoading: workLoading } = useListGigJobs(workParams);

  useEffect(() => {
    const page = workPage as { items: GigJob[]; nextCursor: number | null } | undefined;
    if (!page) return;
    setWorkJobs(page.items);
    setWorkCursor(page.nextCursor ?? undefined);
  }, [workPage]);

  useEffect(() => {
    setWorkJobs([]);
    setWorkCursor(undefined);
  }, [activeCat]);

  useEffect(() => {
    setWorkJobs([]);
    setWorkCursor(undefined);
  }, [workRadius]);

  const handleLoadMore = useCallback(async () => {
    if (!workCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      let url = `/api/gigs/jobs?cursor=${workCursor}&limit=20`;
      if (activeCat) url += `&category=${activeCat}`;
      if (workRadius && workerLat !== null && workerLon !== null) {
        url += `&lat=${workerLat}&lon=${workerLon}&radius=${workRadius}`;
      }
      const res = await (await fetch(url)).json() as { items: GigJob[]; nextCursor: number | null };
      setWorkJobs((prev) => [...prev, ...res.items]);
      setWorkCursor(res.nextCursor ?? undefined);
    } finally {
      setLoadingMore(false);
    }
  }, [workCursor, loadingMore, activeCat, workRadius, workerLat, workerLon]);

  // ── My posted jobs (Hire mode) ───────────────────────────────────────────────
  const { data: myJobs = [], isLoading: myJobsLoading, refetch: refetchMyJobs } = useListMyGigJobs();

  // ── My applications (Work mode) ──────────────────────────────────────────────
  const { data: myApps = [], isLoading: myAppsLoading } = useListMyGigApplications();

  const handleCat = useCallback((id: string) => {
    Haptics.selectionAsync();
    setActiveCat((prev) => (prev === id ? null : id));
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
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
        {mode === "hire" ? (
          <Pressable
            style={[styles.headerPostBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowPost(true)}
            hitSlop={8}
          >
            <Feather name="plus" size={15} color="#fff" />
            <Text style={styles.headerPostBtnText}>Post Gig</Text>
          </Pressable>
        ) : (
          <WorkDailyLimit />
        )}
      </View>

      {/* ── Category chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.catBar, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.catBarContent}
      >
        {/* All chip */}
        <Pressable
          style={[
            styles.catChip,
            {
              backgroundColor: activeCat === null ? colors.primary + "18" : colors.secondary,
              borderColor: activeCat === null ? colors.primary : colors.border,
            },
          ]}
          onPress={() => { Haptics.selectionAsync(); setActiveCat(null); }}
        >
          <Text style={[styles.catChipText, { color: activeCat === null ? colors.primary : colors.foreground, fontWeight: activeCat === null ? "700" : "500" }]}>
            All
          </Text>
        </Pressable>
        {GIG_CATS.map((cat) => (
          <CategoryChip
            key={cat.id}
            cat={cat}
            isActive={activeCat === cat.id}
            onPress={() => handleCat(cat.id)}
          />
        ))}
      </ScrollView>

      {/* ── Hire mode ── */}
      {mode === "hire" ? (
        <>
          {!isLoaded || !meId ? (
            <View style={styles.centred}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Sign in to post gigs and hire workers.
              </Text>
            </View>
          ) : (
            <FlatList
              data={(myJobs as GigJob[]).filter(
                (j) => !activeCat || j.category === activeCat,
              )}
              keyExtractor={(j) => String(j.id)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: insets.bottom + 24 },
              ]}
              refreshing={myJobsLoading}
              onRefresh={refetchMyJobs}
              ListHeaderComponent={
                <View style={styles.hireHeader}>
                  {/* Post a Gig CTA */}
                  <Pressable
                    style={[
                      styles.postJobCard,
                      {
                        backgroundColor: colors.primary + "12",
                        borderColor: colors.primary + "40",
                      },
                    ]}
                    onPress={() => setShowPost(true)}
                  >
                    <View style={[styles.postJobIcon, { backgroundColor: colors.primary }]}>
                      <Feather name="plus" size={22} color="#ffffff" />
                    </View>
                    <View style={styles.postJobText}>
                      <Text style={[styles.postJobTitle, { color: colors.foreground }]}>
                        Post a Gig
                      </Text>
                      <Text style={[styles.postJobSub, { color: colors.mutedForeground }]}>
                        Describe what you need · set your pay
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={colors.primary} />
                  </Pressable>

                  {(myJobs as GigJob[]).length > 0 && (
                    <Text
                      style={[styles.sectionHeading, { color: colors.mutedForeground }]}
                    >
                      My Posted Gigs
                    </Text>
                  )}
                </View>
              }
              renderItem={({ item: job }) => (
                <GigJobCard
                  job={job}
                  showStatus
                  onPress={() => setMyJobId(job.id)}
                />
              )}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              ListEmptyComponent={
                myJobsLoading ? (
                  <SkeletonList count={3} />
                ) : (
                  <Text
                    style={[
                      styles.emptyText,
                      { color: colors.mutedForeground, marginTop: 24 },
                    ]}
                  >
                    You haven't posted any gigs yet.
                  </Text>
                )
              }
            />
          )}
        </>
      ) : (
        /* ── Work mode ── */
        <FlatList
          data={workJobs}
          keyExtractor={(j) => String(j.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={
            <View style={styles.workHeader}>
              {/* Active gig banner — shows when worker has an active tracking record */}
              <GigActiveBanner onOpen={(jobId) => setDetailJobId(jobId)} />

              {/* Location + radius bar */}
              <View style={{ gap: 8 }}>
                <View
                  style={[
                    styles.radiusBar,
                    { backgroundColor: colors.secondary, borderColor: colors.border },
                  ]}
                >
                  <Feather name="map-pin" size={14} color={colors.primary} />
                  <Text style={[styles.radiusLabel, { color: colors.foreground, flex: 1 }]}>
                    {locationLabel}
                  </Text>
                </View>
                <View style={styles.radiusBtnRow}>
                  <Text style={[styles.radiusBtnLabel, { color: colors.mutedForeground }]}>Within:</Text>
                  {([10, 25, 50, 100] as const).map((mi) => (
                    <Pressable
                      key={mi}
                      style={[
                        styles.radiusBtn,
                        {
                          backgroundColor: workRadius === mi ? colors.primary + "18" : colors.secondary,
                          borderColor: workRadius === mi ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => { Haptics.selectionAsync(); setWorkRadius((prev) => prev === mi ? null : mi); }}
                    >
                      <Text style={[styles.radiusBtnText, { color: workRadius === mi ? colors.primary : colors.foreground }]}>
                        {mi}mi
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Verification banner */}
              <View
                style={[
                  styles.verifyBanner,
                  { backgroundColor: colors.secondary, borderColor: colors.border },
                ]}
              >
                <Feather name="shield" size={16} color={colors.primary} />
                <Text style={[styles.verifyText, { color: colors.foreground }]}>
                  Identity verification required to receive payouts
                </Text>
                <View style={[styles.verifyBadge, { backgroundColor: colors.primary + "18" }]}>
                  <Text style={[styles.verifyBadgeText, { color: colors.primary }]}>
                    Soon
                  </Text>
                </View>
              </View>

              {/* My applications */}
              {isLoaded && meId && (myApps as GigApplicationWithJob[]).length > 0 && (
                <>
                  <Text
                    style={[styles.sectionHeading, { color: colors.mutedForeground }]}
                  >
                    My Applications
                  </Text>
                  {(myApps as GigApplicationWithJob[]).map((app) => (
                    <Pressable
                      key={app.id}
                      style={[
                        styles.myAppCard,
                        {
                          backgroundColor: colors.card,
                          borderColor:
                            app.status === "accepted"
                              ? "#22c55e44"
                              : app.status === "rejected"
                              ? "#ef444444"
                              : colors.border,
                        },
                      ]}
                      onPress={() => setDetailJobId(app.job.id)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.myAppTitle, { color: colors.foreground }]}
                          numberOfLines={1}
                        >
                          {app.job.title}
                        </Text>
                        <Text
                          style={[styles.myAppMeta, { color: colors.mutedForeground }]}
                        >
                          {getCat(app.job.category).emoji}{" "}
                          {getCat(app.job.category).label} ·{" "}
                          {fmtPay(app.job.payAmountCents, app.job.payType)}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: appStatusColor(app.status) + "22",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: appStatusColor(app.status) },
                          ]}
                        >
                          {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </>
              )}

              <Text
                style={[
                  styles.sectionHeading,
                  { color: colors.mutedForeground, marginTop: 4 },
                ]}
              >
                {activeCat
                  ? `Open gigs · ${getCat(activeCat).label}`
                  : "All open gigs"}
              </Text>
            </View>
          }
          renderItem={({ item: job }) => (
            <GigJobCard job={job} onPress={() => setDetailJobId(job.id)} />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                size="small"
                color={colors.mutedForeground}
                style={{ marginTop: 16 }}
              />
            ) : null
          }
          ListEmptyComponent={
            workLoading ? (
              <SkeletonList count={5} />
            ) : (
              <Text
                style={[
                  styles.emptyText,
                  { color: colors.mutedForeground, marginTop: 24, textAlign: "center" },
                ]}
              >
                No open gigs in this category yet.{"\n"}Check back soon!
              </Text>
            )
          }
        />
      )}

      {/* ── Post gig modal ── */}
      <Modal
        visible={showPost}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPost(false)}
      >
        <PostGigModal
          meId={meId}
          meDisplayName={meDisplayName}
          onClose={() => setShowPost(false)}
          onPosted={() => setShowPost(false)}
        />
      </Modal>

      {/* ── Job detail modal (Work) ── */}
      <Modal
        visible={detailJobId !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailJobId(null)}
      >
        {detailJobId !== null && (
          <JobDetailModal
            jobId={detailJobId}
            meId={meId}
            onClose={() => setDetailJobId(null)}
          />
        )}
      </Modal>

      {/* ── My job modal (Hire) ── */}
      <Modal
        visible={myJobId !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setMyJobId(null)}
      >
        {myJobId !== null && (
          <MyJobModal
            jobId={myJobId}
            meId={meId}
            onClose={() => setMyJobId(null)}
          />
        )}
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // header
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
  headerPostBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
  },
  headerPostBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  // mode toggle
  toggleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  toggleLabel: { fontSize: 13, fontWeight: "600" },

  // category bar
  catBar: { borderBottomWidth: StyleSheet.hairlineWidth, maxHeight: 60 },
  catBarContent: { paddingHorizontal: 14, paddingVertical: 10, gap: 8, alignItems: "center" },
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
  catChipText: { fontSize: 13 },
  radiusBtnRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  radiusBtnLabel: { fontSize: 12, fontWeight: "500", marginRight: 2 },
  radiusBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1 },
  radiusBtnText: { fontSize: 12, fontWeight: "600" },

  // list
  listContent: { padding: 16, gap: 0 },
  centred: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  emptyText: { fontSize: 14, textAlign: "center" },

  // hire header
  hireHeader: { gap: 14, marginBottom: 14 },
  postJobCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  postJobIcon: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: "center", alignItems: "center",
  },
  postJobText: { flex: 1 },
  postJobTitle: { fontSize: 16, fontWeight: "700" },
  postJobSub: { fontSize: 13, marginTop: 2 },

  // section heading
  sectionHeading: {
    fontSize: 12, fontWeight: "700", textTransform: "uppercase",
    letterSpacing: 0.6, marginBottom: 8,
  },

  // job card
  jobCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  jobCatBadge: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  jobEmoji: { fontSize: 22 },
  jobBody: { flex: 1, gap: 5 },
  jobTitle: { fontSize: 14, lineHeight: 19, fontWeight: "500" },
  jobMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: "600" },
  catTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  catTagText: { fontSize: 11, fontWeight: "500" },
  locRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  locText: { fontSize: 11 },
  appCount: { fontSize: 11, marginTop: 1 },
  jobPay: { alignItems: "flex-end" },
  jobPayAmount: { fontSize: 16, fontWeight: "700" },
  jobPayType: { fontSize: 11, marginTop: 1 },

  // work header
  workHeader: { gap: 12, marginBottom: 4 },

  // active-gig live banner
  activeBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  activeDot: { width: 10, height: 10, borderRadius: 5 },
  activeBannerLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  activeBannerJob: { fontSize: 14, fontWeight: "600" },

  radiusBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 12, borderRadius: 14, borderWidth: 1,
  },
  radiusLabel: { flex: 1, fontSize: 14, fontWeight: "500" },
  verifyBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  verifyText: { flex: 1, fontSize: 13, lineHeight: 18 },
  verifyBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  verifyBadgeText: { fontSize: 12, fontWeight: "600" },

  // my applications card (work mode)
  myAppCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8,
  },
  myAppTitle: { fontSize: 14, fontWeight: "500", marginBottom: 2 },
  myAppMeta: { fontSize: 12 },

  // sheet
  detailSheet: { flex: 1 },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: "center", marginTop: 10, marginBottom: 4,
  },
  sheetTopRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetBack: { flexDirection: "row", alignItems: "center", gap: 4 },
  sheetTitle: { fontSize: 17, fontWeight: "700" },
  detailContent: { padding: 20, gap: 14, paddingBottom: 32 },

  // detail
  detailHeader: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  detailCatBadge: {
    width: 56, height: 56, borderRadius: 16,
    justifyContent: "center", alignItems: "center",
  },
  detailTitle: { fontSize: 18, fontWeight: "700", lineHeight: 24, marginTop: 4, flex: 1 },
  detailMetaRow: {
    flexDirection: "row", borderWidth: 1, borderRadius: 14, overflow: "hidden",
  },
  detailMetaItem: { flex: 1, padding: 12, alignItems: "center" },
  detailMetaLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", marginBottom: 4 },
  detailMetaValue: { fontSize: 14, fontWeight: "700" },
  detailMetaDivider: { width: 1 },
  detailSectionLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  detailDesc: { fontSize: 14, lineHeight: 22 },
  detailApplicants: { fontSize: 13 },

  // worker row
  workerRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  workerText: { fontSize: 14 },

  // completed banner
  completedBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 14, borderRadius: 12, borderWidth: 1,
  },
  completedText: { flex: 1, fontSize: 13, lineHeight: 18 },

  // action btn
  actionBtn: {
    flexDirection: "row", justifyContent: "center", alignItems: "center",
    gap: 8, padding: 14, borderRadius: 14,
  },
  actionBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  // my app banner
  myAppBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  myAppText: { flex: 1, fontSize: 13, fontWeight: "600" },

  // apply
  applyInput: {
    borderWidth: 1, borderRadius: 12, padding: 12,
    fontSize: 14, minHeight: 90, textAlignVertical: "top",
  },
  applyRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  applyCancel: {
    flex: 1, padding: 13, borderRadius: 12, borderWidth: 1,
    alignItems: "center",
  },
  applyCancelText: { fontSize: 14, fontWeight: "600" },
  applyBtn: {
    flex: 1, padding: 14, borderRadius: 14, alignItems: "center",
  },
  applyBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  // msg CTA
  msgCTA: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  msgCTAText: { flex: 1, fontSize: 14, fontWeight: "600" },

  // close btn
  closeBtn: {
    padding: 14, borderRadius: 14, borderWidth: 1, alignItems: "center",
    marginTop: 8,
  },
  closeBtnText: { fontSize: 14, fontWeight: "600" },

  // applicant card
  appCard: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  appCardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  appAvatar: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  appName: { fontSize: 14, fontWeight: "600" },
  appStatus: { fontSize: 12, fontWeight: "600", marginTop: 1 },
  acceptBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  acceptBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  appMessage: { fontSize: 13, fontStyle: "italic", lineHeight: 18 },

  // message thread
  msgWrap: { flex: 1 },
  msgList: { flex: 1 },
  msgListContent: { padding: 16, gap: 10 },
  msgLoading: { flex: 1, justifyContent: "center", alignItems: "center" },
  msgEmpty: { textAlign: "center", marginTop: 40, fontSize: 14 },
  msgBubbleRow: { flexDirection: "row" },
  msgBubbleRowMe: { justifyContent: "flex-end" },
  msgBubbleRowThem: { justifyContent: "flex-start" },
  msgBubble: {
    maxWidth: "78%", padding: 12, borderRadius: 16, borderWidth: 1, gap: 4,
  },
  msgSender: { fontSize: 11, fontWeight: "600" },
  msgBody: { fontSize: 14, lineHeight: 20 },
  msgInputRow: {
    flexDirection: "row", gap: 10, padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: "flex-end",
  },
  msgInput: {
    flex: 1, borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, maxHeight: 100,
  },
  msgSendBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: "center", alignItems: "center",
  },

  // post gig form
  stepPills: { flexDirection: "row", justifyContent: "center", gap: 24, paddingVertical: 14 },
  stepPillWrap: { alignItems: "center", gap: 4 },
  stepPillDot: { width: 26, height: 26, borderRadius: 13, justifyContent: "center", alignItems: "center" },
  stepPillNum: { fontSize: 12, fontWeight: "700" },
  stepPillLabel: { fontSize: 11, fontWeight: "600" },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  catGridItem: {
    width: "47%", padding: 14, borderRadius: 14, borderWidth: 1.5,
    alignItems: "center", gap: 6,
  },
  catGridEmoji: { fontSize: 28 },
  catGridLabel: { fontSize: 14, fontWeight: "600" },
  formFields: { gap: 10 },
  fieldLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15,
  },
  inputMulti: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, minHeight: 100, textAlignVertical: "top",
  },
  payTypeRow: { flexDirection: "row", gap: 10 },
  payTypeBtn: {
    flex: 1, padding: 12, borderRadius: 12, borderWidth: 1.5,
    alignItems: "center",
  },
  payTypeBtnText: { fontSize: 14, fontWeight: "600" },
  reviewCard: { padding: 16, borderRadius: 14, borderWidth: 1, gap: 8 },
  reviewLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  reviewTitle: { fontSize: 16, fontWeight: "700" },
  reviewRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  reviewMeta: { fontSize: 13 },

  // detect location button
  detectLocBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 11, borderRadius: 12, borderWidth: 1,
  },
  detectLocText: { fontSize: 14, fontWeight: "600" },

  // tracking panels
  trackPanel: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 12, marginTop: 8 },
  trackTitle: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  trackSub: { fontSize: 12 },
  trackActionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 13, borderRadius: 12,
  },
  trackBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  trackStepsRow: { flexDirection: "row", alignItems: "flex-start" },
  trackStepCol: { flex: 1, alignItems: "center", gap: 4 },
  trackStepDot: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  trackStepLabel: { fontSize: 9, textAlign: "center", fontWeight: "600" },
  trackStepConnector: { height: 2, flex: 0.4, marginTop: 11 },
  trackWaitRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 12, borderRadius: 10, borderWidth: 1,
  },
  trackWaitText: { fontSize: 13, flex: 1 },
  trackStatusDot: { width: 10, height: 10, borderRadius: 5 },

  // daily limit badge (work mode header)
  dailyLimitBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
  },
  dailyLimitText: { fontSize: 12, fontWeight: "600" },
});
