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
const leadsRoutes = require('./routes/leads');
const paymentRoutes = require('./routes/payments');
const roommateRoutes = require('./routes/roommates');
const screeningRoutes  = require('./routes/screening');
const contractRoutes   = require('./routes/contracts');
const commercialRoutes = require('./routes/commercial');
const gamificationRoutes = require('./routes/gamification');
const servicesRoutes   = require('./routes/services');
const iotRoutes        = require('./routes/iot');
const adminLogsRoutes = require('./routes/adminLogs');
const logsRoutes = require('./routes/logs');
const { requestContext } = require('./middleware/requestContext');
const { auditCapture } = require('./middleware/auditCapture');
const { errorHandler } = require('./middleware/errorHandler');
const { logSystemEvent } = require('./services/systemEventService');
const { SYSTEM_CATEGORY, SYSTEM_SEVERITY } = require('./constants/logging');
const logger = require('./utils/logger');
const { isAllowedCorsOrigin } = require('./config/corsOrigins');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedCorsOrigin(origin)) {
        return callback(null, true);
      }
      if (origin) {
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
app.use(requestContext);
app.use(auditCapture);

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logSystemEvent({
      source: 'rate-limit',
      category: SYSTEM_CATEGORY.SECURITY,
      severity: SYSTEM_SEVERITY.WARN,
      event: 'rate_limit.global',
      message: 'Global rate limit exceeded',
      requestId: req.requestContext?.requestId,
      actorId: req.user?.id || null,
      metadata: { ip: req.ip, path: req.path, method: req.method },
    });
    res.status(429).json({ error: 'Too many requests' });
  },
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
  handler: (req, res) => {
    logSystemEvent({
      source: 'rate-limit',
      category: SYSTEM_CATEGORY.SECURITY,
      severity: SYSTEM_SEVERITY.WARN,
      event: 'rate_limit.auth',
      message: 'Auth rate limit exceeded',
      requestId: req.requestContext?.requestId,
      metadata: { ip: req.ip, path: req.path },
    });
    res.status(429).json({ error: 'Too many auth attempts, please try again later' });
  },
});

// Swipe endpoint gets its own budget to prevent abuse
const swipeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Swipe rate limit exceeded' },
  handler: (req, res) => {
    logSystemEvent({
      source: 'rate-limit',
      category: SYSTEM_CATEGORY.SECURITY,
      severity: SYSTEM_SEVERITY.WARN,
      event: 'rate_limit.swipe',
      message: 'Swipe rate limit exceeded',
      requestId: req.requestContext?.requestId,
      actorId: req.user?.id || null,
      metadata: { ip: req.ip, path: req.path },
    });
    res.status(429).json({ error: 'Swipe rate limit exceeded' });
  },
});

app.use(globalLimiter);

// Terms of Service enforcement gates (CASCADE)
const { authenticate: tosAuthenticate } = require('./middleware/auth');
const { requireTos } = require('./middleware/requireTos');
app.use('/api/apartments', tosAuthenticate, requireTos);
app.use('/api/swipe', tosAuthenticate, requireTos);
app.use('/api/matches', tosAuthenticate, requireTos);
app.use('/api/contracts', tosAuthenticate, requireTos);

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/auth', authLimiter, verifyRoutes);
app.use('/api/apartments', apartmentRoutes);
app.use('/api/swipe', swipeLimiter, swipeRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/landlord', landlordRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/roommates', roommateRoutes);
app.use('/api/screening', screeningRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/commercial', commercialRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/iot', iotRoutes);
app.use('/api/admin/logs', adminLogsRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/tenant', require('./routes/journal'));
// v3 routes (DirApp MVP v3.0)
const contractsV3Routes = require('./routes/contractsV3');
app.use('/api/v3/contracts', contractsV3Routes);

// CASCADE routes
app.use('/api/v3/kyc', require('./routes/kycV3'));
app.use('/api/v3/maintenance', require('./routes/maintenanceV3'));
app.use('/api/v3/guarantor', require('./routes/guarantor'));
app.use('/api/v3/ledger', require('./routes/ledger'));
app.use('/api/v3/admin', require('./routes/admin'));
app.use('/api/v3/renter-journal', require('./routes/renterJournal'));

// v3 routes (Cursor Agent: Financial + Admin)
const ledgerRoutes = require('./routes/ledger');
const adminRoutes = require('./routes/admin');
app.use('/api/v3/ledger', ledgerRoutes);
app.use('/api/v3/admin', adminRoutes);

app.use(errorHandler);

module.exports = app;

