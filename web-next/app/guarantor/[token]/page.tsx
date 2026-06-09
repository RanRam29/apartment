import { GuarantorFlow } from "@/components/guarantor/GuarantorFlow";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "חתימת ערבות דיגיטלית | DirApp",
  description: "חתימה מאובטחת על שטר ערבות דיגיטלי עבור חוזה שכירות במערכת DirApp",
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function GuarantorPage({ params }: PageProps) {
  const { token } = await params;
  
  return <GuarantorFlow token={token} />;
}
