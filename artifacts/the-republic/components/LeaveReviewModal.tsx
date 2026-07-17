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

interface Props {
  visible: boolean;
  revieweeId: string;
  revieweeName: string;
  contextType: "job_listing" | "gig_job" | "freelance_project" | "marketplace_listing";
  contextId: number;
  onClose: () => void;
  onSubmitted?: () => void;
}

export default function LeaveReviewModal({
  visible,
  revieweeId,
  revieweeName,
  contextType,
  contextId,
  onClose,
  onSubmitted,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();

  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const reset = useCallback(() => {
    setRating(0);
    setHoveredRating(0);
    setDescription("");
    setDone(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleSubmit = useCallback(async () => {
    if (rating === 0) {
      Alert.alert("Rating required", "Please select a star rating before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          revieweeId,
          contextType,
          contextId,
          rating,
          description: description.trim(),
        }),
      });
      if (res.ok) {
        setDone(true);
        onSubmitted?.();
      } else {
        const err = await res.json().catch(() => ({})) as { error?: string };
        Alert.alert("Error", err.error ?? "Could not submit review. Please try again.");
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [rating, description, revieweeId, contextType, contextId, getToken, onSubmitted]);

  const displayRating = hoveredRating || rating;

  const ratingLabels: Record<number, string> = {
    1: "Poor",
    2: "Fair",
    3: "Good",
    4: "Very Good",
    5: "Excellent",
  };

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
            {done ? "Review Submitted" : "Leave a Review"}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        {done ? (
          /* ── Success state ── */
          <View style={styles.successContainer}>
            <View style={[styles.successIcon, { backgroundColor: "#16a34a20" }]}>
              <Feather name="check-circle" size={40} color="#16a34a" />
            </View>
            <Text style={[styles.successTitle, { color: colors.foreground }]}>
              Thank you!
            </Text>
            <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
              Your review for {revieweeName} has been submitted. It helps build trust in the community.
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
            {/* Reviewee name */}
            <View style={styles.revieweeRow}>
              <View style={[styles.revieweeAvatar, { backgroundColor: colors.primary + "20" }]}>
                <Text style={[styles.revieweeAvatarLetter, { color: colors.primary }]}>
                  {revieweeName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={[styles.revieweeLabel, { color: colors.mutedForeground }]}>
                  Reviewing
                </Text>
                <Text style={[styles.revieweeName, { color: colors.foreground }]}>
                  {revieweeName}
                </Text>
              </View>
            </View>

            {/* Star rating */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              Rating *
            </Text>
            <View style={styles.starsContainer}>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setRating(s)}
                    onPressIn={() => setHoveredRating(s)}
                    onPressOut={() => setHoveredRating(0)}
                    hitSlop={8}
                    style={styles.starBtn}
                  >
                    <Feather
                      name={s <= displayRating ? "star" : "star"}
                      size={36}
                      color={s <= displayRating ? "#f59e0b" : colors.border}
                    />
                  </Pressable>
                ))}
              </View>
              {displayRating > 0 && (
                <Text style={[styles.ratingLabel, { color: "#f59e0b" }]}>
                  {ratingLabels[displayRating]}
                </Text>
              )}
            </View>

            {/* Description */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              Comments (optional)
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
              value={description}
              onChangeText={setDescription}
              placeholder={`Describe your experience with ${revieweeName}…`}
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={[styles.charCount, { color: colors.mutedForeground }]}>
              {description.length}/500
            </Text>

            {/* Submit */}
            <Pressable
              style={[
                styles.submitBtn,
                { backgroundColor: colors.primary, opacity: submitting || rating === 0 ? 0.6 : 1 },
              ]}
              onPress={handleSubmit}
              disabled={submitting || rating === 0}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="send" size={16} color="#fff" />
                  <Text style={styles.submitBtnText}>Submit Review</Text>
                </>
              )}
            </Pressable>
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
  body: { padding: 20, gap: 12 },

  revieweeRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  revieweeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  revieweeAvatarLetter: { fontSize: 22, fontWeight: "700" },
  revieweeLabel: { fontSize: 12, fontWeight: "500" },
  revieweeName: { fontSize: 16, fontWeight: "700" },

  sectionLabel: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },

  starsContainer: { alignItems: "center", gap: 8, paddingVertical: 8 },
  starsRow: { flexDirection: "row", gap: 8 },
  starBtn: { padding: 4 },
  ratingLabel: { fontSize: 15, fontWeight: "600" },

  textArea: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 120,
    paddingTop: 12,
  },
  charCount: { fontSize: 11, textAlign: "right", marginTop: -8 },

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

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
  doneBtn: {
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  doneBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
