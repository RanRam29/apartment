"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { api } from "@/lib/api";
import Link from "next/link";

const fetcher = <T,>(url: string) => api<T>(url);

type TrustHistoryItem = {
  id: string;
  eventKey: string;
  delta: number;
  createdAt: string;
  meta?: any;
};

type TrustTaskItem = {
  eventKey: string;
  points: number;
  status: "COMPLETED" | "PARTIAL" | "PENDING";
};

type TrustResponse = {
  score: number;
  history: TrustHistoryItem[];
  activeTasks: TrustTaskItem[];
};

const EVENT_TRANSLATIONS: Record<string, { title: string; desc: string; icon: string; link?: string }> = {
  kyc_approved: {
    title: "אימות זהות (KYC)",
    desc: "אימות פרופיל רשמי ומניעת התחזות במערכת",
    icon: "verified_user",
    link: "/onboarding"
  },
  income_verified: {
    title: "הוכחת הכנסה",
    desc: "העלאת תלושי שכר או הצהרת הכנסה חתומה",
    icon: "payments",
    link: "/profile"
  },
  rent_paid_on_time: {
    title: "תשלום שכירות בזמן",
    desc: "תשלום שכר הדירה החודשי ללא עיכובים או פיגורים",
    icon: "event_available",
    link: "/payments"
  },
  streak_6_months: {
    title: "התמדה של 6 חודשים",
    desc: "רצף של חצי שנה של תשלומים תקינים לחלוטין",
    icon: "workspace_premium",
    link: "/payments"
  },
  checkin_checkout_clean: {
    title: "מסירת דירה נקייה (צ'ק-אאוט)",
    desc: "מסירה וצ'ק-אאוט מסודר ללא ליקויים או נזקים",
    icon: "task_alt",
    link: "/contracts"
  },
  whatsapp_opt_in: {
    title: "חיבור התראות WhatsApp",
    desc: "קבלת עדכונים מהירים על תשלומים, חוזים והודעות",
    icon: "chat",
    link: "/onboarding"
  },
  ownership_verified: {
    title: "אימות בעלות נכס",
    desc: "אימות נסח טאבו או מסמכי בעלות רשמיים",
    icon: "real_estate_agent",
    link: "/properties"
  },
  fast_lead_response: {
    title: "מענה מהיר לשוכרים",
    desc: "חזרה מהירה ומענה לפניות שוכרים פוטנציאליים",
    icon: "speed",
    link: "/leads"
  },
  fast_maintenance: {
    title: "טיפול מהיר בתקלות",
    desc: "סגירת קריאות שירות ותיקון תקלות במהירות",
    icon: "handyman",
    link: "/maintenance"
  },
  digital_signing: {
    title: "חתימה דיגיטלית על חוזים",
    desc: "חתימה מאובטחת על הסכמי שכירות דרך המערכת",
    icon: "draw",
    link: "/contracts"
  },
  positive_reviews: {
    title: "חוות דעת חיוביות",
    desc: "קבלת דירוגים גבוהים וחוות דעת מהצד השני",
    icon: "reviews",
    link: "/profile"
  }
};

