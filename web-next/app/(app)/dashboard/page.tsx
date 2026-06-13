"use client";

import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import useSWR from "swr";
import { api } from "@/lib/api";
import type { Apartment, Contract, Notification, GamificationProfile } from "@/lib/types";
import { getFirstApartmentImageUrl } from "@/lib/apartment-images";
import { LandlordDashboard } from "@/components/dashboard/LandlordDashboard";

const fetcher = <T,>(url: string) => api<T>(url);

function QuickActionCard({
  href, icon, ghostIcon, label, gradient,
}: {
  href: string; icon: string; ghostIcon: string; label: string; gradient: string;
}) {
  return (
    <Link href={href} className={`relative overflow-hidden rounded-xl p-6 h-[140px] flex flex-col justify-between cursor-pointer group hover:scale-[1.02] transition-transform ${gradient}`}>
      <span className="material-symbols-outlined text-white text-[32px]">{icon}</span>
      <div className="flex items-center justify-between">
        <span className="material-symbols-outlined text-white/80 group-hover:-translate-x-2 transition-all">arrow_back</span>
        <span className="text-white font-bold text-[18px]">{label}</span>
      </div>
      <span className="material-symbols-outlined absolute -left-4 -bottom-4 text-[120px] text-white/10 pointer-events-none">{ghostIcon}</span>
    </Link>
  );
}

type ChecklistItem = {
  key: string;
  title: string;
  completed: boolean;
  dismissed: boolean;
};

type ChecklistResponse = {
  role: "tenant" | "landlord";
  checklist: ChecklistItem[];
  completionPct: number;
};

function ProfileCompletionWidget({
  checklist,
  completionPct,
}: {
  checklist: ChecklistItem[];
  completionPct: number;
}) {
  const nextStep = checklist.find((item) => !item.completed && !item.dismissed);

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant soft-shadow mb-[24px] text-right" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h4 className="text-[18px] font-bold text-tenant-blue mb-1">השלמת הפרופיל שלך: {completionPct}%</h4>
          {nextStep ? (
            <p className="text-[14px] text-on-surface-variant">
              השלם את הצעד הבא:{" "}
              <Link href="/onboarding" className="text-landlord-green font-bold hover:underline">
                {nextStep.title} ➔
              </Link>
            </p>
          ) : (
            <p className="text-[14px] text-on-surface-variant">כל השלבים הושלמו או דולגו!</p>
          )}
        </div>
        <Link
          href="/onboarding"
          className="px-6 h-10 bg-tenant-blue text-white rounded-full font-bold text-[14px] flex items-center justify-center hover:scale-[1.02] transition-all"
        >
          המשך באונבורדינג
        </Link>
      </div>
      <div className="w-full bg-surface-container-highest h-2.5 rounded-full overflow-hidden">
        <div
          className="bg-landlord-green h-full transition-all duration-500 ease-out"
          style={{ width: `${completionPct}%` }}
        />
      </div>
    </div>
  );
}

