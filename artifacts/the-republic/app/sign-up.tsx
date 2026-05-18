import { useSignUp } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

type Step = "info" | "code";

export default function SignUpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signUp, setActive, isLoaded } = useSignUp();

  const [step, setStep] = useState<Step>("info");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const createAccount = async () => {
    if (!isLoaded || !email.trim()) return;
    setLoading(true);
    setError("");
    try {
      await signUp!.create({
        emailAddress: email.trim(),
        firstName: firstName.trim() || undefined,
      });
      await signUp!.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("code");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setError(e?.errors?.[0]?.longMessage ?? "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!isLoaded || !code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await signUp!.attemptEmailAddressVerification({ code: code.trim() });
      if (result.status === "complete") {
        await setActive!({ session: result.createdSessionId });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/");
      }
    } catch (e: any) {
      setError(e?.errors?.[0]?.longMessage ?? "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.inner, { paddingTop: topPad + 24, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoArea}>
          <Feather name="shield" size={40} color={colors.primary} />
          <Text style={[styles.appName, { color: colors.foreground }]}>THE REPUBLIC</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            Join the curated web
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            {step === "info" ? "Create account" : "Verify email"}
          </Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
            {step === "info"
              ? "Join The Republic — free to start"
              : `We sent a verification code to ${email}`}
          </Text>

          {step === "info" ? (
            <>
              <TextInput
                style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
                placeholder="First name (optional)"
                placeholderTextColor={colors.mutedForeground}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                returnKeyType="next"
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
                placeholder="Email address"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="send"
                onSubmitEditing={createAccount}
              />
            </>
          ) : (
            <TextInput
              style={[styles.input, styles.codeInput, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
              placeholder="6-digit code"
              placeholderTextColor={colors.mutedForeground}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={verifyCode}
              autoFocus
            />
          )}

          {!!error && (
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primary, opacity: pressed || loading ? 0.8 : 1 },
            ]}
            onPress={step === "info" ? createAccount : verifyCode}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                {step === "info" ? "Continue" : "Verify & Join"}
              </Text>
            )}
          </Pressable>

          {step === "code" && (
            <Pressable onPress={() => { setStep("info"); setCode(""); setError(""); }}>
              <Text style={[styles.linkText, { color: colors.mutedForeground }]}>
                ← Change email
              </Text>
            </Pressable>
          )}
        </View>

        <Pressable onPress={() => router.push("/sign-in")} style={styles.switchRow}>
          <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
            Already a citizen?{" "}
            <Text style={{ color: colors.primary, fontWeight: "600" }}>Sign in</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flexGrow: 1,
    paddingHorizontal: 24,
    gap: 28,
  },
  logoArea: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
  },
  appName: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 3,
  },
  tagline: { fontSize: 14, textAlign: "center" },
  card: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    gap: 14,
  },
  cardTitle: { fontSize: 22, fontWeight: "700" },
  cardSub: { fontSize: 14, lineHeight: 20 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    borderWidth: 1,
  },
  codeInput: {
    fontSize: 24,
    letterSpacing: 8,
    textAlign: "center",
  },
  errorText: { fontSize: 13 },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: { fontSize: 16, fontWeight: "700" },
  linkText: { fontSize: 13, textAlign: "center" },
  switchRow: { alignItems: "center" },
  switchText: { fontSize: 14 },
});
