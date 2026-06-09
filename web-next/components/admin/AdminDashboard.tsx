"use client";

import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";

interface AdminStats {
  users: {
    total: number;
    tenants: number;
    landlords: number;
    admins: number;
    verified: number;
    locked: number;
    premium: number;
    activeToday: number;
    activeWeek: number;
    activeMonth: number;
    registeredToday: number;
    registeredWeek: number;
    registeredMonth: number;
    tosAccepted: number;
  };
  listings: {
    active: number;
    inactive: number;
    avgPrice: number;
    totalViews: number;
    totalLikes: number;
    topCities: Array<{ city: string; count: number }>;
  };
  payments: {
    totalLedgerRows: number;
    paid: number;
    pending: number;
    overdue: number;
    paidAmountIls: number;
    overdueAmountIls: number;
    invoiceCount: number;
  };
  contracts: {
    active: number;
    pendingSigning: number;
    ended: number;
    expiring: number;
    amendments: number;
    guarantorsApproved: number;
    guarantorsPending: number;
  };
  interactions: {
    totalSwipes: number;
    swipesToday: number;
    swipesWeek: number;
    likes: number;
    dislikes: number;
    superlikes: number;
    avgSeenDurationMs: number;
    matchesActive: number;
    matchesPending: number;
    matchesExpired: number;
  };
  maintenance: {
    open: number;
    inProgress: number;
    waitingInvoice: number;
    closedThisMonth: number;
  };
  engagement: {
    avgTrustScore: number;
    avgPoints: number;
    levelDistribution: Record<string, number>;
    messagesToday: number;
  };
  security: {
    securityEvents24h: number;
    systemErrors24h: number;
    loginsToday: number;
    failedLoginsToday: number;
  };
}

interface AuditLogItem {
  id: string;
  createdAt: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  outcome: string;
  statusCode: number;
  ipAddress: string | null;
  userAgent: string | null;
}

interface AuditLogResponse {
  items: AuditLogItem[];
  total: number;
  limit: number;
  offset: number;
}

