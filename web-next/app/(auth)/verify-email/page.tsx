"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import Link from "next/link";

type VerifyState = "loading" | "success" | "error" | "no-token";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [state, setState] = useState<VerifyState>(token ? "loading" : "no-token");
  const [errorMessage, setErrorMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  // Verify the token on mount
  useEffect(() => {
    if (!token) {
      setState("no-token");
      return;
    }

    api(`/api/auth/verify/${token}`)
      .then(() => {
        setState("success");
        // Redirect to login after 3 seconds
        setTimeout(() => router.push("/login"), 3000);
      })
      .catch((err) => {
        setState("error");
        if (err instanceof ApiError) {
          setErrorMessage(err.message || "הקישור לא תקין או שפג תוקפו");
        } else {
          setErrorMessage("שגיאה בחיבור לשרת");
        }
      });
  }, [token, router]);

  // Resend verification
  const handleResend = useCallback(async () => {
    if (!resendEmail.trim()) return;
    setResendLoading(true);
    try {
      await api("/api/auth/verify/resend", {
        method: "POST",
        body: { email: resendEmail.trim() },
      });
      setResendDone(true);
    } catch (err) {
      setErrorMessage("לא הצלחנו לשלוח מייל חדש. בדוק את הכתובת ונסה שוב.");
    } finally {
      setResendLoading(false);
    }
  }, [resendEmail]);

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl soft-shadow p-8 text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-tenant-blue rounded-2xl flex items-center justify-center">
            <span className="text-white font-extrabold text-[24px]">D</span>
          </div>
        </div>

        {/* Loading */}
        {state === "loading" && (
          <>
            <div className="w-12 h-12 border-4 border-landlord-green border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h1 className="text-[24px] font-bold text-tenant-blue mb-2">מאמת את המייל שלך...</h1>
            <p className="text-on-surface-variant text-[14px]">רגע, בודקים את הקישור</p>
          </>
        )}

        {/* Success */}
        {state === "success" && (
          <>
            <div className="w-16 h-16 bg-landlord-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-[40px] text-landlord-green" style={{ fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
            </div>
            <h1 className="text-[24px] font-bold text-tenant-blue mb-2">המייל אומת בהצלחה!</h1>
            <p className="text-on-surface-variant text-[14px] mb-6">
              החשבון שלך מוכן. מעביר אותך לעמוד ההתחברות...
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-landlord-green text-white px-8 py-3 rounded-full font-bold text-[16px] hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined text-[20px]">login</span>
              התחבר עכשיו
            </Link>
          </>
        )}

        {/* Error */}
        {state === "error" && (
          <>
            <div className="w-16 h-16 bg-admin-red/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-[40px] text-admin-red">error</span>
            </div>
            <h1 className="text-[24px] font-bold text-tenant-blue mb-2">אימות נכשל</h1>
            <p className="text-on-surface-variant text-[14px] mb-6">
              {errorMessage || "הקישור לא תקין או שפג תוקפו. אפשר לבקש מייל אימות חדש."}
            </p>

            {/* Resend form */}
            {!resendDone ? (
              <div className="space-y-3">
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="הכנס את המייל שנרשמת איתו"
                  className="w-full h-12 bg-surface-container rounded-xl px-4 text-[14px] text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-landlord-green/30"
                  dir="ltr"
                />
                <button
                  onClick={handleResend}
                  disabled={resendLoading || !resendEmail.trim()}
                  className="w-full h-12 bg-tenant-blue text-white rounded-xl font-bold text-[14px] hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
                >
                  {resendLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">mail</span>
                      שלח מייל אימות חדש
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="bg-secondary-container/50 rounded-xl p-4">
                <span className="material-symbols-outlined text-on-secondary-container text-[24px] mb-1">mark_email_read</span>
                <p className="text-[14px] text-on-secondary-container font-medium">
                  מייל אימות חדש נשלח! בדוק את תיבת הדואר שלך.
                </p>
              </div>
            )}
          </>
        )}

        {/* No Token */}
        {state === "no-token" && (
          <>
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-[40px] text-amber-600">mail</span>
            </div>
            <h1 className="text-[24px] font-bold text-tenant-blue mb-2">אימות כתובת מייל</h1>
            <p className="text-on-surface-variant text-[14px] mb-6">
              שלחנו לך מייל עם קישור לאימות. לחץ על הקישור במייל כדי להשלים את ההרשמה.
            </p>
            <div className="bg-surface-container rounded-xl p-4 text-right mb-6">
              <p className="text-[13px] text-on-surface-variant">
                <span className="font-bold">לא קיבלת?</span> בדוק בתיקיית ספאם, או הכנס את המייל למטה כדי לשלוח שוב.
              </p>
            </div>

            {!resendDone ? (
              <div className="space-y-3">
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="כתובת המייל שלך"
                  className="w-full h-12 bg-surface-container rounded-xl px-4 text-[14px] text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-landlord-green/30"
                  dir="ltr"
                />
                <button
                  onClick={handleResend}
                  disabled={resendLoading || !resendEmail.trim()}
                  className="w-full h-12 bg-landlord-green text-white rounded-xl font-bold text-[14px] hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
                >
                  {resendLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "שלח מייל אימות"
                  )}
                </button>
              </div>
            ) : (
              <div className="bg-secondary-container/50 rounded-xl p-4">
                <p className="text-[14px] text-on-secondary-container font-medium">נשלח! בדוק את תיבת הדואר.</p>
              </div>
            )}
          </>
        )}

        {/* Back to login */}
        <div className="mt-6 pt-4 border-t border-outline-variant/30">
          <Link href="/login" className="text-[14px] text-tenant-blue font-medium hover:underline">
            חזרה להתחברות
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-landlord-green border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
