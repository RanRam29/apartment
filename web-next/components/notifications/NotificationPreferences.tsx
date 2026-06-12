"use client";

import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { useState, useEffect } from "react";
import Link from "next/link";

export function NotificationPreferences() {
  const { user, token, login } = useAuth();

  // State of master toggles
  const [masterPush, setMasterPush] = useState(true);
  const [masterEmail, setMasterEmail] = useState(true);
  const [masterWhatsapp, setMasterWhatsapp] = useState(false);

  // Detail toggles
  const [prefs, setPrefs] = useState({
    paymentsPush: true,
    paymentsEmail: true,
    paymentsWhatsapp: false,

    contractsPush: true,
    contractsEmail: true,
    contractsWhatsapp: false,

    maintenancePush: true,
    maintenanceEmail: true,
    maintenanceWhatsapp: false,

    matchesPush: true,
    matchesEmail: true,
    matchesWhatsapp: false,

    chatPush: true,
    chatEmail: true,
    chatWhatsapp: false,

    systemPush: true,
    systemEmail: true,
    systemWhatsapp: false,
  });

  // WhatsApp opt-in
  const [phone, setPhone] = useState(user?.phone || "");
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [phoneMessage, setPhoneMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load preferences from user state on mount
  useEffect(() => {
    if (!user) return;
    const userAny = user as any;
    const np = userAny.notificationPreferences || {};
    
    setMasterPush(np.push ?? true);
    setMasterEmail(np.email ?? true);
    setMasterWhatsapp(user.whatsappOptIn ?? false);

    // Populate detail values (fallback to master values if unset)
    setPrefs({
      paymentsPush: np.paymentsPush ?? np.push ?? true,
      paymentsEmail: np.paymentsEmail ?? np.email ?? true,
      paymentsWhatsapp: np.paymentsWhatsapp ?? user.whatsappOptIn ?? false,

      contractsPush: np.contractsPush ?? np.push ?? true,
      contractsEmail: np.contractsEmail ?? np.email ?? true,
      contractsWhatsapp: np.contractsWhatsapp ?? user.whatsappOptIn ?? false,

      maintenancePush: np.maintenancePush ?? np.push ?? true,
      maintenanceEmail: np.maintenanceEmail ?? np.email ?? true,
      maintenanceWhatsapp: np.maintenanceWhatsapp ?? user.whatsappOptIn ?? false,

      matchesPush: np.matchesPush ?? np.push ?? true,
      matchesEmail: np.matchesEmail ?? np.email ?? true,
      matchesWhatsapp: np.matchesWhatsapp ?? user.whatsappOptIn ?? false,

      chatPush: np.chatPush ?? np.push ?? true,
      chatEmail: np.chatEmail ?? np.email ?? true,
      chatWhatsapp: np.chatWhatsapp ?? user.whatsappOptIn ?? false,

      systemPush: np.systemPush ?? np.push ?? true,
      systemEmail: np.systemEmail ?? np.email ?? true,
      systemWhatsapp: np.systemWhatsapp ?? user.whatsappOptIn ?? false,
    });
  }, [user]);

  // Handle master toggle change
  function handleMasterToggle(type: "push" | "email" | "whatsapp", value: boolean) {
    if (type === "push") {
      setMasterPush(value);
      setPrefs((prev) => ({
        ...prev,
        paymentsPush: value,
        contractsPush: value,
        maintenancePush: value,
        matchesPush: value,
        chatPush: value,
        systemPush: value,
      }));
    } else if (type === "email") {
      setMasterEmail(value);
      setPrefs((prev) => ({
        ...prev,
        paymentsEmail: value,
        contractsEmail: value,
        maintenanceEmail: value,
        matchesEmail: value,
        chatEmail: value,
        systemEmail: value,
      }));
    } else {
      setMasterWhatsapp(value);
      setPrefs((prev) => ({
        ...prev,
        paymentsWhatsapp: value,
        contractsWhatsapp: value,
        maintenanceWhatsapp: value,
        matchesWhatsapp: value,
        chatWhatsapp: value,
        systemWhatsapp: value,
      }));
    }
  }

  // Toggle detail checkbox
  function togglePref(key: keyof typeof prefs) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // Save changes
  async function handleSave() {
    if (!token) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const payload = {
        push: masterPush,
        email: masterEmail,
        whatsapp: masterWhatsapp,
        ...prefs,
      };

      const res = await api<{ notificationPreferences: any }>("/api/auth/notification-preferences", {
        method: "PUT",
        body: payload,
        token,
      });

      // Refetch user profile to refresh context
      const userRes = await api<{ user: User }>("/api/auth/me", { token });
      login(token, userRes.user);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save notification preferences:", err);
      alert("שגיאה בשמירת ההעדפות");
    } finally {
      setIsSaving(false);
    }
  }

  // Save phone number + enable WhatsApp opt-in
  async function handleEnableWhatsapp() {
    if (!token) return;
    setPhoneMessage(null);
    if (!phone.trim()) {
      setPhoneMessage({ type: "error", text: "נא להזין מספר טלפון" });
      return;
    }
    setIsSavingPhone(true);
    try {
      await api<{ user: User }>("/api/users/me", {
        method: "PUT",
        body: { phone: phone.trim(), whatsappOptIn: true },
        token,
      });
      setMasterWhatsapp(true);
      // Refresh user context so the new phone/opt-in survive navigation
      const userRes = await api<{ user: User }>("/api/auth/me", { token });
      login(token, userRes.user);
      setPhoneMessage({ type: "success", text: "עדכוני WhatsApp הופעלו בהצלחה!" });
    } catch (err: any) {
      console.error("WhatsApp opt-in failed:", err);
      setPhoneMessage({ type: "error", text: err?.message || "שגיאה בשמירת מספר הטלפון" });
    } finally {
      setIsSavingPhone(false);
    }
  }

  return (
    <div className="max-w-[1000px] mx-auto py-8 rtl text-right">
      
      {/* Header */}
      <div className="mb-8">
        <nav className="flex gap-2 text-caption text-outline mb-1 font-medium">
          <Link href="/dashboard" className="hover:text-tenant-blue">ראשי</Link>
          <span>/</span>
          <Link href="/notifications" className="hover:text-tenant-blue">מרכז התראות</Link>
          <span>/</span>
          <span className="text-tenant-blue font-bold">הגדרות התראות</span>
        </nav>
        <h2 className="text-h2-web font-bold text-tenant-blue mb-2">הגדרות התראות</h2>
        <p className="text-body text-on-surface-variant">
          נהלו את האופן והתזמון שבו תקבלו עדכונים חשובים על הנכסים והחוזים שלכם.
        </p>
      </div>

      {/* Save Success Alert */}
      {saveSuccess && (
        <div className="mb-6 p-4 bg-secondary-container text-on-secondary-container rounded-xl font-bold flex items-center gap-2">
          <span className="material-symbols-outlined">check_circle</span>
          העדפות ההתראה שלך נשמרו בהצלחה!
        </div>
      )}

      {/* Master Toggles Card */}
      <section className="bg-white rounded-xl p-6 soft-shadow mb-8 border border-outline-variant/30">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Push Master */}
          <div className="flex items-center justify-between p-4 bg-surface rounded-lg border border-outline-variant/30">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-tenant-blue">notifications_active</span>
              <div>
                <p className="text-label font-bold text-on-surface">התראות Push</p>
                <p className="text-[11px] text-on-surface-variant">למכשיר הנייד ולדפדפן</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={masterPush}
                onChange={(e) => handleMasterToggle("push", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full rtl:peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-landlord-green"></div>
            </label>
          </div>

          {/* Email Master */}
          <div className="flex items-center justify-between p-4 bg-surface rounded-lg border border-outline-variant/30">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-tenant-blue">mail</span>
              <div>
                <p className="text-label font-bold text-on-surface">אימייל</p>
                <p className="text-[11px] text-on-surface-variant">סיכומי פעילות וחשבוניות</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={masterEmail}
                onChange={(e) => handleMasterToggle("email", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full rtl:peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-landlord-green"></div>
            </label>
          </div>

          {/* WhatsApp Master */}
          <div className="flex items-center justify-between p-4 bg-surface rounded-lg border border-[#25D366]/30">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#25D366]">chat</span>
              <div>
                <p className="text-label font-bold text-on-surface">WhatsApp</p>
                <p className="text-[11px] text-on-surface-variant">עדכונים מהירים בזמן אמת</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={masterWhatsapp}
                onChange={(e) => handleMasterToggle("whatsapp", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full rtl:peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-landlord-green"></div>
            </label>
          </div>

        </div>
      </section>

      {/* Preference Matrix */}
      <section className="bg-white rounded-xl shadow-soft border border-outline-variant/30 overflow-hidden mb-8">
        <div className="p-6 border-b border-outline-variant/30">
          <h3 className="text-h3-web font-bold text-tenant-blue">פירוט העדפות</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead className="bg-surface-low">
              <tr>
                <th className="px-6 py-4 font-bold text-label text-on-surface-variant text-right">קטגוריה</th>
                <th className="px-6 py-4 font-bold text-label text-on-surface-variant text-center">Push</th>
                <th className="px-6 py-4 font-bold text-label text-on-surface-variant text-center">Email</th>
                <th className="px-6 py-4 font-bold text-label text-on-surface-variant text-center">WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              
              {/* Payments & Bills */}
              <tr className="hover:bg-surface/50 transition-colors">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-tenant-blue/60">payments</span>
                    <span className="text-body font-medium">תשלומים וחשבונות</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-center">
                  <input
                    type="checkbox"
                    checked={prefs.paymentsPush}
                    onChange={() => togglePref("paymentsPush")}
                    className="w-5 h-5 rounded border-outline-variant text-landlord-green focus:ring-landlord-green cursor-pointer"
                  />
                </td>
                <td className="px-6 py-5 text-center">
                  <input
                    type="checkbox"
                    checked={prefs.paymentsEmail}
                    onChange={() => togglePref("paymentsEmail")}
                    className="w-5 h-5 rounded border-outline-variant text-landlord-green focus:ring-landlord-green cursor-pointer"
                  />
                </td>
                <td className="px-6 py-5 text-center">
                  <input
                    type="checkbox"
                    checked={prefs.paymentsWhatsapp}
                    onChange={() => togglePref("paymentsWhatsapp")}
                    className="w-5 h-5 rounded border-outline-variant text-landlord-green focus:ring-landlord-green cursor-pointer"
                  />
                </td>
              </tr>

              {/* Contracts & Documents */}
              <tr className="hover:bg-surface/50 transition-colors">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-tenant-blue/60">description</span>
                    <span className="text-body font-medium">חוזים ומסמכים</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-center">
                  <input
                    type="checkbox"
                    checked={prefs.contractsPush}
                    onChange={() => togglePref("contractsPush")}
                    className="w-5 h-5 rounded border-outline-variant text-landlord-green focus:ring-landlord-green cursor-pointer"
                  />
                </td>
                <td className="px-6 py-5 text-center">
                  <input
                    type="checkbox"
                    checked={prefs.contractsEmail}
                    onChange={() => togglePref("contractsEmail")}
                    className="w-5 h-5 rounded border-outline-variant text-landlord-green focus:ring-landlord-green cursor-pointer"
                  />
                </td>
                <td className="px-6 py-5 text-center">
                  <input
                    type="checkbox"
                    checked={prefs.contractsWhatsapp}
                    onChange={() => togglePref("contractsWhatsapp")}
                    className="w-5 h-5 rounded border-outline-variant text-landlord-green focus:ring-landlord-green cursor-pointer"
                  />
                </td>
              </tr>

              {/* Maintenance */}
              <tr className="hover:bg-surface/50 transition-colors">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-tenant-blue/60">build</span>
                    <span className="text-body font-medium">קריאות תחזוקה ותקלות</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-center">
                  <input
                    type="checkbox"
                    checked={prefs.maintenancePush}
                    onChange={() => togglePref("maintenancePush")}
                    className="w-5 h-5 rounded border-outline-variant text-landlord-green focus:ring-landlord-green cursor-pointer"
                  />
                </td>
                <td className="px-6 py-5 text-center">
                  <input
                    type="checkbox"
                    checked={prefs.maintenanceEmail}
                    onChange={() => togglePref("maintenanceEmail")}
                    className="w-5 h-5 rounded border-outline-variant text-landlord-green focus:ring-landlord-green cursor-pointer"
                  />
                </td>
                <td className="px-6 py-5 text-center">
                  <input
                    type="checkbox"
                    checked={prefs.maintenanceWhatsapp}
                    onChange={() => togglePref("maintenanceWhatsapp")}
                    className="w-5 h-5 rounded border-outline-variant text-landlord-green focus:ring-landlord-green cursor-pointer"
                  />
                </td>
              </tr>

              {/* Tenant Matches */}
              <tr className="hover:bg-surface/50 transition-colors">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-tenant-blue/60">handshake</span>
                    <span className="text-body font-medium">התאמות דיירים חדשות</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-center">
                  <input
                    type="checkbox"
                    checked={prefs.matchesPush}
                    onChange={() => togglePref("matchesPush")}
                    className="w-5 h-5 rounded border-outline-variant text-landlord-green focus:ring-landlord-green cursor-pointer"
                  />
                </td>
                <td className="px-6 py-5 text-center">
                  <input
                    type="checkbox"
                    checked={prefs.matchesEmail}
                    onChange={() => togglePref("matchesEmail")}
                    className="w-5 h-5 rounded border-outline-variant text-landlord-green focus:ring-landlord-green cursor-pointer"
                  />
                </td>
                <td className="px-6 py-5 text-center">
                  <input
                    type="checkbox"
                    checked={prefs.matchesWhatsapp}
                    onChange={() => togglePref("matchesWhatsapp")}
                    className="w-5 h-5 rounded border-outline-variant text-landlord-green focus:ring-landlord-green cursor-pointer"
                  />
                </td>
              </tr>

              {/* Chat & Messages */}
              <tr className="hover:bg-surface/50 transition-colors">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-tenant-blue/60">forum</span>
                    <span className="text-body font-medium">צ&apos;אט והודעות</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-center">
                  <input
                    type="checkbox"
                    checked={prefs.chatPush}
                    onChange={() => togglePref("chatPush")}
                    className="w-5 h-5 rounded border-outline-variant text-landlord-green focus:ring-landlord-green cursor-pointer"
                  />
                </td>
                <td className="px-6 py-5 text-center">
                  <input
                    type="checkbox"
                    checked={prefs.chatEmail}
                    onChange={() => togglePref("chatEmail")}
                    className="w-5 h-5 rounded border-outline-variant text-landlord-green focus:ring-landlord-green cursor-pointer"
                  />
                </td>
                <td className="px-6 py-5 text-center">
                  <input
                    type="checkbox"
                    checked={prefs.chatWhatsapp}
                    onChange={() => togglePref("chatWhatsapp")}
                    className="w-5 h-5 rounded border-outline-variant text-landlord-green focus:ring-landlord-green cursor-pointer"
                  />
                </td>
              </tr>

              {/* System Settings */}
              <tr className="hover:bg-surface/50 transition-colors">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-tenant-blue/60">settings</span>
                    <span className="text-body font-medium">התראות מערכת</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-center">
                  <input
                    type="checkbox"
                    checked={prefs.systemPush}
                    onChange={() => togglePref("systemPush")}
                    className="w-5 h-5 rounded border-outline-variant text-landlord-green focus:ring-landlord-green cursor-pointer"
                  />
                </td>
                <td className="px-6 py-5 text-center">
                  <input
                    type="checkbox"
                    checked={prefs.systemEmail}
                    onChange={() => togglePref("systemEmail")}
                    className="w-5 h-5 rounded border-outline-variant text-landlord-green focus:ring-landlord-green cursor-pointer"
                  />
                </td>
                <td className="px-6 py-5 text-center">
                  <input
                    type="checkbox"
                    checked={prefs.systemWhatsapp}
                    onChange={() => togglePref("systemWhatsapp")}
                    className="w-5 h-5 rounded border-outline-variant text-landlord-green focus:ring-landlord-green cursor-pointer"
                  />
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </section>

      {/* WhatsApp Opt-in Card */}
      <section className="relative bg-gradient-to-l from-[#25D366]/10 to-white rounded-xl p-8 border border-[#25D366]/20 overflow-hidden shadow-sm">
        <div className="absolute -left-10 -top-10 opacity-5">
          <span className="material-symbols-outlined text-[200px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            chat
          </span>
        </div>
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center text-white shadow-lg">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
              </div>
              <h3 className="text-h3-web font-bold text-tenant-blue">הפעל עדכונים ב-WhatsApp</h3>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-body text-on-surface-variant font-medium">
                <span className="material-symbols-outlined text-[#25D366] text-[18px]">check_circle</span>
                קבלת מסמכים לחתימה ישירות לנייד
              </li>
              <li className="flex items-center gap-2 text-body text-on-surface-variant font-medium">
                <span className="material-symbols-outlined text-[#25D366] text-[18px]">check_circle</span>
                עדכונים על העברות בנקאיות בזמן אמת
              </li>
              <li className="flex items-center gap-2 text-body text-on-surface-variant font-medium">
                <span className="material-symbols-outlined text-[#25D366] text-[18px]">check_circle</span>
                תקשורת מהירה מול דיירים ללא צורך באפליקציה
              </li>
            </ul>
          </div>
          
          <div className="bg-white/80 backdrop-blur p-6 rounded-lg shadow-sm border border-white">
            <label className="block text-label font-bold text-on-surface mb-2">מספר טלפון לנייד</label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05X-XXXXXXX"
                className="flex-grow h-button-h bg-surface border border-outline-variant rounded-lg px-4 focus:ring-2 focus:ring-landlord-green outline-none text-left dir-ltr"
              />
              <button
                onClick={handleEnableWhatsapp}
                disabled={isSavingPhone}
                className="bg-[#25D366] hover:bg-[#1fb356] text-white px-6 rounded-full font-bold transition-all active:scale-95 shadow-md disabled:opacity-50"
              >
                {isSavingPhone ? "שומר..." : "הפעל עדכונים"}
              </button>
            </div>
            {phoneMessage && (
              <p className={`mt-3 text-[12px] font-bold ${phoneMessage.type === "success" ? "text-landlord-green" : "text-admin-red"}`}>
                {phoneMessage.text}
              </p>
            )}
            <p className="mt-3 text-[11px] text-on-surface-variant opacity-75">
              בלחיצה על &apos;הפעל עדכונים&apos; הנך מאשר/ת קבלת מסרים ב-WhatsApp מ-DirApp
            </p>
          </div>
        </div>
      </section>

      {/* Actions Footer */}
      <div className="mt-10 flex justify-end gap-4">
        <Link
          href="/notifications"
          className="px-8 h-button-h rounded-full border border-tenant-blue text-tenant-blue font-bold hover:bg-tenant-blue hover:text-white transition-all flex items-center justify-center text-label"
        >
          ביטול שינויים
        </Link>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-10 h-button-h rounded-full bg-landlord-green text-white font-bold shadow-lg hover:shadow-xl hover:-translate-y-[2px] transition-all active:scale-95 disabled:opacity-50"
        >
          {isSaving ? "שומר..." : "שמור העדפות"}
        </button>
      </div>

    </div>
  );
}
