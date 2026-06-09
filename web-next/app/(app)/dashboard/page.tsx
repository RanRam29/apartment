"use client";

import { useAuth } from "@/hooks/useAuth";

export default function DashboardPage() {
  const { user, switchRole } = useAuth();
  const role = user?.activeRole || user?.role || "tenant";

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="soft-shadow rounded-xl bg-white p-8 text-right">
        <h1 className="text-[28px] font-bold text-tenant-blue mb-2">
          שלום, {user?.firstName} {user?.lastName} 👋
        </h1>
        <p className="text-[16px] text-on-surface-variant mb-6">
          {role === "tenant" && "ברוכים הבאים לדשבורד השוכר"}
          {role === "landlord" && "ברוכים הבאים לדשבורד המשכיר"}
          {role === "admin" && "ברוכים הבאים לפאנל הניהול"}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[14px] text-on-surface-variant">
          <div className="bg-surface-container-low rounded-lg p-4 text-center">
            <p className="text-[24px] font-bold text-tenant-blue">0</p>
            <p>חוזים פעילים</p>
          </div>
          <div className="bg-surface-container-low rounded-lg p-4 text-center">
            <p className="text-[24px] font-bold text-landlord-green">0</p>
            <p>התאמות חדשות</p>
          </div>
          <div className="bg-surface-container-low rounded-lg p-4 text-center">
            <p className="text-[24px] font-bold text-[#006b5f]">0</p>
            <p>הודעות</p>
          </div>
          <div className="bg-surface-container-low rounded-lg p-4 text-center">
            <p className="text-[24px] font-bold text-[#6b4fa0]">{user?.trustScore || 0}</p>
            <p>Trust Score</p>
          </div>
        </div>
      </div>

      {/* Role Switch */}
      {role !== "admin" && (
        <div className="soft-shadow rounded-xl bg-white p-6 text-right">
          <h3 className="text-[18px] font-semibold text-tenant-blue mb-4">החלפת תפקיד</h3>
          <div className="flex gap-3">
            <button
              onClick={() => switchRole("tenant")}
              disabled={role === "tenant"}
              className={`h-[48px] px-6 rounded-full text-[14px] font-medium transition-all ${
                role === "tenant"
                  ? "bg-landlord-green text-white"
                  : "border border-outline-variant text-on-surface-variant hover:border-landlord-green"
              }`}
            >
              שוכר
            </button>
            <button
              onClick={() => switchRole("landlord")}
              disabled={role === "landlord"}
              className={`h-[48px] px-6 rounded-full text-[14px] font-medium transition-all ${
                role === "landlord"
                  ? "bg-landlord-green text-white"
                  : "border border-outline-variant text-on-surface-variant hover:border-landlord-green"
              }`}
            >
              משכיר
            </button>
          </div>
        </div>
      )}

      {/* Placeholder */}
      <p className="text-[14px] text-outline text-center">
        זהו דף זמני. הדשבורד המלא ייבנה מ-Stitch בהמשך.
      </p>
    </div>
  );
}
