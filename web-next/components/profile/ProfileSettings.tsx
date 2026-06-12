"use client";

import { useAuth } from "@/hooks/useAuth";
import { api, apiUpload } from "@/lib/api";
import type { User } from "@/lib/types";
import { useState, useEffect } from "react";

interface SearchPreferences {
  budget: { min: number; max: number };
  cities: string[];
  rooms: { min: number; max: number };
  requiredAmenities: string[];
  petsAllowed: boolean;
}

interface RoommateProfile {
  sleepSchedule: "early_bird" | "night_owl" | "flexible";
  cleanlinessLevel: number;
  noiseLevel: "quiet" | "moderate" | "lively";
  guestsFrequency: "never" | "rarely" | "sometimes" | "often";
  smokingAllowed: boolean;
  petsAllowed: boolean;
  workFromHome: boolean;
}

export function ProfileSettings() {
  const { user, token, login, switchRole } = useAuth();

  // Personal details state
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email] = useState(user?.email || ""); // read-only
  const [whatsappOptIn, setWhatsappOptIn] = useState(user?.whatsappOptIn || false);

  // Status and notification states
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Roles switch
  const activeRole = user?.activeRole || user?.role || "tenant";

  // Search Preferences states
  const [budgetMax, setBudgetMax] = useState(12000);
  const [roomsMin, setRoomsMin] = useState(1);
  const [cities, setCities] = useState<string[]>([]);
  const [newCity, setNewCity] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  // Roommate/Lifestyle questionnaire states
  const [cleanliness, setCleanliness] = useState(3);
  const [noise, setNoise] = useState<"quiet" | "moderate" | "lively">("moderate");
  const [guests, setGuests] = useState<"never" | "rarely" | "sometimes" | "often">("rarely");
  const [wfh, setWfh] = useState(false);
  const [smoking, setSmoking] = useState(false);
  const [pets, setPets] = useState(false);
  const [isSavingLifestyle, setIsSavingLifestyle] = useState(false);

  // Security & GDPR States
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [gdprMessage, setGdprMessage] = useState<string | null>(null);

  // Notification settings table states
  const [notifPrefs, setNotifPrefs] = useState({
    push: true,
    email: true,
    paymentReminders: true,
    maintenance: true,
    whatsapp: false,
  });

  // Load Preferences & Roommate Profile on mount
  useEffect(() => {
    if (!token) return;

    // Load search preferences
    api<{ preferences: SearchPreferences | null }>("/api/recommendations/preferences", { token })
      .then((res) => {
        if (res.preferences) {
          setBudgetMax(res.preferences.budget?.max || 12000);
          setRoomsMin(res.preferences.rooms?.min || 1);
          setCities(res.preferences.cities || []);
          setAmenities(res.preferences.requiredAmenities || []);
        }
      })
      .catch((err) => console.error("Failed to load search preferences:", err));

    // Load roommate profile (lifestyle)
    api<{ profile: RoommateProfile | null }>("/api/roommates/profile", { token })
      .then((res) => {
        if (res.profile) {
          setCleanliness(res.profile.cleanlinessLevel || 3);
          setNoise(res.profile.noiseLevel || "moderate");
          setGuests(res.profile.guestsFrequency || "rarely");
          setWfh(res.profile.workFromHome || false);
          setSmoking(res.profile.smokingAllowed || false);
          setPets(res.profile.petsAllowed || false);
        }
      })
      .catch((err) => console.error("Failed to load roommate profile:", err));

    // Set notification preferences
    const userAny = user as any;
    if (userAny?.notificationPreferences) {
      setNotifPrefs({
        push: userAny.notificationPreferences.push ?? true,
        email: userAny.notificationPreferences.email ?? true,
        paymentReminders: userAny.notificationPreferences.paymentReminders ?? true,
        maintenance: userAny.notificationPreferences.maintenance ?? true,
        whatsapp: userAny?.whatsappOptIn ?? false,
      });
    }
  }, [token, user]);

  // Handle Profile Update
  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    setIsSavingProfile(true);
    setProfileMessage(null);

    try {
      const res = await api<{ user: User }>("/api/auth/profile", {
        method: "PATCH",
        body: {
          firstName,
          lastName,
          phone,
          whatsappOptIn,
        },
        token,
      });

      login(token, res.user);
      setProfileMessage({ type: "success", text: "הפרופיל עודכן בהצלחה!" });
    } catch (err: any) {
      setProfileMessage({ type: "error", text: err?.message || "שגיאה בעדכון הפרופיל" });
    } finally {
      setIsSavingProfile(false);
    }
  }

  // Handle Avatar Upload
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setIsUploadingAvatar(true);
    setProfileMessage(null);

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await apiUpload<{ user: User; avatarUrl: string }>("/api/auth/avatar", formData, token);
      login(token, res.user);
      setProfileMessage({ type: "success", text: "תמונת הפרופיל עודכנה בהצלחה!" });
    } catch (err: any) {
      setProfileMessage({ type: "error", text: err?.message || "שגיאה בהעלאת התמונה" });
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  // Add search city tag
  function handleAddCity() {
    if (!newCity.trim()) return;
    if (cities.includes(newCity.trim())) {
      setNewCity("");
      return;
    }
    const updated = [...cities, newCity.trim()];
    setCities(updated);
    setNewCity("");
    saveSearchPrefs(updated, amenities, budgetMax, roomsMin);
  }

  // Remove search city tag
  function handleRemoveCity(cityToRemove: string) {
    const updated = cities.filter((c) => c !== cityToRemove);
    setCities(updated);
    saveSearchPrefs(updated, amenities, budgetMax, roomsMin);
  }

  // Toggle amenity selection
  function handleToggleAmenity(amenity: string) {
    const updated = amenities.includes(amenity)
      ? amenities.filter((a) => a !== amenity)
      : [...amenities, amenity];
    setAmenities(updated);
    saveSearchPrefs(cities, updated, budgetMax, roomsMin);
  }

  // Save Search Preferences helper
  async function saveSearchPrefs(updatedCities: string[], updatedAmenities: string[], maxBudget: number, minRooms: number) {
    if (!token) return;
    setIsSavingPrefs(true);
    try {
      await api("/api/recommendations/preferences", {
        method: "POST",
        body: {
          cities: updatedCities,
          requiredAmenities: updatedAmenities,
          budget: { min: 0, max: maxBudget },
          rooms: { min: minRooms, max: 10 },
        },
        token,
      });
    } catch (err) {
      console.error("Failed to save search preferences:", err);
    } finally {
      setIsSavingPrefs(false);
    }
  }

  // Save Lifestyle Questionnaire
  async function handleSaveLifestyle() {
    if (!token) return;
    setIsSavingLifestyle(true);
    try {
      await api("/api/roommates/profile", {
        method: "POST",
        body: {
          cleanlinessLevel: cleanliness,
          noiseLevel: noise,
          guestsFrequency: guests,
          workFromHome: wfh,
          smokingAllowed: smoking,
          petsAllowed: pets,
        },
        token,
      });
      alert("שאלון סגנון חיים נשמר בהצלחה!");
    } catch (err) {
      console.error("Failed to save roommate profile:", err);
      alert("שגיאה בשמירת השאלון");
    } finally {
      setIsSavingLifestyle(false);
    }
  }

  // Handle Password Change
  async function handleChangePassword() {
    if (!token) return;
    setPasswordMessage(null);
    if (!currentPassword) {
      setPasswordMessage({ type: "error", text: "יש להזין את הסיסמה הנוכחית" });
      return;
    }
    if (password.length < 8) {
      setPasswordMessage({ type: "error", text: "הסיסמה החדשה חייבת להכיל לפחות 8 תווים" });
      return;
    }
    setIsChangingPassword(true);
    try {
      await api("/api/auth/change-password", {
        method: "POST",
        body: { currentPassword, newPassword: password },
        token,
      });
      setPasswordMessage({ type: "success", text: "הסיסמה עודכנה בהצלחה!" });
      setCurrentPassword("");
      setPassword("");
    } catch (err: any) {
      console.error("Password change failed:", err);
      setPasswordMessage({ type: "error", text: err?.message || "שגיאה בעדכון הסיסמה" });
    } finally {
      setIsChangingPassword(false);
    }
  }

  // Handle GDPR Export
  async function handleGdprExport() {
    if (!token || !user) return;
    setGdprMessage("מכין ייצוא נתונים...");
    try {
      const res = await api<any>("/api/auth/export-data", {
        method: "POST",
        token,
      });
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `dirapp-data-${user.id}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setGdprMessage("הנתונים הורדו בהצלחה!");
    } catch (err) {
      console.error("GDPR export failed:", err);
      setGdprMessage("שגיאה בייצוא הנתונים.");
    }
  }

  // Handle GDPR Deletion Request
  async function handleRequestDeletion() {
    if (!token || deleteConfirmation !== "מחיקה") {
      alert("אנא הקלד 'מחיקה' כדי לאשר");
      return;
    }

    try {
      const res = await api<{ message: string }>("/api/auth/request-deletion", {
        method: "POST",
        token,
      });
      alert(res.message);
      setIsDeletingAccount(false);
    } catch (err: any) {
      alert(err?.message || "שגיאה בבקשת המחיקה");
    }
  }

  // Handle Notification Toggles
  async function handleToggleNotif(field: keyof typeof notifPrefs) {
    if (!token) return;
    const updated = { ...notifPrefs, [field]: !notifPrefs[field] };
    setNotifPrefs(updated);

    try {
      await api("/api/auth/notification-preferences", {
        method: "PUT",
        body: {
          push: updated.push,
          email: updated.email,
          paymentReminders: updated.paymentReminders,
          maintenance: updated.maintenance,
          whatsapp: updated.whatsapp,
        },
        token,
      });
    } catch (err) {
      console.error("Failed to save notification preferences:", err);
    }
  }

  // Circular progress calculation
  const score = user?.trustScore || 85;
  const strokeDashoffset = 364.4 * (1 - score / 100);

  return (
    <div className="max-w-6xl mx-auto py-8">
      <header className="mb-8 text-right">
        <h1 className="text-h1-web font-bold text-tenant-blue">פרופיל והגדרות</h1>
        <p className="text-body text-on-surface-variant">נהל את ההעדפות שלך ואת אבטחת החשבון</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-gutter rtl">
        {/* Right Column / Content (65%) */}
        <div className="lg:w-[65%] space-y-gutter">
          
          {/* Profile Card & Role Switcher */}
          <section className="bg-white p-8 rounded-xl soft-shadow flex flex-col md:flex-row items-center gap-8 relative overflow-hidden text-right">
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-surface-container overflow-hidden relative bg-surface-container flex items-center justify-center">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="תמונת פרופיל" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-tenant-blue text-[28px] font-bold">
                    {user?.firstName?.[0] || "?"}{user?.lastName?.[0] || ""}
                  </span>
                )}
                {isUploadingAvatar && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-tenant-blue text-white p-1.5 rounded-full shadow-lg border-2 border-white flex items-center justify-center cursor-pointer hover:bg-tenant-blue/90 transition-all">
                <span className="material-symbols-outlined text-[18px]">edit</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={isUploadingAvatar} />
              </label>
            </div>

            <div className="flex-grow space-y-2 text-center md:text-right">
              <h2 className="text-h2-web font-bold text-tenant-blue">
                {user?.firstName} {user?.lastName}
              </h2>
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <span className="flex items-center gap-1 text-body text-on-surface-variant">
                  <span className="material-symbols-outlined text-landlord-green text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                  {user?.email}
                </span>
                {user?.phone && (
                  <span className="flex items-center gap-1 text-body text-on-surface-variant">
                    <span className="material-symbols-outlined text-[20px]">call</span>
                    {user.phone}
                  </span>
                )}
              </div>
            </div>

            {/* Role switch toggle */}
            <div className="bg-surface-container-low p-1 rounded-full flex items-center w-fit">
              <button
                onClick={() => activeRole !== "tenant" && switchRole("tenant")}
                className={`px-6 py-2 rounded-full font-bold text-label transition-all ${
                  activeRole === "tenant"
                    ? "bg-white shadow-sm text-tenant-blue"
                    : "text-on-surface-variant hover:text-tenant-blue"
                }`}
              >
                שוכר
              </button>
              <button
                onClick={() => activeRole !== "landlord" && switchRole("landlord")}
                className={`px-6 py-2 rounded-full font-bold text-label transition-all ${
                  activeRole === "landlord"
                    ? "bg-white shadow-sm text-tenant-blue"
                    : "text-on-surface-variant hover:text-tenant-blue"
                }`}
              >
                משכיר
              </button>
            </div>
          </section>

          {/* User details edit form */}
          <section className="bg-white p-8 rounded-xl soft-shadow text-right">
            <h3 className="text-h3-web font-bold text-tenant-blue border-b border-outline-variant pb-4 mb-6">פרטים אישיים</h3>
            <form onSubmit={handleProfileSave} className="space-y-6">
              {profileMessage && (
                <div
                  className={`p-4 rounded-lg text-label ${
                    profileMessage.type === "success" ? "bg-secondary-container text-on-secondary-container" : "bg-error-container text-on-error-container"
                  }`}
                >
                  {profileMessage.text}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                <div className="flex flex-col gap-2">
                  <label className="text-label font-bold text-on-surface">שם פרטי</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-input-h border border-outline-variant rounded-lg px-4 bg-surface-container-low focus:border-landlord-green focus:ring-0 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-label font-bold text-on-surface">שם משפחה</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-input-h border border-outline-variant rounded-lg px-4 bg-surface-container-low focus:border-landlord-green focus:ring-0 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                <div className="flex flex-col gap-2">
                  <label className="text-label font-bold text-on-surface">טלפון</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05X-XXXXXXX"
                    className="h-input-h border border-outline-variant rounded-lg px-4 bg-surface-container-low focus:border-landlord-green focus:ring-0 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-label font-bold text-on-surface opacity-70">אימייל (לא ניתן לשינוי)</label>
                  <input
                    type="email"
                    disabled
                    value={email}
                    className="h-input-h border border-outline-variant rounded-lg px-4 bg-surface-container-low/50 text-on-surface-variant/70 cursor-not-allowed outline-none"
                  />
                </div>
              </div>

              {/* WhatsApp Opt-in */}
              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg border border-outline-variant/30">
                <div>
                  <div className="text-label font-bold text-tenant-blue">קבלת התראות ב-WhatsApp</div>
                  <div className="text-caption text-on-surface-variant">עדכונים על תשלומים, חוזים והצעות ישירות לטלפון הנייד</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={whatsappOptIn}
                    onChange={(e) => {
                      setWhatsappOptIn(e.target.checked);
                      setNotifPrefs((prev) => ({ ...prev, whatsapp: e.target.checked }));
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full rtl:peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-landlord-green"></div>
                </label>
              </div>

              <div className="text-left">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="bg-landlord-green hover:opacity-90 text-white font-bold px-8 h-button-h rounded-full transition-all soft-shadow active:scale-[0.98] disabled:opacity-60"
                >
                  {isSavingProfile ? "שומר..." : "שמור שינויים"}
                </button>
              </div>
            </form>
          </section>

          {/* Search Preferences (Tenant only) */}
          {activeRole === "tenant" && (
            <section className="bg-white p-8 rounded-xl soft-shadow text-right space-y-8">
              <h3 className="text-h3-web font-bold text-tenant-blue border-b border-outline-variant pb-4">העדפות חיפוש</h3>
              <div className="space-y-6">
                
                {/* Budget Range */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-label font-bold text-on-surface">תקציב מקסימלי (₪)</label>
                    <span className="text-landlord-green font-bold">₪{budgetMax.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="25000"
                    step="500"
                    value={budgetMax}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setBudgetMax(val);
                      saveSearchPrefs(cities, amenities, val, roomsMin);
                    }}
                    className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer accent-landlord-green"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
                  {/* Min Rooms */}
                  <div className="flex flex-col gap-2">
                    <label className="text-label font-bold text-on-surface">מספר חדרים מינימלי</label>
                    <select
                      value={roomsMin}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setRoomsMin(val);
                        saveSearchPrefs(cities, amenities, budgetMax, val);
                      }}
                      className="h-input-h border border-outline-variant rounded-lg text-body px-4 bg-surface-container-low focus:border-landlord-green outline-none"
                    >
                      <option value="1">1 חדר</option>
                      <option value="2">2 חדרים</option>
                      <option value="3">3 חדרים</option>
                      <option value="4">4 חדרים</option>
                      <option value="5">5+ חדרים</option>
                    </select>
                  </div>

                  {/* Cities Tags */}
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-label font-bold text-on-surface">אזורי עניין (ערים)</label>
                    <div className="flex flex-wrap gap-2 items-center min-h-[48px] border border-outline-variant rounded-lg p-2 bg-surface-container-low">
                      {cities.map((city) => (
                        <span
                          key={city}
                          className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-caption flex items-center gap-1"
                        >
                          {city}
                          <span
                            onClick={() => handleRemoveCity(city)}
                            className="material-symbols-outlined text-[14px] cursor-pointer hover:text-tenant-blue"
                          >
                            close
                          </span>
                        </span>
                      ))}
                      <div className="flex gap-2 items-center flex-grow">
                        <input
                          type="text"
                          value={newCity}
                          onChange={(e) => setNewCity(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddCity()}
                          placeholder="+ הוסף עיר..."
                          className="bg-transparent border-none outline-none text-body min-w-[100px] flex-grow text-right"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Required Amenities */}
                <div className="space-y-4">
                  <label className="text-label font-bold text-on-surface">חובה בדירה:</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { key: "balcony", label: "מרפסת" },
                      { key: "parking", label: "חניה" },
                      { key: "elevator", label: "מעלית" },
                      { key: "furnished", label: "ריהוט" },
                      { key: "ac", label: "מיזוג אוויר" },
                      { key: "storage", label: "מחסן" },
                      { key: "pets_allowed", label: "בעלי חיים" },
                      { key: "sun_boiler", label: "דוד שמש" },
                    ].map((item) => (
                      <label key={item.key} className="flex items-center gap-2 text-body text-on-surface-variant cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={amenities.includes(item.key)}
                          onChange={() => handleToggleAmenity(item.key)}
                          className="w-5 h-5 rounded border-outline-variant text-landlord-green focus:ring-landlord-green cursor-pointer"
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </div>

              </div>
            </section>
          )}

          {/* Lifestyle Questionnaire (Tenant only) */}
          {activeRole === "tenant" && (
            <section className="bg-white p-8 rounded-xl soft-shadow text-right space-y-8">
              <div className="flex items-center justify-between border-b border-outline-variant pb-4">
                <h3 className="text-h3-web font-bold text-tenant-blue">שאלון סגנון חיים</h3>
                <span className="text-on-surface-variant text-caption italic">עוזר לנו למצוא לך התאמות מדויקות</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                {/* Cleanliness */}
                <div className="space-y-3">
                  <div className="flex justify-between text-label font-bold">
                    <span>פחות קריטי לי סדר</span>
                    <span className="text-landlord-green">ניקיון וסדר מופתי ({cleanliness}/5)</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={cleanliness}
                    onChange={(e) => setCleanliness(parseInt(e.target.value))}
                    className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer accent-landlord-green"
                  />
                </div>

                {/* Noise */}
                <div className="space-y-3">
                  <div className="flex justify-between text-label font-bold">
                    <span>שקט מוחלט</span>
                    <span className="text-landlord-green">
                      {noise === "quiet" ? "שקט מאוד" : noise === "moderate" ? "רעש סביר" : "אורבני ותוסס"}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    value={noise === "quiet" ? 1 : noise === "moderate" ? 2 : 3}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      setNoise(v === 1 ? "quiet" : v === 2 ? "moderate" : "lively");
                    }}
                    className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer accent-landlord-green"
                  />
                </div>

                {/* Guests */}
                <div className="space-y-3">
                  <div className="flex justify-between text-label font-bold">
                    <span>מארח לעיתים רחוקות</span>
                    <span className="text-landlord-green">
                      {guests === "never" ? "ללא אורחים" : guests === "rarely" ? "לעיתים רחוקות" : guests === "sometimes" ? "מדי פעם" : "בית פתוח תמיד"}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    value={guests === "never" ? 1 : guests === "rarely" ? 2 : guests === "sometimes" ? 3 : 4}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      setGuests(v === 1 ? "never" : v === 2 ? "rarely" : v === 3 ? "sometimes" : "often");
                    }}
                    className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer accent-landlord-green"
                  />
                </div>

                {/* WFH */}
                <div className="space-y-3 flex items-center justify-between pt-4">
                  <div>
                    <span className="text-label font-bold text-tenant-blue block">עובד מהבית (WFH)</span>
                    <span className="text-caption text-on-surface-variant">זקוק לפינת עבודה שקטה בדירה</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={wfh} onChange={(e) => setWfh(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full rtl:peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-landlord-green"></div>
                  </label>
                </div>

                {/* Pets */}
                <div className="space-y-3 flex items-center justify-between pt-4">
                  <div>
                    <span className="text-label font-bold text-tenant-blue block">גידול בעלי חיים</span>
                    <span className="text-caption text-on-surface-variant">מתכוון להביא חיית מחמד לדירה</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={pets} onChange={(e) => setPets(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full rtl:peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-landlord-green"></div>
                  </label>
                </div>

                {/* Smoking */}
                <div className="space-y-3 flex items-center justify-between pt-4">
                  <div>
                    <span className="text-label font-bold text-tenant-blue block">מעשן</span>
                    <span className="text-caption text-on-surface-variant">נוהג לעשן במרפסת/בתוך הדירה</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={smoking} onChange={(e) => setSmoking(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full rtl:peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-landlord-green"></div>
                  </label>
                </div>
              </div>

              <div className="text-left border-t border-outline-variant pt-6">
                <button
                  type="button"
                  onClick={handleSaveLifestyle}
                  disabled={isSavingLifestyle}
                  className="bg-landlord-green hover:opacity-90 text-white font-bold px-8 h-button-h rounded-full transition-all soft-shadow active:scale-[0.98]"
                >
                  {isSavingLifestyle ? "שומר..." : "שמור שאלון"}
                </button>
              </div>
            </section>
          )}

          {/* Privacy, Security & GDPR */}
          <section className="bg-white p-8 rounded-xl soft-shadow text-right space-y-8">
            <h3 className="text-h3-web font-bold text-tenant-blue border-b border-outline-variant pb-4">פרטיות ואבטחה</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Password Change */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-label font-bold text-on-surface">שינוי סיסמה</label>
                  <input
                    type="password"
                    placeholder="סיסמה נוכחית"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full h-input-h border border-outline-variant rounded-lg px-4 bg-surface-container-low outline-none"
                  />
                  <input
                    type="password"
                    placeholder="סיסמה חדשה (לפחות 8 תווים)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-input-h border border-outline-variant rounded-lg px-4 bg-surface-container-low outline-none"
                  />
                  {password.length > 0 && (
                    <div className="w-full h-1 bg-surface-container rounded-full mt-2 overflow-hidden">
                      <div className={`h-full ${password.length >= 8 ? "bg-landlord-green w-full" : "bg-admin-red w-1/3"}`} />
                    </div>
                  )}
                  {password.length > 0 && (
                    <span className={`text-caption font-bold ${password.length >= 8 ? "text-landlord-green" : "text-admin-red"}`}>
                      {password.length >= 8 ? "סיסמה תקינה" : "סיסמה קצרה מדי (מינימום 8 תווים)"}
                    </span>
                  )}
                  {passwordMessage && (
                    <p className={`text-caption font-bold ${passwordMessage.type === "success" ? "text-landlord-green" : "text-admin-red"}`}>
                      {passwordMessage.text}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={isChangingPassword}
                    className="bg-tenant-blue hover:opacity-90 text-white font-bold px-6 h-button-h rounded-full transition-all soft-shadow active:scale-[0.98] disabled:opacity-50"
                  >
                    {isChangingPassword ? "מעדכן..." : "עדכן סיסמה"}
                  </button>
                </div>

                {/* 2FA — not yet supported by the backend; disabled until implemented */}
                <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg border border-outline-variant/30 opacity-60">
                  <div>
                    <div className="text-label font-bold text-tenant-blue">אימות דו-שלבי (2FA)</div>
                    <div className="text-caption text-on-surface-variant">יהיה זמין בקרוב</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-not-allowed">
                    <input type="checkbox" checked={false} disabled className="sr-only peer" />
                    <div className="w-11 h-6 bg-surface-variant rounded-full peer after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5"></div>
                  </label>
                </div>
              </div>

              {/* GDPR actions */}
              <div className="flex flex-col justify-between space-y-6">
                <div className="p-4 border border-outline-variant rounded-lg space-y-3">
                  <div className="text-label font-bold text-tenant-blue">ניהול מידע אישי (GDPR)</div>
                  <p className="text-caption text-on-surface-variant">
                    באפשרותך לייצא את כל המידע האישי שלך שנאסף במערכת DirApp, כולל חוזים, תשלומים ותכתובות צ'אט.
                  </p>
                  
                  {gdprMessage && <p className="text-[12px] font-bold text-landlord-green">{gdprMessage}</p>}

                  <button
                    onClick={handleGdprExport}
                    className="text-landlord-green font-bold text-label flex items-center gap-1 hover:underline outline-none"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    ייצוא נתונים אישיים (JSON)
                  </button>
                </div>

                {/* Account Deletion */}
                <div className="p-4 border border-admin-red/35 rounded-lg space-y-4">
                  <div className="text-label font-bold text-admin-red">אזור מחיקת חשבון</div>
                  <p className="text-caption text-on-surface-variant">
                    פעולה זו אינה הפיכה ותמחק את כל המידע, החוזים והצ'אטים מהמערכת תוך 30 ימי חסד.
                  </p>

                  {isDeletingAccount ? (
                    <div className="space-y-3">
                      <p className="text-caption text-admin-red">הקלד 'מחיקה' בתיבה מתחת לאישור:</p>
                      <input
                        type="text"
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        placeholder="הקלד מחיקה..."
                        className="w-full h-10 border border-admin-red rounded px-3 text-right bg-surface-container-lowest outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleRequestDeletion}
                          className="bg-admin-red hover:bg-admin-red/90 text-white font-bold text-caption px-4 h-9 rounded-full"
                        >
                          מחק חשבון
                        </button>
                        <button
                          onClick={() => {
                            setIsDeletingAccount(false);
                            setDeleteConfirmation("");
                          }}
                          className="border border-outline text-outline font-bold text-caption px-4 h-9 rounded-full"
                        >
                          ביטול
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsDeletingAccount(true)}
                      className="border-2 border-admin-red text-admin-red px-6 h-button-h rounded-full font-bold text-label hover:bg-admin-red hover:text-white transition-all outline-none"
                    >
                      מחק את החשבון שלי
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Left Column / Sidebar widgets (35%) */}
        <div className="lg:w-[35%] space-y-gutter">
          
          {/* KYC status card */}
          <section className="bg-tenant-blue text-white p-6 rounded-xl soft-shadow text-right">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h4 className="text-h4 font-bold mb-1">סטטוס אימות (KYC)</h4>
                <p className="text-caption text-white/70">
                  {user?.kycStatus === "APPROVED" ? "זהותך אומתה בהצלחה" : "נדרש אימות זהות לביצוע פעולות"}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full font-bold text-caption flex items-center gap-1 ${
                user?.kycStatus === "APPROVED" ? "bg-landlord-green text-tenant-blue" : "bg-[#ffdcdb] text-[#93000a]"
              }`}>
                <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {user?.kycStatus === "APPROVED" ? "verified" : "warning"}
                </span>
                {user?.kycStatus === "APPROVED" ? "מאומת" : "לא מאומת"}
              </span>
            </div>

            <div className="flex items-center gap-4 border-t border-white/10 pt-4">
              <div className="flex-grow">
                <div className="text-caption text-white/50">תוקף עד:</div>
                <div className="text-body font-medium">14 באפריל, 2027</div>
              </div>
              {user?.kycStatus !== "APPROVED" && (
                <a href="/kyc" className="text-landlord-green font-bold text-label flex items-center gap-1 hover:underline">
                  בצע אימות זהות
                  <span className="material-symbols-outlined text-[16px]">arrow_back_ios</span>
                </a>
              )}
            </div>
          </section>

          {/* Trust Score circular card */}
          <section className="bg-white p-8 rounded-xl soft-shadow space-y-6 text-center">
            <h4 className="text-h4 font-bold text-tenant-blue mb-6">מדד אמינות DirApp</h4>
            
            {/* Circular Progress Ring */}
            <div className="relative w-32 h-32 mx-auto mb-6">
              <svg className="w-full h-full transform -rotate-90">
                <circle className="text-surface-container-low" cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" strokeWidth="12" />
                <circle
                  className="text-landlord-green transition-all duration-1000 ease-out"
                  cx="64"
                  cy="64"
                  fill="transparent"
                  r="58"
                  stroke="currentColor"
                  strokeDasharray="364.4"
                  strokeDashoffset={strokeDashoffset}
                  strokeWidth="12"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[32px] font-bold text-tenant-blue">{score}</span>
                <span className="text-caption font-bold text-on-surface-variant">מתוך 100</span>
              </div>
            </div>
            
            <p className="text-body text-landlord-green font-bold">
              {score >= 90 ? "דירוג מצוין!" : score >= 80 ? "דירוג מעולה!" : score >= 70 ? "דירוג טוב" : "נדרש שיפור"}
            </p>

            {/* Breakdown Sub-scores */}
            <div className="space-y-4 text-right">
              <div className="space-y-1">
                <div className="flex justify-between text-caption">
                  <span className="text-on-surface-variant">היסטוריית תשלומים</span>
                  <span className="text-tenant-blue font-bold">98%</span>
                </div>
                <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
                  <div className="w-[98%] h-full bg-landlord-green" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-caption">
                  <span className="text-on-surface-variant">תגובתיות להודעות</span>
                  <span className="text-tenant-blue font-bold">82%</span>
                </div>
                <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
                  <div className="w-[82%] h-full bg-landlord-green" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-caption">
                  <span className="text-on-surface-variant">דירוג ממשתמשים</span>
                  <span className="text-tenant-blue font-bold">85%</span>
                </div>
                <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
                  <div className="w-[85%] h-full bg-landlord-green" />
                </div>
              </div>
            </div>
          </section>

          {/* Notification preferences table widget */}
          <section className="bg-white p-8 rounded-xl soft-shadow space-y-6 text-right">
            <h4 className="text-h4 font-bold text-tenant-blue">התראות מותאמות</h4>
            
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant">
                    <th className="py-3 font-bold text-label text-on-surface-variant text-right">נושא</th>
                    <th className="py-3 text-center">
                      <span className="material-symbols-outlined text-[20px] text-tenant-blue cursor-help" title="Push notifications">
                        smartphone
                      </span>
                    </th>
                    <th className="py-3 text-center">
                      <span className="material-symbols-outlined text-[20px] text-tenant-blue cursor-help" title="Email alerts">
                        mail
                      </span>
                    </th>
                    <th className="py-3 text-center">
                      <span className="text-[12px] font-bold text-tenant-blue block">WA</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  <tr>
                    <td className="py-4 text-body text-tenant-blue font-medium">תשלומים</td>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={notifPrefs.push}
                        onChange={() => handleToggleNotif("push")}
                        className="w-4 h-4 rounded border-outline-variant text-landlord-green"
                      />
                    </td>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={notifPrefs.email}
                        onChange={() => handleToggleNotif("email")}
                        className="w-4 h-4 rounded border-outline-variant text-landlord-green"
                      />
                    </td>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={notifPrefs.whatsapp}
                        onChange={() => handleToggleNotif("whatsapp")}
                        className="w-4 h-4 rounded border-outline-variant text-landlord-green"
                      />
                    </td>
                  </tr>

                  <tr>
                    <td className="py-4 text-body text-tenant-blue font-medium">תחזוקה</td>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={notifPrefs.push}
                        onChange={() => handleToggleNotif("push")}
                        className="w-4 h-4 rounded border-outline-variant text-landlord-green"
                      />
                    </td>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={notifPrefs.email}
                        onChange={() => handleToggleNotif("email")}
                        className="w-4 h-4 rounded border-outline-variant text-landlord-green"
                      />
                    </td>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={notifPrefs.whatsapp}
                        onChange={() => handleToggleNotif("whatsapp")}
                        className="w-4 h-4 rounded border-outline-variant text-landlord-green"
                      />
                    </td>
                  </tr>

                  <tr>
                    <td className="py-4 text-body text-tenant-blue font-medium">הודעות חדשות</td>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={notifPrefs.push}
                        onChange={() => handleToggleNotif("push")}
                        className="w-4 h-4 rounded border-outline-variant text-landlord-green"
                      />
                    </td>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={notifPrefs.email}
                        onChange={() => handleToggleNotif("email")}
                        className="w-4 h-4 rounded border-outline-variant text-landlord-green"
                      />
                    </td>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={notifPrefs.whatsapp}
                        onChange={() => handleToggleNotif("whatsapp")}
                        className="w-4 h-4 rounded border-outline-variant text-landlord-green"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
