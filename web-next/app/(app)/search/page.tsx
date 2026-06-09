import { SearchPage } from "@/components/search/SearchPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "חיפוש דירות | DirApp",
  description: "חפש דירות להשכרה עם חיפוש חכם בשפה טבעית, סינון מתקדם וגריד תוצאות",
};

export default function Search() {
  return <SearchPage />;
}
