import { useSignUp } from "@clerk/expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
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

export default function SignUpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signUp, errors, fetchStatus } = useSignUp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");

  const loading = fetchStatus === "fetching";

  const isVerifying =
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields?.includes("email_address") &&
    signUp.missingFields?.length === 0;

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim()) return;
    const { error } = await signUp.password({ emailAddress: email.trim(), password });
    if (error) return;
    await signUp.verifications.sendEmailCode();
  };

  const handleVerify = async () => {
    if (!code.trim()) return;
    await signUp.verifications.verifyEmailCode({ code: code.trim() });
    if (signUp.status === "complete") {
      if (username.trim()) {
        await AsyncStorage.setItem("pending_username", username.trim());
      }
      await signUp.finalize({
        navigate: ({ decorateUrl }) => {
          const url = decorateUrl("/");
          if (Platform.OS === "web" && url.startsWith("http")) {
            window.location.href = url;
          } else {
            router.replace("/");
          }
        },
      });
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (isVerifying) {
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
            <View style={[styles.logoMark, { backgroundColor: "#ffffff" }]}>
              <Image
                source={require("../assets/images/republic-logo.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.appName, { color: colors.foreground }]}>Republic</Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Verify your email</Text>
            <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
              We sent a code to {email}
            </Text>

            <TextInput
              style={[styles.input, styles.codeInput, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
              placeholder="6-digit code"
              placeholderTextColor={colors.mutedForeground}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleVerify}
            />
            {errors?.fields?.code && (
              <Text style={[styles.errorText, { color: colors.destructive }]}>
                {errors.fields.code.message}
              </Text>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: colors.primary, opacity: pressed || loading ? 0.8 : 1 },
              ]}
              onPress={handleVerify}
              disabled={loading || !code.trim()}
            >
              {loading ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                  Verify & Join
                </Text>
              )}
            </Pressable>

            <Pressable onPress={() => signUp.verifications.sendEmailCode()}>
              <Text style={[styles.linkText, { color: colors.mutedForeground }]}>
                Resend code
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

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
          <View style={[styles.logoMark, { backgroundColor: "#ffffff" }]}>
            <Image
              source={require("../assets/images/republic-logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.appName, { color: colors.foreground }]}>Republic</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            your curated web for commerce & discussions
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Create account</Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
            Join Republic — free to start
          </Text>

          <TextInput
            style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
            placeholder="Email address"
            placeholderTextColor={colors.mutedForeground}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="next"
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
            placeholder="Username (optional)"
            placeholderTextColor={colors.mutedForeground}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            maxLength={40}
            returnKeyType="next"
          />
          {errors?.fields?.emailAddress && (
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {errors.fields.emailAddress.message}
            </Text>
          )}

          <TextInput
            style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
            placeholder="Password"
            placeholderTextColor={colors.mutedForeground}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleSignUp}
          />
          {errors?.fields?.password && (
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {errors.fields.password.message}
            </Text>
          )}

          {errors?.global && (
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {(errors.global as any).longMessage ?? (errors.global as any).message ?? "An error occurred"}
            </Text>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primary, opacity: pressed || loading ? 0.8 : 1 },
            ]}
            onPress={handleSignUp}
            disabled={loading || !email.trim() || !password.trim()}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                Continue
              </Text>
            )}
          </Pressable>

          <View nativeID="clerk-captcha" />
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
  inner: { flexGrow: 1, paddingHorizontal: 24, gap: 28 },
  logoArea: { alignItems: "center", gap: 10, paddingVertical: 16 },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 3,
  },
  logoImage: { width: 52, height: 52 },
  appName: { fontSize: 26, fontWeight: "700", letterSpacing: 1 },
  tagline: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  card: { borderRadius: 16, padding: 24, borderWidth: 1, gap: 14 },
  cardTitle: { fontSize: 22, fontWeight: "700" },
  cardSub: { fontSize: 14, lineHeight: 20 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    borderWidth: 1,
  },
  codeInput: { fontSize: 24, letterSpacing: 8, textAlign: "center" },
  errorText: { fontSize: 13 },
  primaryBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  primaryBtnText: { fontSize: 16, fontWeight: "700" },
  linkText: { fontSize: 13, textAlign: "center" },
  switchRow: { alignItems: "center" },
  switchText: { fontSize: 14 },
});
