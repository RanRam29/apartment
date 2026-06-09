import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import "./globals.css";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin", "hebrew"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DirApp — הדרך החכמה לשכור או לנהל דירה",
    template: "%s | DirApp",
  },
  description:
    "פלטפורמת השכירות החכמה של ישראל. חוזים דיגיטליים, אימות זהות, תשלומים ותחזוקה — הכל במקום אחד.",
  keywords: ["דירה", "שכירות", "חוזה דיגיטלי", "ניהול נכסים", "ישראל"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <Providers>
          <TooltipProvider>
            {children}
          </TooltipProvider>
          <Toaster position="top-center" dir="rtl" />
        </Providers>
      </body>
    </html>
  );
}
