"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { api, apiUpload } from "@/lib/api";

type ChecklistItem = {
  key: string;
  title: string;
  completed: boolean;
  dismissed: boolean;
};

type ChecklistResponse = {
  role: "tenant" | "landlord";
  checklist: ChecklistItem[];
  completionPct: number;
};

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<ChecklistResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Tenant states
  const [bio, setBio] = useState("");
  const [kycLoading, setKycLoading] = useState(false);
  const [showKycModal, setShowKycModal] = useState(false);
  const [kycSuccessMsg, setKycSuccessMsg] = useState("");

  // Landlord states
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("תל אביב");
  const [address, setAddress] = useState("");
  const [price, setPrice] = useState("");
  const [rooms, setRooms] = useState("3");
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [contractFile, setContractFile] = useState<File | null>(null);
  
  // General states
  const [actionLoading, setActionLoading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const fetchChecklist = async () => {
    try {
      const res = await api<ChecklistResponse>("/api/v3/onboarding/checklist");
      setData(res);
      // Prefill bio if tenant already has it
      if (res.role === "tenant" && user?.bio) {
        setBio(user.bio);
      }
      
      // Auto-set step index to the first uncompleted & undismissed step
      const firstUncompleted = res.checklist.findIndex(item => !item.completed && !item.dismissed);
      if (firstUncompleted !== -1) {
        setCurrentStepIndex(firstUncompleted);
      } else {
        // If all are completed, show last step or step 0
        setCurrentStepIndex(Math.max(0, res.checklist.length - 1));
      }
    } catch (err) {
      console.error("Failed to load checklist", err);
      setError("טעינת השלבים נכשלה.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklist();
  }, []);

  const handleSkip = async (key: string) => {
    setActionLoading(true);
    try {
      await api(`/api/v3/onboarding/step/${key}/dismiss`, { method: "POST" });
      await fetchChecklist();
    } catch (err) {
      setError("שגיאה בדילוג על השלב. נסה שוב.");
    } finally {
      setActionLoading(false);
    }
  };

  // Tenant: Save Bio/Preferences
  const handleSaveBio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bio.trim()) {
      setError("אנא מלא את פרטי ההעדפות שלך");
      return;
    }
    setActionLoading(true);
    setError("");
    try {
      await api("/api/auth/profile", {
        method: "PATCH",
        body: { bio: bio.trim() },
      });
      await fetchChecklist();
    } catch (err) {
      setError("שמירת ההעדפות נכשלה.");
    } finally {
      setActionLoading(false);
    }
  };

  // Tenant: Simulate KYC Approval
  const handleSimulateKyc = async () => {
    setKycLoading(true);
    setError("");
    try {
      await api("/api/v3/kyc/initiate", { method: "POST" });
      const res = await api<{ success: boolean; status: string }>("/api/v3/kyc/simulate-approve", {
        method: "POST",
      });
      if (res.success) {
        setKycSuccessMsg("אימות הזהות הושלם בהצלחה!");
        setTimeout(async () => {
          setShowKycModal(false);
          await fetchChecklist();
          setKycSuccessMsg("");
        }, 1500);
      }
    } catch (err) {
      setError("אימות זהות נכשל בסימולציה.");
    } finally {
      setKycLoading(false);
    }
  };

  // Landlord: Publish First Property
  const handlePublishProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !address.trim() || !price || !rooms) {
      setError("אנא מלא את כל שדות החובה");
      return;
    }
    setActionLoading(true);
    setError("");
    try {
      const res = await api<{ id: string }>("/api/apartments", {
        method: "POST",
        body: {
          title: title.trim(),
          city,
          address: address.trim(),
          price: parseInt(price),
          rooms: parseFloat(rooms),
        },
      });
      setSelectedPropertyId(res.id);
      await fetchChecklist();
    } catch (err) {
      setError("פרסום הנכס נכשל.");
    } finally {
      setActionLoading(false);
    }
  };

  // Landlord: Upload Contract
  const handleUploadContract = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Fallback: If landlord hasn't published a property yet, try to find one
    let targetPropertyId = selectedPropertyId;
    if (!targetPropertyId) {
      try {
        const aptsRes = await api<{ apartments: any[] }>("/api/apartments?limit=1");
        if (aptsRes.apartments?.[0]?.id) {
          targetPropertyId = aptsRes.apartments[0].id;
        }
      } catch (_) {}
    }

    if (!targetPropertyId) {
      setError("יש לפרסם נכס לפני העלאת חוזה שכירות עבורו.");
      return;
    }

    if (!contractFile) {
      setError("נא לבחור קובץ חוזה להעלאה.");
      return;
    }

    setActionLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("propertyId", targetPropertyId);
      formData.append("contract", contractFile);
      
      await apiUpload("/api/v3/contracts/upload", formData);
      await fetchChecklist();
    } catch (err) {
      setError("העלאת החוזה נכשלה. אנא ודא שהקובץ תקין.");
    } finally {
      setActionLoading(false);
    }
  };

  // WhatsApp Toggle Opt-In
  const handleToggleWhatsApp = async (optIn: boolean) => {
    setActionLoading(true);
    setError("");
    try {
      await api("/api/users/me", {
        method: "PUT",
        body: { whatsappOptIn: optIn },
      });
      await fetchChecklist();
    } catch (err) {
      setError("עדכון חיבור ה-WhatsApp נכשל.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-right" dir="rtl">
        <div className="w-12 h-12 border-4 border-landlord-green border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-on-surface-variant font-medium">טוען את תהליך האונבורדינג...</p>
      </div>
    );
  }

  if (!data) return null;

  const currentStep = data.checklist[currentStepIndex];
  const isFinished = data.completionPct === 100;

  return (
    <div className="max-w-4xl mx-auto py-8 text-right" dir="rtl">
      {/* Header */}
      <header className="mb-8 text-center md:text-right">
        <h1 className="text-[32px] leading-[40px] font-bold text-tenant-blue mb-2">ברוך הבא ל-DirApp! 👋</h1>
        <p className="text-on-surface-variant text-[16px]">בוא נשלים כמה צעדים פשוטים כדי להתחיל להשתמש במערכת ולקבל נקודות אמינות.</p>
      </header>

      {/* Progress Bar Card */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant soft-shadow mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <span className="text-[18px] font-bold text-tenant-blue">
            התקדמות אונבורדינג: {data.completionPct}%
          </span>
          <div className="flex gap-2">
            {data.checklist.map((item, idx) => (
              <button
                key={item.key}
                onClick={() => setCurrentStepIndex(idx)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                  idx === currentStepIndex
                    ? "bg-tenant-blue text-white"
                    : item.completed
                    ? "bg-landlord-green/10 text-landlord-green border border-landlord-green/30"
                    : item.dismissed
                    ? "bg-surface-variant text-outline border border-outline-variant"
                    : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                }`}
              >
                {idx + 1}. {item.title} {item.completed && "✓"} {item.dismissed && "👁"}
              </button>
            ))}
          </div>
        </div>
        <div className="w-full bg-surface-container-highest h-3 rounded-full overflow-hidden">
          <div
            className="bg-landlord-green h-full transition-all duration-500 ease-out"
            style={{ width: `${data.completionPct}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="p-4 mb-6 rounded-xl bg-error-container text-on-error-container text-[14px] font-medium border border-error/20">
          {error}
        </div>
      )}

      {/* Main Step Render */}
      {isFinished ? (
        <div className="bg-surface-container-lowest rounded-2xl p-10 border border-outline-variant soft-shadow text-center space-y-6">
          <div className="w-20 h-20 bg-landlord-green/10 rounded-full flex items-center justify-center mx-auto text-[48px]">
            🎉
          </div>
          <h2 className="text-[26px] font-bold text-tenant-blue">כל הכבוד! השלמת את האונבורדינג בהצלחה.</h2>
          <p className="text-on-surface-variant max-w-lg mx-auto">
            פרופיל ה-DirApp שלך פעיל ומעודכן כעת. קיבלת תוספות משמעותיות לדירוג האמינות שלך.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="px-8 h-12 bg-tenant-blue text-white rounded-full font-bold shadow hover:scale-[1.02] transition-transform"
            >
              המשך לדשבורד
            </button>
            <button
              onClick={() => router.push("/trust")}
              className="px-8 h-12 bg-surface-container text-tenant-blue border border-outline rounded-full font-bold hover:scale-[1.02] transition-transform"
            >
              צפה בפרופיל אמינות
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant soft-shadow min-h-[300px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-outline-variant pb-4 mb-6">
              <h2 className="text-[22px] font-bold text-tenant-blue">{currentStep.title}</h2>
              {currentStep.completed ? (
                <span className="bg-landlord-green/10 text-landlord-green px-4 py-1.5 rounded-full font-bold text-[14px] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  הושלם
                </span>
              ) : currentStep.dismissed ? (
                <span className="bg-surface-variant text-outline px-4 py-1.5 rounded-full font-bold text-[14px]">
                  דולג
                </span>
              ) : (
                <span className="bg-tenant-blue/10 text-[#0c448d] px-4 py-1.5 rounded-full font-bold text-[14px]">
                  ממתין לביצוע
                </span>
              )}
            </div>

            {/* Step specific forms */}
            {!currentStep.completed && !currentStep.dismissed && (
              <div className="py-2">
                {/* 1. Tenant: preferences/bio */}
                {currentStep.key === "preferences" && (
                  <form onSubmit={handleSaveBio} className="space-y-4">
                    <p className="text-on-surface-variant text-[15px] leading-[24px]">
                      ספר למשכירים קצת על עצמך, העבודה שלך, תחביבים ומה אתה מחפש בדירה. זה יעזור לך לקבל אחוזי התאמה גבוהים יותר ולקבל פניות מהירות יותר!
                    </p>
                    <textarea
                      required
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="היי, אני ישראל, עובד כמתכנת בהרצליה פיתוח, שקט ומחפש דירת חדר וחצי בתל אביב..."
                      className="w-full h-32 p-4 rounded-xl border border-outline-variant bg-white focus:border-tenant-blue focus:ring-1 focus:ring-tenant-blue outline-none transition-all resize-none text-[15px]"
                    />
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-6 h-11 bg-tenant-blue text-white rounded-full font-bold hover:brightness-105 active:scale-[0.98] transition-all"
                    >
                      שמור והמשך
                    </button>
                  </form>
                )}

                {/* 2. Tenant: KYC */}
                {currentStep.key === "kyc" && (
                  <div className="space-y-4">
                    <p className="text-on-surface-variant text-[15px] leading-[24px]">
                      אימות זהות מאפשר למערכת לדעת שאתה אכן מי שאתה טוען. משתמשים מאומתים מקבלים תג <b>&quot;משתמש מאומת&quot;</b> בפיד וזוכים ל-<b>+20 נקודות אמינות</b> באופן מיידי.
                    </p>
                    <div className="p-6 bg-surface-container rounded-2xl border border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-1">
                        <h4 className="text-[16px] font-bold text-tenant-blue">אימות זהות מאובטח (Persona Web SDK)</h4>
                        <p className="text-[13px] text-on-surface-variant">האימות מתבצע תוך פחות מ-2 דקות מול תעודת זהות / רישיון נהיגה.</p>
                      </div>
                      <button
                        onClick={() => setShowKycModal(true)}
                        className="px-8 h-12 bg-tenant-blue text-white rounded-full font-bold shadow hover:scale-[1.02] transition-transform shrink-0"
                      >
                        אימות כעת
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. General: WhatsApp Opt-in */}
                {currentStep.key === "whatsapp" && (
                  <div className="space-y-6">
                    <p className="text-on-surface-variant text-[15px] leading-[24px]">
                      חיבור ה-WhatsApp שלך מאפשר לקבל עדכונים בזמן אמת על התאמות חדשות, חתימות על חוזים, תשלומים מתוזמנים ואישורים בצורה פשוטה ומהירה.
                    </p>
                    <div className="p-6 bg-surface-container rounded-2xl border border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <span className="material-symbols-outlined text-[48px] text-landlord-green">chat</span>
                        <div>
                          <h4 className="text-[16px] font-bold text-tenant-blue">קבל התראות ל-WhatsApp</h4>
                          <p className="text-[13px] text-on-surface-variant">תוכל לכבות זאת בכל עת מהגדרות הפרופיל שלך.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleWhatsApp(true)}
                        disabled={actionLoading}
                        className="px-8 h-12 bg-landlord-green text-white rounded-full font-bold shadow hover:scale-[1.02] transition-transform shrink-0"
                      >
                        אשר וסנכרן
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. Landlord: Publish first property */}
                {currentStep.key === "first_property" && (
                  <form onSubmit={handlePublishProperty} className="space-y-6">
                    <p className="text-on-surface-variant text-[15px]">פרסם את הדירה שלך כדי ששוכרים יוכלו לראות אותה ולהתחיל להחליק!</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[14px] font-semibold text-on-surface-variant mr-1">כותרת המודעה</label>
                        <input
                          type="text"
                          required
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="לדוג׳: דירת 3 חדרים מהממת עם מרפסת"
                          className="w-full h-[46px] px-4 rounded-lg border border-outline-variant bg-white focus:border-landlord-green focus:ring-1 focus:ring-landlord-green transition-all outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[14px] font-semibold text-on-surface-variant mr-1">עיר</label>
                        <select
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full h-[46px] px-4 rounded-lg border border-outline-variant bg-white focus:border-landlord-green focus:ring-1 focus:ring-landlord-green transition-all outline-none"
                        >
                          <option value="תל אביב">תל אביב</option>
                          <option value="חיפה">חיפה</option>
                          <option value="ירושלים">ירושלים</option>
                          <option value="הרצליה">הרצליה</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[14px] font-semibold text-on-surface-variant mr-1">כתובת</label>
                        <input
                          type="text"
                          required
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="לדוג׳: דיזנגוף 100"
                          className="w-full h-[46px] px-4 rounded-lg border border-outline-variant bg-white focus:border-landlord-green focus:ring-1 focus:ring-landlord-green transition-all outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[14px] font-semibold text-on-surface-variant mr-1">מחיר לחודש (₪)</label>
                        <input
                          type="number"
                          required
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="לדוג׳: 5500"
                          className="w-full h-[46px] px-4 rounded-lg border border-outline-variant bg-white focus:border-landlord-green focus:ring-1 focus:ring-landlord-green transition-all outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[14px] font-semibold text-on-surface-variant mr-1">חדרים</label>
                        <input
                          type="number"
                          step="0.5"
                          required
                          value={rooms}
                          onChange={(e) => setRooms(e.target.value)}
                          placeholder="3"
                          className="w-full h-[46px] px-4 rounded-lg border border-outline-variant bg-white focus:border-landlord-green focus:ring-1 focus:ring-landlord-green transition-all outline-none"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-8 h-11 bg-landlord-green text-white rounded-full font-bold hover:brightness-105 active:scale-[0.98] transition-all"
                    >
                      פרסם נכס והמשך
                    </button>
                  </form>
                )}

                {/* 5. Landlord: Upload lease contract */}
                {currentStep.key === "contract_uploaded" && (
                  <form onSubmit={handleUploadContract} className="space-y-6">
                    <p className="text-on-surface-variant text-[15px]">
                      העלה חוזה שכירות ראשוני עבור הנכס שפרסמת. המערכת תסרוק את החוזה באמצעות ה-AI של Gemini ותחלץ את הנתונים באופן אוטומטי.
                    </p>
                    <div className="space-y-4">
                      <div className="p-8 border-2 border-dashed border-outline-variant rounded-2xl hover:border-landlord-green bg-surface-container flex flex-col items-center justify-center cursor-pointer transition-colors relative">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          required
                          onChange={(e) => setContractFile(e.target.files?.[0] || null)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <span className="material-symbols-outlined text-[48px] text-outline mb-2">upload_file</span>
                        <p className="text-[14px] font-bold text-tenant-blue">
                          {contractFile ? contractFile.name : "גרור או לחץ לבחירת קובץ חוזה (PDF, DOC)"}
                        </p>
                        <p className="text-[12px] text-on-surface-variant mt-1">גודל קובץ מירבי: 10MB</p>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={actionLoading || !contractFile}
                      className="px-8 h-11 bg-landlord-green text-white rounded-full font-bold hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-60"
                    >
                      העלה חוזה והמשך
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* If step is completed or dismissed, show status */}
            {(currentStep.completed || currentStep.dismissed) && (
              <div className="p-8 bg-surface-container-low rounded-2xl text-center space-y-4 my-4">
                <span className="material-symbols-outlined text-[48px] text-landlord-green">check_circle</span>
                <p className="text-on-surface-variant text-[15px] font-semibold">
                  שלב זה הושלם או דולג. בחר בשלבים הבאים מעלה או לחץ למעבר לשלב הבא.
                </p>
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="flex justify-between border-t border-outline-variant pt-6 mt-8">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))}
                disabled={currentStepIndex === 0}
                className="px-5 h-11 bg-surface-container border border-outline rounded-full font-medium text-[14px] hover:bg-surface-container-high active:scale-95 transition-all disabled:opacity-50"
              >
                הקודם
              </button>
              <button
                type="button"
                onClick={() => setCurrentStepIndex(prev => Math.min(data.checklist.length - 1, prev + 1))}
                disabled={currentStepIndex === data.checklist.length - 1}
                className="px-5 h-11 bg-surface-container border border-outline rounded-full font-medium text-[14px] hover:bg-surface-container-high active:scale-95 transition-all disabled:opacity-50"
              >
                הבא
              </button>
            </div>
            {!currentStep.completed && !currentStep.dismissed && (
              <button
                type="button"
                onClick={() => handleSkip(currentStep.key)}
                disabled={actionLoading}
                className="px-6 h-11 bg-surface-container-lowest border border-outline rounded-full text-on-surface-variant font-medium text-[14px] hover:bg-surface-container hover:text-tenant-blue transition-colors"
              >
                דלג על שלב זה
              </button>
            )}
          </div>
        </div>
      )}

      {/* KYC Persona Mock Modal */}
      {showKycModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-8 max-w-md w-full border border-outline-variant soft-shadow text-center space-y-6">
            <div className="w-16 h-16 bg-tenant-blue/10 rounded-full flex items-center justify-center mx-auto text-[32px]">
              👤
            </div>
            <div className="space-y-2">
              <h3 className="text-[20px] font-bold text-tenant-blue">אימות זהות מול Persona</h3>
              <p className="text-[14px] text-on-surface-variant">
                [מצב פיתוח] הדמיית אימות התעודה וזיהוי הפנים. המערכת תשלח אישור מדומה לשרת.
              </p>
            </div>

            {kycSuccessMsg ? (
              <div className="p-3 bg-landlord-green/10 text-landlord-green rounded-lg text-[14px] font-bold">
                {kycSuccessMsg}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleSimulateKyc}
                  disabled={kycLoading}
                  className="w-full h-11 bg-landlord-green text-white rounded-full font-bold hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {kycLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  אשר אימות בהצלחה
                </button>
                <button
                  type="button"
                  onClick={() => setShowKycModal(false)}
                  disabled={kycLoading}
                  className="w-full h-11 bg-surface-container text-on-surface font-medium rounded-full hover:bg-surface-container-high transition-colors"
                >
                  ביטול
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
