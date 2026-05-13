/**
 * Shared CORS allowlist for Express and Socket.IO (must stay in sync).
 *
 * Merges CLIENT_ORIGIN and CLIENT_ORIGINS (both may be comma-separated). Previously only one
 * applied, so adding CLIENT_ORIGINS in Render could be ignored if CLIENT_ORIGIN was set.
 *
 * On Render production, known production web clients are included so CORS works without
 * duplicating URLs in the dashboard (RENDER + NODE_ENV=production).
 */
const RENDER_CANONICAL_CLIENT_ORIGINS = ['https://apartment-olive.vercel.app'];

function parseCorsOrigins() {
  const chunks = [];
  for (const key of ['CLIENT_ORIGIN', 'CLIENT_ORIGINS']) {
    const v = process.env[key];
    if (v) {
      chunks.push(
        ...String(v)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      );
    }
  }
  if (
    process.env.NODE_ENV === 'production' &&
    (process.env.RENDER === 'true' || process.env.RENDER === '1')
  ) {
    chunks.push(...RENDER_CANONICAL_CLIENT_ORIGINS);
  }
  const list = [...new Set(chunks)];
  return list.length ? list : ['http://localhost:3000'];
}

function isAllowedCorsOrigin(origin) {
  if (!origin) return true;
  const allowed = parseCorsOrigins();
  if (allowed.includes(origin)) return true;
  if (process.env.CORS_ALLOW_VERCEL_PREVIEWS === 'true') {
    try {
      const { hostname } = new URL(origin);
      if (hostname === 'vercel.app' || hostname.endsWith('.vercel.app')) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

module.exports = { parseCorsOrigins, isAllowedCorsOrigin };
