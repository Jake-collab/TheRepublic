import { Feather } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetUserIdentity,
  useSubmitIdentityVerification,
  useRequestIdentityUploadUrl,
  getGetUserIdentityQueryKey,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

type Step = "status" | "info" | "front" | "back" | "review";

// ── Helper: upload photo to GCS via presigned URL ──────────────────────────────
async function uploadToGcs(
  localUri: string,
  uploadURL: string,
  contentType: string
): Promise<void> {
  const resp = await fetch(localUri);
  const blob = await resp.blob();
  const result = await fetch(uploadURL, {
    method: "PUT",
    body: blob,
    headers: { "Content-Type": contentType },
  });
  if (!result.ok) throw new Error(`GCS upload failed: ${result.status}`);
}

// ── Step indicator ─────────────────────────────────────────────────────────────
function StepDot({ active, done, colors }: { active: boolean; done: boolean; colors: any }) {
  return (
    <View
      style={[
        styles.stepDot,
        {
          backgroundColor: done
            ? colors.primary
            : active
            ? colors.primary + "40"
            : colors.border,
          borderColor: active || done ? colors.primary : colors.border,
        },
      ]}
    >
      {done && <Feather name="check" size={10} color={colors.background} />}
    </View>
  );
}

// ── Photo upload card ─────────────────────────────────────────────────────────
function PhotoCard({
  label,
  uri,
  uploading,
  onPick,
  colors,
}: {
  label: string;
  uri: string | null;
  uploading: boolean;
  onPick: () => void;
  colors: any;
}) {
  return (
    <Pressable
      style={[styles.photoCard, { borderColor: uri ? colors.primary : colors.border, backgroundColor: colors.card }]}
      onPress={onPick}
      disabled={uploading}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.photoPreview} resizeMode="cover" />
      ) : (
        <View style={styles.photoPlaceholder}>
          {uploading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Feather name="camera" size={32} color={colors.mutedForeground} />
              <Text style={[styles.photoLabel, { color: colors.mutedForeground }]}>{label}</Text>
            </>
          )}
        </View>
      )}
      {uri && !uploading && (
        <View style={[styles.photoOverlay, { backgroundColor: colors.primary + "22" }]}>
          <Feather name="refresh-cw" size={20} color={colors.primary} />
          <Text style={[styles.photoChangeText, { color: colors.primary }]}>Tap to change</Text>
        </View>
      )}
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function IdentityVerificationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: identity, isLoading: identityLoading } = useGetUserIdentity({
    query: { queryKey: getGetUserIdentityQueryKey() },
  });
  const { mutateAsync: requestUploadUrl } = useRequestIdentityUploadUrl();
  const { mutateAsync: submitVerification, isPending: submitting } = useSubmitIdentityVerification();

  // Personal info
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [zip, setZip] = useState("");

  // Photos
  const [idFrontPath, setIdFrontPath] = useState<string | null>(null);
  const [idBackPath, setIdBackPath] = useState<string | null>(null);
  const [idFrontUri, setIdFrontUri] = useState<string | null>(null);
  const [idBackUri, setIdBackUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [step, setStep] = useState<Step>("info");

  const pickAndUpload = useCallback(
    async (side: "front" | "back") => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please allow access to your photo library.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
        allowsEditing: true,
        aspect: [3, 2],
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      const contentType = "image/jpeg";

      setUploading(true);
      try {
        const { uploadURL, objectPath } = await requestUploadUrl({
          data: { contentType },
        });
        await uploadToGcs(asset.uri, uploadURL, contentType);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        if (side === "front") {
          setIdFrontPath(objectPath);
          setIdFrontUri(asset.uri);
        } else {
          setIdBackPath(objectPath);
          setIdBackUri(asset.uri);
        }
      } catch {
        Alert.alert("Upload Failed", "Could not upload photo. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [requestUploadUrl]
  );

  const handleSubmit = async () => {
    if (!fullName.trim() || !dob.trim() || !addressLine1.trim() || !city.trim() || !stateVal.trim() || !zip.trim()) {
      Alert.alert("Missing Fields", "Please fill in all personal information fields.");
      return;
    }
    if (!idFrontPath || !idBackPath) {
      Alert.alert("Missing Photos", "Please upload both the front and back of your ID.");
      return;
    }

    try {
      await submitVerification({
        data: {
          fullName: fullName.trim(),
          dob: dob.trim(),
          addressLine1: addressLine1.trim(),
          city: city.trim(),
          state: stateVal.trim(),
          zip: zip.trim(),
          idFrontPath,
          idBackPath,
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await qc.invalidateQueries({ queryKey: getGetUserIdentityQueryKey() });
      Alert.alert(
        "Submitted!",
        "Your identity is under review. You'll receive a notification when it's approved.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch {
      Alert.alert("Submission Failed", "Could not submit your verification. Please try again.");
    }
  };

  const bg = { backgroundColor: colors.background };
  const cardStyle = { backgroundColor: colors.card, borderColor: colors.border };
  const textColor = { color: colors.foreground };
  const mutedColor = { color: colors.mutedForeground };
  const inputStyle = [styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }];

  // ── Status States ──────────────────────────────────────────────────────────
  if (identityLoading) {
    return (
      <View style={[styles.centered, bg]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (identity?.status === "verified") {
    return (
      <View style={[styles.centered, bg, { paddingBottom: insets.bottom }]}>
        <View style={[styles.statusCard, cardStyle]}>
          <Feather name="shield" size={48} color={colors.primary} />
          <Text style={[styles.statusTitle, textColor]}>Identity Verified</Text>
          <Text style={[styles.statusSub, mutedColor]}>
            Your identity has been successfully verified. You can now use Work mode in Gigs and Freelance.
          </Text>
          <Pressable style={[styles.btn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
            <Text style={styles.btnText}>Done</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (identity?.status === "pending") {
    return (
      <View style={[styles.centered, bg, { paddingBottom: insets.bottom }]}>
        <View style={[styles.statusCard, cardStyle]}>
          <Feather name="clock" size={48} color={colors.mutedForeground} />
          <Text style={[styles.statusTitle, textColor]}>Under Review</Text>
          <Text style={[styles.statusSub, mutedColor]}>
            Your verification is being reviewed. This usually takes 1–2 business days. You'll receive a notification when it's complete.
          </Text>
          <Pressable style={[styles.btn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
            <Text style={styles.btnText}>Got It</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isRejected = identity?.status === "rejected";

  return (
    <KeyboardAvoidingView
      style={[styles.flex, bg]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, textColor]}>Identity Verification</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Rejection Banner */}
        {isRejected && (
          <View style={[styles.rejectionBanner, { backgroundColor: colors.destructive + "20", borderColor: colors.destructive + "40" }]}>
            <Feather name="alert-circle" size={16} color={colors.destructive} />
            <Text style={[styles.rejectionText, { color: colors.destructive }]}>
              Previous submission rejected: {identity.rejectionReason ?? "No reason provided"}. Please re-submit with correct information.
            </Text>
          </View>
        )}

        {/* Info Card */}
        <View style={[styles.infoCard, cardStyle]}>
          <Feather name="info" size={16} color={colors.mutedForeground} />
          <Text style={[styles.infoText, mutedColor]}>
            We need to verify your identity before you can offer services on the platform. Your data is encrypted and only accessible to admins.
          </Text>
        </View>

        {/* Step 1: Personal Info */}
        <View style={[styles.section, cardStyle]}>
          <Text style={[styles.sectionTitle, textColor]}>Personal Information</Text>

          <View style={styles.field}>
            <Text style={[styles.label, mutedColor]}>Full Legal Name</Text>
            <TextInput
              style={inputStyle}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Jane Doe"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, mutedColor]}>Date of Birth (YYYY-MM-DD)</Text>
            <TextInput
              style={inputStyle}
              value={dob}
              onChangeText={setDob}
              placeholder="1990-01-15"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, mutedColor]}>Street Address</Text>
            <TextInput
              style={inputStyle}
              value={addressLine1}
              onChangeText={setAddressLine1}
              placeholder="123 Main St"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.field, styles.flex]}>
              <Text style={[styles.label, mutedColor]}>City</Text>
              <TextInput
                style={inputStyle}
                value={city}
                onChangeText={setCity}
                placeholder="City"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="words"
              />
            </View>
            <View style={[styles.field, { width: 80 }]}>
              <Text style={[styles.label, mutedColor]}>State</Text>
              <TextInput
                style={inputStyle}
                value={stateVal}
                onChangeText={setStateVal}
                placeholder="CA"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="characters"
                maxLength={2}
              />
            </View>
            <View style={[styles.field, { width: 100 }]}>
              <Text style={[styles.label, mutedColor]}>ZIP</Text>
              <TextInput
                style={inputStyle}
                value={zip}
                onChangeText={setZip}
                placeholder="90210"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
          </View>
        </View>

        {/* Step 2: ID Photos */}
        <View style={[styles.section, cardStyle]}>
          <Text style={[styles.sectionTitle, textColor]}>Government ID Photos</Text>
          <Text style={[styles.sectionSub, mutedColor]}>
            Upload clear photos of both sides of a government-issued ID (driver's license, passport, national ID).
          </Text>

          <View style={styles.photoRow}>
            <View style={styles.photoCol}>
              <Text style={[styles.label, mutedColor]}>Front</Text>
              <PhotoCard
                label="Tap to upload front"
                uri={idFrontUri}
                uploading={uploading && !idFrontPath}
                onPick={() => pickAndUpload("front")}
                colors={colors}
              />
              {idFrontPath && (
                <View style={styles.checkRow}>
                  <Feather name="check-circle" size={14} color={colors.primary} />
                  <Text style={[styles.checkText, { color: colors.primary }]}>Uploaded</Text>
                </View>
              )}
            </View>

            <View style={styles.photoCol}>
              <Text style={[styles.label, mutedColor]}>Back</Text>
              <PhotoCard
                label="Tap to upload back"
                uri={idBackUri}
                uploading={uploading && !idBackPath}
                onPick={() => pickAndUpload("back")}
                colors={colors}
              />
              {idBackPath && (
                <View style={styles.checkRow}>
                  <Feather name="check-circle" size={14} color={colors.primary} />
                  <Text style={[styles.checkText, { color: colors.primary }]}>Uploaded</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Submit */}
        <Pressable
          style={[
            styles.submitBtn,
            {
              backgroundColor:
                !fullName || !dob || !addressLine1 || !city || !stateVal || !zip || !idFrontPath || !idBackPath || submitting
                  ? colors.muted
                  : colors.primary,
            },
          ]}
          onPress={handleSubmit}
          disabled={
            !fullName || !dob || !addressLine1 || !city || !stateVal || !zip || !idFrontPath || !idBackPath || submitting
          }
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>
              {isRejected ? "Re-submit Verification" : "Submit for Review"}
            </Text>
          )}
        </Pressable>

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  statusCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 16,
  },
  statusTitle: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  statusSub: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  scrollContent: { padding: 16, gap: 16 },
  rejectionBanner: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  rejectionText: { flex: 1, fontSize: 13, lineHeight: 19 },
  infoCard: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 19 },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  sectionTitle: { fontSize: 16, fontWeight: "600" },
  sectionSub: { fontSize: 13, lineHeight: 18, marginTop: -6 },
  field: { gap: 6 },
  label: { fontSize: 12, fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  row: { flexDirection: "row", gap: 10, alignItems: "flex-end" },
  photoRow: { flexDirection: "row", gap: 12 },
  photoCol: { flex: 1, gap: 6 },
  photoCard: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 12,
    overflow: "hidden",
    aspectRatio: 3 / 2,
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
  },
  photoLabel: { fontSize: 12, textAlign: "center" },
  photoPreview: { width: "100%", height: "100%" },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  photoChangeText: { fontSize: 11, fontWeight: "600" },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  checkText: { fontSize: 12, fontWeight: "500" },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btn: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
