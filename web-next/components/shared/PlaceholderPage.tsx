"use client";

import Link from "next/link";

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: string;
}

export function PlaceholderPage({ title, description, icon }: PlaceholderPageProps) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[30%] left-[20%] w-72 h-72 bg-landlord-green/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[30%] right-[20%] w-96 h-96 bg-tenant-blue/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-md w-full backdrop-blur-sm bg-white/60 border border-outline-variant/30 p-10 rounded-3xl soft-shadow space-y-6 relative z-10">
        <div className="relative inline-flex items-center justify-center w-20 h-20 bg-tenant-blue/5 rounded-full mx-auto">
          <span className="material-symbols-outlined text-[48px] text-tenant-blue">
            {icon}
          </span>
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-landlord-green opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-landlord-green"></span>
          </span>
        </div>

        <div className="space-y-2">
          <h2 className="text-[26px] font-extrabold text-tenant-blue">{title}</h2>
          <p className="text-caption text-on-surface-variant leading-relaxed">
            {description}
          </p>
        </div>

        <div className="bg-slate-50/80 border border-outline-variant/20 p-4 rounded-2xl text-[12px] text-on-surface-variant flex items-center gap-2 justify-center">
          <span className="material-symbols-outlined text-[18px] text-landlord-green">info</span>
          <span>עמוד זה נמצא כעת בפיתוח כחלק מגרסה MVP v3.0</span>
        </div>

        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-3 bg-tenant-blue text-white hover:bg-tenant-blue/90 rounded-full font-bold text-label transition-all active:scale-[0.98] shadow-md"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            <span>חזרה ללוח הבקרה</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
