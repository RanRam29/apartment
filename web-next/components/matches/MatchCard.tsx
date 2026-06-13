"use client";

import Link from "next/link";
import type { Match, UserRole } from "@/lib/types";
import { ApartmentImage, ApartmentImageFallback } from "@/components/ui/ApartmentImage";

interface MatchCardProps {
  match: Match & { unreadCount?: number };
  role: UserRole | string;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  isActionLoading: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: "ממתין לאישור", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: "hourglass_top" },
  accepted: { label: "מאושר", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: "check_circle" },
  rejected: { label: "נדחה", color: "text-red-600", bg: "bg-red-50 border-red-200", icon: "cancel" },
};

export function MatchCard({ match, role, onAccept, onReject, isActionLoading }: MatchCardProps) {
  const apt = match.apartment;
  const otherUser = role === "tenant" ? match.landlord : match.tenant;
  const statusInfo = STATUS_CONFIG[match.status] || STATUS_CONFIG.pending;
  return (
    <div className="bg-surface-container-lowest rounded-xl overflow-hidden soft-shadow border border-outline-variant/50 hover:border-landlord-green/30 transition-all group">
      <div className="relative h-[160px] overflow-hidden">
        <ApartmentImage
          images={apt?.images}
          alt={apt?.address || apt?.title || "דירה"}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          fallback={<ApartmentImageFallback compact />}
        />

        {/* Status Badge */}
        <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-[12px] font-bold flex items-center gap-1 border ${statusInfo.bg} ${statusInfo.color}`}>
          <span className="material-symbols-outlined text-[14px]">{statusInfo.icon}</span>
          {statusInfo.label}
        </div>

        {/* Unread Count */}
        {match.unreadCount ? (
          <div className="absolute top-3 left-3 bg-admin-red text-white text-[11px] font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-sm">
            {match.unreadCount > 9 ? "9+" : match.unreadCount}
          </div>
        ) : null}

        {/* Price */}
        {apt?.price && (
          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-lg shadow-sm">
            <span className="text-[16px] font-bold text-landlord-green">₪ {apt.price.toLocaleString()}</span>
            <span className="text-[11px] text-on-surface-variant">/חודש</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Apartment info */}
        <Link href={`/apartment/${apt?.id}`} className="hover:underline">
          <h3 className="text-[16px] font-bold text-tenant-blue mb-1 truncate">
            {apt?.address || apt?.title || "דירה"}
          </h3>
        </Link>
        <p className="text-[13px] text-on-surface-variant flex items-center gap-1 mb-3">
          <span className="material-symbols-outlined text-[14px]">location_on</span>
          {apt?.city || "—"} • {apt?.rooms || "—"} חד׳
        </p>

        {/* Other user info */}
        {otherUser && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-surface-container rounded-lg">
            {otherUser.avatarUrl ? (
              <img src={otherUser.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-tenant-blue/10 flex items-center justify-center text-tenant-blue font-bold text-[14px]">
                {otherUser.firstName?.[0]}{otherUser.lastName?.[0]}
              </div>
            )}
            <div className="flex-grow min-w-0">
              <p className="text-[14px] font-bold text-tenant-blue truncate">
                {otherUser.firstName} {otherUser.lastName}
              </p>
              <p className="text-[12px] text-on-surface-variant">
                {role === "tenant" ? "משכיר" : "שוכר מעוניין"}
                {otherUser.isVerified && (
                  <span className="inline-flex items-center gap-0.5 mr-1 text-[#0b6f63]">
                    <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                    מאומת
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Compatibility Score */}
        {match.compatibilityScore && (
          <div className="flex items-center gap-2 mb-4 text-[13px]">
            <span className="material-symbols-outlined text-[16px] text-landlord-green">stars</span>
            <span className="text-on-surface-variant">
              התאמה: <span className="font-bold text-tenant-blue">{match.compatibilityScore}%</span>
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {/* Chat button (accepted only) */}
          {match.status === "accepted" && (
            <Link
              href={`/chat?matchId=${match.id}`}
              className="flex-grow h-10 bg-tenant-blue text-white rounded-lg font-bold text-[13px] flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined text-[18px]">chat</span>
              {match.unreadCount ? `צ'אט (${match.unreadCount})` : "שלח הודעה"}
            </Link>
          )}

          {/* Landlord actions for pending matches */}
          {match.status === "pending" && role === "landlord" && (
            <>
              <button
                onClick={() => onAccept(match.id)}
                disabled={isActionLoading}
                className="flex-grow h-10 bg-landlord-green text-white rounded-lg font-bold text-[13px] flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isActionLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">check</span>
                    אשר
                  </>
                )}
              </button>
              <button
                onClick={() => onReject(match.id)}
                disabled={isActionLoading}
                className="h-10 px-4 border border-outline-variant text-on-surface-variant rounded-lg font-medium text-[13px] flex items-center justify-center gap-1.5 hover:bg-surface-container transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
                דחה
              </button>
            </>
          )}

          {/* Tenant: pending → show waiting message */}
          {match.status === "pending" && role === "tenant" && (
            <div className="flex-grow h-10 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg font-medium text-[13px] flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[18px]">schedule</span>
              ממתין לאישור המשכיר
            </div>
          )}

          {/* Rejected */}
          {match.status === "rejected" && (
            <div className="flex-grow h-10 bg-red-50 border border-red-200 text-red-500 rounded-lg font-medium text-[13px] flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[18px]">block</span>
              התאמה נדחתה
            </div>
          )}

          {/* View apartment button */}
          <Link
            href={`/apartment/${apt?.id}`}
            className="h-10 w-10 shrink-0 border border-outline-variant rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
            title="צפה בדירה"
          >
            <span className="material-symbols-outlined text-[18px]">visibility</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
