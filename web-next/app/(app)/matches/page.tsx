import { MatchesPage } from "@/components/matches/MatchesPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "התאמות | DirApp",
  description: "צפה בהתאמות הדירות שלך, אשר או דחה התאמות, ושלח הודעות למשכירים",
};

export default function Matches() {
  return <MatchesPage />;
}
