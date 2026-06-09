"use client";

import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import Link from "next/link";

interface NotificationItem {
  id: string;
  type: "payment" | "contract" | "maintenance" | "match" | "system" | "whatsapp";
  title: string;
  body: string;
  time: string;
  read: boolean;
  link?: string;
}

const mockNotificationsData: NotificationItem[] = [
  {
    id: "n-1",
    type: "maintenance",
    title: "קריאת שירות חדשה: נזילה במטבח",
    body: "דייר מנחם בגין 42 פתח קריאה דחופה בנושא אינסטלציה.",
    time: "לפני 15 דקות",
    read: false,
    link: "/maintenance",
  },
  {
    id: "n-2",
    type: "payment",
    title: "התקבל תשלום שכר דירה",
    body: "סכום של 5,400 ₪ התקבל עבור חודש ספטמבר - רחוב ארלוזורוב 12.",
    time: "לפני שעתיים",
    read: false,
    link: "/payments",
  },
  {
    id: "n-3",
    type: "whatsapp",
    title: "הודעה חדשה מהדייר (WhatsApp)",
    body: '"היי, האם אפשר לקבוע מועד לתיקון התריס?"',
    time: "לפני 4 שעות",
    read: true,
    link: "/chat",
  },
  {
    id: "n-4",
    type: "contract",
    title: "חוזה נחתם בהצלחה",
    body: "כל הצדדים חתמו על החוזה עבור הנכס ברחוב השלושה 9.",
    time: "אתמול, 14:20",
    read: true,
    link: "/contracts",
  },
  {
    id: "n-5",
    type: "system",
    title: "עדכון פרטי בנק נדחה",
    body: "המסמך שהעלית לא תואם את פרטי החשבון. אנא נסה שוב.",
    time: "אתמול, 09:15",
    read: true,
    link: "/profile",
  },
  {
    id: "n-6",
    type: "match",
    title: "התאמה חדשה לנכס שלך",
    body: "נמצא שוכר פוטנציאלי עם דירוג אמינות גבוה לנכס בפתח תקווה.",
    time: "אתמול, 08:30",
    read: true,
    link: "/leads",
  },
  {
    id: "n-7",
    type: "payment",
    title: "חשבונית ארנונה לתשלום",
    body: "חשבונית הארנונה עבור הנכס ברחוב רוטשילד 45 זמינה לתשלום.",
    time: "לפני 3 ימים",
    read: true,
    link: "/payments",
  },
  {
    id: "n-8",
    type: "contract",
    title: "בקשת חידוש חוזה ממתינה לאישורך",
    body: "הדייר ברחוב הנביאים 12 ביקש להאריך את תקופת החוזה בשנה נוספת.",
    time: "לפני 4 ימים",
    read: true,
    link: "/contracts",
  },
  {
    id: "n-9",
    type: "maintenance",
    title: "קריאת שירות סגורה: תיקון דוד שמש",
    body: "הטכנאי סיים את התיקון והקריאה נסגרה. לחץ לצפייה בחשבונית.",
    time: "לפני שבוע",
    read: true,
    link: "/maintenance",
  },
];

