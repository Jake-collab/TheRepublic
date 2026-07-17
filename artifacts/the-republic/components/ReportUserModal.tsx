import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useColors } from "@/hooks/useColors";

const REPORT_REASONS = [
  { value: "spam",         label: "Spam",                icon: "alert-octagon" as const },
  { value: "harassment",   label: "Harassment",          icon: "user-x" as const },
  { value: "fraud",        label: "Fraud / Scam",        icon: "alert-triangle" as const },
  { value: "fake_profile", label: "Fake Profile",        icon: "user-minus" as const },
  { value: "inappropriate",label: "Inappropriate Content",icon: "eye-off" as const },
  { value: "other",        label: "Other",               icon: "more-horizontal" as const },
] as const;

type Reason = typeof REPORT_REASONS[number]["value"];

interface Props {
  visible: boolean;
  reportedUserId: string;
  reportedUserName: string;
  onClose: () => void;
  onReported?: () => void;
}

export default function ReportUserModal({
  visible,
  reportedUserId,
  reportedUserName,
  onClose,
  onReported,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();

  const [reason, setReason] = useState<Reason | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const reset = useCallback(() => {
    setReason(null);
    setDetails("");
    setDone(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!reason) {
      Alert.alert("Select a reason", "Please choose a reason for the report.");
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/user-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          reportedUserId,
          reason,
          details: details.trim() || undefined,
        }),
      });
      if (res.ok) {
        setDone(true);
        onReported?.();
      } else {
        const err = await res.json().catch(() => ({})) as { error?: string };
        Alert.alert("Error", err.error ?? "Could not submit report. Please try again.");
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [reason, details, reportedUserId, getToken, onReported]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            { paddingTop: insets.top + 12, borderBottomColor: colors.border },
          ]}
        >
          <Pressable
            onPress={handleClose}
            style={[styles.closeBtn, { backgroundColor: colors.secondary }]}
          >
            <Feather name="x" size={18} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {done ? "Report Submitted" : "Report User"}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        {done ? (
          /* ── Success state ── */
          <View style={styles.successContainer}>
            <View style={[styles.successIcon, { backgroundColor: "#16a34a20" }]}>
              <Feather name="shield" size={40} color="#16a34a" />
            </View>
            <Text style={[styles.successTitle, { color: colors.foreground }]}>Report Received</Text>
            <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
              Thank you. Our team will review {reportedUserName}'s account and take appropriate action.
            </Text>
            <Pressable
              style={[styles.doneBtn, { backgroundColor: colors.primary }]}
              onPress={handleClose}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
          >
            {/* Target */}
            <View style={[styles.targetCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="user" size={18} color={colors.mutedForeground} />
              <Text style={[styles.targetName, { color: colors.foreground }]}>
                Reporting: <Text style={{ fontWeight: "700" }}>{reportedUserName}</Text>
              </Text>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              Reason *
            </Text>
            <View style={styles.reasonList}>
              {REPORT_REASONS.map((r) => (
                <Pressable
                  key={r.value}
                  style={[
                    styles.reasonRow,
                    {
                      backgroundColor:
                        reason === r.value ? colors.primary + "15" : colors.card,
                      borderColor:
                        reason === r.value ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setReason(r.value)}
                >
                  <Feather
                    name={r.icon}
                    size={16}
                    color={reason === r.value ? colors.primary : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.reasonLabel,
                      { color: reason === r.value ? colors.primary : colors.foreground },
                    ]}
                  >
                    {r.label}
                  </Text>
                  {reason === r.value && (
                    <Feather name="check" size={14} color={colors.primary} style={{ marginLeft: "auto" }} />
                  )}
                </Pressable>
              ))}
            </View>

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              Additional Details (optional)
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.secondary,
                  color: colors.foreground,
                  borderColor: colors.border,
                },
              ]}
              value={details}
              onChangeText={setDetails}
              placeholder="Add any additional context that might help our review…"
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlignVertical="top"
              maxLength={300}
            />

            <Pressable
              style={[
                styles.submitBtn,
                { backgroundColor: "#dc2626", opacity: submitting || !reason ? 0.6 : 1 },
              ]}
              onPress={handleSubmit}
              disabled={submitting || !reason}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="flag" size={16} color="#fff" />
                  <Text style={styles.submitBtnText}>Submit Report</Text>
                </>
              )}
            </Pressable>

            <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
              False reports may result in action against your account. Reports are reviewed within 24 hours.
            </Text>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  body: { padding: 20, gap: 14 },

  targetCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 4,
  },
  targetName: { fontSize: 14 },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  reasonList: { gap: 8 },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  reasonLabel: { fontSize: 14, fontWeight: "500" },

  textArea: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 100,
    paddingTop: 12,
  },

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  disclaimer: { fontSize: 12, textAlign: "center", lineHeight: 17 },

  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  successIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center" },
  successTitle: { fontSize: 24, fontWeight: "800" },
  successSub: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  doneBtn: { paddingHorizontal: 40, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  doneBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
