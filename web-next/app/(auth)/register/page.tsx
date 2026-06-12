"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

type Role = "tenant" | "landlord";

function getPasswordStrength(pw: string): number {
  let score = 0;
  if (pw.length > 5) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const strengthLabels = ["", "חלשה מאוד", "בינונית", "טובה", "חזקה מאוד"];
const strengthColors = ["", "bg-admin-red", "bg-guarantor-purple", "bg-tenant-blue", "bg-landlord-green"];
const strengthTextColors = ["", "#ba1a1a", "#6b4fa0", "#002045", "#00cba9"];

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [role, setRole] = useState<Role>("tenant");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Google Sign-In states
  const [tempToken, setTempToken] = useState("");
  const [showRoleSelection, setShowRoleSelection] = useState(false);

  useEffect(() => {
    // Inject the Google One Tap / Sign In script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      const google = (window as any).google;
      if (google) {
        google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
          callback: handleGoogleCredential,
        });

        // Prompt One-Tap prompt
        google.accounts.id.prompt();

        // Render standard button as overlay
        const container = document.getElementById("google-signin-btn-overlay");
        if (container) {
          google.accounts.id.renderButton(container, {
            type: "standard",
            theme: "outline",
            size: "large",
            width: 380,
            text: "signup_with",
            shape: "pill",
          });
        }
      }
    };

    return () => {
      try {
        document.head.removeChild(script);
      } catch (e) {
        // script might have been removed or not found
      }
    };
  }, []);

  async function handleGoogleCredential(response: any) {
    setIsLoading(true);
    setError("");
    try {
      const res = await api<{
        token: string;
        needsRoleSelection: boolean;
        user: any;
      }>("/api/auth/google", {
        method: "POST",
        body: { credential: response.credential },
      });

      if (res.needsRoleSelection) {
        setTempToken(res.token);
        setShowRoleSelection(true);
      } else {
        login(res.token, res.user);
        if (!res.user.tosAcceptedAt) {
          router.push("/terms");
        } else {
          router.push("/dashboard");
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.data?.message || "הרשמה באמצעות Google נכשלה");
      } else {
        setError("שגיאה בהרשמה באמצעות Google. נסה שוב.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function selectRole(selectedRole: "tenant" | "landlord") {
    setIsLoading(true);
    setError("");
    try {
      const res = await api<{ token: string; user: any }>("/api/auth/set-role", {
        method: "POST",
        body: { role: selectedRole },
        token: tempToken,
      });

      login(res.token, res.user);
      if (!res.user.tosAcceptedAt) {
        router.push("/terms");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.data?.message || "בחירת תפקיד נכשלה");
      } else {
        setError("שגיאה בשמירת התפקיד. נסה שוב.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("הסיסמאות לא תואמות");
      return;
    }
    if (!termsAccepted) {
      setError("יש לאשר את תנאי השימוש");
      return;
    }

    setIsLoading(true);
    try {
      await api("/api/auth/register", {
        method: "POST",
        body: { email, password, firstName, lastName, phone, role },
      });
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.data?.message || "שגיאה בהרשמה");
      } else {
        setError("שגיאה בהרשמה. נסה שוב.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (showRoleSelection) {
    return (
      <main className="flex w-full min-h-screen" dir="rtl">
        {/* Role Selection Section */}
        <section className="w-full lg:w-1/2 bg-surface-container-lowest flex flex-col justify-center items-center p-[--spacing-margin-mobile] md:p-[--spacing-margin-desktop] overflow-y-auto">
          <div className="w-full max-w-lg space-y-8 py-8 text-right">
            <h2 className="text-[28px] leading-[36px] font-bold text-tenant-blue mb-2 text-center">
              נעים להכיר!
            </h2>
            <p className="text-[16px] leading-[26px] text-on-surface-variant mb-8 text-center">
              בחר כיצד תרצה להשתמש ב-DirApp. אל דאגה, תוכל להחליף תפקיד בכל עת בהמשך.
            </p>

            {error && (
              <div className="p-3 mb-6 rounded-lg bg-error-container text-on-error-container text-[14px]">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6">
              {/* Tenant Card */}
              <button
                type="button"
                onClick={() => selectRole("tenant")}
                disabled={isLoading}
                className="p-6 border border-outline-variant hover:border-tenant-blue bg-surface-bright rounded-2xl text-right transition-all hover:shadow-md active:scale-[0.99] disabled:opacity-50"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-tenant-blue/10 flex items-center justify-center text-[24px]">
                    🏠
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[18px] font-bold text-tenant-blue mb-1">
                      אני שוכר
                    </h3>
                    <p className="text-[14px] text-on-surface-variant">
                      מחפש דירה להשכרה, חותם על חוזה ומדווח על תשלומים בצורה פשוטה.
                    </p>
                  </div>
                </div>
              </button>

              {/* Landlord Card */}
              <button
                type="button"
                onClick={() => selectRole("landlord")}
                disabled={isLoading}
                className="p-6 border border-outline-variant hover:border-landlord-green bg-surface-bright rounded-2xl text-right transition-all hover:shadow-md active:scale-[0.99] disabled:opacity-50"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-landlord-green/10 flex items-center justify-center text-[24px]">
                    🔑
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[18px] font-bold text-landlord-green mb-1">
                      אני משכיר
                    </h3>
                    <p className="text-[14px] text-on-surface-variant">
                      מפרסם נכסים להשכרה, מנהל דיירים, גובה תשלומים ומפיק חוזים חכמים.
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {isLoading && (
              <div className="mt-8 flex justify-center gap-3 text-on-surface-variant text-[14px]">
                <svg className="animate-spin h-5 w-5 text-landlord-green" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                מעדכן פרופיל...
              </div>
            )}
          </div>
        </section>

        {/* Branding Section */}
        <section className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden bg-gradient-to-br from-tenant-blue via-primary-container to-[#00091b]">
          <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-landlord-green opacity-10 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-[#9ff2e2] opacity-10 rounded-full blur-[80px]" />

          {/* Logo */}
          <div className="flex items-center gap-3 z-10">
            <div className="w-10 h-10 bg-landlord-green rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
                home_pin
              </span>
            </div>
            <span className="text-[28px] leading-[36px] font-bold text-white tracking-tight">
              DirApp
            </span>
          </div>

          <div className="z-10 max-w-lg space-y-6">
            <h1 className="text-[48px] leading-tight font-extrabold text-white">
              השכרת דירה מעולם לא הייתה פשוטה כל כך.
            </h1>
            <p className="text-[16px] leading-[26px] text-[#aec7f5] opacity-90">
              מערכת חכמה לניהול נכסים, חוזים ותשלומים.
            </p>
          </div>

          <div className="z-10 flex gap-8">
            <div>
              <div className="text-[22px] leading-[30px] font-semibold text-landlord-green">10k+</div>
              <div className="text-[12px] leading-[16px] text-[#aec7f5]">משתמשים פעילים</div>
            </div>
            <div>
              <div className="text-[22px] leading-[30px] font-semibold text-landlord-green">2k+</div>
              <div className="text-[12px] leading-[16px] text-[#aec7f5]">נכסים מנוהלים</div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex w-full min-h-screen">
      {/* Branding Section */}
      <section className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden bg-gradient-to-br from-tenant-blue via-primary-container to-[#00091b]">
        <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-landlord-green opacity-10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-[#9ff2e2] opacity-10 rounded-full blur-[80px]" />

        {/* Logo */}
        <div className="flex items-center gap-3 z-10">
          <div className="w-10 h-10 bg-landlord-green rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
              home_pin
            </span>
          </div>
          <span className="text-[28px] leading-[36px] font-bold text-white tracking-tight">
            DirApp
          </span>
        </div>

        {/* Middle */}
        <div className="z-10 max-w-lg space-y-6">
          <h1 className="text-[48px] leading-tight font-extrabold text-white">
            השכרת דירה מעולם לא הייתה פשוטה כל כך.
          </h1>
          <p className="text-[16px] leading-[26px] text-[#aec7f5] opacity-90">
            מערכת חכמה לניהול נכסים, חוזים ותשלומים. בין אם אתם מחפשים דירה או מנהלים תיק נכסים, DirApp כאן כדי להפוך את התהליך לפשוט, שקוף ובטוח עבור כולם.
          </p>
        </div>

        {/* Stats */}
        <div className="z-10 flex gap-8">
          <div>
            <div className="text-[22px] leading-[30px] font-semibold text-landlord-green">10k+</div>
            <div className="text-[12px] leading-[16px] text-[#aec7f5]">משתמשים פעילים</div>
          </div>
          <div>
            <div className="text-[22px] leading-[30px] font-semibold text-landlord-green">2k+</div>
            <div className="text-[12px] leading-[16px] text-[#aec7f5]">נכסים מנוהלים</div>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="w-full lg:w-1/2 bg-surface-container-lowest flex flex-col justify-center items-center p-[--spacing-margin-mobile] md:p-[--spacing-margin-desktop] overflow-y-auto">
        <div className="w-full max-w-lg space-y-8 py-8">
          {/* Header */}
          <div className="text-center lg:text-right space-y-2">
            <h2 className="text-[28px] leading-[36px] font-bold text-tenant-blue">
              צור חשבון חדש
            </h2>
            <p className="text-[16px] leading-[26px] text-on-surface-variant">
              {role === "tenant"
                ? "הירשם והתחל לנהל את הנכסים שלך בצורה חכמה"
                : "הצטרף לאלפי משכירים שמנהלים את הנכסים שלהם בראש שקט"}
            </p>
          </div>

          {/* Role Toggle */}
          <div className="bg-surface-container p-1 rounded-full flex gap-1 w-full max-w-xs mx-auto lg:mx-0 border border-outline-variant">
            <button
              type="button"
              onClick={() => setRole("tenant")}
              className={`flex-1 py-2 px-6 rounded-full text-[14px] font-medium transition-all duration-300 ${
                role === "tenant"
                  ? "bg-landlord-green text-white shadow-md"
                  : "text-on-surface-variant hover:bg-surface-variant/50"
              }`}
            >
              שוכר
            </button>
            <button
              type="button"
              onClick={() => setRole("landlord")}
              className={`flex-1 py-2 px-6 rounded-full text-[14px] font-medium transition-all duration-300 ${
                role === "landlord"
                  ? "bg-landlord-green text-white shadow-md"
                  : "text-on-surface-variant hover:bg-surface-variant/50"
              }`}
            >
              משכיר
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-error-container text-on-error-container text-[14px]">
                {error}
              </div>
            )}

            {/* Name Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[14px] font-medium text-on-surface-variant mr-1">
                  שם פרטי
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="לדוג׳: ישראל"
                  className="w-full h-[48px] px-4 rounded-lg border border-outline-variant bg-white focus:border-landlord-green focus:ring-1 focus:ring-landlord-green transition-all outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[14px] font-medium text-on-surface-variant mr-1">
                  שם משפחה
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="לדוג׳: ישראלי"
                  className="w-full h-[48px] px-4 rounded-lg border border-outline-variant bg-white focus:border-landlord-green focus:ring-1 focus:ring-landlord-green transition-all outline-none"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-[14px] font-medium text-on-surface-variant mr-1">
                דואר אלקטרוני
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                dir="ltr"
                className="w-full h-[48px] px-4 rounded-lg border border-outline-variant bg-white focus:border-landlord-green focus:ring-1 focus:ring-landlord-green transition-all outline-none"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="block text-[14px] font-medium text-on-surface-variant mr-1">
                מספר טלפון
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-[16px] text-on-surface-variant border-r border-outline-variant pr-3">
                  +972
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="50-1234567"
                  dir="ltr"
                  className="w-full h-[48px] pl-20 pr-4 rounded-lg border border-outline-variant bg-white focus:border-landlord-green focus:ring-1 focus:ring-landlord-green transition-all outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-[14px] font-medium text-on-surface-variant mr-1">
                סיסמה
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-[48px] px-4 pl-12 rounded-lg border border-outline-variant bg-white focus:border-landlord-green focus:ring-1 focus:ring-landlord-green transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-tenant-blue transition-colors"
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
              {/* Strength Meter */}
              {password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex h-1.5 gap-1.5 overflow-hidden rounded-full bg-surface-container-highest w-full">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-full w-1/4 transition-colors ${
                          i <= strength ? strengthColors[strength] : "bg-outline-variant"
                        }`}
                      />
                    ))}
                  </div>
                  <span
                    className="text-[12px]"
                    style={{ color: strengthTextColors[strength] || "#74777f" }}
                  >
                    {strengthLabels[strength] || "סיסמה חלשה"}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="block text-[14px] font-medium text-on-surface-variant mr-1">
                אימות סיסמה
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full h-[48px] px-4 pl-12 rounded-lg border bg-white focus:ring-1 transition-all outline-none ${
                    passwordMismatch
                      ? "border-admin-red focus:border-admin-red focus:ring-admin-red"
                      : "border-outline-variant focus:border-landlord-green focus:ring-landlord-green"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-tenant-blue transition-colors"
                >
                  <span className="material-symbols-outlined">
                    {showConfirm ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
              {passwordMismatch && (
                <span className="text-[12px] text-admin-red">הסיסמאות לא תואמות</span>
              )}
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3 py-2">
              <div className="flex items-center h-5">
                <input
                  id="terms"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="w-5 h-5 text-landlord-green border-outline-variant rounded focus:ring-landlord-green"
                />
              </div>
              <label htmlFor="terms" className="text-[12px] leading-tight text-on-surface-variant">
                מסכים ל
                <Link href="/terms" className="text-tenant-blue underline hover:text-landlord-green mx-1">
                  תנאי השימוש
                </Link>
                ול
                <Link href="/privacy" className="text-tenant-blue underline hover:text-landlord-green mx-1">
                  מדיניות הפרטיות
                </Link>
                של המערכת.
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !termsAccepted}
              className="w-full h-[48px] bg-landlord-green text-white text-[18px] font-semibold rounded-full shadow-lg hover:shadow-xl hover:brightness-105 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  נרשם...
                </span>
              ) : (
                "צור חשבון"
              )}
            </button>

            {/* Divider */}
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-outline-variant/30" />
              <span className="flex-shrink mx-4 text-[12px] text-outline">או</span>
              <div className="flex-grow border-t border-outline-variant/30" />
            </div>

            {/* Google */}
            <div className="relative w-full h-[48px]">
              <button
                type="button"
                className="w-full h-full border border-outline-variant rounded-full text-[14px] font-medium text-tenant-blue flex items-center justify-center gap-3 hover:bg-surface-variant/20 transition-all pointer-events-none"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                הרשמה עם Google
              </button>
              <div
                id="google-signin-btn-overlay"
                className="absolute inset-0 opacity-0 cursor-pointer overflow-hidden [&>div]:w-full [&>div]:h-full [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:absolute [&_iframe]:top-0 [&_iframe]:left-0"
              />
            </div>
          </form>

          {/* Login Link */}
          <p className="text-center text-[16px] text-on-surface-variant">
            כבר יש לך חשבון?{" "}
            <Link href="/login" className="text-tenant-blue font-bold hover:underline">
              התחבר כאן
            </Link>
          </p>
        </div>
      </section>

      {/* Material Symbols font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />
    </main>
  );
}
