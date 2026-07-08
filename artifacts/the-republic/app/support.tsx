import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import { useCreateSupportTicket } from "@workspace/api-client-react";

const TICKET_TYPES = [
  { value: "support", label: "General support" },
  { value: "bug", label: "Report a bug" },
  { value: "feature", label: "Feature request" },
];

export default function SupportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [type, setType] = useState("support");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { mutate: createTicket, isPending } = useCreateSupportTicket();

  const handleSubmit = () => {
    if (!subject.trim() || !message.trim()) return;
    createTicket(
      { data: { type, subject: subject.trim(), message: message.trim() } },
      { onSuccess: () => setSubmitted(true) }
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: colors.background, borderBottomColor: colors.border, paddingTop: topPad + 8 },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={[styles.closeBtn, { backgroundColor: colors.secondary }]}
        >
          <Feather name="x" size={18} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Support</Text>
        <View style={{ width: 36 }} />
      </View>

      {submitted ? (
        <View style={styles.centered}>
          <View style={[styles.successIcon, { backgroundColor: colors.green }]}>
            <Feather name="check" size={32} color="#ffffff" />
          </View>
          <Text style={[styles.successTitle, { color: colors.foreground }]}>Ticket submitted!</Text>
          <Text style={[styles.successBody, { color: colors.mutedForeground }]}>
            Our team will review your request and respond by email.
          </Text>
          <Pressable
            style={[styles.doneBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.doneBtnText, { color: colors.primaryForeground }]}>Done</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Type</Text>
          <View style={styles.typeRow}>
            {TICKET_TYPES.map((t) => (
              <Pressable
                key={t.value}
                onPress={() => setType(t.value)}
                style={[
                  styles.typePill,
                  {
                    backgroundColor: type === t.value ? colors.primary : colors.secondary,
                    borderColor: type === t.value ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.typePillText,
                    { color: type === t.value ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Subject</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
            placeholder="Brief description of your issue"
            placeholderTextColor={colors.mutedForeground}
            value={subject}
            onChangeText={setSubject}
            returnKeyType="next"
            maxLength={120}
          />

          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Message</Text>
          <TextInput
            style={[styles.input, styles.messageInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
            placeholder="Please describe your issue in detail…"
            placeholderTextColor={colors.mutedForeground}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={2000}
          />

          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              { backgroundColor: colors.primary, opacity: pressed || isPending ? 0.8 : 1 },
            ]}
            onPress={handleSubmit}
            disabled={isPending || !subject.trim() || !message.trim()}
          >
            {isPending ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <>
                <Feather name="send" size={16} color={colors.primaryForeground} />
                <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>
                  Submit ticket
                </Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
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
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16, padding: 32 },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  successTitle: { fontSize: 22, fontWeight: "700" },
  successBody: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  doneBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  doneBtnText: { fontSize: 16, fontWeight: "600" },
  form: { padding: 20, gap: 10 },
  sectionLabel: { fontSize: 12, fontWeight: "600", letterSpacing: 0.5, marginTop: 8 },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  typePillText: { fontSize: 13, fontWeight: "500" },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  messageInput: { minHeight: 120, paddingTop: 12 },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  submitBtnText: { fontSize: 16, fontWeight: "700" },
});
