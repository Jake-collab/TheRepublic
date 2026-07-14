import { useSignIn } from "@clerk/expo";
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
              {(errors.global as any).longMessage ?? (errors.global as any).message ?? "An error occurred"}
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
            New to Republic?{" "}
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
  errorText: { fontSize: 13 },
  primaryBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  primaryBtnText: { fontSize: 16, fontWeight: "700" },
  switchRow: { alignItems: "center" },
  switchText: { fontSize: 14 },
});