export function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>(mockNotificationsData);
  const [activeTab, setActiveTab] = useState<"all" | "payment" | "contract" | "maintenance" | "match" | "system">("all");
  const [visibleCount, setVisibleCount] = useState(6);

  // Filter logic
  const filteredNotifs = notifications.filter((n) => {
    if (activeTab === "all") return true;
    if (activeTab === "system" && n.type === "whatsapp") return true; // WhatsApp categorised as system/messages
    return n.type === activeTab;
  });

  // Mark single as read
  function handleMarkAsRead(id: string) {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  // Mark all as read
  function handleMarkAllAsRead() {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  }

  // Helper count for tabs
  const getTabCount = (tab: typeof activeTab) => {
    if (tab === "all") return notifications.length;
    if (tab === "system") {
      return notifications.filter((n) => n.type === "system" || n.type === "whatsapp").length;
    }
    return notifications.filter((n) => n.type === tab).length;
  };

  return (
    <div className="max-w-4xl mx-auto py-8 rtl text-right">
      
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <nav className="flex gap-2 text-caption text-outline mb-1 font-medium">
            <Link href="/dashboard" className="hover:text-tenant-blue">ראשי</Link>
            <span>/</span>
            <span className="text-tenant-blue font-bold">מרכז התראות</span>
          </nav>
          <h2 className="text-h1-web font-bold text-on-surface">מרכז ההתראות</h2>
        </div>
        <button
          onClick={handleMarkAllAsRead}
          className="text-landlord-green font-bold text-label hover:underline outline-none"
        >
          סמן הכל כנקרא
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-4 mb-8 overflow-x-auto pb-2 scrollbar-thin">
        {[
          { key: "all", label: "הכל" },
          { key: "payment", label: "תשלומים" },
          { key: "contract", label: "חוזים" },
          { key: "maintenance", label: "תחזוקה" },
          { key: "match", label: "התאמות" },
          { key: "system", label: "מערכת" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key as any);
              setVisibleCount(6);
            }}
            className={`px-6 py-2 rounded-full font-bold text-label whitespace-nowrap transition-all outline-none ${
              activeTab === tab.key
                ? "bg-tenant-blue text-white shadow-md"
                : "bg-white text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            {tab.label} ({getTabCount(tab.key as any)})
          </button>
        ))}
      </div>

      {/* Notification items list */}
      <div className="space-y-4">
        {filteredNotifs.length > 0 ? (
          filteredNotifs.slice(0, visibleCount).map((n) => (
            <div
              key={n.id}
              onClick={() => handleMarkAsRead(n.id)}
              className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 cursor-pointer ${
                !n.read
                  ? "bg-white border-r-4 border-landlord-green soft-shadow"
                  : "bg-surface-container-low/50 border border-outline-variant/30 opacity-80"
              }`}
            >
              {/* Icon widget */}
              <div className="relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  n.type === "maintenance"
                    ? "bg-orange-100 text-orange-600"
                    : n.type === "payment"
                    ? "bg-secondary-container text-on-secondary-container"
                    : n.type === "contract"
                    ? "bg-blue-100 text-blue-600"
                    : n.type === "match"
                    ? "bg-green-100 text-green-600"
                    : n.type === "whatsapp"
                    ? "bg-[#25D366]/20 text-[#25D366]"
                    : "bg-purple-100 text-purple-600"
                }`}>
                  <span className="material-symbols-outlined">
                    {n.type === "maintenance"
                      ? "build"
                      : n.type === "payment"
                      ? "payments"
                      : n.type === "contract"
                      ? "description"
                      : n.type === "match"
                      ? "handshake"
                      : n.type === "whatsapp"
                      ? "chat"
                      : "error"}
                  </span>
                </div>
                {!n.read && (
                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-tenant-blue rounded-full border-2 border-white" />
                )}
              </div>

              {/* Message text */}
              <div className="flex-grow">
                <p className={`text-body leading-snug ${!n.read ? "font-bold text-tenant-blue" : "font-medium text-on-surface-variant"}`}>
                  {n.title}
                </p>
                <p className="text-on-surface-variant text-caption mt-0.5">
                  {n.body}
                </p>
                <span className="text-[11px] text-outline mt-1 block">
                  {n.time}
                </span>
              </div>

              {/* View Action Link */}
              {n.link && (
                <Link
                  href={n.link}
                  className="text-landlord-green font-bold text-label flex items-center gap-1 hover:gap-2 transition-all outline-none"
                >
                  צפה
                  <span className="material-symbols-outlined !text-[18px]">arrow_back</span>
                </Link>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl p-12 text-center border border-outline-variant/30 soft-shadow">
            <span className="material-symbols-outlined text-[64px] text-outline/30 mb-2">notifications_off</span>
            <p className="text-body font-bold text-tenant-blue">אין התראות חדשות</p>
            <p className="text-caption text-on-surface-variant mt-1">כל ההתראות שלך מסוננות או שנקראו בהצלחה.</p>
          </div>
        )}
      </div>

      {/* Load More Button */}
      {filteredNotifs.length > visibleCount && (
        <div className="flex justify-center pt-8">
          <button
            onClick={() => setVisibleCount(visibleCount + 3)}
            className="px-8 py-3 rounded-full border-2 border-landlord-green text-landlord-green font-bold hover:bg-landlord-green hover:text-white transition-all transform active:scale-95 shadow-sm outline-none"
          >
            טען התראות נוספות
          </button>
        </div>
      )}

    </div>
  );
}
