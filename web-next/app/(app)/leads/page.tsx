import { LeadsManagement } from "@/components/leads/LeadsManagement";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ניהול לידים | DirApp",
  description: "ניהול פניות שוכרים פוטנציאליים עבור הדירות שלך",
};

export default function LeadsPage() {
  return <LeadsManagement />;
}
