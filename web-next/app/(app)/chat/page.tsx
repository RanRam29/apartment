import { ChatPage } from "@/components/chat/ChatPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "הודעות | DirApp",
  description: "שלח וקבל הודעות עם משכירים ושוכרים",
};

export default function Chat() {
  return <ChatPage />;
}
