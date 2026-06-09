import { AdminUsers } from "@/components/admin/AdminUsers";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ניהול משתמשים | מנהל מערכת | DirApp",
  description: "רשימת משתמשי DirApp, עריכת הרשאות, ניהול KYC ונעילת חשבונות",
};

export default function AdminUsersPage() {
  return <AdminUsers />;
}
