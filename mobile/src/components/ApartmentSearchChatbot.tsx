import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  TextInput,
  ScrollView,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { recommendationsApi } from '../services/api';
import type { Apartment } from '../types';
import { C } from '../theme';

const FILTER_LABEL: Record<string, string> = {
  city: 'עיר',
  street: 'רחוב',
  neighborhood: 'רחוב',
  minPrice: 'מחיר מ',
  maxPrice: 'מחיר עד',
  minRooms: 'חדרים מ',
  maxRooms: 'חדרים עד',
  amenities: 'מתקנים',
  petsAllowed: 'חיות',
  availableFrom: 'פנוי מ',
};

/** תוויות בעברית לערכי amenities מהשרת (אנגלית) */
const AMENITY_LABEL: Record<string, string> = {
  parking: 'חניה',
  balcony: 'מרפסת',
  elevator: 'מעלית',
  ac: 'מזגן',
  storage: 'מחסן',
  pets_allowed: 'מתאים לחיות',
  furnished: 'מרוהט',
  sun_boiler: 'דוד שמש',
};

function formatFilterSummary(
  filters: Record<string, unknown> | null | undefined,
  opts?: { hasResults?: boolean; queryPreview?: string }
): string {
  if (!filters || Object.keys(filters).length === 0) {
    if (opts?.hasResults && opts.queryPreview?.trim()) {
      const q = opts.queryPreview.trim();
      const short = q.length > 90 ? `${q.slice(0, 90)}…` : q;
      return `חיפוש לפי הבקשה שלך: «${short}»`;
    }
    if (opts?.hasResults) {
      return 'החיפוש הוחל; להלן דירות רלוונטיות.';
    }
    return 'לא זוהו פילטרים ספציפיים מהטקסט — מוצגות דירות זמינות.';
  }
  const parts = Object.entries(filters).map(([k, val]) => {
    const label = FILTER_LABEL[k] ?? k;
    if (Array.isArray(val)) {
      const shown =
        k === 'amenities'
          ? val.map((x) => AMENITY_LABEL[String(x)] ?? String(x))
          : val.map(String);
      return `${label}: ${shown.join(', ')}`;
    }
    if (typeof val === 'boolean') return `${label}: ${val ? 'כן' : 'לא'}`;
    return `${label}: ${String(val)}`;
  });
  return `זיהיתי: ${parts.join(' · ')}`;
}

type ChatMessage = {
  id: string;
  role: 'user' | 'bot';
  text: string;
  apartments?: Apartment[];
};

function newId() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'bot',
  text: 'שלום! תאר בחופשיות מה אתה מחפש — עיר, תקציב, חדרים, חניה, גישה לחיות וכו׳. שלח הודעה ואחפש דירות בשבילך.',
};

