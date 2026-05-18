import { useSignIn } from "@clerk/expo";
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

type Step = "email" | "code";

export default function SignInScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendCode = async () => {
    if (!isLoaded || !email.trim()) return;
    setLoading(true);
    setError("");
    try {
      await signIn!.create({ identifier: email.trim(), strategy: "email_code" });
      await signIn!.prepareFirstFactor({ strategy: "email_code", emailAddressId: signIn!.supportedFirstFactors?.find((f: any) => f.strategy === "email_code")?.emailAddressId ?? "" });
      setStep("code");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setError(e?.errors?.[0]?.longMessage ?? "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!isLoaded || !code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await signIn!.attemptFirstFactor({ strategy: "email_code", code: code.trim() });
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
            Your curated web, governed by citizens
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            {step === "email" ? "Sign in" : "Enter code"}
          </Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
            {step === "email"
              ? "Enter your email to receive a one-time code"
              : `We sent a code to ${email}`}
          </Text>

          {step === "email" ? (
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
              onSubmitEditing={sendCode}
            />
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
            onPress={step === "email" ? sendCode : verifyCode}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                {step === "email" ? "Send Code" : "Verify"}
              </Text>
            )}
          </Pressable>

          {step === "code" && (
            <Pressable onPress={() => { setStep("email"); setCode(""); setError(""); }}>
              <Text style={[styles.linkText, { color: colors.mutedForeground }]}>
                ← Change email
              </Text>
            </Pressable>
          )}
        </View>

        <Pressable onPress={() => router.push("/sign-up")} style={styles.switchRow}>
          <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
            New to The Republic?{" "}
            <Text style={{ color: colors.primary, fontWeight: "600" }}>Create account</Text>
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
