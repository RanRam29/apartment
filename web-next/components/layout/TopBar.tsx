"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function TopBar() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-[260px] h-[64px] bg-surface-container-lowest border-b border-outline-variant z-40 flex items-center justify-between px-[32px]">
      {/* Right: Breadcrumb / Page context */}
      <div className="flex items-center">
        <nav className="flex items-center text-on-surface-variant text-[14px] font-medium">
          <Link href="/dashboard" className="hover:text-tenant-blue">
            דף הבית
          </Link>
        </nav>
      </div>

      {/* Center: Search */}
      <div className="relative w-[480px] hidden md:block">
        <input
          className="w-full h-[48px] bg-surface-container-low border-none rounded-full px-12 text-right text-[16px] focus:ring-2 focus:ring-landlord-green transition-all outline-none"
          placeholder="חפש דירות, חוזים או תשלומים..."
          type="text"
        />
        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline">
          search
        </span>
      </div>

      {/* Left: Actions */}
      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-all text-tenant-blue"
            title={theme === "dark" ? "מצב יום" : "מצב לילה"}
          >
            <span className="material-symbols-outlined">
              {theme === "dark" ? "light_mode" : "dark_mode"}
            </span>
          </button>
        )}

        {/* Notifications */}
        <Link
          href="/notifications"
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-all text-tenant-blue relative"
        >
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 bg-[#ba1a1a] rounded-full border border-white" />
        </Link>

        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-surface-container overflow-hidden cursor-pointer flex items-center justify-center">
          {user?.avatarUrl ? (
            <img className="w-full h-full object-cover" src={user.avatarUrl} alt="" />
          ) : (
            <span className="text-tenant-blue text-[14px] font-bold">
              {user?.firstName?.[0] || "?"}{user?.lastName?.[0] || ""}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

