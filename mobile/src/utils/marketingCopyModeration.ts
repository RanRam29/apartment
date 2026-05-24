export type MarketingCopyModeration = {
  ok: boolean;
  reason?: string;
};

const BLOCKED_TERMS = ['spam', 'scam', 'click here', '100% free', 'guaranteed profit'];

/**
 * Basic client-side guardrails before a landlord copies AI marketing text (UX-031).
 */
export function moderateMarketingCopy(text: string): MarketingCopyModeration {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, reason: 'הטקסט ריק — נסה ליצור מחדש.' };
  }
  if (trimmed.length < 20) {
    return { ok: false, reason: 'הטקסט קצר מדי — נסה ליצור מחדש.' };
  }
  if (trimmed.length > 600) {
    return { ok: false, reason: 'הטקסט ארוך מדי — נסה ליצור מחדש.' };
  }

  const lower = trimmed.toLowerCase();
  for (const term of BLOCKED_TERMS) {
    if (lower.includes(term)) {
      return { ok: false, reason: 'הטקסט מכיל ביטוי שאינו מתאים למודעה — נסה ליצור מחדש.' };
    }
  }

  return { ok: true };
}
