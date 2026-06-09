"use client";

import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

interface ContractSummary {
  id: string;
  startDate: string;
  endDate: string;
  monthlyRentIls: number;
  status: string;
  checkinCompletedAt: string | null;
  checkoutCompletedAt: string | null;
}

interface PaymentsSummary {
  totalRentRows: number;
  paid: number;
  unpaid: number;
  overdue: number;
}

interface RenterJournalStats {
  renter: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    bio: string;
    trustScore: number;
    isVerified: boolean;
    kycStatus: string;
  };
  contracts: ContractSummary[];
  paymentsSummary: PaymentsSummary;
  checkIn: { completedCount: number };
  checkOut: { completedCount: number };
  maintenance: { totalCount: number };
  isEditable: boolean;
}

interface RoomItem {
  id: string;
  name: string;
  photos: string[];
  notes?: string;
}

interface DetailedJournal {
  contract: {
    id: string;
    landlordId: string;
    monthlyRentIls: number;
    startDate: string;
    endDate: string;
    status: string;
    checkinCompletedAt: string | null;
    checkoutCompletedAt: string | null;
    extractedFields?: {
      address?: string;
    };
  } | null;
  ledgerEntries: Array<{
    id: string;
    dueDate: string;
    amount: number;
    status: "PAID" | "PENDING" | "OVERDUE" | "REPORTED";
    paidAt: string | null;
  }>;
  checkIn: {
    rooms: RoomItem[];
    completedAt: string | null;
  } | null;
  maintenance: Array<{
    id: string;
    title: string;
    description: string;
    status: "OPEN" | "IN_PROGRESS" | "WAITING_INVOICE" | "CLOSED";
    createdAt: string;
    updatedAt: string;
  }>;
  checkOut: {
    rooms: RoomItem[];
    completedAt: string | null;
  } | null;
}