export default function ApartmentSearchChatbot() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const scrollRef = useRef<ScrollView>(null);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [messages]);

  const fabBottom = 88 + Math.max(insets.bottom, 8);

  const send = useCallback(async () => {
    const q = input.trim();
    if (!q || pending) return;

    const userMsg: ChatMessage = { id: newId(), role: 'user', text: q };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setPending(true);

    try {
      const res = await recommendationsApi.nlpSearch(q);
      const { apartments = [], filters } = res.data as {
        apartments: Apartment[];
        filters?: Record<string, unknown>;
      };

      const summary = formatFilterSummary(filters, {
        hasResults: apartments.length > 0,
        queryPreview: q,
      });
      const count = apartments.length;
      const body =
        count === 0
          ? `${summary}\n\nלא נמצאו דירות התואמות — נסה ניסוח אחר או חיפוש בלשונית «חיפוש».`
          : `${summary}\n\nנמצאו ${count} דירות. להלן התוצאות — לחץ על דירה לפרטים מלאים.`;

      const botMsg: ChatMessage = {
        id: newId(),
        role: 'bot',
        text: body,
        apartments: count > 0 ? apartments : undefined,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: unknown) {
      const ax = err as { response?: { status?: number } };
      const status = ax.response?.status;
      let hint = 'לא הצלחתי להשלים את החיפוש. נסה שוב בעוד רגע.';
      if (status === 429) {
        hint = 'יותר מדי בקשות חיפוש בזמן קצר. המתן דקה ונסה שוב.';
      } else if (status === 422) {
        hint = 'הטקסט קצר מדי או לא תקין — נסה משפט ארוך יותר.';
      }
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: 'bot', text: hint },
      ]);
    } finally {
      setPending(false);
    }
  }, [input, pending]);

  const clearChat = useCallback(() => {
    setMessages([WELCOME]);
  }, []);

  const openDetail = useCallback(
    (apartmentId: string) => {
      setOpen(false);
      navigation.navigate('ApartmentDetail', { apartmentId });
    },
    [navigation]
  );

  return (
    <>
      <TouchableOpacity
        style={[styles.fab, { bottom: fabBottom }]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="פתח חיפוש דירות בצ׳אט"
        activeOpacity={0.9}
      >
        <Ionicons name="chatbubbles" size={26} color={C.navy} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={clearChat}
              style={styles.headerBtn}
              accessibilityRole="button"
              accessibilityLabel="נקה צ׳אט"
            >
              <Text style={styles.headerBtnText}>נקה</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>חיפוש דירות בצ׳אט</Text>
            <TouchableOpacity
              onPress={() => setOpen(false)}
              style={styles.headerBtn}
              accessibilityRole="button"
              accessibilityLabel="סגור"
            >
              <Ionicons name="close" size={24} color={C.onInverse.primary} />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
          >
            <ScrollView
              ref={scrollRef}
              style={styles.chatScroll}
              contentContainerStyle={styles.chatContent}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.map((m) => (
                <View key={m.id} style={styles.msgWrap}>
                  <View
                    style={[
                      styles.bubble,
                      m.role === 'user' ? styles.bubbleUser : styles.bubbleBot,
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleText,
                        m.role === 'user' && styles.bubbleTextUser,
                      ]}
                    >
                      {m.text}
                    </Text>
                  </View>
                  {m.role === 'bot' && m.apartments && m.apartments.length > 0 && (
                    <FlatList
                      horizontal
                      data={m.apartments}
                      keyExtractor={(a) => a.id}
                      showsHorizontalScrollIndicator={false}
                      style={styles.apartmentStrip}
                      contentContainerStyle={styles.apartmentStripContent}
                      renderItem={({ item }) => (
                        <Pressable
                          style={styles.miniCard}
                          onPress={() => openDetail(item.id)}
                          accessibilityRole="button"
                          accessibilityLabel={`${item.title}, ${item.price} שקלים לחודש`}
                        >
                          <Image
                            source={{
                              uri: item.images?.[0]?.url || 'https://via.placeholder.com/72',
                            }}
                            style={styles.miniThumb}
                            contentFit="cover"
                          />
                          <Text style={styles.miniTitle} numberOfLines={2}>
                            {item.title}
                          </Text>
                          <Text style={styles.miniPrice}>
                            ₪{item.price.toLocaleString()}
                          </Text>
                        </Pressable>
                      )}
                    />
                  )}
                </View>
              ))}
              {pending && (
                <View style={[styles.bubble, styles.bubbleBot, styles.thinking]}>
                  <ActivityIndicator size="small" color={C.cyan} />
                  <Text style={styles.thinkingText}>מחפש עם AI...</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.inputRow}>
              <TouchableOpacity
                style={[styles.sendBtn, (!input.trim() || pending) && styles.sendBtnDisabled]}
                onPress={send}
                disabled={!input.trim() || pending}
                accessibilityRole="button"
                accessibilityLabel="שלח הודעה"
              >
                <Ionicons name="send" size={20} color={C.navy} />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                placeholder="למשל: 3 חדרים בתל אביב עד 8000 עם חניה..."
                placeholderTextColor={C.textMut}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={send}
                returnKeyType="send"
                editable={!pending}
                textAlign="right"
                multiline
                maxLength={500}
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const BORDER = C.cyanAlpha(0.14);

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.cyan,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
    elevation: 12,
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalRoot: { flex: 1, backgroundColor: C.navy },
  flex: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  modalTitle: { color: C.onInverse.primary, fontSize: 17, fontWeight: '800' },
  headerBtn: { padding: 10, minWidth: 48 },
  headerBtnText: { color: C.cyan, fontSize: 14, fontWeight: '600' },
  chatScroll: { flex: 1 },
  chatContent: { padding: 16, paddingBottom: 24, gap: 12 },
  msgWrap: { gap: 8 },
  bubble: {
    maxWidth: '92%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    alignSelf: 'flex-end',
  },
  bubbleUser: {
    backgroundColor: C.cyan,
    alignSelf: 'flex-end',
  },
  bubbleBot: {
    backgroundColor: C.navyMid,
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: BORDER,
  },
  bubbleText: {
    color: C.onInverse.primary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'right',
  },
  bubbleTextUser: { color: C.navy, fontWeight: '600' },
  thinking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'stretch',
  },
  thinkingText: { color: C.textMut, fontSize: 13 },
  apartmentStrip: { marginTop: 4, maxHeight: 140 },
  apartmentStripContent: { gap: 10, paddingVertical: 4 },
  miniCard: {
    width: 132,
    backgroundColor: C.navyMid,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  miniThumb: { width: '100%', height: 64, borderRadius: 8, marginBottom: 6 },
  miniTitle: { color: C.onInverse.primary, fontSize: 11, fontWeight: '600', textAlign: 'right', minHeight: 28 },
  miniPrice: { color: C.cyan, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: C.navy,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: C.navyMid,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: C.onInverse.primary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.cyan,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.45 },
});
