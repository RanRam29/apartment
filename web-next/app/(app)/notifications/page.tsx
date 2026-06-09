import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "מרכז התראות | DirApp",
  description: "צפה בעדכונים, תשלומים, ואירועים אחרונים בחשבונך במערכת DirApp",
};

export default function NotificationsPage() {
  return <NotificationCenter />;
}
