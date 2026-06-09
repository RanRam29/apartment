import { RenterJournalView } from "@/components/journal/RenterJournalView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "יומן שוכר | DirApp",
  description: "הצג את יומן השוכר שלך, מדדי אמינות, חוזים, צ'ק-אין ופירוט תשלומים",
};

export default function RenterJournalPage() {
  return <RenterJournalView />;
}