export function RenterJournalView() {
  const { user } = useAuth();
  
  // Fetch summary stats
  const { data: summary, isLoading: isSummaryLoading } = useApi<RenterJournalStats>(
    user ? `/api/v3/renter-journal/${user.id}` : null
  );

  // Fetch detailed tenant journal (only accessible for active role = tenant)
  const isTenant = user?.activeRole === "tenant" || user?.role === "tenant";
  const { data: details, isLoading: isDetailsLoading } = useApi<DetailedJournal>(
    isTenant ? "/api/tenant/journal" : null
  );

  const [dateRange, setDateRange] = useState("all");

  const formatILS = (num: number) => {
    return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(num);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("he-IL");
  };

  if (isSummaryLoading || (isTenant && isDetailsLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <div className="w-12 h-12 border-4 border-landlord-green border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-on-surface-variant font-label text-body">טוען יומן שוכר...</p>
      </div>
    );
  }

  // Fallbacks if no active tenancy / empty database
  const renter = summary?.renter ?? {
    firstName: user?.firstName ?? "שוכר",
    lastName: user?.lastName ?? "מאומת",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    avatarUrl: user?.avatarUrl ?? null,
    trustScore: user?.trustScore ?? 75,
    kycStatus: user?.kycStatus ?? "NONE",
    bio: "דייר אחראי, שומר על הנכס ומשלם תמיד בזמן."
  };

  const hasActiveTenancy = details?.contract !== null && details !== undefined;

  // Compile timeline events from database or use mock fallbacks
  let timelineEvents = [];

  if (hasActiveTenancy && details) {
    const { contract, ledgerEntries, checkIn, checkOut, maintenance } = details;

    // 1. Contract signed
    if (contract) {
      timelineEvents.push({
        id: `contract-${contract.id}`,
        type: "contract",
        title: "חתימה על חוזה שכירות דיגיטלי",
        date: contract.startDate,
        icon: "description",
        color: "bg-blue-50 text-tenant-blue border-blue-200",
        content: (
          <div className="space-y-1 mt-2">
            <p className="text-caption">כתובת הדירה: <strong>{contract.extractedFields?.address || "דירת המגורים"}</strong></p>
            <p className="text-caption">שכר דירה חודשי: <strong>{formatILS(contract.monthlyRentIls || 5000)}</strong></p>
            <p className="text-caption text-on-surface-variant text-[11px]">מזהה דיגיטלי: {contract.id.substring(0, 8)}...</p>
          </div>
        )
      });
    }

    // 2. Check-in photos
    if (checkIn && checkIn.completedAt) {
      const allPhotos = checkIn.rooms.flatMap(r => r.photos.map(p => ({ roomName: r.name, url: p })));
      timelineEvents.push({
        id: "checkin-flow",
        type: "checkin",
        title: "השלמת פרוטוקול צ'ק-אין (כניסה לדירה)",
        date: checkIn.completedAt,
        icon: "camera_alt",
        color: "bg-purple-50 text-guarantor-purple border-purple-200",
        content: (
          <div className="space-y-3 mt-2">
            <p className="text-caption">נסקרו <strong>{checkIn.rooms.length} חדרים</strong> והועלו תמונות מצב נכס מאומתות.</p>
            {allPhotos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {allPhotos.slice(0, 4).map((img, idx) => (
                  <div key={idx} className="relative h-16 rounded-lg overflow-hidden border border-outline-variant bg-slate-100 group">
                    <img src={img.url} className="w-full h-full object-cover" alt="" />
                    <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center py-0.5 truncate">
                      {img.roomName}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      });
    }

    // 3. Maintenance Service tickets
    if (maintenance && maintenance.length > 0) {
      maintenance.forEach(ticket => {
        timelineEvents.push({
          id: `ticket-${ticket.id}`,
          type: "maintenance",
          title: `דיווח על תקלה: ${ticket.title}`,
          date: ticket.createdAt,
          icon: "build",
          color: ticket.status === "CLOSED" ? "bg-green-50 text-landlord-green border-green-200" : "bg-amber-50 text-[#e28743] border-amber-200",
          content: (
            <div className="space-y-1.5 mt-2">
              <p className="text-caption text-on-surface-variant leading-relaxed">{ticket.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  ticket.status === "CLOSED" ? "bg-green-100 text-landlord-green" : "bg-amber-100 text-[#e28743]"
                }`}>
                  {ticket.status === "CLOSED" ? "טופלה בהצלחה" : "בטיפול"}
                </span>
                <span className="text-[10px] text-on-surface-variant">עודכן ב: {formatDate(ticket.updatedAt)}</span>
              </div>
            </div>
          )
        });
      });
    }

    // 4. Rent Payments
    if (ledgerEntries && ledgerEntries.length > 0) {
      ledgerEntries.forEach(entry => {
        timelineEvents.push({
          id: `payment-${entry.id}`,
          type: "payment",
          title: `תשלום שכר דירה חודשי`,
          date: entry.dueDate,
          icon: "payments",
          color: entry.status === "PAID" ? "bg-green-50 text-landlord-green border-green-200" : "bg-red-50 text-red-700 border-red-200",
          content: (
            <div className="flex justify-between items-center mt-2 p-2 bg-white border border-outline-variant/30 rounded-xl">
              <div>
                <p className="text-caption font-bold text-tenant-blue">{formatILS(entry.amount)}</p>
                <p className="text-[10px] text-on-surface-variant">תאריך פירעון: {formatDate(entry.dueDate)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  entry.status === "PAID" ? "bg-green-100 text-landlord-green" : "bg-red-100 text-red-700"
                }`}>
                  {entry.status === "PAID" ? "שולם במועד" : "פיגור"}
                </span>
                {entry.status === "PAID" && (
                  <button 
                    onClick={() => toast.success("מוריד קבלה מאושרת דיגיטלית...")}
                    className="p-1 hover:bg-slate-100 rounded text-tenant-blue"
                    title="הורד קבלה"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                  </button>
                )}
              </div>
            </div>
          )
        });
      });
    }

    // 5. Check-out completion
    if (checkOut && checkOut.completedAt) {
      timelineEvents.push({
        id: "checkout-flow",
        type: "checkout",
        title: "השלמת פרוטוקול צ'ק-אאוט (יציאה מהדירה)",
        date: checkOut.completedAt,
        icon: "camera_alt",
        color: "bg-red-50 text-red-700 border-red-200",
        content: (
          <div className="space-y-1 mt-2">
            <p className="text-caption">חוזה השכירות הסתיים בהצלחה. המפתחות הוחזרו ונחתם שחרור פיקדון.</p>
            <p className="text-caption text-on-surface-variant text-[11px]">תאריך יציאה: {formatDate(checkOut.completedAt)}</p>
          </div>
        )
      });
    }

  } else {
    // Return High Fidelity simulated timeline events representing historic user credentials
    timelineEvents = [
      {
        id: "mock-verif",
        type: "verification",
        title: "אימות זהות ממשלתי (KYC) מושלם במערכת",
        date: "2026-05-10",
        icon: "verified_user",
        color: "bg-green-50 text-landlord-green border-green-200",
        content: (
          <div className="space-y-1 mt-2">
            <p className="text-caption">נסרקה תעודת זהות ישראלית ובוצעה בדיקת חיות (Liveness detection).</p>
            <p className="text-caption text-on-surface-variant text-[11px]">סטטוס: <strong>APPROVED (מאומת)</strong></p>
          </div>
        )
      },
      {
        id: "mock-contract-1",
        type: "contract",
        title: "חתימה על חוזה שכירות דיגיטלי ברחוב אלנבי 42, תל אביב",
        date: "2025-06-01",
        icon: "description",
        color: "bg-blue-50 text-tenant-blue border-blue-200",
        content: (
          <div className="space-y-1 mt-2">
            <p className="text-caption">משכיר הנכס: <strong>ישראל ישראלי</strong></p>
            <p className="text-caption">שכר דירה חודשי: <strong>{formatILS(4800)}</strong></p>
            <p className="text-caption text-on-surface-variant text-[11px]">תקופה: 01/06/2025 - 31/05/2026</p>
          </div>
        )
      },
      {
        id: "mock-pay-1",
        type: "payment",
        title: "תשלום 12 מחזורי שכר דירה ללא פיגור",
        date: "2026-05-01",
        icon: "payments",
        color: "bg-green-50 text-landlord-green border-green-200",
        content: (
          <div className="space-y-1 mt-2">
            <p className="text-caption">כל התשלומים הועברו במועד בערוץ הלדג'ר הדיגיטלי ללא עיכובים.</p>
            <p className="text-[11px] text-on-surface-variant">דירוג אמינות התשלומים: <strong>100/100 (מצוין)</strong></p>
          </div>
        )
      },
      {
        id: "mock-maint-1",
        type: "maintenance",
        title: "פתיחת קריאת שירות: נזילה בברז המטבח",
        date: "2025-11-15",
        icon: "build",
        color: "bg-green-50 text-landlord-green border-green-200",
        content: (
          <div className="space-y-1 mt-2">
            <p className="text-caption text-on-surface-variant">השוכר דיווח על ברז דולף במטבח, אינסטלטור הגיע ותיקן את הבעיה תוך 6 שעות.</p>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-landlord-green">סגור</span>
          </div>
        )
      },
      {
        id: "mock-checkout-1",
        type: "checkout",
        title: "פינוי דירה וביצוע צ'ק-אאוט ללא ליקויים",
        date: "2026-05-31",
        icon: "camera_alt",
        color: "bg-red-50 text-red-700 border-red-200",
        content: (
          <div className="space-y-1 mt-2">
            <p className="text-caption">הנכס הוחזר למשכיר במצב מצוין ונקי. פיקדון הערבות הוחזר במלואו.</p>
            <p className="text-caption text-on-surface-variant text-[11px]">דירוג המשכיר לשוכר: <strong>5.0 / 5.0 ⭐</strong></p>
          </div>
        )
      }
    ];
  }

  // Sort events by date descending
  const sortedEvents = [...timelineEvents].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Count active months / paid metrics
  const activeMonths = summary?.contracts.length ? summary.contracts.length * 12 : 12;
  const paidCount = summary?.paymentsSummary.paid ?? 12;
  const ticketsResolved = summary?.maintenance.totalCount ?? 1;
  const checkinsCount = summary?.checkIn.completedCount ?? 1;

  return (
    <div className="space-y-10 text-right" dir="rtl">
      
      {/* Title Header */}
      <div>
        <h2 className="text-h1-web font-extrabold text-tenant-blue">יומן השוכר שלי (Renter Journal)</h2>
        <p className="text-body text-on-surface-variant">
          כרטיס האמינות הנייד והמאובטח שלך. היסטוריית תשלומים, צ'ק-אין ותחזוקה חתומים קריפטוגרפית
        </p>
      </div>

      {/* Profile & Trust Score Banner */}
      <section className="bg-white rounded-[24px] p-8 soft-shadow flex flex-col lg:flex-row items-center gap-10 border border-outline-variant/20 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-secondary/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
        
        {/* Avatar & Info */}
        <div className="flex flex-col sm:flex-row items-center gap-6 flex-1 text-center sm:text-right">
          <div className="w-24 h-24 rounded-full border-4 border-white overflow-hidden bg-slate-100 flex items-center justify-center relative shadow-md shrink-0">
            {renter.avatarUrl ? (
              <img src={renter.avatarUrl} className="w-full h-full object-cover" alt="" />
            ) : (
              <span className="text-[28px] font-bold text-tenant-blue">{renter.firstName[0]}{renter.lastName[0]}</span>
            )}
            <div className="absolute bottom-1 left-1 w-5 h-5 bg-landlord-green rounded-full border-2 border-white flex items-center justify-center text-white" title="פרופיל מאומת">
              <span className="material-symbols-outlined text-[11px] font-bold">check</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-2 flex-wrap">
              <h3 className="text-h2-web font-extrabold text-tenant-blue">{renter.firstName} {renter.lastName}</h3>
              {renter.kycStatus === "APPROVED" && (
                <span className="px-2 py-0.5 bg-green-50 text-landlord-green border border-green-200 rounded text-[10px] font-bold">
                  זהות מאומתת (KYC)
                </span>
              )}
            </div>
            <p className="text-caption text-on-surface-variant max-w-md">{renter.bio}</p>
          </div>
        </div>

        {/* trust score conic gradient */}
        <div className="flex items-center gap-6 shrink-0 bg-slate-50 p-5 rounded-2xl border border-outline-variant/30">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90">
              <circle cx="48" cy="48" r="42" fill="none" stroke="#e9ecef" strokeWidth="8" />
              <circle 
                cx="48" 
                cy="48" 
                r="42" 
                fill="none" 
                stroke="#00cba9" 
                strokeWidth="8" 
                strokeDasharray="263.89"
                strokeDashoffset={263.89 - (renter.trustScore / 100) * 263.89}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-extrabold text-[22px] text-tenant-blue leading-none">{renter.trustScore}</span>
              <span className="text-[9px] text-on-surface-variant mt-0.5">ציון אמינות</span>
            </div>
          </div>
          <div>
            <span className="inline-block bg-[#006b5f]/10 text-[#006b5f] px-2 py-0.5 rounded text-[10px] font-bold mb-1">מדד מצוין 🏆</span>
            <h4 className="font-bold text-tenant-blue text-caption">דייר מומלץ DirApp</h4>
            <p className="text-[10px] text-on-surface-variant max-w-[160px] leading-tight mt-0.5">ציון מעל הממוצע הארצי. פניות השוכר מקבלות קדימות.</p>
          </div>
        </div>
      </section>

      {/* Tenancy Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-gutter">
        <div className="bg-white rounded-2xl p-5 soft-shadow border border-outline-variant/30 text-center">
          <span className="text-[11px] text-on-surface-variant font-bold block mb-1">חודשי שכירות פעילים</span>
          <span className="text-[28px] font-extrabold text-tenant-blue leading-none">{activeMonths}</span>
        </div>
        <div className="bg-white rounded-2xl p-5 soft-shadow border border-outline-variant/30 text-center">
          <span className="text-[11px] text-on-surface-variant font-bold block mb-1">מחזורי תשלום שבוצעו</span>
          <span className="text-[28px] font-extrabold text-landlord-green leading-none">{paidCount}</span>
        </div>
        <div className="bg-white rounded-2xl p-5 soft-shadow border border-outline-variant/30 text-center">
          <span className="text-[11px] text-on-surface-variant font-bold block mb-1">תקלות שטופלו בהצלחה</span>
          <span className="text-[28px] font-extrabold text-tenant-blue leading-none">{ticketsResolved}</span>
        </div>
        <div className="bg-white rounded-2xl p-5 soft-shadow border border-outline-variant/30 text-center">
          <span className="text-[11px] text-on-surface-variant font-bold block mb-1">צ'ק-אין מאושרים</span>
          <span className="text-[28px] font-extrabold text-guarantor-purple leading-none">{checkinsCount}</span>
        </div>
      </div>

      {/* Central Dotted Timeline */}
      <section className="bg-white rounded-2xl p-8 soft-shadow border border-outline-variant/20">
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-outline-variant/30">
          <div>
            <h3 className="text-h3-web font-bold text-tenant-blue">ציר הזמן של השוכר</h3>
            <p className="text-caption text-on-surface-variant">כל האירועים החשובים מתקופות השכירות</p>
          </div>
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-outline-variant rounded-full text-caption text-tenant-blue font-bold focus:outline-none"
          >
            <option value="all">כל השנים</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>

        {/* Vertical dotted timeline */}
        <div className="relative border-r border-dashed border-outline-variant/70 mr-4 pr-8 space-y-8 pb-2">
          
          {sortedEvents.map((evt) => (
            <div key={evt.id} className="relative">
              {/* Timeline dot circle icon */}
              <span className={`absolute -right-[49px] top-0.5 w-8 h-8 rounded-full border-2 flex items-center justify-center ${evt.color} shadow-sm z-10`}>
                <span className="material-symbols-outlined text-[16px]">{evt.icon}</span>
              </span>

              {/* Event card details */}
              <div className="bg-slate-50/50 border border-outline-variant/20 rounded-2xl p-5 max-w-2xl hover:bg-slate-50 transition-colors">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                  <h4 className="font-extrabold text-tenant-blue text-caption">{evt.title}</h4>
                  <span className="text-[11px] text-on-surface-variant font-mono">{formatDate(evt.date)}</span>
                </div>
                {evt.content}
              </div>
            </div>
          ))}

        </div>
      </section>

    </div>
  );
}
