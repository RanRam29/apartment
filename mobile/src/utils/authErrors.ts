/**
 * Maps axios/backend auth responses to user-facing Hebrew messages.
 */
export function formatLoginError(
  err: unknown,
  fallback = 'שגיאה בכניסה, נסו שנית.'
): string {
  const e = err as {
    response?: { status?: number; data?: { error?: string; code?: string } };
    message?: string;
    code?: string;
  };
  const status = e?.response?.status;
  const data = e?.response?.data;
  const code = data?.code;

  if (!e?.response) {
    // Distinguish timeout (cold start) from general network errors
    if (e?.code === 'ECONNABORTED' || e?.message?.includes('timeout')) {
      return 'השרת מתעורר (זה לוקח עד 30 שניות בפעם הראשונה). לחצו שוב על כניסה.';
    }
    return 'לא ניתן להתחבר לשרת. בדקו את הרשת ואת כתובת ה־API.';
  }

  if (status === 401) {
    return 'אימייל או סיסמה שגויים. אם החשבון נוצר בסביבת שרת אחרת, צריך להירשם מחדש או להשתמש בשרת המתאים.';
  }

  if (status === 403 && code === 'EMAIL_NOT_VERIFIED') {
    return (
      data?.error ||
      'נא לאמת את כתובת האימייל לפני הכניסה (בדקו את תיבת הדואר).'
    );
  }

  if (status === 503 && code === 'JWT_SIGN_FAILED') {
    return 'שירות ההתחברות אינו זמין כרגע (תצורת שרת). נסו שוב מאוחר יותר.';
  }

  if (typeof data?.error === 'string' && data.error.trim()) {
    return data.error;
  }

  return fallback;
}
