/**
 * Detect Axios timeout / network errors caused by Render cold starts.
 * Render free-tier instances spin down after ~15 min inactivity;
 * first request after sleep can take 30-60s, exceeding Axios timeout.
 */
export function isTimeoutError(err: unknown): boolean {
  const e = err as {
    code?: string;
    message?: string;
    response?: unknown;
  };
  // No HTTP response received at all
  if (e?.response) return false;
  // Axios sets code=ECONNABORTED on timeout
  if (e?.code === 'ECONNABORTED') return true;
  // Fallback: check message
  if (typeof e?.message === 'string' && e.message.toLowerCase().includes('timeout')) return true;
  return false;
}
