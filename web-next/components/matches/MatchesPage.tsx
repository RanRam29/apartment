"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import type { Match } from "@/lib/types";
import Link from "next/link";
import { MatchCard } from "./MatchCard";

interface MatchesResponse {
  matches: (Match & { unreadCount?: number })[];
  fromCache?: boolean;
}

type TabKey = "all" | "pending" | "accepted" | "rejected";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "all", label: "הכל", icon: "list" },
  { key: "pending", label: "ממתינות", icon: "hourglass_top" },
  { key: "accepted", label: "מאושרות", icon: "check_circle" },
  { key: "rejected", label: "נדחו", icon: "cancel" },
];

export function MatchesPage() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data, isLoading, error, mutate } = useApi<MatchesResponse>("/api/matches");

  const role = user?.activeRole || user?.role || "tenant";
  const matches = data?.matches || [];

  // Filter matches by tab
  const filteredMatches = activeTab === "all"
    ? matches
    : matches.filter((m) => m.status === activeTab);

  // Count by status
  const counts = {
    all: matches.length,
    pending: matches.filter((m) => m.status === "pending").length,
    accepted: matches.filter((m) => m.status === "accepted").length,
    rejected: matches.filter((m) => m.status === "rejected").length,
  };

  // Accept / reject handlers (landlord only)
  const handleAccept = useCallback(async (matchId: string) => {
    if (!token) return;
    setActionLoading(matchId);
    try {
      await api(`/api/matches/${matchId}/accept`, { method: "POST", token });
      mutate(); // Refresh matches
    } catch (err) {
      console.error("Accept match failed:", err);
    } finally {
      setActionLoading(null);
    }
  }, [token, mutate]);

  const handleReject = useCallback(async (matchId: string) => {
    if (!token) return;
    setActionLoading(matchId);
    try {
      await api(`/api/matches/${matchId}/reject`, { method: "POST", token });
      mutate();
    } catch (err) {
      console.error("Reject match failed:", err);
    } finally {
      setActionLoading(null);
    }
  }, [token, mutate]);

  return (
    <div>
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-[28px] leading-[36px] font-bold text-tenant-blue mb-1">
          {role === "landlord" ? "לידים והתאמות" : "ההתאמות שלי"}
        </h1>
        <p className="text-[16px] text-on-surface-variant">
          {role === "landlord"
            ? "שוכרים שהביעו עניין בנכסים שלך"
            : "דירות שהבעת בהן עניין וסטטוס ההתאמה"}
        </p>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 bg-surface-container-lowest rounded-xl p-1.5 soft-shadow border border-outline-variant/50 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[14px] font-medium transition-all ${
              activeTab === tab.key
                ? "bg-tenant-blue text-white shadow-sm"
                : "text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
            {counts[tab.key] > 0 && (
              <span className={`text-[11px] font-bold min-w-[20px] h-5 rounded-full flex items-center justify-center px-1.5 ${
                activeTab === tab.key
                  ? "bg-white/20"
                  : tab.key === "pending" ? "bg-amber-100 text-amber-700" : "bg-surface-container-high text-on-surface-variant"
              }`}>
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-landlord-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-on-surface-variant">טוען התאמות...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="bg-error-container text-on-error-container rounded-xl p-6 text-center">
          <span className="material-symbols-outlined text-[32px] mb-2">error</span>
          <p className="font-bold">שגיאה בטעינת ההתאמות</p>
          <button onClick={() => mutate()} className="mt-3 text-[14px] underline">נסה שוב</button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredMatches.length === 0 && (
        <div className="bg-surface-container-lowest rounded-xl soft-shadow p-12 text-center">
          <span className="material-symbols-outlined text-[64px] text-outline/30 mb-4">
            {activeTab === "pending" ? "hourglass_empty" : activeTab === "rejected" ? "heart_broken" : "favorite_border"}
          </span>
          <h3 className="text-[20px] font-bold text-tenant-blue mb-2">
            {activeTab === "all" ? "אין התאמות עדיין" : activeTab === "pending" ? "אין התאמות ממתינות" : activeTab === "accepted" ? "אין התאמות מאושרות" : "אין התאמות שנדחו"}
          </h3>
          <p className="text-on-surface-variant text-[14px] mb-6 max-w-md mx-auto">
            {role === "tenant"
              ? "חפש דירות ולחץ על \"אני מעוניין\" כדי ליצור התאמות חדשות"
              : "ברגע ששוכרים יביעו עניין בנכסים שלך, תוכל לאשר או לדחות אותם כאן"}
          </p>
          {role === "tenant" && (
            <Link href="/search" className="inline-flex items-center gap-2 bg-landlord-green text-white px-6 py-2.5 rounded-full font-bold text-[14px] hover:opacity-90 transition-opacity">
              <span className="material-symbols-outlined text-[18px]">search</span>
              חפש דירות
            </Link>
          )}
        </div>
      )}

      {/* Match Cards */}
      {!isLoading && filteredMatches.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredMatches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              role={role}
              onAccept={handleAccept}
              onReject={handleReject}
              isActionLoading={actionLoading === match.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
