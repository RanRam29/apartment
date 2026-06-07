import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Animated, Dimensions, Alert, Linking,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { chatApi, matchesApi } from '../services/api';
import type { Message } from '../types';
import { C } from '../theme';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { fontFamily } from '../theme/fonts';

type ChatRoute = RouteProp<{ Chat: { matchId: string; title: string } }, 'Chat'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const colorsV3 = {
  primary: '#00091b',
  primaryContainer: '#002045',
  onPrimaryContainer: '#7089b3',
  secondary: '#006b5f',
  secondaryContainer: '#9cefdf',
  onSecondaryContainer: '#0b6f63',
  background: '#f8f9ff',
  surface: '#f8f9ff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f2f3f9',
  surfaceContainer: '#eceef3',
  surfaceContainerHigh: '#e7e8ee',
  surfaceContainerHighest: '#e1e2e8',
  onSurface: '#191c20',
  onSurfaceVariant: '#44474e',
  outline: '#74777f',
  outlineVariant: '#c4c6cf',
  actionCta: '#00cba9',
  error: '#ba1a1a',
};

export default function ChatScreen() {
  const route     = useRoute<ChatRoute>();
  const navigation = useNavigation<any>();
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

  // Retrieve active match details for the custom header and context mini-card
  const { data: matchData } = useQuery({
    queryKey: ['match', matchId],
    queryFn: () => matchesApi.getById(matchId).then((r) => r.data.match),
  });

  const isLandlord = matchData?.landlordId === user?.id;
  const otherParty = isLandlord ? matchData?.tenant : matchData?.landlord;
  const apartment = matchData?.apartment;

  // Hide the default react-navigation header to render our own highly custom V3 header
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
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
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
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

  const handleCall = () => {
    if (otherParty?.phone) {
      Linking.openURL(`tel:${otherParty.phone}`);
    } else {
      Alert.alert('שגיאה', 'לא נמצא מספר טלפון עבור משתמש זה.');
    }
  };

  const handleMoreOptions = () => {
    Alert.alert(
      'אפשרויות שיחה',
      `שיחה עם ${otherParty?.firstName || 'המשתמש'}`,
      [
        { text: 'מחק שיחה', style: 'destructive', onPress: () => {} },
        { text: 'דווח על משתמש', onPress: () => {} },
        { text: 'ביטול', style: 'cancel' }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colorsV3.secondary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Custom V3 Header ── */}
      <View style={styles.customHeader}>
        <View style={styles.headerRightCol}>
          {/* Back button (RTL forward arrow) */}
          <TouchableOpacity 
            style={styles.headerBackBtn} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-forward" size={24} color={colorsV3.primary} />
          </TouchableOpacity>

          {/* Contact Details */}
          <View style={styles.headerUserCard}>
            {otherParty?.avatarUrl && !otherParty.avatarUrl.includes('via.placeholder.com') ? (
              <Image source={{ uri: otherParty.avatarUrl }} style={styles.headerAvatar} contentFit="cover" />
            ) : (
              <View style={styles.headerAvatarFallback}>
                <Ionicons name="person" size={16} color="#74777f" />
              </View>
            )}
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{otherParty ? `${otherParty.firstName} ${otherParty.lastName}` : title}</Text>
            <Text style={styles.headerStatusText}>אונליין</Text>
          </View>
        </View>

        {/* Action Call & Menu buttons */}
        <View style={styles.headerLeftCol}>
          <TouchableOpacity style={styles.headerActionBtn} onPress={handleCall} activeOpacity={0.7}>
            <Ionicons name="call-outline" size={20} color={colorsV3.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionBtn} onPress={handleMoreOptions} activeOpacity={0.7}>
            <Ionicons name="ellipsis-vertical" size={20} color={colorsV3.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <ResponsiveContainer style={{ flex: 1 }}>
          {/* ── Property Context Mini-Card ── */}
          {apartment && (
            <TouchableOpacity 
              style={styles.contextCard}
              onPress={() => navigation.navigate('ApartmentDetail', { apartmentId: apartment.id })}
              activeOpacity={0.9}
            >
              {apartment.images?.[0]?.url ? (
                <Image source={{ uri: apartment.images[0].url }} style={styles.contextThumb} contentFit="cover" />
              ) : (
                <View style={styles.contextThumbFallback}>
                  <Ionicons name="home-outline" size={18} color="#74777f" />
                </View>
              )}
              <View style={styles.contextDetails}>
                <Text style={styles.contextTitle} numberOfLines={1}>{apartment.title}</Text>
                <Text style={styles.contextSubtitle} numberOfLines={1}>
                  {apartment.city}{apartment.street ? `, ${apartment.street}` : ''}
                </Text>
              </View>
              <View style={styles.contextPriceCol}>
                <Text style={styles.contextPriceText}>₪{Number(apartment.price).toLocaleString()}</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Messages Feed */}
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
            ListFooterComponent={isOtherTyping ? <TypingDots /> : null}
          />

          {/* ── V3 Chat Input Bar ── */}
          <View style={styles.inputBar}>
            {/* Action Attachment Buttons */}
            <TouchableOpacity 
              style={styles.attachBtn} 
              onPress={() => Alert.alert('קובץ', 'בחירת קבצים')}
              activeOpacity={0.75}
            >
              <Ionicons name="attach-outline" size={24} color="#74777f" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.attachBtn} 
              onPress={() => Alert.alert('מצלמה', 'פתיחת מצלמה')}
              activeOpacity={0.75}
            >
              <Ionicons name="camera-outline" size={24} color="#74777f" />
            </TouchableOpacity>

            {/* Message Input text field */}
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="הקלד הודעה..."
                placeholderTextColor="#74777f"
                value={input}
                onChangeText={handleTyping}
                multiline
                maxLength={2000}
                textAlign="right"
              />
            </View>

            {/* Send button (Teal circle) */}
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!input.trim() || sending}
              activeOpacity={0.8}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="send" size={18} color="#ffffff" style={styles.sendIcon} />
              )}
            </TouchableOpacity>
          </View>
        </ResponsiveContainer>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ChatBubble({ message, isMe }: { message: Message; isMe: boolean }) {
  let timeString = '';
  try {
    timeString = new Date(message.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  } catch {
    timeString = '00:00';
  }

  return (
    <View style={[styles.bubbleWrapper, isMe ? styles.bubbleMeWrapper : styles.bubbleThemWrapper]}>
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
        <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
          {message.content}
        </Text>
      </View>
      <View style={[styles.bubbleMeta, isMe ? styles.bubbleMetaMe : styles.bubbleMetaThem]}>
        {isMe && (
          <Ionicons
            name={message.isRead ? 'checkmark-done' : 'checkmark'}
            size={14}
            color={message.isRead ? colorsV3.secondary : '#74777f'}
            style={{ marginLeft: 4 }}
          />
        )}
        <Text style={styles.bubbleTime}>{timeString}</Text>
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
  container: { flex: 1, backgroundColor: colorsV3.background },
  centered: { flex: 1, backgroundColor: colorsV3.background, justifyContent: 'center', alignItems: 'center' },
  
  // Custom V3 Header
  customHeader: {
    flexDirection: 'row-reverse',
    height: 64,
    width: '100%',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#c4c6cf',
  },
  headerRightCol: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  headerBackBtn: {
    padding: 4,
  },
  headerUserCard: {
    position: 'relative',
    width: 40,
    height: 40,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colorsV3.secondaryContainer,
  },
  headerAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colorsV3.surfaceContainerLow,
    borderWidth: 1.5,
    borderColor: colorsV3.secondaryContainer,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colorsV3.secondary, // Teal online dot
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  headerInfo: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerName: {
    fontSize: 14,
    fontWeight: '700',
    color: colorsV3.primary,
    fontFamily: fontFamily.bold,
  },
  headerStatusText: {
    fontSize: 11,
    color: colorsV3.secondary,
    fontFamily: fontFamily.semibold,
    marginTop: 1,
  },
  headerLeftCol: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  headerActionBtn: {
    padding: 6,
  },

  // Property Context Mini-Card
  contextCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colorsV3.outlineVariant,
    borderRadius: 12,
    padding: 8,
    gap: 12,
    shadowColor: '#002045',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  contextThumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
  },
  contextThumbFallback: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: colorsV3.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contextDetails: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
  },
  contextTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colorsV3.primary,
    fontFamily: fontFamily.bold,
  },
  contextSubtitle: {
    fontSize: 10,
    color: colorsV3.onSurfaceVariant,
    fontFamily: fontFamily.regular,
  },
  contextPriceCol: {
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  contextPriceText: {
    fontSize: 14,
    fontWeight: '800',
    color: colorsV3.secondary,
    fontFamily: fontFamily.bold,
  },

  // Messages
  messagesList: { padding: 16, gap: 14, flexGrow: 1 },
  bubbleWrapper: {
    maxWidth: '75%',
    gap: 4,
  },
  bubbleMeWrapper: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  bubbleThemWrapper: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#002045',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  bubbleMe: {
    backgroundColor: colorsV3.secondary, // Teal bubble for sender
    borderBottomRightRadius: 2,
  },
  bubbleThem: {
    backgroundColor: colorsV3.surfaceContainerHigh, // Greyish bubble for recipient
    borderBottomLeftRadius: 2,
  },
  bubbleText: { fontSize: 14, lineHeight: 20, fontFamily: fontFamily.regular },
  bubbleTextMe: { color: '#ffffff' },
  bubbleTextThem: { color: colorsV3.primary },
  bubbleMeta: { flexDirection: 'row-reverse', alignItems: 'center', marginTop: 2 },
  bubbleMetaMe: { alignSelf: 'flex-end' },
  bubbleMetaThem: { alignSelf: 'flex-start' },
  bubbleTime: { fontSize: 9, color: '#74777f', fontFamily: fontFamily.regular },
  typingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: colorsV3.surfaceContainerHigh, borderRadius: 16, borderBottomLeftRadius: 4,
    alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 10,
  },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#74777f' },
  emptyChat: { flex: 1, alignItems: 'center', paddingTop: 60 },
  emptyChatText: { color: '#74777f', fontSize: 14, fontFamily: fontFamily.regular },
  
  // Footer input bar
  inputBar: {
    flexDirection: 'row-reverse', // RTL footer bar
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#c4c6cf',
    backgroundColor: '#ffffff',
    gap: 8,
  },
  attachBtn: {
    padding: 6,
  },
  inputWrapper: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
  },
  input: {
    backgroundColor: colorsV3.surfaceContainerLow,
    borderRadius: 20,
    paddingHorizontal: 16,
    height: '100%',
    color: colorsV3.primary,
    fontSize: 14,
    textAlign: 'right',
    fontFamily: fontFamily.regular,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colorsV3.secondary, // Teal send button
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colorsV3.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  sendIcon: {
    transform: [{ rotate: '180deg' }], // RTL send icon pointing left
  },
  sendBtnDisabled: { opacity: 0.5 },
});
