import { useAuth, useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

type CMessage = {
  id: number;
  senderId: string;
  senderName: string;
  body: string;
  fileUrl: string | null;
  fileName: string | null;
  createdAt: string;
};

type ConvDetail = {
  id: number;
  contextTitle: string;
  otherUserId?: string;
  otherUserName?: string;
  messages: CMessage[];
};

export default function ConversationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();
  const meId = user?.id ?? "";
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const params = useLocalSearchParams<{ id: string; title?: string }>();
  const convId = params.id;
  const headerTitle = params.title ?? "Messages";

  const [conv, setConv] = useState<ConvDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    if (!convId) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/messages/conversations/${convId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConv(data);
      }
    } catch {}
    setLoading(false);
  }, [convId, getToken]);

  useEffect(() => {
    load();
    // Poll for new messages every 10s
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  const handleSend = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText("");
    try {
      const token = await getToken();
      await fetch(`/api/messages/conversations/${convId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      await load();
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {}
    setSending(false);
  };

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (result.canceled || !result.assets[0]) return;
      const file = result.assets[0];
      const token = await getToken();

      // Upload file to storage
      const form = new FormData();
      form.append("file", { uri: file.uri, name: file.name, type: file.mimeType ?? "application/octet-stream" } as any);
      const uploadRes = await fetch("/api/storage/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!uploadRes.ok) return;
      const { url } = await uploadRes.json();

      // Send as message with file
      await fetch(`/api/messages/conversations/${convId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ body: "", fileUrl: url, fileName: file.name }),
      });
      await load();
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {}
  };

  const messages = conv?.messages ?? [];
  const otherName = conv?.otherUserName ?? headerTitle;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border, paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.secondary }]}>
          <Feather name="chevron-left" size={20} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerName, { color: colors.foreground }]} numberOfLines={1}>{otherName}</Text>
          {conv?.contextTitle ? (
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]} numberOfLines={1}>
              {conv.contextTitle}
            </Text>
          ) : null}
        </View>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={topPad + 56}
        >
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => String(m.id)}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Feather name="message-circle" size={36} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No messages yet — say hello!</Text>
              </View>
            }
            renderItem={({ item: msg }) => {
              const isMe = msg.senderId === meId;
              return (
                <View style={[styles.bubbleRow, isMe ? styles.bubbleRowMe : styles.bubbleRowThem]}>
                  {!isMe && (
                    <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
                      <Text style={{ fontSize: 11 }}>{(msg.senderName?.[0] ?? "?").toUpperCase()}</Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.bubble,
                      isMe
                        ? { backgroundColor: colors.primary }
                        : { backgroundColor: colors.secondary, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth },
                    ]}
                  >
                    {msg.fileUrl ? (
                      <View style={styles.fileRow}>
                        <Feather name="paperclip" size={14} color={isMe ? "#fff" : colors.foreground} />
                        <Text style={[styles.fileName, { color: isMe ? "#fff" : colors.foreground }]} numberOfLines={1}>
                          {msg.fileName ?? "File"}
                        </Text>
                      </View>
                    ) : null}
                    {msg.body ? (
                      <Text style={[styles.bubbleText, { color: isMe ? "#fff" : colors.foreground }]}>
                        {msg.body}
                      </Text>
                    ) : null}
                    <Text style={[styles.bubbleTime, { color: isMe ? "rgba(255,255,255,0.65)" : colors.mutedForeground }]}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                </View>
              );
            }}
          />

          {/* Input bar */}
          <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: insets.bottom + 8 }]}>
            <Pressable onPress={handleFileUpload} style={[styles.attachBtn, { backgroundColor: colors.secondary }]}>
              <Feather name="paperclip" size={18} color={colors.mutedForeground} />
            </Pressable>
            <TextInput
              style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
              placeholder="Message…"
              placeholderTextColor={colors.mutedForeground}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={2000}
              onSubmitEditing={handleSend}
            />
            <Pressable
              onPress={handleSend}
              disabled={!text.trim() || sending}
              style={[styles.sendBtn, { backgroundColor: text.trim() ? colors.primary : colors.secondary }]}
            >
              <Feather name="send" size={18} color={text.trim() ? "#fff" : colors.mutedForeground} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
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
  headerCenter: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  headerName: { fontSize: 15, fontWeight: "700" },
  headerSub: { fontSize: 11, marginTop: 1 },
  listContent: { padding: 16, gap: 8, flexGrow: 1 },
  emptyWrap: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10, paddingTop: 60 },
  emptyText: { fontSize: 14 },
  bubbleRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 4 },
  bubbleRowMe: { justifyContent: "flex-end" },
  bubbleRowThem: { justifyContent: "flex-start" },
  avatar: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center", marginBottom: 2 },
  bubble: { maxWidth: "75%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, gap: 2 },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTime: { fontSize: 10, marginTop: 2, textAlign: "right" },
  fileRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  fileName: { fontSize: 13, fontWeight: "500", flex: 1 },
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    paddingHorizontal: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth,
  },
  attachBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center" },
  input: {
    flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, fontSize: 15,
    maxHeight: 120, borderWidth: StyleSheet.hairlineWidth,
  },
  sendBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center" },
});
