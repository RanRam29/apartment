"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";

interface GuarantorDetails {
  guarantorName: string;
  propertyAddress: string;
  rentAmount: number;
  startDate: string;
  endDate: string;
}

export function GuarantorFlow({ token }: { token: string }) {
  const [step, setStep] = useState<number>(1);
  const [details, setDetails] = useState<GuarantorDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  // Step 2 Form States
  const [idNumber, setIdNumber] = useState("");
  const [idError, setIdError] = useState("");
  const [idPhoto, setIdPhoto] = useState<string | null>(null);

  // Step 3 Form States
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);

  // Canvas ref for signature
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  // Fetch Guarantor Flow details on mount
  useEffect(() => {
    async function fetchDetails() {
      try {
        setIsLoading(true);
        const res = await api<GuarantorDetails>(`/api/v3/guarantor/flow/${token}`);
        setDetails(res);
      } catch (err: any) {
        console.error(err);
        // Map common error codes
        if (err.status) {
          setErrorStatus(err.status);
        } else {
          setErrorStatus(404);
        }
      } finally {
        setIsLoading(false);
      }
    }
    fetchDetails();
  }, [token]);

  // Israeli ID checksum validation
  const validateIsraeliId = (idStr: string): boolean => {
    const cleanId = idStr.trim();
    if (cleanId.length === 0) return false;
    if (cleanId.length > 9 || isNaN(Number(cleanId))) return false;
    const paddedId = cleanId.padStart(9, "0");
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      const num = parseInt(paddedId[i]);
      const weight = i % 2 === 0 ? 1 : 2;
      const step = num * weight;
      sum += step > 9 ? step - 9 : step;
    }
    return sum % 10 === 0;
  };

  const handleIdChange = (val: string) => {
    setIdNumber(val);
    if (val && !validateIsraeliId(val)) {
      setIdError("תעודת זהות ישראלית אינה תקינה (ספרת ביקורת שגויה)");
    } else {
      setIdError("");
    }
  };

  // Drag and Drop ID upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setIdPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Signature pad logic
  useEffect(() => {
    if (step === 3 && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#1a365d"; // tenant-blue
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
      }
    }
  }, [step]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let clientX, clientY;
    if ("touches" in e) {
      // Prevent scrolling when drawing on touch devices
      e.preventDefault();
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSigned(false);
    }
  };

  // Simulate OTP send
  const sendOtp = () => {
    setOtpSent(true);
    toast.success("קוד אימות SMS (סימולטיבי) נשלח למכשירך: 123456");
  };

  // Decline Invitation
  const handleDecline = async () => {
    const confirmed = window.confirm("האם אתה בטוח שברצונך לדחות את הזמנת הערבות?\nהודעה תישלח למשכיר על הסירוב.");
    if (!confirmed) return;

    try {
      await api(`/api/v3/guarantor/flow/${token}/decline`, { method: "POST" });
      setStep(5); // Decline screen state
    } catch (err) {
      toast.error("שגיאה בדחיית הבקשה");
    }
  };

  // Complete Signature Approval
  const handleComplete = async () => {
    if (!hasSigned) {
      toast.error("אנא חתום על גבי לוח החתימה");
      return;
    }
    if (otpCode !== "123456") {
      toast.error("קוד האימות אינו נכון (נא להזין 123456)");
      return;
    }
    if (!consentAccepted) {
      toast.error("עליך לאשר את הסכמתך לתנאי שטר הערבות");
      return;
    }

    try {
      setIsLoading(true);
      await api(`/api/v3/guarantor/flow/${token}/complete`, {
        method: "POST",
        body: {
          idNumber,
          signatureData: canvasRef.current?.toDataURL(),
        },
      });
      setStep(4); // Success screen
    } catch (err) {
      toast.error("חתימה על שטר ערבות נכשלה");
    } finally {
      setIsLoading(false);
    }
  };

  // Formatting utils
  const formatILS = (num: number) => {
    return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(num);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("he-IL");
  };

  // Loading indicator
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-md w-full p-8 text-center soft-shadow border border-outline-variant/30">
          <div className="w-12 h-12 border-4 border-landlord-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-on-surface-variant font-label text-body">טוען שטר ערבות דיגיטלי...</p>
        </div>
      </div>
    );
  }

  // Handle Expired / Invalid
  if (errorStatus) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl max-w-md w-full p-8 text-center soft-shadow border border-red-200">
          <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-[36px]">gpp_bad</span>
          </div>
          <h2 className="text-h3-web font-extrabold text-tenant-blue mb-2">קישור פג תוקף או שגוי</h2>
          <p className="text-caption text-on-surface-variant mb-6 leading-relaxed">
            {errorStatus === 410 
              ? "שטר ערבות זה פג תוקף ולא ניתן לחתום עליו. יש לבקש מהמשכיר לשלוח הזמנה חדשה."
              : "הקישור אליו הגעת אינו תקין או שההזמנה בוטלה על ידי המשכיר."}
          </p>
          <a
            href="https://dirapp.co.il"
            className="inline-block w-full py-3 bg-tenant-blue text-white rounded-full font-bold text-label hover:bg-tenant-blue/90 transition-all"
          >
            חזרה לאתר הבית
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 flex justify-center items-center" dir="rtl">
      <div className="bg-white rounded-3xl max-w-xl w-full soft-shadow border border-outline-variant/30 overflow-hidden flex flex-col">
        
        {/* Header Branding */}
        <header className="bg-tenant-blue p-6 text-white text-center relative">
          <h1 className="text-[26px] font-extrabold text-landlord-green">DirApp</h1>
          <p className="text-[12px] text-blue-200 font-medium">מרכז חתימת ערבויות דיגיטליות</p>
          
          {/* Progress bar */}
          {step <= 3 && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-950">
              <div 
                className="h-full bg-landlord-green transition-all duration-500"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          )}
        </header>

        {/* Dynamic Wizard Steps */}
        <main className="p-8 flex-1">
          
          {/* STEP 1: Overview */}
          {step === 1 && details && (
            <div className="space-y-6">
              <div className="text-center">
                <span className="inline-block bg-green-50 text-landlord-green px-3 py-1 rounded-full text-caption font-bold border border-green-200/50 mb-3">
                  שלב 1 מתוך 3: פרטי העסקה
                </span>
                <h2 className="text-h3-web font-extrabold text-tenant-blue">שלום {details.guarantorName},</h2>
                <p className="text-caption text-on-surface-variant max-w-md mx-auto">
                  הוזמנת לערוב עבור חוזה השכירות הדיגיטלי הבא במערכת DirApp. אנא סקור את פרטי הנכס ותנאי השכירות:
                </p>
              </div>

              {/* Lease info sheet */}
              <div className="bg-slate-50 border border-outline-variant/30 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-outline-variant/30">
                  <span className="text-caption text-on-surface-variant">נכס להשכרה</span>
                  <span className="font-bold text-tenant-blue">{details.propertyAddress}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-outline-variant/30">
                  <span className="text-caption text-on-surface-variant">דמי שכירות חודשיים</span>
                  <span className="font-bold text-landlord-green text-label">{formatILS(details.rentAmount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-caption text-on-surface-variant">תקופת חוזה השכירות</span>
                  <span className="font-bold text-tenant-blue select-all text-caption">
                    {formatDate(details.startDate)} - {formatDate(details.endDate)}
                  </span>
                </div>
              </div>

              {/* Legal explanation alert */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex gap-3 text-caption text-tenant-blue">
                <span className="material-symbols-outlined text-[20px]">gavel</span>
                <p className="leading-relaxed">
                  חתימה כערב מהווה התחייבות משפטית לפרוע כל חוב שייווצר על ידי השוכרים, לרבות דמי שכירות או נזקים לנכס, בהתאם לתנאי החוזה המקורי.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-4 pt-4 border-t border-outline-variant/20">
                <button
                  onClick={handleDecline}
                  className="flex-1 py-3 border border-red-200 text-red-600 rounded-full font-bold text-label hover:bg-red-50 transition-colors"
                >
                  אני מסרב לערוב
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 bg-tenant-blue text-white rounded-full font-bold text-label hover:bg-tenant-blue/90 transition-colors"
                >
                  המשך לאימות פרטים
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Identification Upload */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <span className="inline-block bg-green-50 text-landlord-green px-3 py-1 rounded-full text-caption font-bold border border-green-200/50 mb-3">
                  שלב 2 מתוך 3: אימות זהות
                </span>
                <h2 className="text-h3-web font-extrabold text-tenant-blue">אימות תעודת זהות ישראלית</h2>
                <p className="text-caption text-on-surface-variant">
                  כדי להשלים את הערבות כחוק, עלינו לאמת את פרטי הזיהוי שלך מול משרד הפנים
                </p>
              </div>

              <div className="space-y-4">
                {/* ID input */}
                <div>
                  <label className="text-[12px] font-bold text-tenant-blue block mb-1">מספר תעודת זהות (9 ספרות)</label>
                  <input
                    type="text"
                    maxLength={9}
                    required
                    value={idNumber}
                    onChange={(e) => handleIdChange(e.target.value)}
                    placeholder="הקלד 9 ספרות..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-outline-variant rounded-xl text-caption text-tenant-blue focus:outline-none focus:border-landlord-green text-center font-mono"
                  />
                  {idError && <span className="text-red-600 text-[11px] font-bold block mt-1">{idError}</span>}
                </div>

                {/* ID photo upload */}
                <div>
                  <label className="text-[12px] font-bold text-tenant-blue block mb-2">צילום תעודת זהות / רישיון נהיגה</label>
                  
                  {idPhoto ? (
                    <div className="relative border border-outline-variant rounded-2xl overflow-hidden h-44 bg-slate-100 flex items-center justify-center">
                      <img src={idPhoto} className="h-full object-contain" alt="ID Preview" />
                      <button 
                        onClick={() => setIdPhoto(null)}
                        className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full shadow hover:bg-red-700 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-outline-variant/60 rounded-2xl h-44 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
                      <span className="material-symbols-outlined text-[36px] text-on-surface-variant">photo_camera</span>
                      <span className="text-caption font-bold text-tenant-blue mt-2">לחץ להעלאת צילום ת.ז.</span>
                      <span className="text-[10px] text-on-surface-variant mt-1">תבניות נתמכות: JPG, PNG עד 5MB</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handlePhotoUpload} 
                        className="hidden" 
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-4 pt-4 border-t border-outline-variant/20">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-outline-variant text-tenant-blue rounded-full font-bold text-label hover:bg-slate-50 transition-colors"
                >
                  חזרה
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!idNumber || idError !== "" || !idPhoto}
                  className="flex-1 py-3 bg-tenant-blue text-white rounded-full font-bold text-label hover:bg-tenant-blue/90 transition-colors disabled:opacity-50"
                >
                  המשך לשלב החתימה
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Signature Canvas & OTP */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <span className="inline-block bg-green-50 text-landlord-green px-3 py-1 rounded-full text-caption font-bold border border-green-200/50 mb-3">
                  שלב 3 מתוך 3: חתימה אלקטרונית
                </span>
                <h2 className="text-h3-web font-extrabold text-tenant-blue">חתימה ואישור ב-SMS</h2>
                <p className="text-caption text-on-surface-variant">
                  חתום בעזרת העכבר/מגע ואמת את זהותך על ידי קוד ה-SMS החד פעמי
                </p>
              </div>

              {/* Canvas signature pad */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[12px] font-bold text-tenant-blue block">חתום כאן (בעזרת העכבר או האצבע):</label>
                  <button 
                    onClick={clearCanvas}
                    className="text-[11px] text-red-600 font-bold hover:underline"
                  >
                    נקה חתימה
                  </button>
                </div>
                <div className="border border-outline-variant rounded-2xl overflow-hidden bg-slate-50 h-36 relative">
                  <canvas
                    ref={canvasRef}
                    width={512}
                    height={144}
                    className="w-full h-full cursor-crosshair touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                  {!hasSigned && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 select-none text-[11px] text-tenant-blue">
                      חתום בתוך התיבה...
                    </div>
                  )}
                </div>
              </div>

              {/* OTP SMS validation */}
              <div className="space-y-3 pt-3 border-t border-outline-variant/20">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="text-[12px] font-bold text-tenant-blue block mb-1">קוד אימות שנשלח בנייד</label>
                    <input
                      type="text"
                      disabled={!otpSent}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="הזן 6 ספרות..."
                      className="w-full px-4 py-2 bg-slate-50 border border-outline-variant rounded-xl text-caption text-tenant-blue font-bold tracking-widest text-center focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={sendOtp}
                    className="py-2 px-4 border border-outline-variant text-tenant-blue font-bold text-caption rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    {otpSent ? "שלח שוב" : "שלח קוד אימות"}
                  </button>
                </div>
              </div>

              {/* Legal checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={(e) => setConsentAccepted(e.target.checked)}
                  className="rounded border-outline-variant text-landlord-green focus:ring-0 w-4 h-4 mt-0.5 shrink-0"
                />
                <span className="text-[11px] text-on-surface-variant leading-relaxed">
                  הנני מצהיר כי כל הפרטים שמסרתי נכונים, קראתי את תנאי השכירות ואני מסכים לשמש כערב לקיום כל התחייבויות השוכרים המפורטות בחוזה.
                </span>
              </label>

              {/* Action buttons */}
              <div className="flex gap-4 pt-4 border-t border-outline-variant/20">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 border border-outline-variant text-tenant-blue rounded-full font-bold text-label hover:bg-slate-50 transition-colors"
                >
                  חזרה
                </button>
                <button
                  onClick={handleComplete}
                  disabled={!hasSigned || !consentAccepted || !otpCode}
                  className="flex-1 py-3 bg-landlord-green text-white rounded-full font-bold text-label hover:bg-[#00b094] transition-colors disabled:opacity-50"
                >
                  אישור וחתימה סופית
                </button>
              </div>
            </div>
          )}

          {/* SUCCESS SCREEN */}
          {step === 4 && details && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 text-landlord-green flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[36px]">verified</span>
              </div>
              <div>
                <h2 className="text-h3-web font-extrabold text-tenant-blue">הערבות נחתמה בהצלחה!</h2>
                <p className="text-caption text-on-surface-variant max-w-sm mx-auto mt-2 leading-relaxed">
                  תודה לך. חתימת הערב שלך נקלטה בהצלחה במערכות הדיגיטליות של DirApp והועברה למשכיר לאשרור העסקה.
                </p>
              </div>

              <div className="bg-slate-50 border border-outline-variant/30 rounded-2xl p-4 text-caption text-tenant-blue text-right max-w-sm mx-auto space-y-2">
                <div>שם הערב: <strong>{details.guarantorName}</strong></div>
                <div>ת.ז. מאומתת: <strong>{idNumber}</strong></div>
                <div>נכס מבוטח: <strong>{details.propertyAddress}</strong></div>
                <div>תאריך חתימה: <strong>{new Date().toLocaleDateString("he-IL")}</strong></div>
              </div>

              <div className="pt-4">
                <a
                  href="https://dirapp.co.il"
                  className="inline-block px-8 py-3 bg-tenant-blue text-white rounded-full font-bold text-label hover:bg-tenant-blue/90 transition-all"
                >
                  סיום
                </a>
              </div>
            </div>
          )}

          {/* DECLINED SCREEN */}
          {step === 5 && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[36px]">block</span>
              </div>
              <div>
                <h2 className="text-h3-web font-extrabold text-tenant-blue">הערבות נדחתה בהצלחה</h2>
                <p className="text-caption text-on-surface-variant max-w-sm mx-auto mt-2 leading-relaxed">
                  הודעה נשלחה למשכיר ולשוכרים בדבר סירובך לערוב לעסקה. פרטיך לא יישמרו במערכת.
                </p>
              </div>
              <div className="pt-4">
                <a
                  href="https://dirapp.co.il"
                  className="inline-block px-8 py-3 bg-tenant-blue text-white rounded-full font-bold text-label hover:bg-tenant-blue/90 transition-all"
                >
                  חזרה לאתר הבית
                </a>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
