import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useGetUserProfile } from "@workspace/api-client-react";

export default function MyResumeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: profile, refetch } = useGetUserProfile();
  const resumeUrl = (profile as any)?.resumeUrl as string | null | undefined;
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/msword",
               "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      if (!file) return;

      setUploading(true);
      const token = await getToken();
      const form = new FormData();
      form.append("resume", { uri: file.uri, name: file.name, type: file.mimeType ?? "application/pdf" } as any);

      const res = await fetch("/api/user/resume", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (res.ok) {
        Alert.alert("Resume uploaded", "Your resume has been saved.");
        refetch();
      } else {
        Alert.alert("Upload failed", "Please try again.");
      }
    } catch {
      Alert.alert("Error", "Could not upload resume.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border, paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.secondary }]}>
          <Feather name="chevron-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Resume</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.body}>
        {resumeUrl ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="file-text" size={28} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Resume on file</Text>
            <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
              Your resume is visible to hirers and employers on The Republic.
            </Text>
            <Pressable style={[styles.btn, { backgroundColor: colors.secondary, borderColor: colors.border }]} onPress={handleUpload} disabled={uploading}>
              <Feather name="upload" size={15} color={colors.foreground} />
              <Text style={[styles.btnText, { color: colors.foreground }]}>{uploading ? "Uploading…" : "Replace Resume"}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.empty}>
            <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
              <Feather name="file-text" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No resume uploaded</Text>
            <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>
              Upload your resume so employers can find you when you apply to jobs.
            </Text>
            <Pressable style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={handleUpload} disabled={uploading}>
              <Feather name="upload" size={16} color="#fff" />
              <Text style={styles.addBtnText}>{uploading ? "Uploading…" : "Upload Resume"}</Text>
            </Pressable>
            <Text style={[styles.formatNote, { color: colors.mutedForeground }]}>PDF or Word document</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  body: { flex: 1, padding: 20 },
  card: {
    borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
    padding: 20, gap: 10, alignItems: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardSub: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  btn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginTop: 4,
  },
  btnText: { fontSize: 14, fontWeight: "600" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 14 },
  iconWrap: { width: 72, height: 72, borderRadius: 24, justifyContent: "center", alignItems: "center" },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptySubText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14,
  },
  addBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  formatNote: { fontSize: 12 },
});
