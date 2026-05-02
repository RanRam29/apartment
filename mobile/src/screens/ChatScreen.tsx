import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import type { Message } from '../types';

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
        <ActivityIndicator size="large" color="#6C5CE7" />
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
        <FlatList
          ref={flatListRef}
          data={chatMessages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messagesList}
          renderItem={({ item }) => (
            <ChatBubble message={item} isMe={item.senderId === user?.id} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>שלח הודעה ראשונה 👋</Text>
            </View>
          }
          ListFooterComponent={
            isOtherTyping ? (
              <View style={styles.typingIndicator}>
                <Text style={styles.typingText}>מקליד...</Text>
              </View>
            ) : null
          }
        />

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || sending}
          >
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="send" size={18} color="#fff" />
            }
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="הקלד הודעה..."
            placeholderTextColor="#A0A0B2"
            value={input}
            onChangeText={handleTyping}
            multiline
            maxLength={2000}
            textAlign="right"
            onSubmitEditing={handleSend}
          />
        </View>
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
      <Text style={styles.bubbleTime}>
        {new Date(message.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  centered: { flex: 1, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' },
  messagesList: { padding: 16, gap: 8, flexGrow: 1 },
  bubble: {
    maxWidth: '75%', borderRadius: 16, padding: 10,
    paddingHorizontal: 14,
  },
  bubbleMe: {
    alignSelf: 'flex-end', backgroundColor: '#6C5CE7',
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    alignSelf: 'flex-start', backgroundColor: '#2A2A3E',
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTextMe: { color: '#fff' },
  bubbleTextThem: { color: '#E0E0E0' },
  bubbleTime: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 3, textAlign: 'right' },
  typingIndicator: { paddingHorizontal: 16, paddingBottom: 4 },
  typingText: { color: '#A0A0B2', fontSize: 12, fontStyle: 'italic' },
  emptyChat: { flex: 1, alignItems: 'center', paddingTop: 60 },
  emptyChatText: { color: '#A0A0B2', fontSize: 14 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    padding: 10, borderTopWidth: 1, borderTopColor: '#2A2A3E',
    backgroundColor: '#1A1A2E', gap: 8,
  },
  input: {
    flex: 1, backgroundColor: '#2A2A3E', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    color: '#fff', fontSize: 15, maxHeight: 100,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});
