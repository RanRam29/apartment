"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled route error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 rtl" dir="rtl">
      <span className="material-symbols-outlined text-[64px] text-admin-red mb-4">error</span>
      <h2 className="text-h2-web font-bold text-tenant-blue mb-2">משהו השתבש</h2>
      <p className="text-body text-on-surface-variant mb-6 max-w-md">
        אירעה שגיאה בלתי צפויה. אפשר לנסות שוב, ואם הבעיה חוזרת — חזרו למסך הראשי.
      </p>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="px-8 h-button-h rounded-full bg-landlord-green text-white font-bold shadow-lg hover:shadow-xl transition-all active:scale-95"
        >
          נסה שוב
        </button>
        <Link
          href="/dashboard"
          className="px-8 h-button-h rounded-full border border-tenant-blue text-tenant-blue font-bold hover:bg-tenant-blue hover:text-white transition-all flex items-center justify-center"
        >
          חזרה לראשי
        </Link>
      </div>
    </div>
  );
}
