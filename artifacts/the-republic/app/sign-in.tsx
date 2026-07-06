import { useSignIn } from "@clerk/expo";
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

export default function SignInScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, errors, fetchStatus } = useSignIn();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loading = fetchStatus === "fetching";

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) return;
    const { error } = await signIn.password({ emailAddress: email.trim(), password });
    if (error) return;

    if (signIn.status === "complete") {
      await signIn.finalize({
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
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Sign in</Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
            Enter your email and password
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
          {errors?.fields?.identifier && (
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {errors.fields.identifier.message}
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
            onSubmitEditing={handleSignIn}
          />
          {errors?.fields?.password && (
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {errors.fields.password.message}
            </Text>
          )}

          {errors?.global && (
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {errors.global.message}
            </Text>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primary, opacity: pressed || loading ? 0.8 : 1 },
            ]}
            onPress={handleSignIn}
            disabled={loading || !email.trim() || !password.trim()}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                Sign In
              </Text>
            )}
          </Pressable>
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
  inner: { flexGrow: 1, paddingHorizontal: 24, gap: 28 },
  logoArea: { alignItems: "center", gap: 10, paddingVertical: 16 },
  appName: { fontSize: 22, fontWeight: "700", letterSpacing: 3 },
  tagline: { fontSize: 14, textAlign: "center" },
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
  errorText: { fontSize: 13 },
  primaryBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  primaryBtnText: { fontSize: 16, fontWeight: "700" },
  switchRow: { alignItems: "center" },
  switchText: { fontSize: 14 },
});
