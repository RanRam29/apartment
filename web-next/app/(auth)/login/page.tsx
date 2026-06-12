"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api, ApiError } from "@/lib/api";
import type { LoginResponse } from "@/lib/types";
import { AuthBranding } from "@/components/auth/AuthBranding";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
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
            text: "signin_with",
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
        setError(err.data?.message || "התחברות באמצעות Google נכשלה");
      } else {
        setError("שגיאה בהתחברות באמצעות Google. נסה שוב.");
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await api<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });
      login(res.token, res.user);

      if (!res.user.tosAcceptedAt) {
        router.push("/terms");
        return;
      }

      const role = res.user.activeRole || res.user.role;
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.data?.message || "אימייל או סיסמה שגויים");
      } else {
        setError("שגיאה בהתחברות. נסה שוב.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (showRoleSelection) {
    return (
      <main className="min-h-screen flex flex-col md:flex-row" dir="rtl">
        {/* Role Selection Section */}
        <section className="flex-1 flex items-center justify-center p-6 md:p-[--spacing-margin-desktop] bg-surface-container-lowest z-10">
          <div className="w-full max-w-[480px] text-right">
            <h1 className="text-[28px] leading-[36px] font-bold text-tenant-blue mb-2 text-center">
              נעים להכיר!
            </h1>
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
        <AuthBranding />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col md:flex-row">
      {/* Form Section */}
      <section className="flex-1 flex items-center justify-center p-6 md:p-[--spacing-margin-desktop] bg-surface-container-lowest z-10">
        <div className="w-full max-w-[400px]">
          {/* Heading */}
          <div className="mb-10 text-right">
            <h1 className="text-[28px] leading-[36px] font-bold text-tenant-blue mb-2">
              ברוכים הבאים
            </h1>
            <p className="text-[16px] leading-[26px] text-on-surface-variant">
              התחברו לניהול או השכרת הדירה שלכם
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-error-container text-on-error-container text-[14px]">
                {error}
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-right text-[14px] font-medium text-on-surface">
                אימייל
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline">
                  mail
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full h-[48px] pr-12 pl-4 rounded-lg border border-outline-variant focus:border-landlord-green focus:ring-1 focus:ring-landlord-green transition-all outline-none bg-surface-bright"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-right text-[14px] font-medium text-on-surface">
                סיסמה
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline">
                  lock
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-[48px] pr-12 pl-12 rounded-lg border border-outline-variant focus:border-landlord-green focus:ring-1 focus:ring-landlord-green transition-all outline-none bg-surface-bright"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-outline hover:text-tenant-blue transition-colors"
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  id="remember"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-5 h-5 rounded border-outline-variant text-landlord-green focus:ring-landlord-green"
                />
                <label htmlFor="remember" className="text-[14px] font-medium text-on-surface-variant">
                  זכור אותי
                </label>
              </div>
              <Link href="/forgot-password" className="text-[14px] font-medium text-landlord-green hover:underline">
                שכחת סיסמה?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[48px] bg-landlord-green text-white font-bold rounded-full hover:brightness-95 transition-all soft-shadow active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  מתחבר...
                </span>
              ) : (
                "התחבר"
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
                התחבר באמצעות Google
              </button>
              <div
                id="google-signin-btn-overlay"
                className="absolute inset-0 opacity-0 cursor-pointer overflow-hidden [&>div]:w-full [&>div]:h-full [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:absolute [&_iframe]:top-0 [&_iframe]:left-0"
              />
            </div>
          </form>

          {/* Footer */}
          <p className="mt-8 text-center text-[16px] text-on-surface-variant">
            אין חשבון?{" "}
            <Link href="/register" className="text-landlord-green font-bold hover:underline">
              הרשם כאן
            </Link>
          </p>
        </div>
      </section>

      {/* Branding Section */}
      <AuthBranding />

      {/* Material Symbols font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />
    </main>
  );
}
