"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import type { Match } from "@/lib/types";
import { toast } from "sonner";
import { ChatSidebar } from "./ChatSidebar";
import { ChatMessages } from "./ChatMessages";

interface MatchesResponse {
  matches: (Match & { unreadCount?: number })[];
}

interface ChatMessage {
  _id?: string;
  id?: string;
  matchId: string;
  senderId: string;
  content: string;
  type: "text" | "image";
  imageUrl?: string;
  isRead?: boolean;
  createdAt: string;
}

interface MessagesResponse {
  messages: ChatMessage[];
  hasMore: boolean;
}

export function ChatPage() {
  const { user, token } = useAuth();
  const searchParams = useSearchParams();
  const initialMatchId = searchParams.get("matchId");

  const [activeMatchId, setActiveMatchId] = useState<string | null>(initialMatchId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch accepted matches (only accepted have chat)
  const { data: matchesData, mutate: refreshMatches } = useApi<MatchesResponse>("/api/matches");
  const acceptedMatches = (matchesData?.matches || []).filter((m) => m.status === "accepted");

  // Auto-select first match if none selected
  useEffect(() => {
    if (!activeMatchId && acceptedMatches.length > 0) {
      setActiveMatchId(acceptedMatches[0].id);
    }
  }, [activeMatchId, acceptedMatches]);

  // Fetch messages for active match
  const fetchMessages = useCallback(async () => {
    if (!activeMatchId || !token) return;
    try {
      const res = await api<MessagesResponse>(`/api/chat/${activeMatchId}?limit=50`, { token });
      setMessages(res.messages);
      // Mark as read
      api(`/api/chat/${activeMatchId}/read`, { method: "PATCH", token }).catch(() => {});
    } catch (err) {
      console.error("Fetch messages failed:", err);
    }
  }, [activeMatchId, token]);

  // Load messages when active match changes
  useEffect(() => {
    if (activeMatchId) {
      setMessagesLoading(true);
      fetchMessages().finally(() => setMessagesLoading(false));
    }
  }, [activeMatchId, fetchMessages]);

  // Polling for new messages (every 5s) — fallback for Socket.io
  useEffect(() => {
    if (!activeMatchId) return;
    pollRef.current = setInterval(() => {
      fetchMessages();
    }, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeMatchId, fetchMessages]);

  // Send message
  const handleSend = useCallback(async (content: string) => {
    if (!activeMatchId || !token || !content.trim()) return;
    setSending(true);
    try {
      const res = await api<{ message: ChatMessage }>(`/api/chat/${activeMatchId}`, {
        method: "POST",
        body: { content: content.trim(), type: "text" },
        token,
      });
      setMessages((prev) => [...prev, res.message]);
      refreshMatches();
    } catch (err: any) {
      console.error("Send message failed:", err);
      toast.error(err?.message || "שליחת ההודעה נכשלה. אנא נסה שוב.");
    } finally {
      setSending(false);
    }
  }, [activeMatchId, token, refreshMatches]);

  // Get the active match object
  const activeMatch = acceptedMatches.find((m) => m.id === activeMatchId);
  const role = user?.activeRole || user?.role || "tenant";

  return (
    <div className="flex h-[calc(100vh-112px)] bg-surface-container-lowest rounded-xl overflow-hidden soft-shadow border border-outline-variant/50">
      {/* Sidebar: Match list */}
      <ChatSidebar
        matches={acceptedMatches}
        activeMatchId={activeMatchId}
        onSelect={setActiveMatchId}
        role={role}
        currentUserId={user?.id || ""}
      />

      {/* Chat area */}
      {activeMatch ? (
        <ChatMessages
          match={activeMatch}
          messages={messages}
          isLoading={messagesLoading}
          isSending={sending}
          onSend={handleSend}
          currentUserId={user?.id || ""}
          role={role}
        />
      ) : (
        <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
          <span className="material-symbols-outlined text-[64px] text-outline/20 mb-4">forum</span>
          <h3 className="text-[20px] font-bold text-tenant-blue mb-2">
            {acceptedMatches.length === 0 ? "אין שיחות פעילות" : "בחר שיחה"}
          </h3>
          <p className="text-on-surface-variant text-[14px] max-w-sm">
            {acceptedMatches.length === 0
              ? "ברגע שיהיו לך התאמות מאושרות, תוכל לנהל צ'אט עם המשכיר או השוכר"
              : "בחר שיחה מהרשימה כדי להתחיל לשוחח"}
          </p>
        </div>
      )}
    </div>
  );
}
