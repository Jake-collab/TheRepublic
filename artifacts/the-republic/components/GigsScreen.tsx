/**
 * GigsScreen — Section 4: full gig work flow.
 *
 * Hire mode  → post jobs, view applicants, accept a worker, start & complete.
 * Work mode  → browse open jobs, apply, track your applications, message hirer.
 */
import { Feather } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
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
  useListGigMessages,
  useCreateGigJob,
  useApplyToGigJob,
  useAcceptGigApplication,
  useStartGigJob,
  useCompleteGigJob,
  useSendGigMessage,
  getListGigJobsQueryKey,
  getListMyGigJobsQueryKey,
  getListMyGigApplicationsQueryKey,
  getGetGigJobQueryKey,
  getListGigMessagesQueryKey,
  useGetUserIdentity,
  getGetUserIdentityQueryKey,
} from "@workspace/api-client-react";
import type {
  GigJob,
  GigApplication,
  GigApplicationWithJob,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

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
          {job.city ? (
            <View style={styles.locRow}>
              <Feather name="map-pin" size={10} color={colors.mutedForeground} />
              <Text style={[styles.locText, { color: colors.mutedForeground }]}>
                {job.city}{job.stateCode ? `, ${job.stateCode}` : ""}
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

// ── MessageThread ─────────────────────────────────────────────────────────────

function MessageThread({
  jobId,
  meId,
}: {
  jobId: number;
  meId: string;
}) {
  const colors = useColors();
  const qc = useQueryClient();
  const [msgText, setMsgText] = useState("");
  const listRef = useRef<FlatList>(null);

  const { data: messages = [], isLoading } = useListGigMessages(jobId);
  const { mutateAsync: send, isPending: sending } = useSendGigMessage();

  const handleSend = async () => {
    const body = msgText.trim();
    if (!body || sending) return;
    setMsgText("");
    await send({ id: jobId, data: { body } });
    qc.invalidateQueries({ queryKey: getListGigMessagesQueryKey(jobId) });
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  if (isLoading) {
    return (
      <View style={styles.msgLoading}>
        <ActivityIndicator size="small" color={colors.mutedForeground} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.msgWrap}
      keyboardVerticalOffset={100}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => String(m.id)}
        style={styles.msgList}
        contentContainerStyle={styles.msgListContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <Text style={[styles.msgEmpty, { color: colors.mutedForeground }]}>
            No messages yet — say hello!
          </Text>
        }
        renderItem={({ item: msg }) => {
          const isMe = msg.senderId === meId;
          return (
            <View
              style={[
                styles.msgBubbleRow,
                isMe ? styles.msgBubbleRowMe : styles.msgBubbleRowThem,
              ]}
            >
              <View
                style={[
                  styles.msgBubble,
                  {
                    backgroundColor: isMe ? colors.primary : colors.secondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                {!isMe && (
                  <Text style={[styles.msgSender, { color: colors.mutedForeground }]}>
                    {msg.senderName}
                  </Text>
                )}
                <Text
                  style={[
                    styles.msgBody,
                    { color: isMe ? "#ffffff" : colors.foreground },
                  ]}
                >
                  {msg.body}
                </Text>
              </View>
            </View>
          );
        }}
      />
      <View
        style={[
          styles.msgInputRow,
          { borderTopColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <TextInput
          style={[
            styles.msgInput,
            {
              backgroundColor: colors.secondary,
              color: colors.foreground,
              borderColor: colors.border,
            },
          ]}
          value={msgText}
          onChangeText={setMsgText}
          placeholder="Message…"
          placeholderTextColor={colors.mutedForeground}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          multiline
        />
        <Pressable
          style={[styles.msgSendBtn, { backgroundColor: colors.primary, opacity: sending ? 0.5 : 1 }]}
          onPress={handleSend}
          disabled={sending}
        >
          <Feather name="send" size={16} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
  const [applyMsg, setApplyMsg] = useState("");
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [showMessages, setShowMessages] = useState(false);

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

      {showMessages && (isWorker || isMyJob) ? (
        <>
          <View style={[styles.sheetTopRow, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowMessages(false)} style={styles.sheetBack}>
              <Feather name="chevron-left" size={22} color={colors.foreground} />
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Messages</Text>
            </Pressable>
          </View>
          <MessageThread jobId={jobId} meId={meId} />
        </>
      ) : (
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

          {/* ─ Messages (if active worker) ─ */}
          {(isWorker && job.status === "in_progress") && (
            <Pressable
              style={[styles.msgCTA, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={() => setShowMessages(true)}
            >
              <Feather name="message-circle" size={18} color={colors.primary} />
              <Text style={[styles.msgCTAText, { color: colors.foreground }]}>Open Job Chat</Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}

          <Pressable onPress={onClose} style={[styles.closeBtn, { borderColor: colors.border }]}>
            <Text style={[styles.closeBtnText, { color: colors.foreground }]}>Close</Text>
          </Pressable>
        </ScrollView>
      )}
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
  const [showMessages, setShowMessages] = useState(false);

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

      {showMessages ? (
        <>
          <View style={[styles.sheetTopRow, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowMessages(false)} style={styles.sheetBack}>
              <Feather name="chevron-left" size={22} color={colors.foreground} />
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Job Chat</Text>
            </Pressable>
          </View>
          <MessageThread jobId={jobId} meId={meId} />
        </>
      ) : (
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

          {/* Action buttons */}
          {job.status === "open" && job.workerId && (
            <Pressable
              style={[styles.actionBtn, { backgroundColor: "#f59e0b" }]}
              onPress={handleStart}
              disabled={starting}
            >
              {starting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="play" size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>Confirm Start</Text>
                </>
              )}
            </Pressable>
          )}

          {job.status === "in_progress" && (
            <>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: "#22c55e" }]}
                onPress={handleComplete}
                disabled={completing}
              >
                {completing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="check" size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>Mark Complete</Text>
                  </>
                )}
              </Pressable>
              <Pressable
                style={[styles.msgCTA, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                onPress={() => setShowMessages(true)}
              >
                <Feather name="message-circle" size={18} color={colors.primary} />
                <Text style={[styles.msgCTAText, { color: colors.foreground }]}>Job Chat</Text>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </Pressable>
            </>
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
        <Pressable onPress={onClose}>
          <Feather name="x" size={22} color={colors.mutedForeground} />
        </Pressable>
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

export default function GigsScreen({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, isLoaded } = useUser();
  const qc = useQueryClient();

  const router = useRouter();
  const { data: identity } = useGetUserIdentity({
    query: { queryKey: getGetUserIdentityQueryKey() },
  });

  const [mode, setMode] = useState<Mode>("hire");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>("Detecting location…");

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
  const [showPost, setShowPost] = useState(false);
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
  const workParams = { category: activeCat ?? undefined, limit: 20 };
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

  const handleLoadMore = useCallback(async () => {
    if (!workCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await (await fetch(`/api/gigs/jobs?cursor=${workCursor}&limit=20${activeCat ? `&category=${activeCat}` : ""}`)).json() as { items: GigJob[]; nextCursor: number | null };
      setWorkJobs((prev) => [...prev, ...res.items]);
      setWorkCursor(res.nextCursor ?? undefined);
    } finally {
      setLoadingMore(false);
    }
  }, [workCursor, loadingMore, activeCat]);

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
        <ModeToggle mode={mode} onChange={handleModeChange} />
      </View>

      {/* ── Category chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.catBar, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.catBarContent}
      >
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
                  <ActivityIndicator
                    size="small"
                    color={colors.mutedForeground}
                    style={{ marginTop: 32 }}
                  />
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
              {/* Location bar */}
              <View
                style={[
                  styles.radiusBar,
                  { backgroundColor: colors.secondary, borderColor: colors.border },
                ]}
              >
                <Feather name="map-pin" size={14} color={colors.primary} />
                <Text style={[styles.radiusLabel, { color: colors.foreground }]}>
                  {locationLabel}
                </Text>
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
              <ActivityIndicator
                size="small"
                color={colors.mutedForeground}
                style={{ marginTop: 32 }}
              />
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
});
