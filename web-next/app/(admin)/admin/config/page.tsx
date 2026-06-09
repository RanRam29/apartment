import { AdminConfig } from "@/components/admin/AdminConfig";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "הגדרות מערכת | מנהל מערכת | DirApp",
  description: "ניהול הגדרות אפליקציה, עמלות, מנויים ואבטחה",
};

export default function AdminConfigPage() {
  return <AdminConfig />;
}