export default function TrustHubPage() {
  const { user } = useAuth();
  const router = useRouter();
  const role = user?.activeRole || user?.role || "tenant";

  const { data: trustData, error, mutate } = useSWR<TrustResponse>("/api/v3/trust/me", fetcher);
  
  const [displayedScore, setDisplayedScore] = useState(50);
  const [simulatedEvent, setSimulatedEvent] = useState<string | null>(null);
  const [simulationResult, setSimulationResult] = useState<{ currentScore: number; hypotheticalScore: number; delta: number } | null>(null);
  const [simulationLoading, setSimulationLoading] = useState(false);

  // Initialize displayed score when data loads
  useEffect(() => {
    if (trustData?.score !== undefined && !simulatedEvent) {
      setDisplayedScore(trustData.score);
    }
  }, [trustData?.score, simulatedEvent]);

  if (error) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-right" dir="rtl">
        <span className="material-symbols-outlined text-[64px] text-error mb-4">error</span>
        <h3 className="text-[20px] font-bold text-tenant-blue mb-2">טעינת הנתונים נכשלה</h3>
        <p className="text-on-surface-variant">אירעה שגיאה בקבלת פרופיל האמינות שלך. נסה לרענן את העמוד.</p>
      </div>
    );
  }

  if (!trustData) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-right" dir="rtl">
        <div className="w-12 h-12 border-4 border-landlord-green border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-on-surface-variant font-medium">טוען נתוני פרופיל אמינות...</p>
      </div>
    );
  }

  const handleSimulate = async (eventKey: string) => {
    if (simulatedEvent === eventKey) {
      // Toggle off simulation
      setSimulatedEvent(null);
      setSimulationResult(null);
      animateScore(displayedScore, trustData.score);
      return;
    }

    setSimulationLoading(true);
    try {
      const res = await api<{ currentScore: number; hypotheticalScore: number; delta: number }>(
        `/api/v3/trust/simulate?event=${eventKey}`
      );
      setSimulatedEvent(eventKey);
      setSimulationResult(res);
      animateScore(displayedScore, res.hypotheticalScore);
    } catch (err) {
      console.error("Simulation failed", err);
    } finally {
      setSimulationLoading(false);
    }
  };

  const animateScore = (startVal: number, endVal: number) => {
    let start = startVal;
    const end = endVal;
    if (start === end) return;
    const duration = 600; // ms
    const stepTime = Math.abs(Math.floor(duration / (end - start)));
    const timer = setInterval(() => {
      if (start < end) {
        start++;
        setDisplayedScore(start);
      } else if (start > end) {
        start--;
        setDisplayedScore(start);
      }
      if (start === end) {
        clearInterval(timer);
      }
    }, Math.max(stepTime, 10));
  };

  // Compute SVG Arc variables
  const scoreToUse = displayedScore;
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scoreToUse / 100) * circumference;

  // Bracket detection
  const isExcellent = scoreToUse >= 80;
  const isGood = scoreToUse >= 60 && scoreToUse < 80;
  
  // Style config based on score bracket
  let themeColor = "stroke-amber-500 text-amber-500";
  let themeBg = "bg-amber-500/10 text-amber-500 border-amber-500/20";
  let bracketName = "בסיסי";
  let ringGradient = "url(#amberGradient)";

  if (isExcellent) {
    themeColor = "stroke-landlord-green text-landlord-green";
    themeBg = "bg-landlord-green/10 text-landlord-green border-landlord-green/20";
    bracketName = "מעולה!";
    ringGradient = "url(#emeraldGradient)";
  } else if (isGood) {
    themeColor = "stroke-tenant-blue text-tenant-blue";
    themeBg = "bg-tenant-blue/10 text-tenant-blue border-tenant-blue/20";
    bracketName = "טוב";
    ringGradient = "url(#blueGradient)";
  }

  return (
    <div className="max-w-6xl mx-auto py-6 text-right" dir="rtl">
      {/* Simulation Banner */}
      {simulatedEvent && simulationResult && (
        <div className="mb-6 p-4 rounded-xl bg-tenant-blue/10 border border-tenant-blue/30 text-tenant-blue flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[24px] animate-pulse">science</span>
            <span className="text-[15px] font-bold">
              מצב סימולציה: ביצוע &quot;{EVENT_TRANSLATIONS[simulatedEvent]?.title}&quot; יעלה את הציון שלך מ-{simulationResult.currentScore} ל-{simulationResult.hypotheticalScore} (<span className="text-landlord-green font-extrabold">+{simulationResult.delta} נקודות</span>)!
            </span>
          </div>
          <button
            onClick={() => {
              setSimulatedEvent(null);
              setSimulationResult(null);
              animateScore(displayedScore, trustData.score);
            }}
            className="px-4 py-1.5 bg-white border border-tenant-blue/20 rounded-full text-[13px] font-bold hover:bg-tenant-blue/5 transition-all"
          >
            בטל סימולציה
          </button>
        </div>
      )}

      {/* Header */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] leading-[40px] font-bold text-tenant-blue mb-1">פרופיל אמינות ודירוג אישי 🛡️</h1>
          <p className="text-on-surface-variant text-[16px]">הצג את מדדי האמינות שלך במערכת, בצע משימות להעלאת הציון ושפר את סיכויי ההתאמה שלך.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/onboarding"
            className="px-6 h-11 bg-tenant-blue text-white rounded-full font-bold text-[14px] flex items-center justify-center shadow hover:scale-[1.02] transition-transform"
          >
            אונבורדינג מודרך
          </Link>
        </div>
      </header>

      {/* Top Section: Score Circular Gauge + Simulation Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Circle Score Gauge Card */}
        <div className="bg-white rounded-2xl border border-outline-variant p-8 soft-shadow flex flex-col items-center justify-center text-center relative overflow-hidden">
          <h3 className="text-[18px] font-bold text-tenant-blue mb-6">דירוג האמינות שלך</h3>
          
          <div className="relative w-56 h-56 flex items-center justify-center mb-6">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
              <defs>
                <linearGradient id="emeraldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#059669" />
                  <stop offset="100%" stopColor="#00cba9" />
                </linearGradient>
                <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0c448d" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
                <linearGradient id="amberGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
              {/* Background ring */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke="#f3f4f6"
                strokeWidth="12"
              />
              {/* Filled ring */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke={ringGradient}
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-1">
              <span className="text-[52px] font-black tracking-tighter text-on-surface leading-none">
                {scoreToUse}
              </span>
              <span className="text-[12px] text-on-surface-variant font-bold">מתוך 100</span>
            </div>
          </div>

          <div className={`px-5 py-2 rounded-full border text-[15px] font-black tracking-wide ${themeBg}`}>
            דירוג {bracketName}
          </div>

          {simulatedEvent && (
            <span className="text-[12px] text-tenant-blue font-semibold mt-3 animate-pulse">
              * מוצג ציון מדומה *
            </span>
          )}

          <div className="absolute -left-16 -top-16 w-32 h-32 bg-tenant-blue/5 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Improved Checklist / Improve score */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-outline-variant p-6 soft-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-outline-variant pb-4 mb-4">
              <h3 className="text-[18px] font-bold text-tenant-blue flex items-center gap-2">
                <span className="material-symbols-outlined">insights</span>
                איך להעלות את הציון שלך?
              </h3>
              <span className="text-[13px] text-on-surface-variant font-semibold">לחץ על משימה כדי לבצע או להדמות אותה</span>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {trustData.activeTasks.filter(t => t.points > 0).map((task) => {
                const config = EVENT_TRANSLATIONS[task.eventKey] || {
                  title: task.eventKey,
                  desc: "משימת אמינות במערכת",
                  icon: "star",
                  link: "#"
                };

                const isThisSimulated = simulatedEvent === task.eventKey;

                return (
                  <div
                    key={task.eventKey}
                    className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isThisSimulated
                        ? "bg-tenant-blue/5 border-tenant-blue"
                        : "bg-surface-container-lowest border-outline-variant hover:border-tenant-blue/30"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[24px] text-tenant-blue/80 mt-0.5">
                        {config.icon}
                      </span>
                      <div>
                        <h4 className="text-[15px] font-bold text-on-surface flex items-center gap-2">
                          {config.title}
                          <span className="px-2 py-0.5 rounded-full bg-landlord-green/10 text-landlord-green font-bold text-[11px]">
                            +{task.points} נק׳
                          </span>
                        </h4>
                        <p className="text-[12px] text-on-surface-variant mt-0.5">{config.desc}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleSimulate(task.eventKey)}
                        disabled={simulationLoading}
                        className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-all border ${
                          isThisSimulated
                            ? "bg-tenant-blue text-white border-tenant-blue"
                            : "bg-white text-tenant-blue border-tenant-blue/20 hover:bg-tenant-blue/5"
                        }`}
                      >
                        {isThisSimulated ? "בטל הדמיה" : "הדמה השפעה"}
                      </button>
                      {config.link && (
                        <Link
                          href={config.link}
                          className="px-3 py-1.5 rounded-full bg-landlord-green text-white text-[12px] font-bold hover:brightness-105 transition-all flex items-center gap-1"
                        >
                          בצע עכשיו
                          <span className="material-symbols-outlined text-[12px]">arrow_back</span>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}

              {trustData.activeTasks.filter(t => t.points > 0).length === 0 && (
                <div className="text-center py-8 text-on-surface-variant font-medium">
                  🌟 כל הכבוד! השלמת את כל משימות האמינות הזמינות לתפקידך! ציון האמינות שלך מקסימלי.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* History & Complete Guide Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Points History */}
        <div className="bg-white rounded-2xl border border-outline-variant p-6 soft-shadow flex flex-col justify-between">
          <div>
            <h3 className="text-[18px] font-bold text-tenant-blue border-b border-outline-variant pb-4 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">history</span>
              היסטוריית נקודות אמינות
            </h3>
            
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              {trustData.history.map((event) => {
                const config = EVENT_TRANSLATIONS[event.eventKey] || {
                  title: event.eventKey,
                  icon: "star"
                };
                const isPositive = event.delta >= 0;

                return (
                  <div key={event.id} className="flex items-center justify-between border-b border-outline-variant/40 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isPositive ? "bg-landlord-green/10 text-landlord-green" : "bg-error/10 text-error"
                      }`}>
                        <span className="material-symbols-outlined text-[18px]">
                          {isPositive ? config.icon : "warning"}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-[14px] font-bold text-on-surface">{config.title}</h4>
                        <span className="text-[11px] text-on-surface-variant">
                          {new Date(event.createdAt).toLocaleDateString("he-IL", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[15px] font-black ${isPositive ? "text-landlord-green" : "text-error"}`}>
                      {isPositive ? `+${event.delta}` : event.delta}
                    </span>
                  </div>
                );
              })}

              {trustData.history.length === 0 && (
                <div className="text-center py-8 text-on-surface-variant text-[14px]">
                  טרם נצברו אירועי אמינות בחשבונך. השלם צעדים באונבורדינג כדי להתחיל לקבל נקודות.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Complete System Guide (Hebrew, responsive, informative) */}
        <div className="bg-white rounded-2xl border border-outline-variant p-6 soft-shadow">
          <h3 className="text-[18px] font-bold text-tenant-blue border-b border-outline-variant pb-4 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">menu_book</span>
            מדריך העלאת ציון האמינות
          </h3>

          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 text-[14px] leading-[22px]">
            <p className="text-on-surface-variant font-medium">
              ציון האמינות ב-DirApp הוא כלי רב עוצמה שמסייע ליצור אמון הדדי בין שוכרים למשכירים עוד לפני פגישת ההיכרות.
            </p>
            
            <div className="space-y-3 pt-2">
              <h4 className="font-extrabold text-tenant-blue flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">badge</span>
                איך שוכר יכול להעלות את הציון?
              </h4>
              <ul className="list-disc list-inside space-y-1.5 text-on-surface-variant mr-2">
                <li>
                  <span className="font-bold text-on-surface">אימות זהות (KYC):</span> העלה תעודה מזהה וקבל <b>+20 נקודות</b> מיידיות ותג מאומת.
                </li>
                <li>
                  <span className="font-bold text-on-surface">אימות הכנסה מסודר:</span> העלה תלושי שכר מול מערכת מאובטחת לקבלת <b>+15 נקודות</b>.
                </li>
                <li>
                  <span className="font-bold text-on-surface">תשלום שכר דירה בזמן:</span> כל חודש של תשלום תקין מעניק <b>+5 נקודות</b> (עד תקרה של 30 נקודות).
                </li>
                <li>
                  <span className="font-bold text-on-surface">רצף של חצי שנה (Streak):</span> שלם חצי שנה ברצף ללא איחור וקבל <b>+10 נקודות</b> בונוס.
                </li>
                <li>
                  <span className="font-bold text-on-surface">חתימה דיגיטלית:</span> חתום על חוזה השכירות ישירות במערכת DirApp וקבל <b>+15 נקודות</b>.
                </li>
              </ul>
            </div>

            <div className="space-y-3 pt-3 border-t border-outline-variant/40">
              <h4 className="font-extrabold text-tenant-blue flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">house</span>
                איך משכיר יכול להעלות את הציון?
              </h4>
              <ul className="list-disc list-inside space-y-1.5 text-on-surface-variant mr-2">
                <li>
                  <span className="font-bold text-on-surface">אימות בעלות על הנכס:</span> אימות טאבו או חוזה רשמי מקנה <b>+25 נקודות</b> ומסמן את הדירה כמאומתת.
                </li>
                <li>
                  <span className="font-bold text-on-surface">מענה מהיר לפניות שוכרים:</span> חזור לפניות של לידים חדשים במהירות וקבל <b>+15 נקודות</b>.
                </li>
                <li>
                  <span className="font-bold text-on-surface">טיפול מהיר בתקלות:</span> פתור קריאות תחזוקה ושירות במהירות עבור השוכרים שלך וקבל <b>+15 נקודות</b>.
                </li>
                <li>
                  <span className="font-bold text-on-surface">חתימה דיגיטלית על חוזים:</span> שימוש במערכת החוזים הדיגיטלית מעניק <b>+15 נקודות</b>.
                </li>
                <li>
                  <span className="font-bold text-on-surface">חוות דעת חיוביות:</span> צבור משובים מעולים משוכרים קודמים ונוכחיים לקבלת <b>+15 נקודות</b>.
                </li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
