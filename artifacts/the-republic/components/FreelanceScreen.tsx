/**
 * FreelanceScreen — Section 5: remote freelance project marketplace.
 *
 * Hire mode  → post projects with a budget range, review bids, accept a
 *              freelancer, then manage milestones and chat.
 * Work mode  → browse open projects by category, submit bids with a cover
 *              letter, track your active contracts through milestones.
 */
import { Feather } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import * as Haptics from "expo-haptics";
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
  useListFreelanceProjects,
  useGetFreelanceProject,
  useListMyFreelanceProjects,
  useListMyFreelanceBids,
  useListFreelanceMessages,
  useCreateFreelanceProject,
  useSubmitFreelanceBid,
  useAcceptFreelanceBid,
  useCreateFreelanceMilestone,
  useUpdateFreelanceMilestone,
  useSendFreelanceMessage,
  getListFreelanceProjectsQueryKey,
  getGetFreelanceProjectQueryKey,
  getListMyFreelanceProjectsQueryKey,
  getListMyFreelanceBidsQueryKey,
  getListFreelanceMessagesQueryKey,
} from "@workspace/api-client-react";
import type {
  FreelanceProject,
  FreelanceBid,
  FreelanceMilestone,
  FreelanceBidWithProject,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = "hire" | "work";

// ── Category constants ────────────────────────────────────────────────────────

const FL_CATS = [
  { id: "design",     label: "Design",      emoji: "🎨" },
  { id: "dev",        label: "Development", emoji: "💻" },
  { id: "writing",    label: "Writing",     emoji: "✍️"  },
  { id: "video",      label: "Video",       emoji: "🎬" },
  { id: "marketing",  label: "Marketing",   emoji: "📣" },
  { id: "music",      label: "Music",       emoji: "🎵" },
  { id: "photo",      label: "Photography", emoji: "📷" },
  { id: "consulting", label: "Consulting",  emoji: "💡" },
] as const;

function getCat(id: string) {
  return FL_CATS.find((c) => c.id === id) ?? { id, label: id, emoji: "💼" };
}

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmtBudget(minCents: number, maxCents: number, budgetType: string) {
  const fmt = (c: number) =>
    "$" + (c / 100).toLocaleString("en-US", { minimumFractionDigits: 0 });
  if (minCents === maxCents) {
    return budgetType === "hourly" ? `${fmt(minCents)}/hr` : fmt(minCents);
  }
  const suffix = budgetType === "hourly" ? "/hr" : "";
  return `${fmt(minCents)}–${fmt(maxCents)}${suffix}`;
}

function fmtProposed(cents: number, budgetType: string) {
  return (
    "$" +
    (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 }) +
    (budgetType === "hourly" ? "/hr" : "")
  );
}

function projStatusColor(status: string) {
  switch (status) {
    case "open":         return "#22c55e";
    case "in_progress":  return "#f59e0b";
    case "completed":    return "#64748b";
    case "cancelled":    return "#ef4444";
    default:             return "#64748b";
  }
}

function projStatusLabel(status: string) {
  switch (status) {
    case "open":         return "Open";
    case "in_progress":  return "In Progress";
    case "completed":    return "Completed";
    case "cancelled":    return "Cancelled";
    default:             return status;
  }
}

function bidStatusColor(status: string) {
  switch (status) {
    case "pending":   return "#f59e0b";
    case "accepted":  return "#22c55e";
    case "rejected":  return "#ef4444";
    case "withdrawn": return "#64748b";
    default:          return "#64748b";
  }
}

function msStatusMeta(status: string) {
  switch (status) {
    case "pending":     return { color: "#64748b", label: "Not started", dot: "○" };
    case "in_progress": return { color: "#f59e0b", label: "In Progress",  dot: "◑" };
    case "submitted":   return { color: "#3b82f6", label: "In Review",    dot: "◕" };
    case "approved":    return { color: "#22c55e", label: "Approved",     dot: "●" };
    default:            return { color: "#64748b", label: status,          dot: "○" };
  }
}

// ── ModeToggle ────────────────────────────────────────────────────────────────

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const colors = useColors();
  return (
    <Pressable
      style={[styles.toggleWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onChange(mode === "hire" ? "work" : "hire");
      }}
      hitSlop={8}
    >
      <Text style={[styles.toggleLabel, { color: mode === "hire" ? colors.primary : colors.mutedForeground }]}>
        Hire
      </Text>
      <Feather name="refresh-cw" size={13} color={colors.foreground} />
      <Text style={[styles.toggleLabel, { color: mode === "work" ? colors.primary : colors.mutedForeground }]}>
        Work
      </Text>
    </Pressable>
  );
}

// ── CategoryTab ───────────────────────────────────────────────────────────────

function CategoryTab({
  cat,
  isActive,
  onPress,
}: {
  cat: (typeof FL_CATS)[number];
  isActive: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      style={[
        styles.catTab,
        { borderBottomWidth: isActive ? 2 : 0, borderBottomColor: colors.primary },
      ]}
      onPress={onPress}
      hitSlop={4}
    >
      <Text style={styles.catTabEmoji}>{cat.emoji}</Text>
      <Text
        style={[
          styles.catTabLabel,
          { color: isActive ? colors.primary : colors.mutedForeground, fontWeight: isActive ? "700" : "400" },
        ]}
      >
        {cat.label}
      </Text>
    </Pressable>
  );
}

