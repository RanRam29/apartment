/**
 * Shared CORS allowlist for Express and Socket.IO (must stay in sync).
 */
function parseCorsOrigins() {
  const raw = process.env.CLIENT_ORIGIN || process.env.CLIENT_ORIGINS || 'http://localhost:3000';
  const list = String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
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
