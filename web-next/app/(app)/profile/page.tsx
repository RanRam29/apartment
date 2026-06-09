import { ProfileSettings } from "@/components/profile/ProfileSettings";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "פרופיל והגדרות | DirApp",
  description: "ניהול הגדרות חשבון, העדפות חיפוש ופרטיות במערכת DirApp",
};

export default function ProfilePage() {
  return <ProfileSettings />;
}
