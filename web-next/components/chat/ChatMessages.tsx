"use client";

import { useState, useRef, useEffect } from "react";
import type { Match } from "@/lib/types";

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

interface ChatMessagesProps {
  match: Match & { unreadCount?: number };
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  onSend: (content: string) => void;
  currentUserId: string;
  role: string;
}

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "היום";
    if (d.toDateString() === yesterday.toDateString()) return "אתמול";
    return d.toLocaleDateString("he-IL", { day: "numeric", month: "long" });
  } catch {
    return "";
  }
}

export function ChatMessages({ match, messages, isLoading, isSending, onSend, currentUserId, role }: ChatMessagesProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const otherUser = role === "tenant" ? match.landlord : match.tenant;

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, [match.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSend(input.trim());
      setInput("");
    }
  };

  // Group messages by date
  let lastDate = "";

  return (
    <div className="flex-grow flex flex-col min-w-0">
      {/* Chat Header */}
      <div className="px-5 py-3 border-b border-outline-variant/30 flex items-center gap-3 bg-white shrink-0">
        {otherUser?.avatarUrl ? (
          <img src={otherUser.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-tenant-blue/10 flex items-center justify-center text-tenant-blue font-bold text-[14px]">
            {otherUser?.firstName?.[0]}{otherUser?.lastName?.[0]}
          </div>
        )}
        <div className="flex-grow">
          <h3 className="text-[16px] font-bold text-tenant-blue">
            {otherUser?.firstName} {otherUser?.lastName}
          </h3>
          <p className="text-[12px] text-on-surface-variant">
            {match.apartment?.address}, {match.apartment?.city} • {match.apartment?.rooms} חד׳
          </p>
        </div>
        <div className="flex items-center gap-2">
          {otherUser?.phone && (
            <a href={`tel:${otherUser.phone}`} className="w-9 h-9 rounded-lg border border-outline-variant flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors" title="התקשר">
              <span className="material-symbols-outlined text-[18px]">call</span>
            </a>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-grow overflow-y-auto px-5 py-4 space-y-1 bg-[#f8f9fb]">
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-3 border-landlord-green border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-[48px] text-outline/20 mb-2">waving_hand</span>
            <p className="text-on-surface-variant text-[14px]">
              התחל שיחה עם {otherUser?.firstName}
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isMine = msg.senderId === currentUserId;
          const msgDate = formatDate(msg.createdAt);
          let showDateSeparator = false;
          if (msgDate !== lastDate) {
            showDateSeparator = true;
            lastDate = msgDate;
          }

          return (
            <div key={msg._id || msg.id || msg.createdAt}>
              {/* Date separator */}
              {showDateSeparator && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-grow h-px bg-outline-variant/30" />
                  <span className="text-[11px] text-on-surface-variant font-medium bg-[#f8f9fb] px-3">{msgDate}</span>
                  <div className="flex-grow h-px bg-outline-variant/30" />
                </div>
              )}

              {/* Message bubble */}
              <div className={`flex ${isMine ? "justify-start" : "justify-end"} mb-1`}>
                <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                  isMine
                    ? "bg-tenant-blue text-white rounded-br-md"
                    : "bg-white text-on-surface shadow-sm rounded-bl-md"
                }`}>
                  {msg.type === "image" && msg.imageUrl && (
                    <img src={msg.imageUrl} alt="" className="rounded-lg max-w-full mb-2" />
                  )}
                  <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-start" : "justify-end"}`}>
                    <span className={`text-[10px] ${isMine ? "text-white/60" : "text-on-surface-variant/60"}`}>
                      {formatTime(msg.createdAt)}
                    </span>
                    {isMine && msg.isRead && (
                      <span className="material-symbols-outlined text-[12px] text-white/60" style={{ fontVariationSettings: "'FILL' 1" }}>done_all</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-outline-variant/30 bg-white flex items-center gap-3 shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="כתוב הודעה..."
          className="flex-grow h-11 bg-surface-container rounded-full px-5 text-[14px] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-landlord-green/30"
          dir="rtl"
        />
        <button
          type="submit"
          disabled={!input.trim() || isSending}
          className="w-11 h-11 bg-landlord-green text-white rounded-full flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-all active:scale-95 shrink-0"
        >
          {isSending ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="material-symbols-outlined text-[20px] rotate-180">send</span>
          )}
        </button>
      </form>
    </div>
  );
}
