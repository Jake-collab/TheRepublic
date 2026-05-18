import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";
import React from "react";
import { View, StyleSheet } from "react-native";

export default function TabLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return <View style={styles.fill} />;
  if (!isSignedIn) return <Redirect href="/sign-in" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