function TrustScoreCard({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 58;
  const offset = circumference - (score / 100) * circumference;

  return (
    <Link href="/trust" className="block hover:scale-[1.01] transition-transform">
      <div className="bg-tenant-blue rounded-2xl p-8 text-white soft-shadow relative overflow-hidden text-right" dir="rtl">
        <h3 className="text-[22px] leading-[30px] font-semibold mb-6">דירוג האמינות שלך</h3>
        <div className="flex items-center gap-6 mb-6">
          <div className="relative">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r="58" fill="none" stroke="#1a365d" strokeWidth="8" />
              <circle cx="64" cy="64" r="58" fill="none" stroke="#00cba9" strokeWidth="8"
                strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold">{score}</span>
              <span className="text-[10px] opacity-60">מתוך 100</span>
            </div>
          </div>
          <div className="flex-grow">
            <p className="text-[14px] font-medium text-landlord-green mb-4">
              {score >= 80 ? "דירוג מעולה!" : score >= 60 ? "דירוג טוב" : "דירוג בסיסי"}
            </p>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[12px] mb-1"><span>98%</span><span>תשלומים בזמן</span></div>
                <div className="w-full bg-[#1a365d] h-1 rounded-full overflow-hidden"><div className="bg-landlord-green h-full w-[98%]" /></div>
              </div>
              <div>
                <div className="flex justify-between text-[12px] mb-1"><span>4.9/5</span><span>חוות דעת משכירים</span></div>
                <div className="w-full bg-[#1a365d] h-1 rounded-full overflow-hidden"><div className="bg-landlord-green h-full w-[92%]" /></div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute -left-10 -top-10 w-40 h-40 bg-[#1a365d]/20 rounded-full blur-3xl" />
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.activeRole || user?.role || "tenant";

  const { data: apartments } = useSWR<{ apartments: Apartment[] }>("/api/apartments?limit=3", fetcher);
  const { data: contracts } = useSWR<{ contracts: Contract[] }>("/api/contracts", fetcher);
  const { data: gamification } = useSWR<GamificationProfile>("/api/gamification/me", fetcher);
  const { data: notifications } = useSWR<{ notifications: Notification[] }>("/api/notifications?limit=3", fetcher);
  const { data: onboarding } = useSWR<ChecklistResponse>("/api/v3/onboarding/checklist", fetcher);

  if (role === "landlord") {
    return <LandlordDashboard />;
  }

  const activeContracts = contracts?.contracts?.filter((c) => c.status === "ACTIVE") || [];
  const trustScore = gamification?.trustScore ?? user?.trustScore ?? 50;
  const recentNotifs = notifications?.notifications?.slice(0, 3) || [];
  const recommendedApts = apartments?.apartments?.slice(0, 3) || [];

  return (
    <div>
      <header className="mb-[24px]">
        <h2 className="text-[28px] leading-[36px] font-bold text-tenant-blue mb-1">שלום, {user?.firstName} 👋</h2>
        <p className="text-[18px] leading-[26px] font-semibold text-on-surface-variant opacity-80">מה תרצה לעשות היום?</p>
      </header>

      {onboarding && onboarding.completionPct < 100 && (
        <ProfileCompletionWidget
          checklist={onboarding.checklist}
          completionPct={onboarding.completionPct}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-[24px] mb-[24px]">
        <QuickActionCard href="/search" icon="search" ghostIcon="apartment" label="חפש דירה" gradient="bg-gradient-to-br from-landlord-green to-[#006b5f]" />
        <QuickActionCard href="/matches" icon="handshake" ghostIcon="favorite" label="צפה בהתאמות" gradient="bg-tenant-blue" />
        <QuickActionCard href="/payments" icon="payments" ghostIcon="receipt_long" label="בדוק תשלומים" gradient="bg-[#006b5f]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-[24px]">
        <div className="lg:col-span-6 space-y-[24px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[22px] leading-[30px] font-semibold text-tenant-blue">דירות מומלצות עבורך</h3>
              <Link href="/search" className="text-[#006b5f] text-[14px] font-medium hover:underline">צפה בכל הדירות</Link>
            </div>
            <div className="space-y-4">
              {recommendedApts.length > 0 ? recommendedApts.map((apt) => {
                const thumb = getFirstApartmentImageUrl(apt.images);
                return (
                <Link key={apt.id} href={`/apartment/${apt.id}`}
                  className="bg-surface-container-lowest rounded-xl p-4 flex items-center soft-shadow hover:bg-surface-container-low transition-colors border border-transparent hover:border-outline-variant block">
                  <div className="w-32 h-24 rounded-lg overflow-hidden shrink-0 bg-surface-container flex items-center justify-center">
                    {thumb ? <img src={thumb} alt="" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-[40px] text-outline/30">apartment</span>}
                  </div>
                  <div className="mr-4 flex-grow">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[18px] font-semibold text-tenant-blue">{apt.address}</p>
                        <p className="text-[12px] text-on-surface-variant flex items-center">
                          <span className="material-symbols-outlined text-[14px] ml-1">location_on</span>
                          {apt.city} • {apt.rooms} חדרים {apt.size ? `• ${apt.size} מ"ר` : ""}
                        </p>
                      </div>
                      <div className="text-left">
                        <p className="text-[22px] leading-[30px] font-semibold text-landlord-green">₪ {apt.price?.toLocaleString()}</p>
                        <p className="text-[12px] text-on-surface-variant">לחודש</p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
              }) : (
                <div className="bg-surface-container-lowest rounded-xl p-8 text-center soft-shadow">
                  <span className="material-symbols-outlined text-[48px] text-outline/30 mb-2">search</span>
                  <p className="text-on-surface-variant">אין דירות מומלצות עדיין</p>
                  <Link href="/search" className="text-landlord-green text-[14px] font-medium hover:underline mt-2 inline-block">חפש דירות</Link>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-[22px] leading-[30px] font-semibold text-tenant-blue mb-4">חוזים פעילים</h3>
            <div className="bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant soft-shadow">
              {activeContracts.length > 0 ? (
                <table className="w-full text-right border-collapse">
                  <thead className="bg-surface-container-low border-b border-outline-variant text-on-surface-variant text-[14px] font-medium">
                    <tr><th className="px-6 py-4 font-bold">נכס</th><th className="px-6 py-4 font-bold">סטטוס</th><th className="px-6 py-4 font-bold">תאריכים</th><th className="px-6 py-4 font-bold">שכ&quot;ד</th><th className="px-6 py-4 font-bold">פעולות</th></tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {activeContracts.map((c) => (
                      <tr key={c.id}>
                        <td className="px-6 py-4"><p className="text-[14px] font-medium text-tenant-blue">{c.apartment?.address || "—"}</p></td>
                        <td className="px-6 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium bg-[#9cefdf] text-[#0b6f63]">בתוקף</span></td>
                        <td className="px-6 py-4 text-[12px] text-on-surface-variant">{c.startDate?.slice(0, 10)} - {c.endDate?.slice(0, 10)}</td>
                        <td className="px-6 py-4 font-bold text-tenant-blue">₪ {c.monthlyRent?.toLocaleString()}</td>
                        <td className="px-6 py-4"><Link href={`/contracts/${c.id}`} className="text-[#006b5f] hover:text-[#0b6f63]"><span className="material-symbols-outlined">visibility</span></Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center">
                  <span className="material-symbols-outlined text-[48px] text-outline/30 mb-2">description</span>
                  <p className="text-on-surface-variant">אין חוזים פעילים</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-[24px]">
          <TrustScoreCard score={trustScore} />
          <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant soft-shadow">
            <h4 className="text-[18px] leading-[26px] font-semibold text-tenant-blue mb-4">התראות אחרונות</h4>
            {recentNotifs.length > 0 ? (
              <div className="space-y-4">
                {recentNotifs.map((n) => (
                  <div key={n.id} className="flex items-start">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.type?.includes("payment") ? "bg-[#9cefdf] text-[#0b6f63]" : "bg-[#d6e3ff] text-[#001b3c]"}`}>
                      <span className="material-symbols-outlined text-[16px]">{n.type?.includes("payment") ? "check_circle" : "notifications"}</span>
                    </div>
                    <div className="mr-3">
                      <p className="text-[14px] font-bold text-tenant-blue leading-tight">{n.title}</p>
                      <p className="text-[12px] text-on-surface-variant">{n.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[14px] text-on-surface-variant text-center py-4">אין התראות חדשות</p>
            )}
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant soft-shadow">
            <h4 className="text-[18px] leading-[26px] font-semibold text-tenant-blue mb-4">אירועים קרובים</h4>
            <div className="space-y-4 relative before:absolute before:right-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-outline-variant">
              <div className="relative flex items-center">
                <div className="w-8 h-8 rounded-full bg-surface-container-lowest border-2 border-landlord-green z-10 shrink-0" />
                <div className="mr-4 flex-grow bg-surface-container-low p-3 rounded-lg">
                  <p className="text-[14px] font-bold text-tenant-blue">ביקור טכנאי מזגנים</p>
                  <p className="text-[12px] text-on-surface-variant">מחר, 10:00</p>
                </div>
              </div>
              <div className="relative flex items-center">
                <div className="w-8 h-8 rounded-full bg-surface-container-lowest border-2 border-outline z-10 shrink-0" />
                <div className="mr-4 flex-grow p-3">
                  <p className="text-[14px] font-bold text-on-surface-variant">פגישת חידוש חוזה</p>
                  <p className="text-[12px] text-outline">24 ינואר, 17:00</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Link href="/maintenance" className="fixed bottom-8 left-8 w-14 h-14 bg-landlord-green text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group">
        <span className="material-symbols-outlined text-[28px]">add</span>
        <span className="absolute right-full ml-3 bg-tenant-blue text-white px-4 py-2 rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md pointer-events-none">דווח על תקלה</span>
      </Link>
    </div>
  );
}