export function AdminDashboard() {
  const { token } = useAuth();
  
  // Fetch detailed statistics
  const { data: stats, error: statsError, isLoading: statsLoading } = useApi<AdminStats>("/api/v3/admin/stats/detailed");
  
  // Fetch recent audit logs
  const { data: logsData, error: logsError, isLoading: logsLoading, mutate: mutateLogs } = useApi<AuditLogResponse>("/api/admin/logs/audit?limit=10");

  const [activeTab, setActiveTab] = useState<"general" | "security" | "engagement">("general");

  // Format currency
  const formatILS = (num: number) => {
    return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(num);
  };

  if (statsLoading || logsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <div className="w-12 h-12 border-4 border-landlord-green border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-on-surface-variant font-label text-body">טוען נתוני מנהל מערכת...</p>
      </div>
    );
  }

  // Fallback defaults if APIs are failing/empty
  const u = stats?.users ?? {
    total: 0,
    tenants: 0,
    landlords: 0,
    admins: 0,
    verified: 0,
    locked: 0,
    premium: 0,
    activeToday: 0,
    activeWeek: 0,
    activeMonth: 0,
    registeredToday: 0,
    registeredWeek: 0,
    registeredMonth: 0,
    tosAccepted: 0,
  };
  const l = stats?.listings ?? {
    active: 0,
    inactive: 0,
    avgPrice: 0,
    totalViews: 0,
    totalLikes: 0,
    topCities: [],
  };
  const p = stats?.payments ?? {
    totalLedgerRows: 0,
    paid: 0,
    pending: 0,
    overdue: 0,
    paidAmountIls: 0,
    overdueAmountIls: 0,
    invoiceCount: 0,
  };
  const c = stats?.contracts ?? {
    active: 0,
    pendingSigning: 0,
    ended: 0,
    expiring: 0,
    amendments: 0,
    guarantorsApproved: 0,
    guarantorsPending: 0,
  };
  const m = stats?.maintenance ?? {
    open: 0,
    inProgress: 0,
    waitingInvoice: 0,
    closedThisMonth: 0,
  };
  const s = stats?.security ?? {
    securityEvents24h: 0,
    systemErrors24h: 0,
    loginsToday: 0,
    failedLoginsToday: 0,
  };
  const e = stats?.engagement ?? {
    avgTrustScore: 65,
    avgPoints: 240,
    levelDistribution: {},
    messagesToday: 0,
  };

  const auditLogs = logsData?.items ?? [];

  // Determine alarms
  const alarms = [];
  if (p.overdue > 0) {
    alarms.push({
      id: "alarm-payments",
      type: "warning",
      icon: "payments",
      title: `${p.overdue} תשלומים בפיגור מבוקשים`,
      desc: `סך חוב פעיל מגיע ל-${formatILS(p.overdueAmountIls)}`,
      actionText: "צפה בלדג'ר",
      actionLink: "/admin/ledger",
    });
  }
  if (m.open > 0) {
    alarms.push({
      id: "alarm-maintenance",
      type: "error",
      icon: "build",
      title: `${m.open} תקלות פתוחות ממתינות לטיפול`,
      desc: "דיירים מדווחים על בעיות ללא מענה של משכירים",
      actionText: "צפה בתקלות",
      actionLink: "/admin/maintenance",
    });
  }
  if (s.failedLoginsToday > 3) {
    alarms.push({
      id: "alarm-security",
      type: "critical",
      icon: "gpp_maybe",
      title: `זוהו ${s.failedLoginsToday} ניסיונות התחברות כושלים היום`,
      desc: "אפשרות למתקפת Brute Force על המערכת",
      actionText: "צפה בלוג אבטחה",
      actionLink: "#logs",
    });
  }
  if (u.locked > 0) {
    alarms.push({
      id: "alarm-locked",
      type: "info",
      icon: "lock",
      title: `חשבון משתמש אחד או יותר נעול במערכת (${u.locked})`,
      desc: "משתמשים שנחסמו עקב פעילות חריגה או ריבוי כשלונות",
      actionText: "ניהול משתמשים",
      actionLink: "/admin/users",
    });
  }

  // Payment Status Pie values (Circumference for radius 24 is 150.8)
  const totalPayments = p.paid + p.pending + p.overdue || 1;
  const paidPct = (p.paid / totalPayments) * 100;
  const pendingPct = (p.pending / totalPayments) * 100;
  const overduePct = (p.overdue / totalPayments) * 100;

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-h1-web font-extrabold text-tenant-blue">מנהל מערכת - מרכז בקרה</h2>
          <p className="text-body text-on-surface-variant">סקירה מלאה, ניהול תצורות ואבטחת פעילות פלטפורמת DirApp</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/config"
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-outline-variant text-tenant-blue rounded-full font-bold text-label hover:bg-surface-container-low transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
            <span>הגדרות מערכת</span>
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center gap-2 px-5 py-2.5 bg-tenant-blue text-white rounded-full font-bold text-label hover:bg-tenant-blue/90 transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[20px]">group</span>
            <span>ניהול משתמשים</span>
          </Link>
        </div>
      </div>

      {/* Alarms Banner */}
      {alarms.length > 0 && (
        <section className="bg-red-50/50 border border-red-200/60 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-red-800 font-bold text-label">
            <span className="material-symbols-outlined text-red-600 animate-pulse">report</span>
            <span>התראות מערכת דחופות ({alarms.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alarms.map((alarm) => (
              <div key={alarm.id} className="flex gap-3 bg-white p-4 rounded-xl shadow-sm border border-red-100">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">{alarm.icon}</span>
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className="font-bold text-tenant-blue text-caption leading-snug">{alarm.title}</h4>
                  <p className="text-caption text-on-surface-variant">{alarm.desc}</p>
                  <Link href={alarm.actionLink} className="inline-block text-caption text-red-700 font-bold hover:underline pt-1">
                    {alarm.actionText} &larr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bento Grid: 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        
        {/* KPI 1: Users */}
        <div className="bg-white rounded-2xl p-6 soft-shadow border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-caption text-on-surface-variant font-medium block">משתמשים רשומים</span>
              <span className="text-h1-web font-extrabold text-tenant-blue leading-none">{u.total}</span>
            </div>
            <div className="w-11 h-11 bg-blue-50 text-tenant-blue rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">group</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-outline-variant/30 flex justify-between text-caption text-on-surface-variant">
            <span>מאומתי KYC: <strong className="text-tenant-blue">{u.verified}</strong></span>
            <span className="text-emerald-600 font-bold">+{u.registeredWeek} השבוע</span>
          </div>
        </div>

        {/* KPI 2: Apartments */}
        <div className="bg-white rounded-2xl p-6 soft-shadow border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-caption text-on-surface-variant font-medium block">דירות פעילות</span>
              <span className="text-h1-web font-extrabold text-tenant-blue leading-none">{l.active}</span>
            </div>
            <div className="w-11 h-11 bg-emerald-50 text-[#006b5f] rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">apartment</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-outline-variant/30 flex justify-between text-caption text-on-surface-variant">
            <span>ממוצע שכירות: <strong className="text-tenant-blue">{formatILS(l.avgPrice)}</strong></span>
            <span>צפיות: <strong className="text-tenant-blue">{l.totalViews}</strong></span>
          </div>
        </div>

        {/* KPI 3: Contracts */}
        <div className="bg-white rounded-2xl p-6 soft-shadow border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-caption text-on-surface-variant font-medium block">חוזים פעילים</span>
              <span className="text-h1-web font-extrabold text-tenant-blue leading-none">{c.active}</span>
            </div>
            <div className="w-11 h-11 bg-purple-50 text-guarantor-purple rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">description</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-outline-variant/30 flex justify-between text-caption text-on-surface-variant">
            <span>לחתימה: <strong className="text-tenant-blue">{c.pendingSigning}</strong></span>
            <span className="text-amber-600 font-bold">בתוקף פג: {c.expiring}</span>
          </div>
        </div>

        {/* KPI 4: Cashflow */}
        <div className="bg-white rounded-2xl p-6 soft-shadow border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-caption text-on-surface-variant font-medium block">תזרים ששולם</span>
              <span className="text-[24px] font-extrabold text-landlord-green leading-none">{formatILS(p.paidAmountIls)}</span>
            </div>
            <div className="w-11 h-11 bg-green-50 text-landlord-green rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">payments</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-outline-variant/30 flex justify-between text-caption text-on-surface-variant">
            <span>חוב פיגור: <strong className="text-red-600">{formatILS(p.overdueAmountIls)}</strong></span>
            <span>חשבוניות: <strong className="text-tenant-blue">{p.invoiceCount}</strong></span>
          </div>
        </div>

      </div>

      {/* Growth Curves & Donut Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-gutter">
        
        {/* Growth Curve Chart (60%) */}
        <section className="lg:col-span-6 bg-white rounded-2xl p-6 soft-shadow border border-outline-variant/30 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-h3-web font-bold text-tenant-blue">מדדי פעילות וצמיחה</h3>
              <p className="text-caption text-on-surface-variant">רישום משתמשים חדשים ופעילות ביממה האחרונה</p>
            </div>
            <div className="flex bg-surface-container rounded-lg p-1 text-caption font-bold">
              <button 
                onClick={() => setActiveTab("general")} 
                className={`px-3 py-1.5 rounded-md transition-colors ${activeTab === "general" ? "bg-white text-tenant-blue shadow-sm" : "text-on-surface-variant hover:text-tenant-blue"}`}
              >
                משתמשים
              </button>
              <button 
                onClick={() => setActiveTab("security")} 
                className={`px-3 py-1.5 rounded-md transition-colors ${activeTab === "security" ? "bg-white text-tenant-blue shadow-sm" : "text-on-surface-variant hover:text-tenant-blue"}`}
              >
                אבטחה
              </button>
              <button 
                onClick={() => setActiveTab("engagement")} 
                className={`px-3 py-1.5 rounded-md transition-colors ${activeTab === "engagement" ? "bg-white text-tenant-blue shadow-sm" : "text-on-surface-variant hover:text-tenant-blue"}`}
              >
                מעורבות
              </button>
            </div>
          </div>

          <div className="h-64 w-full bg-slate-50/50 rounded-xl border border-dashed border-outline-variant/50 relative overflow-hidden flex items-end px-4 pb-2">
            {/* SVG Growth Line */}
            <svg className="absolute inset-0 w-full h-full p-6" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path
                d="M 0 90 Q 20 70, 40 80 T 80 30 T 100 10"
                fill="none"
                stroke="#00cba9"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <path
                d="M 0 90 Q 20 70, 40 80 T 80 30 T 100 10 L 100 100 L 0 100 Z"
                fill="url(#gradient-growth)"
                opacity="0.1"
              />
              <defs>
                <linearGradient id="gradient-growth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00cba9" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* X Axis Mock labels */}
            <div className="w-full flex justify-between text-[11px] text-on-surface-variant z-10 px-2">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>24:00</span>
            </div>
          </div>

          {/* Quick Metrics from tab selection */}
          <div className="grid grid-cols-3 gap-4 mt-6 text-center">
            {activeTab === "general" ? (
              <>
                <div className="bg-surface-container-low p-3 rounded-xl">
                  <span className="text-[12px] text-on-surface-variant block">פעילים היום</span>
                  <span className="font-extrabold text-tenant-blue text-label">{u.activeToday}</span>
                </div>
                <div className="bg-surface-container-low p-3 rounded-xl">
                  <span className="text-[12px] text-on-surface-variant block">פעילי חודש</span>
                  <span className="font-extrabold text-tenant-blue text-label">{u.activeMonth}</span>
                </div>
                <div className="bg-surface-container-low p-3 rounded-xl">
                  <span className="text-[12px] text-on-surface-variant block">קבלת ToS</span>
                  <span className="font-extrabold text-tenant-blue text-label">{u.tosAccepted}</span>
                </div>
              </>
            ) : activeTab === "security" ? (
              <>
                <div className="bg-surface-container-low p-3 rounded-xl">
                  <span className="text-[12px] text-on-surface-variant block">אירועי אבטחה 24ש'</span>
                  <span className="font-extrabold text-red-600 text-label">{s.securityEvents24h}</span>
                </div>
                <div className="bg-surface-container-low p-3 rounded-xl">
                  <span className="text-[12px] text-on-surface-variant block">שגיאות קריטיות</span>
                  <span className="font-extrabold text-red-600 text-label">{s.systemErrors24h}</span>
                </div>
                <div className="bg-surface-container-low p-3 rounded-xl">
                  <span className="text-[12px] text-on-surface-variant block">לוגינים היום</span>
                  <span className="font-extrabold text-tenant-blue text-label">{s.loginsToday}</span>
                </div>
              </>
            ) : (
              <>
                <div className="bg-surface-container-low p-3 rounded-xl">
                  <span className="text-[12px] text-on-surface-variant block">ממוצע ציון אמינות</span>
                  <span className="font-extrabold text-tenant-blue text-label">{e.avgTrustScore}</span>
                </div>
                <div className="bg-surface-container-low p-3 rounded-xl">
                  <span className="text-[12px] text-on-surface-variant block">נקודות דייר ממוצעת</span>
                  <span className="font-extrabold text-tenant-blue text-label">{e.avgPoints}</span>
                </div>
                <div className="bg-surface-container-low p-3 rounded-xl">
                  <span className="text-[12px] text-on-surface-variant block">הודעות צ'אט (24ש')</span>
                  <span className="font-extrabold text-tenant-blue text-label">{e.messagesToday}</span>
                </div>
              </>
            )}
          </div>
        </section>

        {/* CSS Donut Chart (40%) */}
        <section className="lg:col-span-4 bg-white rounded-2xl p-6 soft-shadow border border-outline-variant/30 flex flex-col justify-between">
          <div>
            <h3 className="text-h3-web font-bold text-tenant-blue mb-2">סטטוס פניות תשלומים</h3>
            <p className="text-caption text-on-surface-variant">התפלגות התקבולים במערכת השכירות</p>
          </div>

          <div className="relative flex justify-center py-6">
            <svg width="180" height="180" className="-rotate-90">
              {/* Back Circle */}
              <circle cx="90" cy="90" r="70" fill="transparent" stroke="#f1f5f9" strokeWidth="16" />
              
              {/* Overdue Arc */}
              <circle
                cx="90"
                cy="90"
                r="70"
                fill="transparent"
                stroke="#ba1a1a"
                strokeWidth="16"
                strokeDasharray="439.8"
                strokeDashoffset={439.8 - (overduePct / 100) * 439.8}
                strokeLinecap="round"
              />

              {/* Pending Arc (offsetting by overdue) */}
              <circle
                cx="90"
                cy="90"
                r="70"
                fill="transparent"
                stroke="#e28743"
                strokeWidth="16"
                strokeDasharray="439.8"
                strokeDashoffset={439.8 - (pendingPct / 100) * 439.8}
                style={{ transform: `rotate(${(overduePct / 100) * 360}deg)`, transformOrigin: "90px 90px" }}
              />

              {/* Paid Arc (offsetting by overdue + pending) */}
              <circle
                cx="90"
                cy="90"
                r="70"
                fill="transparent"
                stroke="#00cba9"
                strokeWidth="16"
                strokeDasharray="439.8"
                strokeDashoffset={439.8 - (paidPct / 100) * 439.8}
                style={{ transform: `rotate(${((overduePct + pendingPct) / 100) * 360}deg)`, transformOrigin: "90px 90px" }}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col justify-center items-center">
              <span className="font-extrabold text-[28px] text-tenant-blue">{totalPayments}</span>
              <span className="text-caption text-on-surface-variant">שורות תשלום</span>
            </div>
          </div>

          <div className="space-y-2 text-caption">
            <div className="flex justify-between items-center bg-green-50/50 p-2 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-landlord-green" />
                <span className="font-bold text-tenant-blue">שולם</span>
              </div>
              <span className="font-bold text-tenant-blue">{p.paid} ({Math.round(paidPct)}%)</span>
            </div>
            <div className="flex justify-between items-center bg-amber-50/50 p-2 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#e28743]" />
                <span className="font-bold text-tenant-blue">ממתין</span>
              </div>
              <span className="font-bold text-tenant-blue">{p.pending} ({Math.round(pendingPct)}%)</span>
            </div>
            <div className="flex justify-between items-center bg-red-50/50 p-2 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-600" />
                <span className="font-bold text-tenant-blue">באיחור</span>
              </div>
              <span className="font-bold text-tenant-blue">{p.overdue} ({Math.round(overduePct)}%)</span>
            </div>
          </div>
        </section>

      </div>

      {/* Audit Logs Table */}
      <section id="logs" className="bg-white rounded-2xl border border-outline-variant/30 soft-shadow overflow-hidden">
        <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center">
          <div>
            <h3 className="text-h3-web font-bold text-tenant-blue">יומן פעילות אבטחה וביקורת (Audit Logs)</h3>
            <p className="text-caption text-on-surface-variant">תיעוד בזמן אמת של פעולות מנהלים וקריאות API מסווגות</p>
          </div>
          <button 
            onClick={() => {
              mutateLogs();
              toast.success("יומן הפעילות סונכרן בהצלחה");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container rounded-lg font-bold text-caption text-tenant-blue hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] animate-spin-hover">sync</span>
            <span>רענן לוג</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant font-label text-caption border-b border-outline-variant/30">
                <th className="p-4 pr-6">זמן אירוע</th>
                <th className="p-4">מזהה משתמש</th>
                <th className="p-4">פעולה שבוצעה</th>
                <th className="p-4">סוג משאב</th>
                <th className="p-4 text-center">סטטוס תגובה</th>
                <th className="p-4 text-center">תוצאה</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 text-caption text-tenant-blue">
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 pr-6 text-on-surface-variant">
                      {new Date(log.createdAt).toLocaleString("he-IL", { hour12: false })}
                    </td>
                    <td className="p-4 font-mono select-all">
                      {log.actorId ? log.actorId.substring(0, 8) + "..." : "אורח מחוץ למערכת"}
                    </td>
                    <td className="p-4 font-bold">{log.action}</td>
                    <td className="p-4">{log.resourceType}</td>
                    <td className="p-4 text-center font-mono font-bold">
                      <span className={`px-2 py-0.5 rounded text-[11px] ${log.statusCode >= 400 ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                        {log.statusCode}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 font-bold ${log.outcome === "success" ? "text-landlord-green" : "text-red-600"}`}>
                        <span className="material-symbols-outlined text-[14px]">
                          {log.outcome === "success" ? "check_circle" : "cancel"}
                        </span>
                        <span>{log.outcome === "success" ? "הצליח" : "נכשל"}</span>
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-on-surface-variant text-body">
                    אין פעולות ביקורת זמינות ביומן כרגע
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
