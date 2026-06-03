/**
 * DirApp — General API Rate Limiting Middleware
 *
 * Provides configurable rate limiters for all API endpoints.
 * Uses express-rate-limit (same package as geminiRateLimit.js).
 *
 * Usage:
 *   const { apiLimiter, authLimiter, strictLimiter } = require('../middleware/rateLimit');
 *   router.use(apiLimiter);                      // general: 100 req/15min per IP
 *   router.post('/login', authLimiter, handler); // auth: 10 req/15min per IP
 *   router.post('/webhook', strictLimiter, ...); // strict: 30 req/min per IP
 */

const rateLimit = require('express-rate-limit');

const isTest = process.env.NODE_ENV === 'test';

/**
 * General API limiter — applies to most endpoints.
 * Default: 100 requests per 15 minutes per IP.
 * Override via env: RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX
 */
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: isTest ? 100_000 : (parseInt(process.env.RATE_LIMIT_MAX, 10) || 100),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please slow down.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  keyGenerator: (req) => (req.user?.id ? `uid:${req.user.id}` : req.ip),
  skip: () => isTest,
});

/**
 * Auth limiter — stricter limit for login/register endpoints.
 * Default: 10 requests per 15 minutes per IP.
 * Override via env: AUTH_RATE_LIMIT_MAX
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 100_000 : (parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts. Please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
  keyGenerator: (req) => req.ip,
  skip: () => isTest,
});

/**
 * Strict limiter — for sensitive endpoints (webhooks, KYC, uploads).
 * Default: 30 requests per minute per IP/user.
 * Override via env: STRICT_RATE_LIMIT_MAX
 */
const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 100_000 : (parseInt(process.env.STRICT_RATE_LIMIT_MAX, 10) || 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Request rate too high for this endpoint.',
    code: 'STRICT_RATE_LIMIT_EXCEEDED',
  },
  keyGenerator: (req) => (req.user?.id ? `uid:${req.user.id}` : req.ip),
  skip: () => isTest,
});

module.exports = { apiLimiter, authLimiter, strictLimiter };
