import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Animated,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { chatApi } from '../services/api';
import type { Message } from '../types';
import { C, Dark } from '../theme';
import { dirApp } from '../theme/dirAppTokens';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { dirType } from '../theme/textStyles';
import { fontFamily } from '../theme/fonts';

type ChatRoute = RouteProp<{ Chat: { matchId: string; title: string } }, 'Chat'>;

export default function ChatScreen() {
  const route     = useRoute<ChatRoute>();
  const navigation = useNavigation();
  const { matchId, title } = route.params;
  const { user }  = useAuthStore();
  const { messages, typingUsers, connect, joinChat, loadMessages, sendMessage, setTyping } = useChatStore();

  const [input, setInput]     = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chatMessages = messages[matchId] ?? [];
  const isOtherTyping = typingUsers[matchId] ?? false;

  useEffect(() => {
    navigation.setOptions({ title });

    async function init() {
      await connect();
      joinChat(matchId);
      await loadMessages(matchId);
      chatApi.markRead(matchId).catch(() => {});
      setLoading(false);
    }
    init();
  }, [matchId]);

  useEffect(() => {
    if (chatMessages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [chatMessages.length]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    try {
      await sendMessage(matchId, text);
    } finally {
      setSending(false);
    }
  }, [input, sending, matchId, sendMessage]);

  const handleTyping = (text: string) => {
    setInput(text);
    setTyping(matchId, true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setTyping(matchId, false), 1500);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={C.cyan} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ResponsiveContainer style={{ flex: 1 }}>
          <FlatList
            style={{ flex: 1 }}
            ref={flatListRef}
            data={chatMessages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.messagesList}
            renderItem={({ item }) => (
              <ChatBubble message={item} isMe={item.senderId === user?.id} />
            )}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Text style={[styles.emptyChatText, dirType.body]}>שלח הודעה ראשונה 👋</Text>
              </View>
            }
            ListFooterComponent={isOtherTyping ? <TypingDots /> : null}
          />

          {/* Input bar */}
          <View style={styles.inputBar}>
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!input.trim() || sending}
              accessibilityRole="button"
              accessibilityLabel="שלח הודעה"
            >
              {sending
                ? <ActivityIndicator size="small" color={dirApp.primary} />
                : <Ionicons name="send" size={18} color={dirApp.primary} />
              }
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="הקלד הודעה..."
              placeholderTextColor={C.textMut}
              value={input}
              onChangeText={handleTyping}
              multiline
              maxLength={2000}
              textAlign="right"
              onSubmitEditing={handleSend}
            />
          </View>
        </ResponsiveContainer>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ChatBubble({ message, isMe }: { message: Message; isMe: boolean }) {
  return (
    <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
      <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
        {message.content}
      </Text>
      <View style={styles.bubbleMeta}>
        {isMe && (
          <Ionicons
            name={message.isRead ? 'checkmark-done' : 'checkmark'}
            size={12}
            color={message.isRead ? C.cyan : C.onInverse.faint}
          />
        )}
        <Text style={styles.bubbleTime}>
          {new Date(message.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
}

function TypingDots() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(dot, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.delay((dots.length - 1 - i) * 160),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <View style={styles.typingBubble}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={[
            styles.typingDot,
            { transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }] },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Dark.bg },
  centered: { flex: 1, backgroundColor: Dark.bg, justifyContent: 'center', alignItems: 'center' },
  messagesList: { padding: 16, gap: 8, flexGrow: 1 },
  bubble: {
    maxWidth: '75%', borderRadius: 16, padding: 10,
    paddingHorizontal: 14,
  },
  bubbleMe: {
    alignSelf: 'flex-end', backgroundColor: C.cyan,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    alignSelf: 'flex-start', backgroundColor: Dark.surface,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 15, lineHeight: 20, fontFamily: fontFamily.regular },
  bubbleTextMe: { color: dirApp.primary },
  bubbleTextThem: { color: C.onInverse.secondary },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 3 },
  bubbleTime: { fontSize: 10, color: C.onInverse.faint, fontFamily: fontFamily.regular },
  typingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: Dark.surface, borderRadius: 16, borderBottomLeftRadius: 4,
    alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 10,
  },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.textMut },
  emptyChat: { flex: 1, alignItems: 'center', paddingTop: 60 },
  emptyChatText: { color: C.textMut, fontSize: 14, fontFamily: fontFamily.regular },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    padding: 10, borderTopWidth: 1, borderTopColor: Dark.surface,
    backgroundColor: Dark.bg, gap: 8,
  },
  input: {
    flex: 1, backgroundColor: Dark.surface, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    color: C.onInverse.primary, fontSize: 15, maxHeight: 100,
    borderWidth: 1,
    borderColor: Dark.border,
    fontFamily: fontFamily.regular,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: C.cyan,
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});
