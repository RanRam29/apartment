"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function NotFound() {
  const { user } = useAuth();
  const dashboardLink = user ? "/dashboard" : "/login";

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-tenant-blue via-[#1a365d] to-[#0c1a30] p-4 text-center" 
      dir="rtl"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[10%] w-72 h-72 bg-landlord-green/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[20%] right-[10%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-md w-full backdrop-blur-md bg-white/10 border border-white/10 p-8 rounded-3xl soft-shadow space-y-6 relative z-10">
        
        {/* Error Code */}
        <div className="relative inline-block">
          <h1 className="text-[100px] leading-none font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-landlord-green to-blue-400 select-none">
            404
          </h1>
          <span className="material-symbols-outlined absolute -top-4 -right-4 text-[42px] text-landlord-green animate-bounce">
            error
          </span>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h2 className="text-h2-web font-extrabold text-white">אופס! הדף לא נמצא</h2>
          <p className="text-caption text-blue-200 leading-relaxed">
            נראה שהקישור שהגעת אליו שבור, הוסר או שלא קיים יותר במערכת DirApp.
          </p>
        </div>

        {/* Action button */}
        <div className="pt-4">
          <Link
            href={dashboardLink}
            className="inline-flex items-center gap-2 px-8 py-3 bg-landlord-green text-white hover:bg-[#00b094] rounded-full font-bold text-label transition-all active:scale-[0.98] shadow-lg shadow-landlord-green/20"
          >
            <span className="material-symbols-outlined text-[20px]">home</span>
            <span>חזרה למסך הבית</span>
          </Link>
        </div>

        {/* Material Symbols font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </div>
    </div>
  );
}
