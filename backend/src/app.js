const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const verifyRoutes = require('./routes/verify');
const apartmentRoutes = require('./routes/apartments');
const swipeRoutes = require('./routes/swipe');
const matchRoutes = require('./routes/matches');
const chatRoutes = require('./routes/chat');
const recommendationRoutes = require('./routes/recommendations');
const landlordRoutes = require('./routes/landlord');
const paymentRoutes = require('./routes/payments');
const roommateRoutes = require('./routes/roommates');
const screeningRoutes  = require('./routes/screening');
const contractRoutes   = require('./routes/contracts');
const commercialRoutes = require('./routes/commercial');
const gamificationRoutes = require('./routes/gamification');
const servicesRoutes   = require('./routes/services');
const iotRoutes        = require('./routes/iot');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

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

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedCorsOrigin(origin)) {
        return callback(null, true);
      }
      if (origin && process.env.NODE_ENV !== 'production') {
        logger.warn(`CORS rejected origin: ${origin}`);
      }
      callback(null, false);
    },
    credentials: true,
  })
);
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for auth endpoints to prevent brute-force
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again later' },
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email : '';
    return `${req.ip}:${req.path}:${email}`;
  },
});

// Swipe endpoint gets its own budget to prevent abuse
const swipeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Swipe rate limit exceeded' },
});

app.use(globalLimiter);

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/auth', authLimiter, verifyRoutes);
app.use('/api/apartments', apartmentRoutes);
app.use('/api/swipe', swipeLimiter, swipeRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/landlord', landlordRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/roommates', roommateRoutes);
app.use('/api/screening', screeningRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/commercial', commercialRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/iot', iotRoutes);

app.use(errorHandler);

module.exports = app;
