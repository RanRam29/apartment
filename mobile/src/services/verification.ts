export function extractVerificationToken(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const token = parsed.searchParams.get('token');
    return token && token.trim().length > 0 ? token : null;
  } catch {
    return null;
  }
}