// ── ProjectCard ───────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  showStatus,
  onPress,
}: {
  project: FreelanceProject;
  showStatus?: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const cat = getCat(project.category);
  const tags = project.skillTags
    ? project.skillTags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 3)
    : [];

  return (
    <Pressable
      style={[styles.projectCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
    >
      <View style={styles.projectTop}>
        <Text style={[styles.projectEmoji]}>{cat.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.projectTitle, { color: colors.foreground }]} numberOfLines={2}>
            {project.title}
          </Text>
          <Text style={[styles.projectHirer, { color: colors.mutedForeground }]}>
            by {project.hirerName}
          </Text>
        </View>
        <View style={styles.projectBudgetCol}>
          <Text style={[styles.projectBudget, { color: colors.primary }]}>
            {fmtBudget(project.budgetMinCents, project.budgetMaxCents, project.budgetType)}
          </Text>
          <Text style={[styles.projectBudgetType, { color: colors.mutedForeground }]}>
            {project.budgetType}
          </Text>
        </View>
      </View>

      <Text style={[styles.projectDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
        {project.description}
      </Text>

      <View style={styles.projectBottom}>
        {showStatus && (
          <View style={[styles.statusPill, { backgroundColor: projStatusColor(project.status) + "22" }]}>
            <Text style={[styles.statusPillText, { color: projStatusColor(project.status) }]}>
              {projStatusLabel(project.status)}
            </Text>
          </View>
        )}
        {tags.map((tag) => (
          <View key={tag} style={[styles.skillTag, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.skillTagText, { color: colors.mutedForeground }]}>{tag}</Text>
          </View>
        ))}
        <View style={styles.projectBidsBadge}>
          <Feather name="users" size={11} color={colors.mutedForeground} />
          <Text style={[styles.projectBidsText, { color: colors.mutedForeground }]}>
            {project.bidCount} bid{project.bidCount !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// ── MilestoneRow ──────────────────────────────────────────────────────────────

function MilestoneRow({
  ms,
  isHirer,
  isWorker,
  onAdvance,
}: {
  ms: FreelanceMilestone;
  isHirer: boolean;
  isWorker: boolean;
  onAdvance: (milestoneId: number, nextStatus: string) => void;
}) {
  const colors = useColors();
  const meta = msStatusMeta(ms.status);

  const canAdvance =
    (isHirer  && ms.status === "pending")     ||
    (isWorker && ms.status === "in_progress") ||
    (isHirer  && ms.status === "submitted");

  const nextStatus =
    ms.status === "pending"     ? "in_progress" :
    ms.status === "in_progress" ? "submitted"   :
    ms.status === "submitted"   ? "approved"    : null;

  const actionLabel =
    ms.status === "pending"     ? "Start" :
    ms.status === "in_progress" ? "Submit for Review" :
    ms.status === "submitted"   ? "Approve" : null;

  return (
    <View style={[styles.msRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.msLeft}>
        <Text style={[styles.msDot, { color: meta.color }]}>{meta.dot}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.msTitle, { color: colors.foreground }]}>{ms.title}</Text>
        {!!ms.description && (
          <Text style={[styles.msDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
            {ms.description}
          </Text>
        )}
        <View style={styles.msMeta}>
          <Text style={[styles.msStatus, { color: meta.color }]}>{meta.label}</Text>
          {ms.amountCents > 0 && (
            <Text style={[styles.msAmount, { color: colors.primary }]}>
              ${(ms.amountCents / 100).toFixed(0)}
            </Text>
          )}
          {ms.dueDate ? (
            <Text style={[styles.msDue, { color: colors.mutedForeground }]}>Due {ms.dueDate}</Text>
          ) : null}
        </View>
      </View>
      {canAdvance && nextStatus && actionLabel && (
        <Pressable
          style={[styles.msActionBtn, { backgroundColor: meta.color + "22", borderColor: meta.color + "44" }]}
          onPress={() => onAdvance(ms.id, nextStatus)}
        >
          <Text style={[styles.msActionText, { color: meta.color }]}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ── FreelanceMessageThread ────────────────────────────────────────────────────

function FreelanceMessageThread({ projectId, meId }: { projectId: number; meId: string }) {
  const colors = useColors();
  const qc = useQueryClient();
  const [msgText, setMsgText] = useState("");
  const listRef = useRef<FlatList>(null);

  const { data: messages = [], isLoading } = useListFreelanceMessages(projectId);
  const { mutateAsync: send, isPending: sending } = useSendFreelanceMessage();

  const handleSend = async () => {
    const body = msgText.trim();
    if (!body || sending) return;
    setMsgText("");
    await send({ id: projectId, data: { body } });
    qc.invalidateQueries({ queryKey: getListFreelanceMessagesQueryKey(projectId) });
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  if (isLoading) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator size="small" color={colors.mutedForeground} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
      keyboardVerticalOffset={100}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => String(m.id)}
        style={{ flex: 1 }}
        contentContainerStyle={styles.msgListContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.mutedForeground, marginTop: 40 }]}>
            No messages yet — say hello!
          </Text>
        }
        renderItem={({ item: msg }) => {
          const isMe = msg.senderId === meId;
          return (
            <View style={[styles.msgBubbleRow, isMe ? styles.msgBubbleRowMe : styles.msgBubbleRowThem]}>
              <View
                style={[
                  styles.msgBubble,
                  { backgroundColor: isMe ? colors.primary : colors.secondary, borderColor: colors.border },
                ]}
              >
                {!isMe && (
                  <Text style={[styles.msgSender, { color: colors.mutedForeground }]}>{msg.senderName}</Text>
                )}
                <Text style={[styles.msgBody, { color: isMe ? "#ffffff" : colors.foreground }]}>
                  {msg.body}
                </Text>
              </View>
            </View>
          );
        }}
      />
      <View style={[styles.msgInputRow, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <TextInput
          style={[styles.msgInput, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
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

// ── ProjectDetailModal (Work mode — browse + bid) ─────────────────────────────

function ProjectDetailModal({
  projectId,
  meId,
  onClose,
}: {
  projectId: number;
  meId: string;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [view, setView] = useState<"detail" | "bid" | "messages">("detail");
  const [proposedDollars, setProposedDollars] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("7");
  const [coverLetter, setCoverLetter] = useState("");

  const { data: project, isLoading } = useGetFreelanceProject(projectId);
  const { mutateAsync: submitBid, isPending: bidding } = useSubmitFreelanceBid();
  const { mutateAsync: advanceMilestone } = useUpdateFreelanceMilestone();

  const bids: FreelanceBid[] = (project as any)?.bids ?? [];
  const milestones: FreelanceMilestone[] = (project as any)?.milestones ?? [];
  const myBid = bids.find((b) => b.workerId === meId);
  const isWorker = project?.workerId === meId;
  const cat = project ? getCat(project.category) : null;
  const tags = project?.skillTags
    ? project.skillTags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getGetFreelanceProjectQueryKey(projectId) });
    qc.invalidateQueries({ queryKey: getListMyFreelanceBidsQueryKey() });
  };

  const handleBid = async () => {
    const amount = parseFloat(proposedDollars);
    if (isNaN(amount) || amount <= 0) { Alert.alert("Enter a valid bid amount"); return; }
    try {
      await submitBid({
        id: projectId,
        data: {
          proposedCents: Math.round(amount * 100),
          deliveryDays: parseInt(deliveryDays) || 7,
          coverLetter: coverLetter.trim(),
        },
      });
      invalidate();
      setView("detail");
      Alert.alert("Bid submitted!", "The client will review your proposal.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not submit bid.");
    }
  };

  const handleAdvance = async (milestoneId: number, nextStatus: string) => {
    try {
      await advanceMilestone({ id: projectId, milestoneId, data: { status: nextStatus } });
      invalidate();
    } catch {
      Alert.alert("Error", "Could not update milestone.");
    }
  };

  if (isLoading || !project || !cat) {
    return (
      <View style={[styles.sheet, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} />
      </View>
    );
  }

  return (
    <View style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
      <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

      {/* Sub-view header */}
      {view !== "detail" ? (
        <View style={[styles.sheetTopRow, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => setView("detail")} style={styles.sheetBack}>
            <Feather name="chevron-left" size={22} color={colors.foreground} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
              {view === "bid" ? "Submit Bid" : "Project Chat"}
            </Text>
          </Pressable>
          <Pressable onPress={onClose}>
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </Pressable>
        </View>
      ) : (
        <View style={[styles.sheetTopRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Project Details</Text>
          <Pressable onPress={onClose}>
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </Pressable>
        </View>
      )}

      {/* ── Messages ── */}
      {view === "messages" && (
        <FreelanceMessageThread projectId={projectId} meId={meId} />
      )}

      {/* ── Bid form ── */}
      {view === "bid" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
            Your proposed {project.budgetType === "hourly" ? "hourly rate ($)" : "total ($)"}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
            value={proposedDollars}
            onChangeText={setProposedDollars}
            placeholder="0.00"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="decimal-pad"
          />
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Delivery days</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
            value={deliveryDays}
            onChangeText={setDeliveryDays}
            placeholder="7"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="number-pad"
          />
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Cover letter</Text>
          <TextInput
            style={[styles.inputMulti, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
            value={coverLetter}
            onChangeText={setCoverLetter}
            placeholder="Briefly explain why you're a great fit for this project…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={5}
          />
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: bidding ? 0.6 : 1 }]}
            onPress={handleBid}
            disabled={bidding}
          >
            {bidding ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Submit Bid</Text>
            )}
          </Pressable>
        </ScrollView>
      )}

      {/* ── Main detail ── */}
      {view === "detail" && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
          {/* Title + status */}
          <View style={styles.detailHeader}>
            <Text style={styles.detailEmoji}>{cat.emoji}</Text>
            <View style={{ flex: 1 }}>
              <View style={[styles.statusPill, { backgroundColor: projStatusColor(project.status) + "22", alignSelf: "flex-start" }]}>
                <Text style={[styles.statusPillText, { color: projStatusColor(project.status) }]}>
                  {projStatusLabel(project.status)}
                </Text>
              </View>
              <Text style={[styles.detailTitle, { color: colors.foreground }]}>{project.title}</Text>
              <Text style={[styles.detailHirer, { color: colors.mutedForeground }]}>
                posted by {project.hirerName}
              </Text>
            </View>
          </View>

          {/* Budget + bids row */}
          <View style={[styles.metaRow, { borderColor: colors.border }]}>
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Budget</Text>
              <Text style={[styles.metaValue, { color: colors.primary }]}>
                {fmtBudget(project.budgetMinCents, project.budgetMaxCents, project.budgetType)}
              </Text>
            </View>
            <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Bids</Text>
              <Text style={[styles.metaValue, { color: colors.foreground }]}>{project.bidCount}</Text>
            </View>
            <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Type</Text>
              <Text style={[styles.metaValue, { color: colors.foreground }]}>
                {project.budgetType === "hourly" ? "Hourly" : "Fixed"}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Description</Text>
          <Text style={[styles.descText, { color: colors.foreground }]}>{project.description}</Text>

          {/* Skills */}
          {tags.length > 0 && (
            <View style={styles.tagsRow}>
              {tags.map((tag) => (
                <View key={tag} style={[styles.skillTag, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.skillTagText, { color: colors.mutedForeground }]}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* My bid status */}
          {myBid && (
            <View style={[styles.myBidBanner, { backgroundColor: bidStatusColor(myBid.status) + "18", borderColor: bidStatusColor(myBid.status) + "44" }]}>
              <Feather name="check-circle" size={15} color={bidStatusColor(myBid.status)} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.myBidStatus, { color: bidStatusColor(myBid.status) }]}>
                  Your bid: {fmtProposed(myBid.proposedCents, project.budgetType)} ·{" "}
                  {myBid.deliveryDays}d delivery · {myBid.status}
                </Text>
              </View>
            </View>
          )}

          {/* Milestones (active worker) */}
          {isWorker && milestones.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Milestones</Text>
              {milestones.map((ms) => (
                <MilestoneRow
                  key={ms.id}
                  ms={ms}
                  isHirer={false}
                  isWorker={isWorker}
                  onAdvance={handleAdvance}
                />
              ))}
            </>
          )}

          {/* CTAs */}
          {!project.workerId && !myBid && project.status === "open" && (
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => setView("bid")}
            >
              <Text style={styles.primaryBtnText}>Submit a Bid</Text>
            </Pressable>
          )}

          {isWorker && project.status === "in_progress" && (
            <Pressable
              style={[styles.secondaryBtn, { borderColor: colors.border }]}
              onPress={() => setView("messages")}
            >
              <Feather name="message-circle" size={17} color={colors.primary} />
              <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>Open Project Chat</Text>
              <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
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

// ── MyProjectModal (Hire mode — manage posted project) ────────────────────────

function MyProjectModal({
  projectId,
  meId,
  onClose,
}: {
  projectId: number;
  meId: string;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [view, setView] = useState<"detail" | "addMilestone" | "messages">("detail");
  const [msTitle, setMsTitle] = useState("");
  const [msDesc, setMsDesc] = useState("");
  const [msDollars, setMsDollars] = useState("");
  const [msDue, setMsDue] = useState("");

  const { data: project, isLoading } = useGetFreelanceProject(projectId);
  const { mutateAsync: accept, isPending: accepting } = useAcceptFreelanceBid();
  const { mutateAsync: addMs, isPending: addingMs } = useCreateFreelanceMilestone();
  const { mutateAsync: advanceMilestone } = useUpdateFreelanceMilestone();

  const bids: FreelanceBid[] = (project as any)?.bids ?? [];
  const milestones: FreelanceMilestone[] = (project as any)?.milestones ?? [];
  const cat = project ? getCat(project.category) : null;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getGetFreelanceProjectQueryKey(projectId) });
    qc.invalidateQueries({ queryKey: getListMyFreelanceProjectsQueryKey() });
    qc.invalidateQueries({ queryKey: getListFreelanceProjectsQueryKey() });
  };

  const handleAccept = async (bidId: number) => {
    try {
      await accept({ id: projectId, bidId });
      invalidate();
      Alert.alert("Freelancer hired!", "The contract is now in progress.");
    } catch {
      Alert.alert("Error", "Could not accept bid.");
    }
  };

  const handleAddMilestone = async () => {
    if (!msTitle.trim()) { Alert.alert("Enter a milestone title"); return; }
    try {
      await addMs({
        id: projectId,
        data: {
          title: msTitle.trim(),
          description: msDesc.trim(),
          amountCents: msDollars ? Math.round(parseFloat(msDollars) * 100) : 0,
          dueDate: msDue.trim() || undefined,
        },
      });
      invalidate();
      setView("detail");
      setMsTitle(""); setMsDesc(""); setMsDollars(""); setMsDue("");
    } catch {
      Alert.alert("Error", "Could not add milestone.");
    }
  };

  const handleAdvance = async (milestoneId: number, nextStatus: string) => {
    try {
      await advanceMilestone({ id: projectId, milestoneId, data: { status: nextStatus } });
      invalidate();
    } catch {
      Alert.alert("Error", "Could not update milestone.");
    }
  };

  if (isLoading || !project || !cat) {
    return (
      <View style={[styles.sheet, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} />
      </View>
    );
  }

  return (
    <View style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
      <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

      {view !== "detail" ? (
        <View style={[styles.sheetTopRow, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => setView("detail")} style={styles.sheetBack}>
            <Feather name="chevron-left" size={22} color={colors.foreground} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
              {view === "addMilestone" ? "Add Milestone" : "Project Chat"}
            </Text>
          </Pressable>
          <Pressable onPress={onClose}>
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </Pressable>
        </View>
      ) : (
        <View style={[styles.sheetTopRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Manage Project</Text>
          <Pressable onPress={onClose}>
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </Pressable>
        </View>
      )}

      {view === "messages" && (
        <FreelanceMessageThread projectId={projectId} meId={meId} />
      )}

      {view === "addMilestone" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Title *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
            value={msTitle}
            onChangeText={setMsTitle}
            placeholder="e.g. Initial wireframes"
            placeholderTextColor={colors.mutedForeground}
          />
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Description</Text>
          <TextInput
            style={[styles.inputMulti, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
            value={msDesc}
            onChangeText={setMsDesc}
            placeholder="What's included in this milestone?"
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={3}
          />
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Payment amount ($)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
            value={msDollars}
            onChangeText={setMsDollars}
            placeholder="0.00"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="decimal-pad"
          />
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Due date (optional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
            value={msDue}
            onChangeText={setMsDue}
            placeholder="e.g. 2025-08-01"
            placeholderTextColor={colors.mutedForeground}
          />
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: addingMs ? 0.6 : 1 }]}
            onPress={handleAddMilestone}
            disabled={addingMs}
          >
            {addingMs ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Add Milestone</Text>
            )}
          </Pressable>
        </ScrollView>
      )}

      {view === "detail" && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
          {/* Header */}
          <View style={styles.detailHeader}>
            <Text style={styles.detailEmoji}>{cat.emoji}</Text>
            <View style={{ flex: 1 }}>
              <View style={[styles.statusPill, { backgroundColor: projStatusColor(project.status) + "22", alignSelf: "flex-start" }]}>
                <Text style={[styles.statusPillText, { color: projStatusColor(project.status) }]}>
                  {projStatusLabel(project.status)}
                </Text>
              </View>
              <Text style={[styles.detailTitle, { color: colors.foreground }]} numberOfLines={3}>
                {project.title}
              </Text>
            </View>
          </View>

          {/* Budget row */}
          <View style={[styles.metaRow, { borderColor: colors.border }]}>
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Budget</Text>
              <Text style={[styles.metaValue, { color: colors.primary }]}>
                {fmtBudget(project.budgetMinCents, project.budgetMaxCents, project.budgetType)}
              </Text>
            </View>
            <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Bids</Text>
              <Text style={[styles.metaValue, { color: colors.foreground }]}>{project.bidCount}</Text>
            </View>
            {project.workerName && (
              <>
                <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
                <View style={styles.metaItem}>
                  <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Freelancer</Text>
                  <Text style={[styles.metaValue, { color: "#22c55e" }]} numberOfLines={1}>
                    {project.workerName}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Milestones */}
          {milestones.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                Milestones ({milestones.filter((m) => m.status === "approved").length}/{milestones.length} done)
              </Text>
              {milestones.map((ms) => (
                <MilestoneRow
                  key={ms.id}
                  ms={ms}
                  isHirer
                  isWorker={false}
                  onAdvance={handleAdvance}
                />
              ))}
            </>
          )}

          {/* Add milestone CTA */}
          {(project.status === "open" || project.status === "in_progress") && (
            <Pressable
              style={[styles.secondaryBtn, { borderColor: colors.border }]}
              onPress={() => setView("addMilestone")}
            >
              <Feather name="plus-circle" size={16} color={colors.primary} />
              <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>Add Milestone</Text>
            </Pressable>
          )}

          {/* Chat CTA */}
          {project.status === "in_progress" && (
            <Pressable
              style={[styles.secondaryBtn, { borderColor: colors.border }]}
              onPress={() => setView("messages")}
            >
              <Feather name="message-circle" size={16} color={colors.primary} />
              <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>Project Chat</Text>
              <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
            </Pressable>
          )}

          {/* Bids list */}
          {bids.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                Bids ({bids.length})
              </Text>
              {bids.map((bid) => (
                <View
                  key={bid.id}
                  style={[
                    styles.bidCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: bid.status === "accepted" ? "#22c55e44" : colors.border,
                    },
                  ]}
                >
                  <View style={styles.bidCardTop}>
                    <View style={[styles.bidAvatar, { backgroundColor: colors.secondary }]}>
                      <Text style={{ fontSize: 18 }}>👤</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.bidName, { color: colors.foreground }]}>{bid.workerName}</Text>
                      <Text style={[styles.bidMeta, { color: colors.mutedForeground }]}>
                        {fmtProposed(bid.proposedCents, project.budgetType)} · {bid.deliveryDays}d delivery
                      </Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: bidStatusColor(bid.status) + "22" }]}>
                      <Text style={[styles.statusPillText, { color: bidStatusColor(bid.status) }]}>
                        {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  {!!bid.coverLetter && (
                    <Text style={[styles.bidCoverLetter, { color: colors.mutedForeground }]} numberOfLines={3}>
                      "{bid.coverLetter}"
                    </Text>
                  )}
                  {bid.status === "pending" && project.status === "open" && (
                    <Pressable
                      style={[styles.acceptBidBtn, { backgroundColor: "#22c55e" }]}
                      onPress={() => handleAccept(bid.id)}
                      disabled={accepting}
                    >
                      {accepting ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.acceptBidBtnText}>Hire this Freelancer</Text>
                      )}
                    </Pressable>
                  )}
                </View>
              ))}
            </>
          )}

          {bids.length === 0 && project.status === "open" && (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No bids yet — freelancers can browse and submit proposals.
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

// ── PostProjectModal ──────────────────────────────────────────────────────────

const POST_STEPS = ["Overview", "Budget", "Review"];

function PostProjectModal({
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
  const [catId, setCatId] = useState<string>(FL_CATS[0].id);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [skillTags, setSkillTags] = useState("");
  const [budgetType, setBudgetType] = useState<"fixed" | "hourly">("fixed");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");

  const { mutateAsync: create, isPending: posting } = useCreateFreelanceProject();

  const validate = () => {
    if (step === 0) {
      if (!title.trim()) { Alert.alert("Add a project title"); return false; }
      if (!desc.trim()) { Alert.alert("Add a project description"); return false; }
    }
    if (step === 1) {
      const min = parseFloat(budgetMin), max = parseFloat(budgetMax);
      if (isNaN(min) || min <= 0) { Alert.alert("Enter a minimum budget"); return false; }
      if (isNaN(max) || max < min) { Alert.alert("Max budget must be ≥ min"); return false; }
    }
    return true;
  };

  const handleNext = () => {
    if (!validate()) return;
    if (step < POST_STEPS.length - 1) { setStep((s) => s + 1); return; }
    handlePost();
  };

  const handlePost = async () => {
    try {
      await create({
        data: {
          hirerId:        meId,
          hirerName:      meDisplayName,
          title:          title.trim(),
          description:    desc.trim(),
          category:       catId,
          skillTags:      skillTags.trim(),
          budgetType,
          budgetMinCents: Math.round(parseFloat(budgetMin) * 100),
          budgetMaxCents: Math.round(parseFloat(budgetMax) * 100),
        },
      });
      qc.invalidateQueries({ queryKey: getListMyFreelanceProjectsQueryKey() });
      qc.invalidateQueries({ queryKey: getListFreelanceProjectsQueryKey() });
      onPosted();
      Alert.alert("Project posted!", "Freelancers can now browse and submit bids.");
    } catch {
      Alert.alert("Error", "Could not post project. Try again.");
    }
  };

  const selectedCat = FL_CATS.find((c) => c.id === catId);

  return (
    <View style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
      <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
      <View style={[styles.sheetTopRow, { borderBottomColor: colors.border }]}>
        {step > 0 ? (
          <Pressable onPress={() => setStep((s) => s - 1)} style={styles.sheetBack}>
            <Feather name="chevron-left" size={22} color={colors.foreground} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Post a Project</Text>
          </Pressable>
        ) : (
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Post a Project</Text>
        )}
        <Pressable onPress={onClose}>
          <Feather name="x" size={22} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {/* Step pills */}
      <View style={styles.stepPills}>
        {POST_STEPS.map((label, i) => (
          <View key={i} style={styles.stepPillWrap}>
            <View style={[styles.stepDot, { backgroundColor: i <= step ? colors.primary : colors.border }]}>
              <Text style={[styles.stepNum, { color: i <= step ? "#fff" : colors.mutedForeground }]}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepLabel, { color: i === step ? colors.foreground : colors.mutedForeground }]}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.sheetContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step 0: Overview */}
        {step === 0 && (
          <View style={{ gap: 12 }}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
              {FL_CATS.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.catChip,
                    { backgroundColor: catId === cat.id ? colors.primary + "18" : colors.secondary, borderColor: catId === cat.id ? colors.primary : colors.border },
                  ]}
                  onPress={() => { Haptics.selectionAsync(); setCatId(cat.id); }}
                >
                  <Text>{cat.emoji}</Text>
                  <Text style={[styles.catChipLabel, { color: catId === cat.id ? colors.primary : colors.foreground }]}>
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Project title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Design a logo for my startup"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Description *</Text>
            <TextInput
              style={[styles.inputMulti, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
              value={desc}
              onChangeText={setDesc}
              placeholder="Describe your project, deliverables, and any requirements…"
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={5}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Skills needed (comma-separated)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
              value={skillTags}
              onChangeText={setSkillTags}
              placeholder="e.g. Figma, Branding, Illustration"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
        )}

        {/* Step 1: Budget */}
        {step === 1 && (
          <View style={{ gap: 12 }}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Budget type</Text>
            <View style={styles.payTypeRow}>
              {(["fixed", "hourly"] as const).map((t) => (
                <Pressable
                  key={t}
                  style={[
                    styles.payTypeBtn,
                    { backgroundColor: budgetType === t ? colors.primary + "18" : colors.secondary, borderColor: budgetType === t ? colors.primary : colors.border },
                  ]}
                  onPress={() => setBudgetType(t)}
                >
                  <Text style={[styles.payTypeBtnText, { color: budgetType === t ? colors.primary : colors.foreground }]}>
                    {t === "fixed" ? "Fixed price" : "Hourly rate"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              Minimum {budgetType === "hourly" ? "rate ($/hr)" : "budget ($)"} *
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
              value={budgetMin}
              onChangeText={setBudgetMin}
              placeholder="0.00"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              Maximum {budgetType === "hourly" ? "rate ($/hr)" : "budget ($)"} *
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
              value={budgetMax}
              onChangeText={setBudgetMax}
              placeholder="0.00"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
            />
          </View>
        )}

        {/* Step 2: Review */}
        {step === 2 && (
          <View style={[styles.reviewCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Text style={[styles.reviewLabel, { color: colors.mutedForeground }]}>Review your project</Text>
            <Text style={[styles.reviewTitle, { color: colors.foreground }]}>{title}</Text>
            <View style={styles.reviewRow}>
              <Text style={[styles.reviewMeta, { color: colors.mutedForeground }]}>Category:</Text>
              <Text style={[styles.reviewMeta, { color: colors.foreground }]}>
                {selectedCat?.emoji} {selectedCat?.label}
              </Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={[styles.reviewMeta, { color: colors.mutedForeground }]}>Budget:</Text>
              <Text style={[styles.reviewMeta, { color: colors.primary }]}>
                {budgetMin && budgetMax ? fmtBudget(parseFloat(budgetMin) * 100, parseFloat(budgetMax) * 100, budgetType) : "—"}
              </Text>
            </View>
            {skillTags.trim() && (
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewMeta, { color: colors.mutedForeground }]}>Skills:</Text>
                <Text style={[styles.reviewMeta, { color: colors.foreground }]}>{skillTags}</Text>
              </View>
            )}
          </View>
        )}

        <Pressable
          style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: posting ? 0.6 : 1, marginTop: 8 }]}
          onPress={handleNext}
          disabled={posting}
        >
          {posting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>
              {step < POST_STEPS.length - 1 ? "Continue" : "Post Project"}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ── Main FreelanceScreen ──────────────────────────────────────────────────────

export default function FreelanceScreen({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, isLoaded } = useUser();
  const qc = useQueryClient();

  const [mode, setMode] = useState<Mode>("hire");
  const [activeCat, setActiveCat] = useState<string>(FL_CATS[0].id);

  // modal state
  const [showPost, setShowPost] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [myProjectId, setMyProjectId] = useState<number | null>(null);

  // work-mode pagination
  const [workCursor, setWorkCursor] = useState<number | undefined>(undefined);
  const [workProjects, setWorkProjects] = useState<FreelanceProject[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

  const meId = user?.id ?? "";
  const meDisplayName = user?.fullName ?? user?.firstName ?? "User";

  // ── Browse projects (Work mode) ──────────────────────────────────────────────
  const { data: workPage, isLoading: workLoading } = useListFreelanceProjects({ category: activeCat });

  useEffect(() => {
    const page = workPage as { items: FreelanceProject[]; nextCursor: number | null } | undefined;
    if (!page) return;
    setWorkProjects(page.items);
    setWorkCursor(page.nextCursor ?? undefined);
  }, [workPage]);

  useEffect(() => { setWorkProjects([]); setWorkCursor(undefined); }, [activeCat]);

  const handleLoadMore = useCallback(async () => {
    if (!workCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await (
        await fetch(`/api/freelance/projects?cursor=${workCursor}&limit=20&category=${activeCat}`)
      ).json() as { items: FreelanceProject[]; nextCursor: number | null };
      setWorkProjects((prev) => [...prev, ...res.items]);
      setWorkCursor(res.nextCursor ?? undefined);
    } finally {
      setLoadingMore(false);
    }
  }, [workCursor, loadingMore, activeCat]);

  // ── My projects (Hire mode) ──────────────────────────────────────────────────
  const { data: myProjects = [], isLoading: myProjectsLoading, refetch: refetchMyProjects } =
    useListMyFreelanceProjects();

  // ── My bids (Work mode) ──────────────────────────────────────────────────────
  const { data: myBids = [] } = useListMyFreelanceBids();

  const handleCat = useCallback((id: string) => {
    Haptics.selectionAsync();
    setActiveCat(id);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 12, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={onOpenDrawer} style={styles.hamburger} hitSlop={10}>
          <Feather name="menu" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {mode === "hire" ? "Freelance" : "Find Projects"}
        </Text>
        <ModeToggle mode={mode} onChange={setMode} />
      </View>

      {/* ── Category tabs (both modes) ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.catBar, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.catBarContent}
      >
        {FL_CATS.map((cat) => (
          <CategoryTab
            key={cat.id}
            cat={cat}
            isActive={activeCat === cat.id}
            onPress={() => handleCat(cat.id)}
          />
        ))}
      </ScrollView>

      {/* ── Hire mode ── */}
      {mode === "hire" ? (
        !isLoaded || !meId ? (
          <View style={styles.centred}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Sign in to post projects and hire freelancers.
            </Text>
          </View>
        ) : (
          <FlatList
            data={(myProjects as FreelanceProject[]).filter((p) => p.category === activeCat)}
            keyExtractor={(p) => String(p.id)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
            refreshing={myProjectsLoading}
            onRefresh={refetchMyProjects}
            ListHeaderComponent={
              <View style={{ gap: 14, marginBottom: 14 }}>
                <Pressable
                  style={[styles.postCTA, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "40" }]}
                  onPress={() => setShowPost(true)}
                >
                  <View style={[styles.postCTAIcon, { backgroundColor: colors.primary }]}>
                    <Feather name="plus" size={20} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.postCTATitle, { color: colors.foreground }]}>Post a Project</Text>
                    <Text style={[styles.postCTASub, { color: colors.mutedForeground }]}>
                      Set a budget · review bids · hire a freelancer
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.primary} />
                </Pressable>
                {(myProjects as FreelanceProject[]).filter((p) => p.category === activeCat).length > 0 && (
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                    My Projects · {getCat(activeCat).label}
                  </Text>
                )}
              </View>
            }
            renderItem={({ item: p }) => (
              <ProjectCard project={p} showStatus onPress={() => setMyProjectId(p.id)} />
            )}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            ListEmptyComponent={
              myProjectsLoading ? (
                <ActivityIndicator size="small" color={colors.mutedForeground} style={{ marginTop: 32 }} />
              ) : (
                <Text style={[styles.emptyText, { color: colors.mutedForeground, marginTop: 16, textAlign: "center" }]}>
                  No projects in {getCat(activeCat).label} yet.{"\n"}Post one to get proposals!
                </Text>
              )
            }
          />
        )
      ) : (
        /* ── Work mode ── */
        <FlatList
          data={workProjects}
          keyExtractor={(p) => String(p.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={
            <View style={{ gap: 12, marginBottom: 4 }}>
              {/* Fee info banner */}
              <View style={[styles.feeBanner, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Feather name="percent" size={14} color={colors.primary} />
                <Text style={[styles.feeBannerText, { color: colors.foreground }]}>
                  5% platform fee · waived with $4.99/mo membership
                </Text>
              </View>

              {/* My bids */}
              {isLoaded && meId && (myBids as FreelanceBidWithProject[]).length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>My Bids</Text>
                  {(myBids as FreelanceBidWithProject[])
                    .filter((b) => b.project.category === activeCat)
                    .map((bid) => (
                      <Pressable
                        key={bid.id}
                        style={[styles.myBidCard, { backgroundColor: colors.card, borderColor: bid.status === "accepted" ? "#22c55e44" : colors.border }]}
                        onPress={() => setDetailId(bid.project.id)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.myBidTitle, { color: colors.foreground }]} numberOfLines={1}>
                            {bid.project.title}
                          </Text>
                          <Text style={[styles.myBidMeta, { color: colors.mutedForeground }]}>
                            Your bid: {fmtProposed(bid.proposedCents, bid.project.budgetType)} · {bid.deliveryDays}d
                          </Text>
                        </View>
                        <View style={[styles.statusPill, { backgroundColor: bidStatusColor(bid.status) + "22" }]}>
                          <Text style={[styles.statusPillText, { color: bidStatusColor(bid.status) }]}>
                            {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                </>
              )}

              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                Open Projects · {getCat(activeCat).label}
              </Text>
            </View>
          }
          renderItem={({ item: p }) => (
            <ProjectCard project={p} onPress={() => setDetailId(p.id)} />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color={colors.mutedForeground} style={{ marginTop: 16 }} />
            ) : null
          }
          ListEmptyComponent={
            workLoading ? (
              <ActivityIndicator size="small" color={colors.mutedForeground} style={{ marginTop: 32 }} />
            ) : (
              <Text style={[styles.emptyText, { color: colors.mutedForeground, marginTop: 24, textAlign: "center" }]}>
                No open projects in {getCat(activeCat).label} yet.{"\n"}Check back soon!
              </Text>
            )
          }
        />
      )}

      {/* ── Post project modal ── */}
      <Modal visible={showPost} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPost(false)}>
        <PostProjectModal meId={meId} meDisplayName={meDisplayName} onClose={() => setShowPost(false)} onPosted={() => setShowPost(false)} />
      </Modal>

      {/* ── Project detail modal (Work) ── */}
      <Modal visible={detailId !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDetailId(null)}>
        {detailId !== null && (
          <ProjectDetailModal projectId={detailId} meId={meId} onClose={() => setDetailId(null)} />
        )}
      </Modal>

      {/* ── My project modal (Hire) ── */}
      <Modal visible={myProjectId !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setMyProjectId(null)}>
        {myProjectId !== null && (
          <MyProjectModal projectId={myProjectId} meId={meId} onClose={() => setMyProjectId(null)} />
        )}
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 12,
  },
  hamburger: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 22, fontWeight: "700", flex: 1, letterSpacing: -0.4 },

  toggleWrap: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  toggleLabel: { fontSize: 13, fontWeight: "600" },

  catBar: { borderBottomWidth: StyleSheet.hairlineWidth, maxHeight: 52 },
  catBarContent: { paddingHorizontal: 12, alignItems: "center", gap: 4 },
  catTab: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  catTabEmoji: { fontSize: 14 },
  catTabLabel: { fontSize: 13 },

  listContent: { padding: 16, gap: 0 },
  centred: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  emptyText: { fontSize: 14 },

  // project card
  projectCard: {
    borderWidth: 1, borderRadius: 16, padding: 14, gap: 8,
  },
  projectTop: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  projectEmoji: { fontSize: 26, marginTop: 2 },
  projectTitle: { fontSize: 15, fontWeight: "700", lineHeight: 21 },
  projectHirer: { fontSize: 12, marginTop: 2 },
  projectBudgetCol: { alignItems: "flex-end" },
  projectBudget: { fontSize: 15, fontWeight: "700" },
  projectBudgetType: { fontSize: 11, marginTop: 1 },
  projectDesc: { fontSize: 13, lineHeight: 18 },
  projectBottom: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  projectBidsBadge: { flexDirection: "row", alignItems: "center", gap: 3, marginLeft: "auto" },
  projectBidsText: { fontSize: 11 },

  // status pill
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusPillText: { fontSize: 11, fontWeight: "600" },

  // skill tags
  skillTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  skillTagText: { fontSize: 11 },

  // milestone row
  msRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  msLeft: { width: 20, alignItems: "center", paddingTop: 2 },
  msDot: { fontSize: 16 },
  msTitle: { fontSize: 14, fontWeight: "600" },
  msDesc: { fontSize: 12, lineHeight: 17 },
  msMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  msStatus: { fontSize: 11, fontWeight: "600" },
  msAmount: { fontSize: 11, fontWeight: "700" },
  msDue: { fontSize: 11 },
  msActionBtn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
    alignSelf: "flex-start",
  },
  msActionText: { fontSize: 12, fontWeight: "600" },

  // post CTA
  postCTA: {
    flexDirection: "row", alignItems: "center", gap: 14,
    padding: 16, borderRadius: 16, borderWidth: 1.5,
  },
  postCTAIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  postCTATitle: { fontSize: 16, fontWeight: "700" },
  postCTASub: { fontSize: 13, marginTop: 2 },

  // section label
  sectionLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },

  // fee banner
  feeBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  feeBannerText: { flex: 1, fontSize: 13 },

  // my bid card (work mode)
  myBidCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8,
  },
  myBidTitle: { fontSize: 14, fontWeight: "500" },
  myBidMeta: { fontSize: 12, marginTop: 2 },

  // sheet
  sheet: { flex: 1 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 4 },
  sheetTopRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetBack: { flexDirection: "row", alignItems: "center", gap: 4 },
  sheetTitle: { fontSize: 17, fontWeight: "700" },
  sheetContent: { padding: 20, gap: 12, paddingBottom: 40 },

  // detail
  detailHeader: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  detailEmoji: { fontSize: 32, marginTop: 4 },
  detailTitle: { fontSize: 18, fontWeight: "700", lineHeight: 24, marginTop: 4 },
  detailHirer: { fontSize: 13, marginTop: 2 },

  metaRow: { flexDirection: "row", borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  metaItem: { flex: 1, padding: 12, alignItems: "center" },
  metaLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", marginBottom: 4 },
  metaValue: { fontSize: 14, fontWeight: "700" },
  metaDivider: { width: 1 },

  descText: { fontSize: 14, lineHeight: 22 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },

  // my bid banner
  myBidBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  myBidStatus: { fontSize: 13, fontWeight: "600" },

  // bid card
  bidCard: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  bidCardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  bidAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  bidName: { fontSize: 14, fontWeight: "600" },
  bidMeta: { fontSize: 12, marginTop: 1 },
  bidCoverLetter: { fontSize: 13, fontStyle: "italic", lineHeight: 18 },
  acceptBidBtn: { borderRadius: 12, padding: 12, alignItems: "center" },
  acceptBidBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // primary / secondary buttons
  primaryBtn: { padding: 14, borderRadius: 14, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  secondaryBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  secondaryBtnText: { flex: 1, fontSize: 14, fontWeight: "600" },
  closeBtn: { padding: 14, borderRadius: 14, borderWidth: 1, alignItems: "center", marginTop: 4 },
  closeBtnText: { fontSize: 14, fontWeight: "600" },

  // form
  fieldLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  inputMulti: {
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, minHeight: 110, textAlignVertical: "top",
  },
  payTypeRow: { flexDirection: "row", gap: 10 },
  payTypeBtn: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1.5, alignItems: "center" },
  payTypeBtnText: { fontSize: 14, fontWeight: "600" },

  catChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
  },
  catChipLabel: { fontSize: 13, fontWeight: "600" },

  // step pills
  stepPills: { flexDirection: "row", justifyContent: "center", gap: 28, paddingVertical: 14 },
  stepPillWrap: { alignItems: "center", gap: 4 },
  stepDot: { width: 26, height: 26, borderRadius: 13, justifyContent: "center", alignItems: "center" },
  stepNum: { fontSize: 12, fontWeight: "700" },
  stepLabel: { fontSize: 11, fontWeight: "600" },

  // review card
  reviewCard: { padding: 16, borderRadius: 14, borderWidth: 1, gap: 8 },
  reviewLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  reviewTitle: { fontSize: 16, fontWeight: "700" },
  reviewRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  reviewMeta: { fontSize: 13 },

  // messages
  msgListContent: { padding: 16, gap: 10 },
  msgBubbleRow: { flexDirection: "row" },
  msgBubbleRowMe: { justifyContent: "flex-end" },
  msgBubbleRowThem: { justifyContent: "flex-start" },
  msgBubble: { maxWidth: "78%", padding: 12, borderRadius: 16, borderWidth: 1, gap: 4 },
  msgSender: { fontSize: 11, fontWeight: "600" },
  msgBody: { fontSize: 14, lineHeight: 20 },
  msgInputRow: {
    flexDirection: "row", gap: 10, padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth, alignItems: "flex-end",
  },
  msgInput: {
    flex: 1, borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 100,
  },
  msgSendBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
});
