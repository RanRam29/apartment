import { GamificationView } from "@/components/gamification/GamificationView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "מועדון דיירים ודירוג אמון | DirApp",
  description: "צבירת נקודות זכות, גביעים ומעקב אחר מיקום בטבלת המובילים הארצית",
};

export default function GamificationPage() {
  return <GamificationView />;
}
