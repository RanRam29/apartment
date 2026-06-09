import { ApartmentDetail } from "@/components/apartment/ApartmentDetail";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "פרטי דירה | DirApp",
  description: "צפה בפרטים המלאים של הדירה, העלות החודשית האמיתית והתאמה לפרופיל שלך במערכת DirApp",
};

export default async function ApartmentPage({ params }: PageProps) {
  const { id } = await params;
  return <ApartmentDetail apartmentId={id} />;
}
