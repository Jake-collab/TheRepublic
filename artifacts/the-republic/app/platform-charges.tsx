import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import PlatformChargesScreen from "@/components/PlatformChargesScreen";

export default function PlatformChargesPage() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { borderBottomColor: colors.border, paddingTop: insets.top + 8 },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.secondary }]}
        >
          <Feather name="chevron-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Platform Charges
        </Text>
        <View style={{ width: 36 }} />
      </View>
      <PlatformChargesScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection:    "row",
    alignItems:       "center",
    justifyContent:   "space-between",
    paddingHorizontal: 16,
    paddingBottom:    12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width:         36,
    height:        36,
    borderRadius:  10,
    alignItems:    "center",
    justifyContent: "center",
  },
  title: { fontSize: 16, fontWeight: "700" },
});
