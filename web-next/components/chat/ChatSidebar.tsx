"use client";

import type { Match } from "@/lib/types";

interface ChatSidebarProps {
  matches: (Match & { unreadCount?: number })[];
  activeMatchId: string | null;
  onSelect: (id: string) => void;
  role: string;
  currentUserId: string;
}

export function ChatSidebar({ matches, activeMatchId, onSelect, role, currentUserId }: ChatSidebarProps) {
  return (
    <aside className="w-[320px] shrink-0 border-l border-outline-variant/50 flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-outline-variant/30">
        <h2 className="text-[18px] font-bold text-tenant-blue flex items-center gap-2">
          <span className="material-symbols-outlined text-[22px]">forum</span>
          הודעות
        </h2>
        <p className="text-[12px] text-on-surface-variant mt-1">{matches.length} שיחות פעילות</p>
      </div>

      {/* Match list */}
      <div className="flex-grow overflow-y-auto">
        {matches.length === 0 && (
          <div className="p-6 text-center">
            <span className="material-symbols-outlined text-[40px] text-outline/20 mb-2">chat_bubble_outline</span>
            <p className="text-[13px] text-on-surface-variant">אין שיחות עדיין</p>
          </div>
        )}

        {matches.map((match) => {
          const otherUser = role === "tenant" ? match.landlord : match.tenant;
          const isActive = match.id === activeMatchId;
          const apt = match.apartment;

          return (
            <button
              key={match.id}
              onClick={() => onSelect(match.id)}
              className={`w-full text-right p-4 flex items-start gap-3 transition-colors border-b border-outline-variant/20 ${
                isActive
                  ? "bg-tenant-blue/5 border-r-4 border-r-tenant-blue"
                  : "hover:bg-surface-container"
              }`}
            >
              {/* Avatar */}
              {otherUser?.avatarUrl ? (
                <img src={otherUser.avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-tenant-blue/10 flex items-center justify-center text-tenant-blue font-bold text-[14px] shrink-0">
                  {otherUser?.firstName?.[0]}{otherUser?.lastName?.[0]}
                </div>
              )}

              {/* Info */}
              <div className="flex-grow min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[14px] font-bold text-tenant-blue truncate">
                    {otherUser?.firstName} {otherUser?.lastName}
                  </span>
                  {match.unreadCount ? (
                    <span className="bg-admin-red text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 shrink-0">
                      {match.unreadCount > 9 ? "9+" : match.unreadCount}
                    </span>
                  ) : null}
                </div>
                <p className="text-[12px] text-on-surface-variant truncate">
                  {apt?.address || apt?.title || "—"}, {apt?.city || ""}
                </p>
                <p className="text-[11px] text-outline mt-0.5">
                  {apt?.rooms} חד׳ • ₪{apt?.price?.toLocaleString()}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
