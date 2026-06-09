"use client";

import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import type { Apartment, User } from "@/lib/types";
import Link from "next/link";
import { useState, useEffect } from "react";

interface SearchPreferences {
  budget?: { min: number; max: number };
  cities?: string[];
  rooms?: { min: number; max: number };
  requiredAmenities?: string[];
  petsAllowed?: boolean;
}

export function ApartmentDetail({ apartmentId }: { apartmentId: string }) {
  const { user, token } = useAuth();

  // 1. Fetch apartment details
  const { data: detailData, isLoading, error } = useApi<{ apartment: Apartment }>(
    `/api/apartments/${apartmentId}`
  );

  // 2. Fetch tenant preferences to compute compatibility details
  const [tenantPrefs, setTenantPrefs] = useState<SearchPreferences | null>(null);
  useEffect(() => {
    if (!token || user?.activeRole !== "tenant") return;
    api<{ preferences: SearchPreferences | null }>("/api/recommendations/preferences", { token })
      .then((res) => {
        if (res.preferences) setTenantPrefs(res.preferences);
      })
      .catch((err) => console.error("Failed to load tenant preferences:", err));
  }, [token, user]);

  // Swipe interest states
  const [interestSent, setInterestSent] = useState(false);
  const [isSendingInterest, setIsSendingInterest] = useState(false);
  const [matchResult, setMatchResult] = useState<{ id: string; status: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-landlord-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-on-surface-variant text-body">טוען פרטי דירה...</p>
        </div>
      </div>
    );
  }

  if (error || !detailData?.apartment) {
    return (
      <div className="text-center py-12 bg-white rounded-xl soft-shadow max-w-xl mx-auto mt-12 text-right p-8">
        <span className="material-symbols-outlined text-[48px] text-admin-red mb-2 block">warning</span>
        <h2 className="text-h2-web font-bold text-tenant-blue mb-2">דירה לא נמצאה</h2>
        <p className="text-on-surface-variant mb-6">לא הצלחנו לטעון את פרטי הדירה המבוקשת. ייתכן שהמודעה הוסרה או שאינה פעילה.</p>
        <Link href="/dashboard" className="inline-block bg-tenant-blue text-white px-6 py-2 rounded-full font-bold">
          חזרה לדשבורד
        </Link>
      </div>
    );
  }

  const apartment = detailData.apartment;
  const landlord = apartment.landlord;
  const cost = (apartment as any).costBreakdown || {
    rent: apartment.price,
    arnonaEstimate: Math.round(apartment.price * 0.05),
    buildingFeeEstimate: 250,
    total: apartment.price + Math.round(apartment.price * 0.05) + 250,
  };

  // Mock layout images fallback if database has no images
  const defaultImages = [
    "https://lh3.googleusercontent.com/aida/AP1WRLs9QOb8exgVD7w6SpxfZeYj_WIo-qDJ-IE39RwkEedD9ouBkN0C3wshW1SHr2nKt-wkzgDloUPIitBIcIyX6FVx5GZN8VXrg5i9uuMuB6cEcBJSNI0AsUs75df21IiX7XGT3G26Ep3XdLt3pE7rWzQQwi2y6NmOW9KmAcaPB3pjgoDK9dLdoytIa_-Yt8gsE6CTnA4DuYACBfprJbV23O9y37_sxQWkk2ELx6Jpy_egHOk8raIaNCZLRw",
    "https://lh3.googleusercontent.com/aida/AP1WRLHteSKZb5IAyW9_tLsg0NV1Iydc17j-UqZzWPKf5NKSuTxKGf1eNdjwTrtrR3Y6as3_rWy51SpRIamHy4pnx8ildqhv9pj4AXHno7Ac1t4imcZOJOn69lUIB0h4DHsEWmpWht209FTB_NKlGhlRY6aQUbOMELAGvPtn5q2mqu4zgCVuDU2yIEGCMugxE3RZDSIhMJngRtc0EKzmeJHFBfQ4LOrWbwjIKF-xwr1DX974ZfHKkWwSU-4_A",
    "https://lh3.googleusercontent.com/aida/AP1WRLvPhEXdN-iEGdYOGrW9y2LzB8Rq_ei8tm8pGNpiUQixhr2bhLz1xSuW9yUUe6WGrUu5gxx7mnbelwEb3_i4UAA63S0LIUKK9OsrXdcQpcb1stPO_P-dmk62Sd-f7vI5GkwDNwavFXf_YSZDBhv7Ofef_IB7tM6DO2OL2XWPSOxVUSjvQnsEXsGGuIYp-UxxfY4DcceTbdpbay64o1GS6t_txkkvAgvUMmysNY_NcswuFS9Yn0yPvHWO6w",
    "https://lh3.googleusercontent.com/aida/AP1WRLt7kdWVmymiKX0TE-juyXchfCEt3uPVWorFgmeN0onuizxlBeUtZvpT6z9IHvxLl0Pzj4QeqcMzOiPKUg1CEqrZ5HKoAQ7eUyiFZinZs5sdjMSYP73MO51YpSzxF9Qnii6fRB0OToXBfOP1Da5ryk1EWRqNRFlAmbiLbMZ1xyEKQ77ZaEshR_yPptPlOVfMyOGoF3X0-JfBS-QawerUDQyTS6pTKixXVHxI5CmnBNlXxuu-u8uWSZNRbg",
  ];

  const images: string[] = (apartment.images && apartment.images.length > 0) ? apartment.images : defaultImages;

  // Calculate compatibility client-side for presentation
  const budgetMatch = tenantPrefs?.budget ? apartment.price <= tenantPrefs.budget.max : true;
  const roomMatch = tenantPrefs?.rooms ? apartment.rooms >= tenantPrefs.rooms.min : true;
  const amenitiesMatchCount = tenantPrefs?.requiredAmenities
    ? tenantPrefs.requiredAmenities.filter((a) => apartment.amenities?.includes(a)).length
    : 0;
  const totalRequiredAmenities = tenantPrefs?.requiredAmenities?.length || 0;

  // Final compatibility percentage
  let compatibilityScore = 80; // default baseline
  if (user?.activeRole === "tenant" && tenantPrefs) {
    let matchesCount = 0;
    let totalCriteria = 2;
    if (budgetMatch) matchesCount++;
    if (roomMatch) matchesCount++;
    if (totalRequiredAmenities > 0) {
      matchesCount += (amenitiesMatchCount / totalRequiredAmenities);
      totalCriteria++;
    }
    compatibilityScore = Math.round((matchesCount / totalCriteria) * 100);
  }

  // Handle Swipe interest button
  async function handleExpressInterest() {
    if (!token) return;
    setIsSendingInterest(true);
    setErrorMessage(null);
    try {
      const res = await api<{ swipe: any; match: { id: string; status: string } | null }>("/api/swipe", {
        method: "POST",
        body: {
          apartmentId,
          direction: "like",
          seenDurationMs: 5000,
        },
        token,
      });
      setInterestSent(true);
      if (res.match) {
        setMatchResult(res.match);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "שגיאה בחיבור לשרת");
    } finally {
      setIsSendingInterest(false);
    }
  }

  // Map Hebrew labels for amenities
  const amenityLabels: Record<string, string> = {
    parking: "חניה פרטית",
    balcony: "מרפסת שמש",
    elevator: "מעלית",
    ac: "מיזוג אוויר",
    storage: "מחסן",
    pets_allowed: "חיות מחמד",
    furnished: "מרוהטת",
    sun_boiler: "דוד שמש",
  };

  return (
    <div className="max-w-[1200px] mx-auto py-8 rtl text-right">
      
      {/* Breadcrumb info */}
      <nav className="flex items-center gap-2 text-on-surface-variant text-label mb-6">
        <Link href="/dashboard" className="hover:text-tenant-blue transition-colors">
          דף הבית
        </Link>
        <span className="material-symbols-outlined text-[16px]">chevron_left</span>
        <span className="text-primary font-bold">
          דירת {apartment.rooms} חדרים, {apartment.city}
        </span>
      </nav>

      {/* Gallery Grid */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 h-[300px] md:h-[500px]">
        {/* Main gallery image */}
        <div className="md:col-span-3 h-full rounded-xl overflow-hidden shadow-soft relative group">
          <img src={images[0]} alt="סלון דירה" className="w-full h-full object-cover" />
          <button className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-lg font-bold text-tenant-blue flex items-center gap-2 shadow-lg hover:bg-white transition-all">
            <span className="material-symbols-outlined text-[20px]">grid_view</span>
            צפה בכל תמונות הנכס
          </button>
        </div>
        
        {/* Gallery thumbnails */}
        <div className="hidden md:flex flex-col gap-4 h-full">
          {images.slice(1, 4).map((img, idx) => (
            <div key={idx} className="h-1/3 rounded-xl overflow-hidden shadow-soft hover:-translate-y-0.5 transition-all duration-200">
              <img src={img} alt="תמונת דירה" className="w-full h-full object-cover" />
            </div>
          ))}
          {images.length > 4 && (
            <div className="h-1/3 rounded-xl overflow-hidden shadow-soft bg-surface-container relative">
              <img src={images[4]} alt="עוד תמונות" className="w-full h-full object-cover opacity-50" />
              <div className="absolute inset-0 flex items-center justify-center font-bold text-tenant-blue text-center p-2 text-label">
                +{images.length - 4} תמונות נוספות
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Grid Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Main Details (65%) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Header Info */}
          <div>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-caption font-bold">
                חדש בלוח
              </span>
              {apartment.minLeaseDuration && (
                <span className="bg-surface-container-high text-tenant-blue px-3 py-1 rounded-full text-caption font-medium">
                  מינימום {apartment.minLeaseDuration} חודשי שכירות
                </span>
              )}
              {apartment.petsAllowed && (
                <span className="bg-guarantor-purple/10 text-guarantor-purple px-3 py-1 rounded-full text-caption font-medium">
                  מתאים לחיות מחמד
                </span>
              )}
            </div>
            <h1 className="text-h1-web font-bold text-tenant-blue mb-2">
              {apartment.address}, {apartment.city}
            </h1>
            <p className="text-h4 font-bold text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined">location_on</span>
              {apartment.neighborhood || "מרכז העיר"} • קומה {apartment.floor || "—"} מתוך {apartment.totalFloors || "—"} (עם מעלית)
            </p>
          </div>

          {/* Description */}
          <div className="p-6 bg-white rounded-xl shadow-soft">
            <h2 className="text-h3-web font-bold text-tenant-blue mb-4">תיאור הנכס</h2>
            <p className="text-body text-on-surface-variant leading-relaxed whitespace-pre-line">
              {apartment.description || "לא הוזן תיאור לנכס זה."}
            </p>
          </div>

          {/* True Monthly Cost Table */}
          <div className="p-6 bg-white rounded-xl shadow-soft">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-h3-web font-bold text-tenant-blue">עלות חודשית אמיתית</h2>
              <span className="material-symbols-outlined text-outline cursor-help" title={cost.note}>
                info
              </span>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-outline-variant">
                <span className="text-body text-on-surface-variant">שכר דירה חודשי</span>
                <span className="text-h4 font-bold text-tenant-blue">₪ {cost.rent.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-outline-variant">
                <span className="text-body text-on-surface-variant">ארנונה (לחודש)</span>
                <span className="text-body text-tenant-blue font-medium">₪ {cost.arnonaEstimate.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-outline-variant">
                <span className="text-body text-on-surface-variant">ועד בית</span>
                <span className="text-body text-tenant-blue font-medium">₪ {cost.buildingFeeEstimate.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-4">
                <span className="text-h3-web font-bold text-tenant-blue">סה&quot;כ עלות משוערת</span>
                <span className="text-h2-web font-bold text-landlord-green">₪ {cost.total.toLocaleString()}</span>
              </div>
              <p className="text-caption text-on-surface-variant opacity-70 mt-2 text-left">{cost.note}</p>
            </div>
          </div>

          {/* Features Grid */}
          <div className="p-6 bg-white rounded-xl shadow-soft">
            <h2 className="text-h3-web font-bold text-tenant-blue mb-6">מה יש בדירה?</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              {Object.keys(amenityLabels).map((key) => {
                const isAvailable = apartment.amenities?.includes(key) || (key === "pets_allowed" && apartment.petsAllowed);
                return (
                  <div key={key} className={`flex items-center gap-3 ${isAvailable ? "" : "opacity-40"}`}>
                    <span className={`material-symbols-outlined ${isAvailable ? "text-landlord-green" : "text-outline-variant"}`}>
                      {key === "parking"
                        ? "local_parking"
                        : key === "balcony"
                        ? "balcony"
                        : key === "elevator"
                        ? "elevator"
                        : key === "ac"
                        ? "ac_unit"
                        : key === "storage"
                        ? "database"
                        : key === "pets_allowed"
                        ? "pets"
                        : key === "furnished"
                        ? "chair"
                        : "solar_power"}
                    </span>
                    <span className={`text-label ${isAvailable ? "text-on-surface" : "text-outline"}`}>
                      {amenityLabels[key]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Map Embed Simulation */}
          <div className="rounded-xl overflow-hidden h-[350px] shadow-soft border border-outline-variant relative">
            <div className="w-full h-full bg-surface-variant relative">
              <img
                src="https://lh3.googleusercontent.com/aida/AP1WRLuSXF1lj3CwL0vvLN4gsm6d_bCQeJsx7ysSr5m08kr529HFjAOjV7ZBaQSq6nAzWS0GyoWHFKJPeVqVc43Z3W1W7JkZPJA2hAlm5NV39rbbiffV0RSuV5sM1rmV72aC3EY_6L-CkAAcg4MTimWvl-Nbz0KgHnYAO9HMlCfUInUF064_czNK4QfPQG8mfYrjo6fCJ03es0cz_kclDk0iT0v5nToPTeYIf9KGyGS-CLVCx1iK3MHf0-0KOQ"
                alt="מפה"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-tenant-blue/10" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <span className="material-symbols-outlined text-admin-red text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  location_on
                </span>
              </div>
              <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg shadow-lg">
                <p className="text-label font-bold text-tenant-blue">{apartment.address}, {apartment.city}</p>
                <button
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(apartment.address + ", " + apartment.city)}`, "_blank")}
                  className="text-on-secondary-container text-caption font-bold mt-1 hover:underline"
                >
                  פתח ב-Google Maps
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Sticky CTA & Match Cards (35%) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="sticky top-[84px] space-y-6">
            
            {/* Main CTA Card */}
            <div className="p-6 bg-white rounded-xl shadow-soft border-2 border-landlord-green">
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col">
                  <div className="text-caption text-outline mb-1">מחיר שכירות</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-display-web font-bold text-tenant-blue">
                      ₪ {apartment.price.toLocaleString()}
                    </span>
                    <span className="text-body text-on-surface-variant font-medium">לחודש</span>
                  </div>
                </div>
                {landlord?.trustScore && (
                  <div className="bg-surface-low px-3 py-2 rounded-lg text-center border border-outline-variant">
                    <div className="text-caption text-outline">מדד משכיר</div>
                    <div className="font-bold text-tenant-blue">{landlord.trustScore}/100</div>
                  </div>
                )}
              </div>

              {/* Status or Send Action */}
              {errorMessage && (
                <div className="mb-4 p-3 bg-error-container text-on-error-container text-caption rounded-lg">
                  {errorMessage === "Daily swipe limit reached" ? "הגעת למכסת הבעות העניין היומית לחשבון חינמי." : errorMessage}
                </div>
              )}

              {matchResult && (
                <div className="mb-4 p-4 bg-secondary-container text-on-secondary-container text-caption rounded-lg font-bold flex items-start gap-2">
                  <span className="material-symbols-outlined text-[20px]">celebrate</span>
                  <div>
                    <p className="font-bold">יש התאמה! 🎉</p>
                    <p className="font-normal">{landlord?.firstName || "המשכיר"} מעוניין גם כן. נפתח צ&apos;אט לשיחה.</p>
                  </div>
                </div>
              )}

              {interestSent ? (
                <div className="w-full h-button-height bg-[#f2f3f9] text-[#0b6f63] font-bold rounded-full flex items-center justify-center gap-2 border border-outline-variant">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                  הבעת עניין נשלחה
                </div>
              ) : (
                <button
                  onClick={handleExpressInterest}
                  disabled={isSendingInterest || user?.activeRole !== "tenant"}
                  className="w-full h-button-height bg-landlord-green hover:opacity-95 text-white font-bold rounded-full text-[16px] hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined">favorite</span>
                  {isSendingInterest ? "שולח מועמדות..." : "אני מעוניין בדירה"}
                </button>
              )}
              
              <p className="text-caption text-center text-on-surface-variant mt-3">
                {apartment.viewCount || 12} אנשים צפו במודעה זו
              </p>
            </div>

            {/* Landlord Card */}
            {landlord && (
              <div className="p-6 bg-white rounded-xl shadow-soft">
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    {landlord.avatarUrl ? (
                      <img src={landlord.avatarUrl} alt={landlord.firstName} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center font-bold text-tenant-blue text-h3-web border-2 border-white shadow-sm">
                        {landlord.firstName?.[0]}{landlord.lastName?.[0]}
                      </div>
                    )}
                    {(landlord as any).isVerified && (
                      <div className="absolute bottom-0 right-0 w-5 h-5 bg-landlord-green border-2 border-white rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-[12px] text-white font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
                          check
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-h3-web font-bold text-tenant-blue">
                      {landlord.firstName} {landlord.lastName}
                    </h3>
                    <div className="flex items-center gap-1 text-on-secondary-container">
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        verified
                      </span>
                      <span className="text-label font-medium">משכיר מאומת</span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-low p-3 rounded-lg text-center mb-6 border border-outline-variant/30">
                  <div className="text-caption text-outline">זמן תגובה ממוצע</div>
                  <div className="text-body font-bold text-tenant-blue">&lt; 15 דקות</div>
                </div>

                <Link
                  href={`/chat?user=${landlord.id}`}
                  className="w-full h-button-height border-2 border-tenant-blue text-tenant-blue hover:bg-tenant-blue hover:text-white rounded-full font-bold transition-all flex items-center justify-center gap-2 text-label"
                >
                  <span className="material-symbols-outlined">chat_bubble</span>
                  שליחת הודעה ל{landlord.firstName}
                </Link>
              </div>
            )}

            {/* Compatibility Card (Tenant only) */}
            {user?.activeRole === "tenant" && (
              <div className="p-6 bg-tenant-blue text-white rounded-xl shadow-soft relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-landlord-green/20 rounded-full blur-2xl" />
                
                <h3 className="text-h4 font-bold mb-4 relative z-10">התאמה לפרופיל שלך</h3>
                
                <div className="flex items-center gap-4 mb-4 relative z-10">
                  <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle className="text-white/10" cx="32" cy="32" fill="transparent" r="28" stroke="currentColor" stroke-width="6" />
                      <circle
                        className="text-landlord-green"
                        cx="32"
                        cy="32"
                        fill="transparent"
                        r="28"
                        stroke="currentColor"
                        stroke-dasharray="176"
                        stroke-dashoffset={176 * (1 - compatibilityScore / 100)}
                        stroke-width="6"
                      />
                    </svg>
                    <span className="absolute font-bold text-label">{compatibilityScore}%</span>
                  </div>
                  <p className="text-caption leading-tight opacity-90">
                    דירה זו מדורגת בהתאמה גבוהה להעדפות התקציב, המיקום והדרישות שלך מהבית.
                  </p>
                </div>

                <ul className="space-y-2 relative z-10 border-t border-white/10 pt-4">
                  <li className="flex items-center gap-2 text-caption">
                    <span className={`material-symbols-outlined text-[16px] ${budgetMatch ? "text-landlord-green" : "text-admin-red"}`}>
                      {budgetMatch ? "check_circle" : "cancel"}
                    </span>
                    {budgetMatch ? "מתחת לתקציב המקסימלי שהגדרת" : "מעבר לתקציב שהגדרת"}
                  </li>
                  <li className="flex items-center gap-2 text-caption">
                    <span className={`material-symbols-outlined text-[16px] ${roomMatch ? "text-landlord-green" : "text-admin-red"}`}>
                      {roomMatch ? "check_circle" : "cancel"}
                    </span>
                    {roomMatch ? "עונה על דרישת מספר החדרים המינימלי" : "פחות חדרים מהרצוי"}
                  </li>
                  {totalRequiredAmenities > 0 && (
                    <li className="flex items-center gap-2 text-caption">
                      <span className="material-symbols-outlined text-[16px] text-landlord-green">check_circle</span>
                      מכילה {amenitiesMatchCount} מתוך {totalRequiredAmenities} מאפיינים שסימנת כחובה
                    </li>
                  )}
                </ul>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
