"use client";

import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useState } from "react";
import { toast } from "sonner";

interface KycProfile {
  status: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
}

interface UserListItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: "tenant" | "landlord" | "admin";
  activeRole: "tenant" | "landlord" | "admin";
  trustScore: number;
  isPremium: boolean;
  isVerified: boolean;
  isLocked: boolean;
  blockedCount: number;
  createdAt: string;
  kycProfile: KycProfile | null;
}

interface UsersResponse {
  rows: UserListItem[];
  count: number;
}

export function AdminUsers() {
  const { token } = useAuth();
  const [page, setPage] = useState(1);
  const limit = 50;

  // Fetch users list
  const { data: usersData, error, isLoading, mutate } = useApi<UsersResponse>(
    `/api/v3/admin/users?page=${page}&limit=${limit}`
  );

  // Search/Filter states
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [kycFilter, setKycFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Edit User states
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "tenant" as "tenant" | "landlord" | "admin",
    activeRole: "tenant" as "tenant" | "landlord" | "admin",
    trustScore: 50,
    isPremium: false,
    isVerified: false,
    isLocked: false,
    blockedCount: 0,
  });

  // Loading states for actions
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const users = usersData?.rows ?? [];

  // Client-side filtering
  const filteredUsers = users.filter((u) => {
    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
    const email = u.email.toLowerCase();
    const phone = (u.phone ?? "").toLowerCase();
    const matchesSearch =
      fullName.includes(search.toLowerCase()) ||
      email.includes(search.toLowerCase()) ||
      phone.includes(search.toLowerCase());

    const matchesRole = roleFilter === "all" || u.role === roleFilter || u.activeRole === roleFilter;
    
    const kycStatus = u.kycProfile?.status ?? "NONE";
    const matchesKyc = kycFilter === "all" || kycStatus === kycFilter;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "locked" && u.isLocked) ||
      (statusFilter === "active" && !u.isLocked);

    return matchesSearch && matchesRole && matchesKyc && matchesStatus;
  });

  // Open Edit Modal
  const startEdit = (u: UserListItem) => {
    setEditingUser(u);
    setEditForm({
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone ?? "",
      role: u.role,
      activeRole: u.activeRole,
      trustScore: u.trustScore,
      isPremium: u.isPremium,
      isVerified: u.isVerified,
      isLocked: u.isLocked,
      blockedCount: u.blockedCount,
    });
  };

  // Submit User Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setActionLoadingId(editingUser.id);
      const updated = await api<UserListItem>(`/api/v3/admin/users/${editingUser.id}`, {
        method: "PUT",
        body: editForm,
        token: token || undefined,
      });
      toast.success(`משתמש ${updated.firstName} עודכן בהצלחה`);
      setEditingUser(null);
      mutate();
    } catch (err) {
      console.error(err);
      toast.error("עדכון פרטי המשתמש נכשל");
    } finally {
      setActionLoadingId(null);
    }
  };

  // KYC Override
  const handleKycOverride = async (userId: string, newStatus: string) => {
    try {
      setActionLoadingId(userId + "-kyc");
      await api(`/api/v3/admin/users/${userId}/kyc-override`, {
        method: "POST",
        body: { status: newStatus },
        token: token || undefined,
      });
      toast.success(`אימות KYC של המשתמש עודכן ל-${newStatus}`);
      mutate();
    } catch (err) {
      console.error(err);
      toast.error("עדכון אימות זהות נכשל");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Unlock User Account
  const handleUnlock = async (userId: string) => {
    try {
      setActionLoadingId(userId + "-unlock");
      await api(`/api/v3/admin/users/${userId}/unlock`, {
        method: "POST",
        token: token || undefined,
      });
      toast.success("נעילת החשבון שוחררה בהצלחה");
      mutate();
    } catch (err) {
      console.error(err);
      toast.error("שחרור נעילת החשבון נכשל");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Cascading Delete User
  const handleDeleteUser = async (userId: string, name: string) => {
    const confirmed = window.confirm(
      `אזהרה חמורה: האם אתה בטוח שברצונך למחוק את המשתמש "${name}"?\nמחיקה זו היא מדורגת (Cascading) ותגרור מחיקה מיידית של כל החוזים, הדירות, השורות בלדג'ר והתקלות השייכות לו!`
    );
    if (!confirmed) return;

    try {
      setActionLoadingId(userId + "-delete");
      await api(`/api/v3/admin/users/${userId}`, {
        method: "DELETE",
        token: token || undefined,
      });
      toast.success(`המשתמש ${name} וכל נתוניו נמחקו לצמיתות`);
      mutate();
    } catch (err) {
      console.error(err);
      toast.error("מחיקת המשתמש נכשלה");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <div className="w-12 h-12 border-4 border-landlord-green border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-on-surface-variant font-label text-body">טוען רשימת משתמשים...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Title */}
      <div>
        <h2 className="text-h1-web font-extrabold text-tenant-blue">ניהול משתמשי המערכת</h2>
        <p className="text-body text-on-surface-variant">
          סקירת משתמשים, שחרור נעילת חשבונות, מעקפי KYC, עריכת הרשאות ומחיקות מדורגות
        </p>
      </div>

      {/* Filter Bars */}
      <section className="bg-white rounded-2xl p-5 border border-outline-variant/30 soft-shadow flex flex-col md:flex-row gap-4 items-center">
        {/* Search */}
        <div className="w-full md:flex-1 relative">
          <input
            type="text"
            placeholder="חפש משתמש לפי שם, אימייל או נייד..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 bg-surface border border-outline-variant rounded-full text-caption text-tenant-blue placeholder:text-on-surface-variant focus:outline-none focus:border-landlord-green"
          />
          <span className="material-symbols-outlined absolute right-3.5 top-3 text-on-surface-variant text-[20px]">search</span>
        </div>

        {/* Filters */}
        <div className="w-full md:w-auto flex flex-wrap gap-3">
          {/* Role */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2.5 bg-surface border border-outline-variant rounded-full text-caption text-tenant-blue font-bold focus:outline-none"
          >
            <option value="all">כל התפקידים</option>
            <option value="tenant">שוכר</option>
            <option value="landlord">משכיר</option>
            <option value="admin">מנהל</option>
          </select>

          {/* KYC Status */}
          <select
            value={kycFilter}
            onChange={(e) => setKycFilter(e.target.value)}
            className="px-4 py-2.5 bg-surface border border-outline-variant rounded-full text-caption text-tenant-blue font-bold focus:outline-none"
          >
            <option value="all">כל סטטוס KYC</option>
            <option value="APPROVED">מאומת (APPROVED)</option>
            <option value="PENDING">ממתין (PENDING)</option>
            <option value="REJECTED">נדחה (REJECTED)</option>
            <option value="NONE">לא הוגש (NONE)</option>
          </select>

          {/* Lock Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-surface border border-outline-variant rounded-full text-caption text-tenant-blue font-bold focus:outline-none"
          >
            <option value="all">כל סטטוסי חשבון</option>
            <option value="active">פעיל</option>
            <option value="locked">נעול</option>
          </select>
        </div>
      </section>

      {/* Users Table */}
      <section className="bg-white rounded-2xl border border-outline-variant/30 soft-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant font-label text-caption border-b border-outline-variant/30">
                <th className="p-4 pr-6">משתמש</th>
                <th className="p-4">פרטי קשר</th>
                <th className="p-4 text-center">תפקיד נוכחי</th>
                <th className="p-4 text-center">מדד אמינות</th>
                <th className="p-4 text-center">אימות זהות (KYC)</th>
                <th className="p-4 text-center">סטטוס חשבון</th>
                <th className="p-4 text-left pl-6">פעולות ניהול</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 text-caption text-tenant-blue">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => {
                  const kycStatus = u.kycProfile?.status ?? "NONE";
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Name & Avatar */}
                      <td className="p-4 pr-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full border bg-surface-container flex items-center justify-center font-bold text-tenant-blue text-caption">
                            {u.firstName[0]}{u.lastName[0]}
                          </div>
                          <div>
                            <span className="font-bold block text-tenant-blue">{u.firstName} {u.lastName}</span>
                            <span className="text-[11px] text-on-surface-variant block">נוצר ב: {new Date(u.createdAt).toLocaleDateString("he-IL")}</span>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="p-4">
                        <span className="block font-medium">{u.email}</span>
                        <span className="block text-on-surface-variant font-mono">{u.phone || "אין מספר נייד"}</span>
                      </td>

                      {/* Role */}
                      <td className="p-4 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-full font-bold text-[11px] bg-blue-50 text-tenant-blue border border-blue-100">
                          {u.role === "admin" ? "מנהל" : u.role === "landlord" ? "משכיר" : "שוכר"}
                        </span>
                        {u.activeRole !== u.role && (
                          <span className="block text-[10px] text-on-surface-variant mt-1">
                            פעיל כ: {u.activeRole === "landlord" ? "משכיר" : "שוכר"}
                          </span>
                        )}
                      </td>

                      {/* Trust Score */}
                      <td className="p-4 text-center">
                        <span className="font-extrabold text-tenant-blue bg-slate-100 px-2 py-0.5 rounded">
                          {u.trustScore}
                        </span>
                      </td>

                      {/* KYC status */}
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] border ${
                          kycStatus === "APPROVED"
                            ? "bg-green-50 text-landlord-green border-green-200"
                            : kycStatus === "PENDING"
                            ? "bg-amber-50 text-[#e28743] border-amber-200"
                            : kycStatus === "REJECTED"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-gray-50 text-on-surface-variant border-outline-variant"
                        }`}>
                          {kycStatus === "APPROVED" && "מאומת"}
                          {kycStatus === "PENDING" && "ממתין"}
                          {kycStatus === "REJECTED" && "נדחה"}
                          {kycStatus === "NONE" && "לא הוגש"}
                        </span>
                      </td>

                      {/* Account status */}
                      <td className="p-4 text-center">
                        {u.isLocked ? (
                          <span className="inline-flex items-center gap-1 font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            <span className="material-symbols-outlined text-[14px]">lock</span>
                            <span>נעול ({u.blockedCount})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-medium text-landlord-green bg-green-50/50 px-2 py-0.5 rounded">
                            <span className="material-symbols-outlined text-[14px]">check</span>
                            <span>פעיל</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-left pl-6">
                        <div className="flex items-center justify-end gap-2">
                          {/* Unlock */}
                          {u.isLocked && (
                            <button
                              onClick={() => handleUnlock(u.id)}
                              disabled={actionLoadingId === u.id + "-unlock"}
                              className="px-2.5 py-1 border border-emerald-500 text-emerald-600 hover:bg-emerald-50 rounded text-caption font-bold transition-all disabled:opacity-50"
                            >
                              שחרר נעילה
                            </button>
                          )}

                          {/* KYC Quick overrides */}
                          {kycStatus !== "APPROVED" ? (
                            <button
                              onClick={() => handleKycOverride(u.id, "APPROVED")}
                              disabled={actionLoadingId === u.id + "-kyc"}
                              className="px-2.5 py-1 border border-landlord-green text-[#006b5f] hover:bg-green-50 rounded text-caption font-bold transition-all disabled:opacity-50"
                            >
                              אשר זהות
                            </button>
                          ) : (
                            <button
                              onClick={() => handleKycOverride(u.id, "NONE")}
                              disabled={actionLoadingId === u.id + "-kyc"}
                              className="px-2.5 py-1 border border-red-500 text-red-600 hover:bg-red-50 rounded text-caption font-bold transition-all disabled:opacity-50"
                            >
                              בטל אימות
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            onClick={() => startEdit(u)}
                            className="p-1.5 hover:bg-surface-container rounded-full text-tenant-blue transition-colors"
                            title="ערוך פרטי משתמש"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteUser(u.id, `${u.firstName} ${u.lastName}`)}
                            disabled={actionLoadingId === u.id + "-delete"}
                            className="p-1.5 hover:bg-red-50 rounded-full text-red-600 transition-colors disabled:opacity-50"
                            title="מחיקת משתמש קסקדה"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-on-surface-variant text-body">
                    לא נמצאו משתמשים התואמים את סינוני החיפוש
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full soft-shadow border border-outline-variant overflow-hidden flex flex-col">
            <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low">
              <h3 className="font-extrabold text-tenant-blue text-label">ערוך פרטי משתמש</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 hover:bg-surface-container rounded-full text-on-surface-variant"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] font-bold text-tenant-blue block mb-1">שם פרטי</label>
                  <input
                    type="text"
                    required
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-caption focus:outline-none focus:border-landlord-green"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-tenant-blue block mb-1">שם משפחה</label>
                  <input
                    type="text"
                    required
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-caption focus:outline-none focus:border-landlord-green"
                  />
                </div>
              </div>

              <div>
                <label className="text-[12px] font-bold text-tenant-blue block mb-1">דואר אלקטרוני</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-caption focus:outline-none focus:border-landlord-green"
                />
              </div>

              <div>
                <label className="text-[12px] font-bold text-tenant-blue block mb-1">מספר טלפון נייד</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-caption focus:outline-none focus:border-landlord-green"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] font-bold text-tenant-blue block mb-1">תפקיד בסיס</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
                    className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-caption focus:outline-none"
                  >
                    <option value="tenant">tenant (שוכר)</option>
                    <option value="landlord">landlord (משכיר)</option>
                    <option value="admin">admin (מנהל)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[12px] font-bold text-tenant-blue block mb-1">תפקיד פעיל</label>
                  <select
                    value={editForm.activeRole}
                    onChange={(e) => setEditForm({ ...editForm, activeRole: e.target.value as any })}
                    className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-caption focus:outline-none"
                  >
                    <option value="tenant">tenant</option>
                    <option value="landlord">landlord</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[12px] font-bold text-tenant-blue block mb-1">ציון אמינות (Trust Score: 0-100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editForm.trustScore}
                  onChange={(e) => setEditForm({ ...editForm, trustScore: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-caption focus:outline-none"
                />
              </div>

              <div className="space-y-2.5 pt-2 border-t border-outline-variant/30">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isPremium}
                    onChange={(e) => setEditForm({ ...editForm, isPremium: e.target.checked })}
                    className="rounded border-outline-variant text-landlord-green focus:ring-0 w-4 h-4"
                  />
                  <span className="text-caption text-tenant-blue font-bold">משתמש פרימיום (Premium Access)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isVerified}
                    onChange={(e) => setEditForm({ ...editForm, isVerified: e.target.checked })}
                    className="rounded border-outline-variant text-landlord-green focus:ring-0 w-4 h-4"
                  />
                  <span className="text-caption text-tenant-blue font-bold">חשבון מאומת (Verified Checkmark)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isLocked}
                    onChange={(e) => setEditForm({ ...editForm, isLocked: e.target.checked, blockedCount: e.target.checked ? Math.max(1, editForm.blockedCount) : 0 })}
                    className="rounded border-outline-variant text-landlord-green focus:ring-0 w-4 h-4"
                  />
                  <span className="text-caption text-tenant-blue font-bold">חשבון חסום/נעול (isLocked)</span>
                </label>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-5 py-2 border border-outline-variant text-tenant-blue rounded-full font-bold text-caption hover:bg-surface-container-low transition-all"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId !== null}
                  className="px-5 py-2 bg-tenant-blue text-white rounded-full font-bold text-caption hover:bg-tenant-blue/90 transition-all disabled:opacity-50"
                >
                  שמור שינויים
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
