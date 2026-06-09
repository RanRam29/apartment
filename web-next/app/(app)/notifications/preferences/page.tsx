import { NotificationPreferences } from "@/components/notifications/NotificationPreferences";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "הגדרות התראות | DirApp",
  description: "נהל את העדפות קבלת ההתראות במערכת DirApp - אימייל, פוש ו-WhatsApp",
};

export default function NotificationPreferencesPage() {
  return <NotificationPreferences />;
}
