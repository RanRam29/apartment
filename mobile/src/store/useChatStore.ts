import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { chatApi, tokenStorage } from '../services/api';
import { getApiBaseUrl } from '../services/apiConfig';
import type { Message } from '../types';

interface ChatState {
  messages: Record<string, Message[]>;
  socket: Socket | null;
  typingUsers: Record<string, boolean>;

  connect: () => Promise<void>;
  disconnect: () => void;
  joinChat: (matchId: string) => void;
  loadMessages: (matchId: string, before?: string) => Promise<void>;
  sendMessage: (matchId: string, content: string) => Promise<void>;
  setTyping: (matchId: string, isTyping: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: {},
  socket: null,
  typingUsers: {},

  connect: async () => {
    if (get().socket?.connected) return;

    const token = await tokenStorage.get();
    if (!token) return;

    const socket = io(getApiBaseUrl(), {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socket.on('new_message', (msg: Message) => {
      set((state) => ({
        messages: {
          ...state.messages,
          [msg.matchId]: [...(state.messages[msg.matchId] ?? []), msg],
        },
      }));
    });

    socket.on('user_typing', ({ userId, matchId }: { userId: string; matchId: string }) => {
      set((state) => ({
        typingUsers: { ...state.typingUsers, [matchId]: true },
      }));
      // Clear after 3s
      setTimeout(() => {
        set((state) => ({
          typingUsers: { ...state.typingUsers, [matchId]: false },
        }));
      }, 3000);
    });

    socket.on('user_stop_typing', ({ matchId }: { matchId: string }) => {
      set((state) => ({
        typingUsers: { ...state.typingUsers, [matchId]: false },
      }));
    });

    socket.on('messages_read', ({ matchId }: { matchId: string }) => {
      set((state) => ({
        messages: {
          ...state.messages,
          [matchId]: (state.messages[matchId] ?? []).map((m) => ({ ...m, isRead: true })),
        },
      }));
    });

    socket.on('join_chat_room', (matchId: string) => {
      if (matchId) socket.emit('join_chat', matchId);
    });

    set({ socket });
  },

  disconnect: () => {
    get().socket?.disconnect();
    set({ socket: null, messages: {}, typingUsers: {} });
  },

  joinChat: (matchId) => {
    get().socket?.emit('join_chat', matchId);
  },

  loadMessages: async (matchId, before) => {
    const res = await chatApi.getMessages(matchId, { limit: 30, before });
    set((state) => ({
      messages: {
        ...state.messages,
        [matchId]: before
          ? [...(res.data.messages as Message[]), ...(state.messages[matchId] ?? [])]
          : (res.data.messages as Message[]),
      },
    }));
  },

  sendMessage: async (matchId, content) => {
    const socket = get().socket;
    if (socket?.connected) {
      socket.emit('send_message', { matchId, content });
    } else {
      // REST fallback
      await chatApi.sendMessage(matchId, content);
    }
  },

  setTyping: (matchId, isTyping) => {
    const event = isTyping ? 'typing' : 'stop_typing';
    get().socket?.emit(event, { matchId });
  },
}));
