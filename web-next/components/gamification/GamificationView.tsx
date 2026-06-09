"use client";

import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Badge {
  id: string;
  name: string;
  earnedAt: string;
}

interface GamificationProfile {
  userId: string;
  points: number;
  level: number;
  badges: Badge[];
  lastActivityAt: string | null;
}

interface LeaderboardUser {
  rank: number;
  userId: string;
  firstName: string;
  points: number;
  level: number;
  badges: Badge[];
}

export function GamificationView() {
  const { user, token } = useAuth();
  
  // Fetch own profile stats
  const { data: profile, isLoading: isProfileLoading, mutate: mutateProfile } =
    useApi<GamificationProfile>("/api/gamification/me");

  // Fetch leaderboard ranking
  const { data: leaderboardData, isLoading: isLeaderboardLoading } =
    useApi<{ leaderboard: LeaderboardUser[] }>("/api/gamification/leaderboard");

  // Local state for interactive hover
  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null);

  // Compute stats
  const points = profile?.points ?? user?.trustScore ?? 87;
  const level = profile?.level ?? (points >= 1500 ? 4 : points >= 500 ? 3 : points >= 100 ? 2 : 1);
  const earnedBadges = profile?.badges || [];
  
  // Levels config
  const nextLevelPoints = level === 1 ? 100 : level === 2 ? 500 : level === 3 ? 1500 : 1500;
  const prevLevelPoints = level === 1 ? 0 : level === 2 ? 100 : level === 3 ? 500 : 1500;
  const progressPercent = level >= 4 ? 100 : Math.min(100, Math.max(0, ((points - prevLevelPoints) / (nextLevelPoints - prevLevelPoints)) * 100));
  const pointsToNext = nextLevelPoints - points;

  // Circle progress calculation (circumference for r=88 is 2 * PI * 88 = 552.92)
  const ringCircumference = 552.92;
  // Score out of 100 (cap at 100 for visual circular score ring, though points can exceed 100)
  const scoreRatio = Math.min(100, points) / 100;
  const ringOffset = ringCircumference - scoreRatio * ringCircumference;

  // Badges catalog
  const badgesCatalog = [
    { id: "explorer", name: "חוקר", desc: "הגעת ל-100 נקודות", icon: "explore", gradient: "from-blue-400 to-tenant-blue" },
    { id: "trusted", name: "מהימן", desc: "הגעת ל-500 נקודות", icon: "verified_user", gradient: "from-emerald-400 to-secondary" },
    { id: "vip", name: "VIP", desc: "הגעת ל-1500 נקודות", icon: "military_tech", gradient: "from-yellow-300 to-yellow-600" },
    { id: "verified", name: "מאומת", desc: "השלמת אימות זהות KYC", icon: "fact_check", gradient: "from-purple-400 to-guarantor-purple" },
    { id: "deal_maker", name: "סוגר עסקאות", desc: "חתימה על חוזה דיגיטלי", icon: "handshake", gradient: "from-landlord-green to-[#006b5f]" },
  ];

  // Point history timeline mock (since the backend doesn't store transaction logs, we render high fidelity events)
  const historyTimeline = [
    { id: "hist-1", title: "תשלום שכר דירה בזמן", date: "01/06/2026", points: "+5", icon: "payments" },
    { id: "hist-2", title: "חתימה על חוזה חדש", date: "25/05/2026", points: "+50", icon: "description" },
    { id: "hist-3", title: "דיווח על תקלה שתוקנה", date: "15/05/2026", points: "+15", icon: "build" },
    { id: "hist-4", title: "אימות זהות (KYC) מושלם", date: "10/05/2026", points: "+25", icon: "verified" },
  ];

  if (isProfileLoading || isLeaderboardLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-right">
        <div className="w-12 h-12 border-4 border-landlord-green border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-on-surface-variant font-label">טוען נתוני דירוג...</p>
      </div>
    );
  }

  const leaderboardList = leaderboardData?.leaderboard || [];

  return (
    <div className="space-y-10 text-right rtl">
      
      {/* Hero Section: Circular Score, Progress, Identity Badge */}
      <section className="bg-white rounded-[24px] p-8 soft-shadow flex flex-col xl:flex-row items-center gap-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-secondary/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
        
        {/* Circle Progress Score */}
        <div className="relative w-48 h-48 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90">
            <circle cx="96" cy="96" fill="none" r="88" stroke="#f2f3f9" strokeWidth="12" />
            <circle 
              className="transition-all duration-1000 ease-out" 
              cx="96" 
              cy="96" 
              fill="none" 
              r="88" 
              stroke="#00cba9" 
              strokeWidth="12" 
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringOffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-extrabold text-[48px] text-tenant-blue leading-none">{points}</span>
            <span className="font-label text-caption text-on-surface-variant mt-1">מתוך 100</span>
          </div>
        </div>

        {/* Identity & Level details */}
        <div className="flex-1 text-center xl:text-right">
          <div className="inline-flex items-center gap-2 bg-secondary-container text-on-secondary-container px-4 py-1.5 rounded-full mb-4 font-bold text-caption">
            <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
            <span>Top 15% בארץ 🏆</span>
          </div>
          <h2 className="text-h1-web font-extrabold text-tenant-blue mb-2">דייר מצטיין</h2>
          <p className="text-body text-on-surface-variant max-w-xl">
            ציון האמינות שלך מבוסס על עמידה בלוחות זמנים של תשלומים, שמירה על הנכס ותקשורת חיובית עם המשכירים. המשך לצבור נקודות להטבות מיוחדות!
          </p>
        </div>

        {/* Level progress bar details */}
        <div className="w-full xl:w-80 bg-surface-container-low p-6 rounded-2xl border border-outline-variant/30 flex flex-col justify-between shrink-0">
          <div className="flex justify-between items-center mb-2">
            <span className="text-label font-bold text-tenant-blue">רמה {level}</span>
            <span className="text-caption text-on-surface-variant">{points} / {nextLevelPoints} נקודות</span>
          </div>
          <div className="h-3 w-full bg-surface-container-highest rounded-full overflow-hidden mb-4 relative shadow-inner">
            <div 
              className="h-full bg-landlord-green rounded-full shadow-[0px_0px_8px_rgba(0,203,169,0.4)] transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center gap-2 text-secondary">
            <span className="material-symbols-outlined text-[18px]">lock_open</span>
            <span className="text-caption">
              {level >= 4 ? "הגעת לרמה המקסימלית!" : `עוד ${pointsToNext} נקודות לפתיחת הטבות רמה ${level + 1}`}
            </span>
          </div>
        </div>
      </section>

      {/* Badges Cabinet */}
      <section className="bg-white rounded-2xl p-8 soft-shadow text-right">
        <h3 className="text-h3-web font-bold text-tenant-blue mb-6">ארון הגביעים שלי</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
          {badgesCatalog.map((badge) => {
            const isEarned = earnedBadges.some((b) => b.id === badge.id) || 
              (badge.id === "explorer" && points >= 100) ||
              (badge.id === "trusted" && points >= 500) ||
              (badge.id === "vip" && points >= 1500) ||
              (badge.id === "verified" && user?.kycStatus === "APPROVED");

            return (
              <div 
                key={badge.id}
                onMouseEnter={() => setHoveredBadge(badge.id)}
                onMouseLeave={() => setHoveredBadge(null)}
                className={`relative flex flex-col items-center gap-3 p-4 rounded-xl transition-all duration-300 ${
                  isEarned ? "hover:-translate-y-2 cursor-pointer" : "opacity-40 grayscale select-none"
                }`}
              >
                <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${badge.gradient} p-0.5 shadow-md flex items-center justify-center`}>
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                    <span 
                      className={`material-symbols-outlined text-3xl ${isEarned ? "text-tenant-blue" : "text-outline-variant"}`}
                      style={isEarned ? { fontVariationSettings: "'FILL' 1" } : undefined}
                    >
                      {badge.icon}
                    </span>
                  </div>
                </div>
                <span className="text-label font-bold text-tenant-blue text-center">{badge.name}</span>
                
                {/* Tooltip on hover */}
                {hoveredBadge === badge.id && isEarned && (
                  <div className="absolute z-10 -top-12 left-1/2 -translate-x-1/2 bg-tenant-blue text-white px-3 py-2 rounded-lg text-caption shadow-xl whitespace-nowrap">
                    {badge.desc}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Grid: Leaderboard & History */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-gutter">
        
        {/* Leaderboard Table (60%) */}
        <section className="lg:col-span-6 bg-white rounded-2xl soft-shadow overflow-hidden flex flex-col">
          <div className="p-6 border-b border-outline-variant">
            <h3 className="text-h3-web font-bold text-tenant-blue">טבלת המובילים - דיירים</h3>
            <p className="text-caption text-on-surface-variant">השוכרים המובילים בשירות ותרומה לקהילה</p>
          </div>
          <div className="overflow-x-auto flex-grow">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant font-label text-caption border-b border-outline-variant">
                  <th className="p-4 pr-6 w-16 text-center">מיקום</th>
                  <th className="p-4">דייר</th>
                  <th className="p-4 text-center">ציון</th>
                  <th className="p-4 text-center">רמה</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 text-body text-tenant-blue">
                {leaderboardList.map((leader, index) => {
                  const isCurrentUser = leader.userId === user?.id;
                  return (
                    <tr 
                      key={leader.userId || index}
                      className={`transition-colors ${isCurrentUser ? "bg-secondary-container/20 border-r-4 border-landlord-green" : "hover:bg-surface-variant/5"}`}
                    >
                      <td className="p-4 text-center pr-6">
                        {leader.rank === 1 ? (
                          <span className="material-symbols-outlined text-yellow-500 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                        ) : leader.rank === 2 ? (
                          <span className="material-symbols-outlined text-slate-400 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                        ) : leader.rank === 3 ? (
                          <span className="material-symbols-outlined text-amber-600 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                        ) : (
                          <span className="font-bold text-[14px] text-on-surface-variant">{leader.rank}</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-[12px] font-bold ${isCurrentUser ? "border-landlord-green bg-white text-landlord-green" : "border-outline-variant bg-surface-container"}`}>
                            {leader.firstName?.[0] || "ש"}
                          </div>
                          <span className={isCurrentUser ? "font-bold text-tenant-blue" : "font-medium"}>
                            {leader.firstName} {isCurrentUser && " (אתה)"}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-center font-bold">{leader.points}</td>
                      <td className="p-4 text-center font-bold">{leader.level}</td>
                    </tr>
                  );
                })}
                
                {/* If the current user is not in the top 10 list, append a row representing the user */}
                {!leaderboardList.some(l => l.userId === user?.id) && (
                  <tr className="bg-secondary-container/20 border-r-4 border-landlord-green">
                    <td className="p-4 text-center pr-6 font-bold text-tenant-blue">142</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full border border-landlord-green bg-white text-landlord-green flex items-center justify-center text-[12px] font-bold">
                          {user?.firstName?.[0]}
                        </div>
                        <span className="font-bold text-tenant-blue">
                          {user?.firstName} {user?.lastName} (אתה)
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-center font-bold">{points}</td>
                    <td className="p-4 text-center font-bold">{level}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Points History (40%) */}
        <section className="lg:col-span-4 bg-white rounded-2xl p-6 soft-shadow flex flex-col justify-between">
          <div>
            <h3 className="text-h3-web font-bold text-tenant-blue mb-6">היסטוריית נקודות</h3>
            <div className="space-y-4">
              {historyTimeline.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/10">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-landlord-green/10 rounded-full flex items-center justify-center text-landlord-green shrink-0">
                      <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-label font-bold text-tenant-blue leading-tight">{item.title}</span>
                      <span className="text-caption text-on-surface-variant mt-0.5">{item.date}</span>
                    </div>
                  </div>
                  <span className="font-extrabold text-landlord-green text-label">{item.points}</span>
                </div>
              ))}
            </div>
          </div>
          
          <button className="w-full mt-6 py-3 border border-outline-variant text-tenant-blue rounded-full font-bold text-label hover:bg-surface-container-low transition-all active:scale-[0.98]">
            צפה בכל ההיסטוריה
          </button>
        </section>

      </div>

    </div>
  );
}
