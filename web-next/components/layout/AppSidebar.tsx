"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

interface NavItem {
  icon: string;
  label: string;
  href: string;
  badge?: number;
}

const tenantNav: NavItem[] = [
  { icon: "home", label: "בית", href: "/dashboard" },
  { icon: "search", label: "חיפוש", href: "/search" },
  { icon: "handshake", label: "התאמות", href: "/matches" },
  { icon: "mail", label: "הודעות", href: "/chat" },
  { icon: "description", label: "חוזי שכירות", href: "/contracts" },
  { icon: "payments", label: "תשלומים", href: "/payments" },
  { icon: "build", label: "תחזוקה", href: "/maintenance" },
  { icon: "calendar_today", label: "יומן", href: "/journal" },
  { icon: "trending_up", label: "דירוג", href: "/gamification" },
];

const landlordNav: NavItem[] = [
  { icon: "home_work", label: "דשבורד", href: "/dashboard" },
  { icon: "person_search", label: "לידים", href: "/leads" },
  { icon: "apartment", label: "נכסים", href: "/properties" },
  { icon: "handshake", label: "התאמות", href: "/matches" },
  { icon: "mail", label: "הודעות", href: "/chat" },
  { icon: "description", label: "חוזים", href: "/contracts" },
  { icon: "payments", label: "תשלומים", href: "/payments" },
  { icon: "build", label: "תקלות", href: "/maintenance" },
  { icon: "camera_alt", label: "צ'ק-אין/אאוט", href: "/checkin" },
];

const adminNav: NavItem[] = [
  { icon: "dashboard", label: "דשבורד", href: "/admin" },
  { icon: "group", label: "משתמשים", href: "/admin/users" },
  { icon: "apartment", label: "נכסים", href: "/admin/properties" },
  { icon: "description", label: "חוזים", href: "/admin/contracts" },
  { icon: "payments", label: "לדג'ר", href: "/admin/ledger" },
  { icon: "build", label: "תקלות", href: "/admin/maintenance" },
  { icon: "settings", label: "הגדרות", href: "/admin/config" },
];

function getNavItems(role: string): NavItem[] {
  switch (role) {
    case "admin": return adminNav;
    case "landlord": return landlordNav;
    default: return tenantNav;
  }
}

function getRoleLabel(role: string): string {
  switch (role) {
    case "admin": return "מנהל מערכת";
    case "landlord": return "משכיר מאומת";
    default: return "שוכר מאומת";
  }
}

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const role = user?.activeRole || user?.role || "tenant";
  const navItems = getNavItems(role);

  return (
    <aside className="fixed right-0 top-0 h-full w-[260px] bg-tenant-blue z-50 flex flex-col py-8 overflow-y-auto shadow-lg">
      {/* Logo */}
      <div className="px-6 mb-10 flex flex-col items-start">
        <h1 className="text-[28px] leading-[36px] font-bold text-landlord-green">
          DirApp
        </h1>
        <p className="text-[12px] text-[#aec7f5] opacity-70">
          {role === "admin" ? "פאנל ניהול" : role === "landlord" ? "מערכת ניהול חכמה" : "ניהול שכירות חכם"}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-grow space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && item.href !== "/admin" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-6 py-3 transition-colors relative ${
                isActive
                  ? "bg-[rgba(26,54,93,0.5)] border-r-4 border-landlord-green text-landlord-green font-bold"
                  : "text-[#aec7f5] opacity-80 hover:bg-[rgba(174,199,245,0.1)] hover:text-landlord-green"
              }`}
            >
              <span
                className="material-symbols-outlined ml-3"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className="text-[14px]">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="absolute left-6 bg-[#ba1a1a] text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Settings link for landlord/admin */}
      {role !== "tenant" && (
        <div className="border-t border-[#1a365d] pt-4 px-6">
          <Link
            href={role === "admin" ? "/admin/config" : "/profile"}
            className="flex items-center py-3 text-[#aec7f5] opacity-80 hover:text-landlord-green transition-colors"
          >
            <span className="material-symbols-outlined ml-3">settings</span>
            <span className="text-[14px]">הגדרות</span>
          </Link>
        </div>
      )}

      {/* User Profile + Logout */}
      <div className="mt-auto px-6 pt-6 border-t border-[#1a365d]">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden relative bg-[#1a365d] flex items-center justify-center">
            {user?.avatarUrl ? (
              <img className="w-full h-full object-cover" src={user.avatarUrl} alt="" />
            ) : (
              <span className="text-white text-[14px] font-bold">
                {user?.firstName?.[0] || "?"}{user?.lastName?.[0] || ""}
              </span>
            )}
            <div className="absolute bottom-0 left-0 w-3 h-3 bg-landlord-green rounded-full border-2 border-tenant-blue" />
          </div>
          <div className="mr-3">
            <p className="text-[14px] font-medium text-white">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-[12px] text-[#aec7f5] opacity-70">
              {getRoleLabel(role)}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center w-full text-[#aec7f5] opacity-80 hover:text-[#ba1a1a] transition-colors pb-4"
        >
          <span className="material-symbols-outlined ml-3">logout</span>
          <span className="text-[14px]">התנתקות</span>
        </button>
      </div>
    </aside>
  );
}
