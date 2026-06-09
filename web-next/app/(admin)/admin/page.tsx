import { AdminDashboard } from "@/components/admin/AdminDashboard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "לוח מנהל מערכת | DirApp",
  description: "מרכז הבקרה הראשי של פלטפורמת DirApp",
};

export default function AdminDashboardPage() {
  return <AdminDashboard />;
}
