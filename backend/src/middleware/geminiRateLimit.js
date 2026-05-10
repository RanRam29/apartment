const rateLimit = require('express-rate-limit');

function parseWindowMs(envKey, defaultMs) {
  const v = process.env[envKey];
  if (v === undefined || v === '') return defaultMs;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : defaultMs;
}

function parseMax(envKey, defaultMax) {
  const v = process.env[envKey];
  if (v === undefined || v === '') return defaultMax;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : defaultMax;
}

const testBypass =
  process.env.NODE_ENV === 'test' && process.env.GEMINI_RATE_LIMIT_IN_TESTS !== '1';

/** Rate limit for POST /api/recommendations/search (Gemini NLP). Use after authenticate. */
const geminiSearchLimiter = rateLimit({
  windowMs: parseWindowMs('GEMINI_SEARCH_RATE_WINDOW_MS', 15 * 60 * 1000),
  max: testBypass ? 100_000 : parseMax('GEMINI_SEARCH_RATE_MAX', 60),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many AI search requests. Please try again later.',
    code: 'GEMINI_SEARCH_RATE_LIMIT',
  },
  keyGenerator: (req) => (req.user?.id ? `uid:${req.user.id}` : req.ip),
});

/** Rate limit for POST /api/apartments/:id/marketing-copy (Gemini copy). Use after authenticate. */
const geminiMarketingLimiter = rateLimit({
  windowMs: parseWindowMs('GEMINI_MARKETING_RATE_WINDOW_MS', 15 * 60 * 1000),
  max: testBypass ? 100_000 : parseMax('GEMINI_MARKETING_RATE_MAX', 40),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many marketing copy requests. Please try again later.',
    code: 'GEMINI_MARKETING_RATE_LIMIT',
  },
  keyGenerator: (req) => (req.user?.id ? `uid:${req.user.id}` : req.ip),
});

module.exports = { geminiSearchLimiter, geminiMarketingLimiter };
