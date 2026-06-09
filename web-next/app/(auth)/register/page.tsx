"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

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
