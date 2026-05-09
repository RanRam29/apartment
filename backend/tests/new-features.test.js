/**
 * Tests for new feature routes: F8 Roommates, F9 Screening, F10 Contracts,
 * F11 Rent Payments, F12 Commercial, F13 Gamification, F14 Services, F15 IoT
 * Uses in-memory mocks — no live DB required.
 */
const request = require('supertest');

// ─── Auth mock ────────────────────────────────────────────────────────────────
jest.mock('../src/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    if (token === 'tenant')   { req.user = { id: 'user-tenant',   role: 'tenant'   }; return next(); }
    if (token === 'landlord') { req.user = { id: 'user-landlord', role: 'landlord' }; return next(); }
    return res.status(401).json({ error: 'Invalid token' });
  },
  requireRole: (...roles) => (req, res, next) =>
    roles.includes(req.user?.role) ? next() : res.status(403).json({ error: 'Forbidden' }),
  requireVerified: (_req, _res, next) => next(),
}));

jest.mock('../src/config/redis', () => ({
  getRedisClient: () => ({
    get: jest.fn(async () => null),
    set: jest.fn(async () => 'OK'),
    setex: jest.fn(async () => 'OK'),
    del: jest.fn(async () => 1),
  }),
  cacheGet: jest.fn(async () => null),
  cacheSet: jest.fn(async () => undefined),
  cacheDel: jest.fn(async () => undefined),
}));

jest.mock('../src/config/socket', () => ({
  getIO: () => ({ to: () => ({ emit: () => {} }) }),
}));

// ─── Query chain helper ───────────────────────────────────────────────────────
// Wraps a result in a chainable object that Mongoose query methods return.
function q(result) {
  const p = Promise.resolve(result);
  const chain = {
    lean:   jest.fn(() => p),
    sort:   jest.fn(() => chain),
    limit:  jest.fn(() => chain), // returns chain so .lean() can follow
    skip:   jest.fn(() => chain),
    select: jest.fn(() => chain),
    then:   p.then.bind(p),
    catch:  p.catch.bind(p),
  };
  return chain;
}

// ─── Postgres User / Match / Apartment mock ───────────────────────────────────
jest.mock('../src/models', () => ({
  User: {
    findByPk: jest.fn(async () => ({
      id: 'user-landlord', firstName: 'ישראל', lastName: 'ישראלי', phone: '050-1234567',
    })),
    findOne:  jest.fn(async () => null),
    findAll:  jest.fn(async () => [
      { id: 'user-tenant', firstName: 'שוכר', dataValues: { id: 'user-tenant' } },
    ]),
    update: jest.fn(async () => [1]),
  },
  Match: {
    findOne: jest.fn(async () => ({
      id: 'm-1', tenantId: 'user-tenant', landlordId: 'user-landlord',
    })),
  },
  Apartment: {
    findOne: jest.fn(async () => ({
      id: 'apt-1', landlordId: 'user-landlord', title: 'דירה', city: 'תל אביב',
    })),
  },
}));

// ─── Mongoose model mocks ─────────────────────────────────────────────────────

const mockRoommate = {
  _id: 'rp-1', userId: 'user-tenant', lookingForRoommate: true,
  sleepSchedule: 'flexible', cleanlinessLevel: 3, noiseLevel: 'moderate',
  guestsFrequency: 'sometimes', smokingAllowed: false, petsAllowed: true,
  workFromHome: false, cities: ['תל אביב'],
};

jest.mock('../src/models/mongo/RoommateProfile', () => {
  const m = {
    findOne:          jest.fn(),
    findOneAndUpdate: jest.fn(),
    find:             jest.fn(),
  };
  const ctor = jest.fn(() => ({ ...mockRoommate, save: jest.fn(async () => mockRoommate) }));
  return Object.assign(ctor, m);
});

const mockVerification = {
  _id: 'iv-1', userId: 'user-tenant', status: 'pending',
  idNumberLast4: '1234', fullName: 'ישראל ישראלי', phone: '0501234567',
};

jest.mock('../src/models/mongo/IdentityVerification', () => {
  const m = {
    findOne:          jest.fn(),
    findOneAndUpdate: jest.fn(),
    find:             jest.fn(),
  };
  const ctor = jest.fn(() => ({ ...mockVerification, save: jest.fn(async () => mockVerification) }));
  return Object.assign(ctor, m);
});

const mockContract = {
  _id: 'c-1', matchId: 'm-1', landlordId: 'user-landlord', tenantId: 'user-tenant',
  monthlyRent: 5000, status: 'active', depositStatus: 'pending',
  apartmentTitle: 'דירה יפה',
  startDate: new Date('2026-01-01'), endDate: new Date('2027-01-01'),
  landlordSignedAt: null, tenantSignedAt: null,
};

jest.mock('../src/models/mongo/RentalContract', () => {
  const m = {
    findById:           jest.fn(),
    findByIdAndUpdate:  jest.fn(),
    findOne:            jest.fn(),
    find:               jest.fn(),
    create:             jest.fn(),
  };
  const ctor = jest.fn(() => ({ ...mockContract, save: jest.fn(async () => mockContract) }));
  return Object.assign(ctor, m);
});

const mockRentPayment = {
  _id: 'rp-pay-1', contractId: 'c-1', tenantId: 'user-tenant',
  landlordId: 'user-landlord', amount: 5000, month: '2026-05', status: 'pending',
  apartmentTitle: 'דירה יפה', landlordPhone: '0501234567',
};

jest.mock('../src/models/mongo/RentPayment', () => {
  const m = {
    findById: jest.fn(),
    find:     jest.fn(),
    create:   jest.fn(),
  };
  const ctor = jest.fn(() => ({ ...mockRentPayment, save: jest.fn(async () => mockRentPayment) }));
  return Object.assign(ctor, m);
});

const mockLease = {
  _id: 'cl-1', landlordId: 'user-landlord', tenantId: 'user-tenant',
  businessName: 'החברה שלי', businessType: 'office', monthlyRent: 15000,
  annualCamEstimate: 6000, camReconciliationMonth: 1, camHistory: [],
  startDate: new Date('2026-01-01'), endDate: new Date('2027-01-01'),
  status: 'active',
};

jest.mock('../src/models/mongo/CommercialLease', () => {
  const m = {
    findById: jest.fn(),
    find:     jest.fn(),
    create:   jest.fn(),
  };
  const ctor = jest.fn(() => ({ ...mockLease, save: jest.fn(async () => mockLease) }));
  return Object.assign(ctor, m);
});

const mockPoints = {
  _id: 'up-1', userId: 'user-tenant', points: 120, level: 2,
  badges: [{ id: 'explorer', name: 'חוקר', earnedAt: new Date() }],
  lastActivityAt: new Date(),
};

jest.mock('../src/models/mongo/UserPoints', () => {
  const m = {
    findOne:          jest.fn(),
    find:             jest.fn(),
    findOneAndUpdate: jest.fn(),
  };
  const ctor = jest.fn(() => ({ ...mockPoints, save: jest.fn(async () => mockPoints) }));
  return Object.assign(ctor, m);
});

const mockService = {
  _id: 'sl-1', providerId: 'user-tenant', providerName: 'ישראל ישראלי',
  category: 'cleaning', title: 'ניקיון מקצועי', priceType: 'hourly',
  price: 80, cities: ['תל אביב'], isActive: true, rating: null, reviewCount: 0,
};

jest.mock('../src/models/mongo/ServiceListing', () => {
  const m = {
    findById:          jest.fn(),
    find:              jest.fn(),
    findOne:           jest.fn(),
    create:            jest.fn(),
    aggregate:         jest.fn(),
    findByIdAndUpdate: jest.fn(),
    countDocuments:    jest.fn(async () => 1),
  };
  const ctor = jest.fn(() => ({ ...mockService, save: jest.fn(async () => mockService) }));
  return Object.assign(ctor, m);
});

jest.mock('../src/models/mongo/ServiceReview', () => {
  const m = {
    findOne:           jest.fn(),
    findOneAndUpdate:  jest.fn(),
    find:              jest.fn(),
    create:            jest.fn(),
    aggregate:         jest.fn(),
  };
  const ctor = jest.fn(() => ({}));
  return Object.assign(ctor, m);
});

const mockDevice = {
  _id: 'd-1', leaseId: 'cl-1', landlordId: 'user-landlord', tenantId: 'user-tenant',
  deviceId: 'dev-001', name: 'כניסה ראשית', type: 'access_control', status: 'offline',
};

jest.mock('../src/models/mongo/IoTDevice', () => {
  const m = {
    findOne: jest.fn(),
    find:    jest.fn(),
    create:  jest.fn(),
  };
  const ctor = jest.fn(() => ({ ...mockDevice, save: jest.fn(async () => mockDevice) }));
  return Object.assign(ctor, m);
});

const mockTicket = {
  _id: 't-1', leaseId: 'cl-1', reporterId: 'user-tenant',
  title: 'מזגן מקולקל', priority: 'high', status: 'open',
};

jest.mock('../src/models/mongo/MaintenanceTicket', () => {
  const m = {
    findById: jest.fn(),
    find:     jest.fn(),
    create:   jest.fn(),
  };
  const ctor = jest.fn(() => ({ ...mockTicket, save: jest.fn(async () => mockTicket) }));
  return Object.assign(ctor, m);
});

const app = require('../src/app');

// ═══════════════════════════════════════════════════════════════════════════════
// F8 — Roommate Compatibility
// ═══════════════════════════════════════════════════════════════════════════════

describe('F8 — Roommate routes', () => {
  let RoommateProfile;
  beforeAll(() => { RoommateProfile = require('../src/models/mongo/RoommateProfile'); });
  beforeEach(() => jest.clearAllMocks());

  it('GET /api/roommates/profile — 401 without auth', async () => {
    const res = await request(app).get('/api/roommates/profile');
    expect(res.status).toBe(401);
  });

  it('GET /api/roommates/profile — returns profile for tenant', async () => {
    RoommateProfile.findOne.mockReturnValue(q(mockRoommate));
    const res = await request(app)
      .get('/api/roommates/profile')
      .set('Authorization', 'Bearer tenant');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('profile');
  });

  it('GET /api/roommates/profile — returns null profile when none exists', async () => {
    RoommateProfile.findOne.mockReturnValue(q(null));
    const res = await request(app)
      .get('/api/roommates/profile')
      .set('Authorization', 'Bearer tenant');
    expect(res.status).toBe(200);
    expect(res.body.profile).toBeNull();
  });

  it('GET /api/roommates/matches — returns matches array', async () => {
    RoommateProfile.findOne.mockReturnValue(q(mockRoommate));
    RoommateProfile.find.mockReturnValue(q([]));
    const res = await request(app)
      .get('/api/roommates/matches')
      .set('Authorization', 'Bearer tenant');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('matches');
    expect(Array.isArray(res.body.matches)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// F9 — Identity Screening
// ═══════════════════════════════════════════════════════════════════════════════

describe('F9 — Screening routes', () => {
  let IdentityVerification;
  beforeAll(() => { IdentityVerification = require('../src/models/mongo/IdentityVerification'); });
  beforeEach(() => jest.clearAllMocks());

  it('GET /api/screening/status — 401 without auth', async () => {
    const res = await request(app).get('/api/screening/status');
    expect(res.status).toBe(401);
  });

  it('GET /api/screening/status — returns verification doc when exists', async () => {
    IdentityVerification.findOne.mockReturnValue(q(mockVerification));
    const res = await request(app)
      .get('/api/screening/status')
      .set('Authorization', 'Bearer tenant');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('verification');
  });

  it('GET /api/screening/status — returns null when no record', async () => {
    IdentityVerification.findOne.mockReturnValue(q(null));
    const res = await request(app)
      .get('/api/screening/status')
      .set('Authorization', 'Bearer tenant');
    expect(res.status).toBe(200);
    expect(res.body.verification).toBeNull();
  });

  it('POST /api/screening/identity — 422 with short ID number', async () => {
    const res = await request(app)
      .post('/api/screening/identity')
      .set('Authorization', 'Bearer tenant')
      .send({ idNumber: '123', fullName: 'ישראל ישראלי', phone: '0501234567' });
    expect(res.status).toBe(422);
  });

  it('POST /api/screening/identity — 409 on duplicate submission', async () => {
    IdentityVerification.findOne.mockResolvedValue(mockVerification);
    const res = await request(app)
      .post('/api/screening/identity')
      .set('Authorization', 'Bearer tenant')
      .send({ idNumber: '123456789', fullName: 'ישראל ישראלי', phone: '0501234567' });
    expect(res.status).toBe(409);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// F10 — Digital Contracts
// ═══════════════════════════════════════════════════════════════════════════════

describe('F10 — Contracts routes', () => {
  let RentalContract;
  beforeAll(() => { RentalContract = require('../src/models/mongo/RentalContract'); });
  beforeEach(() => jest.clearAllMocks());

  it('GET /api/contracts — 401 without auth', async () => {
    const res = await request(app).get('/api/contracts');
    expect(res.status).toBe(401);
  });

  it('GET /api/contracts — returns list for tenant', async () => {
    RentalContract.find.mockReturnValue(q([mockContract]));
    const res = await request(app)
      .get('/api/contracts')
      .set('Authorization', 'Bearer tenant');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('contracts');
  });

  it('POST /api/contracts — 403 for tenant role', async () => {
    const res = await request(app)
      .post('/api/contracts')
      .set('Authorization', 'Bearer tenant')
      .send({ matchId: 'm-1', monthlyRent: 5000, startDate: '2026-01-01', endDate: '2027-01-01' });
    expect(res.status).toBe(403);
  });

  it('GET /api/contracts/:id — 404 for unknown id', async () => {
    RentalContract.findById.mockReturnValue(q(null));
    const res = await request(app)
      .get('/api/contracts/unknown-id')
      .set('Authorization', 'Bearer landlord');
    expect(res.status).toBe(404);
  });

  it('GET /api/contracts/:id — 403 for non-party', async () => {
    RentalContract.findById.mockReturnValue(q({
      ...mockContract,
      landlordId: 'someone-else',
      tenantId:   'someone-else-2',
    }));
    const res = await request(app)
      .get('/api/contracts/c-1')
      .set('Authorization', 'Bearer tenant');
    expect(res.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// F11 — Rent Payments
// ═══════════════════════════════════════════════════════════════════════════════

describe('F11 — Rent payments routes', () => {
  let RentPayment, RentalContract;
  beforeAll(() => {
    RentPayment    = require('../src/models/mongo/RentPayment');
    RentalContract = require('../src/models/mongo/RentalContract');
  });
  beforeEach(() => jest.clearAllMocks());

  it('GET /api/payments/rent — 401 without auth', async () => {
    const res = await request(app).get('/api/payments/rent');
    expect(res.status).toBe(401);
  });

  it('GET /api/payments/rent — returns payments for landlord', async () => {
    RentPayment.find.mockReturnValue(q([mockRentPayment]));
    const res = await request(app)
      .get('/api/payments/rent')
      .set('Authorization', 'Bearer landlord');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('payments');
  });

  it('POST /api/payments/rent — 403 for tenant role', async () => {
    const res = await request(app)
      .post('/api/payments/rent')
      .set('Authorization', 'Bearer tenant')
      .send({ contractId: 'c-1', month: '2026-05' });
    expect(res.status).toBe(403);
  });

  it('POST /api/payments/rent — 422 with bad month format', async () => {
    const res = await request(app)
      .post('/api/payments/rent')
      .set('Authorization', 'Bearer landlord')
      .send({ contractId: 'c-1', month: 'May-2026' });
    expect(res.status).toBe(422);
  });

  it('POST /api/payments/rent/:id/pay — 403 when not the tenant', async () => {
    RentPayment.findById.mockResolvedValue({ ...mockRentPayment, tenantId: 'other-tenant' });
    const res = await request(app)
      .post('/api/payments/rent/rp-pay-1/pay')
      .set('Authorization', 'Bearer tenant')
      .send({ method: 'bit' });
    expect(res.status).toBe(403);
  });

  it('POST /api/payments/rent/:id/pay — returns paymentUrl for valid tenant', async () => {
    RentPayment.findById.mockResolvedValue({
      ...mockRentPayment, save: jest.fn(async () => mockRentPayment),
    });
    const res = await request(app)
      .post('/api/payments/rent/rp-pay-1/pay')
      .set('Authorization', 'Bearer tenant')
      .send({ method: 'bit' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('paymentUrl');
  });

  it('POST /api/payments/rent/:id/mark-paid — 403 for tenant role', async () => {
    const res = await request(app)
      .post('/api/payments/rent/rp-pay-1/mark-paid')
      .set('Authorization', 'Bearer tenant');
    expect(res.status).toBe(403);
  });

  it('POST /api/payments/webhook — handles rent payment confirmation', async () => {
    RentPayment.findById.mockResolvedValue({
      ...mockRentPayment, status: 'initiated',
      save: jest.fn(async () => mockRentPayment),
    });
    const res = await request(app)
      .post('/api/payments/webhook')
      .send({ transactionId: 'tx-1', status: 'success', rentPaymentId: 'rp-pay-1' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('received', true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// F12 — Commercial Real Estate
// ═══════════════════════════════════════════════════════════════════════════════

describe('F12 — Commercial routes', () => {
  let CommercialLease;
  beforeAll(() => { CommercialLease = require('../src/models/mongo/CommercialLease'); });
  beforeEach(() => jest.clearAllMocks());

  it('GET /api/commercial — 401 without auth', async () => {
    const res = await request(app).get('/api/commercial');
    expect(res.status).toBe(401);
  });

  it('GET /api/commercial — returns lease list for landlord', async () => {
    CommercialLease.find.mockReturnValue(q([mockLease]));
    const res = await request(app)
      .get('/api/commercial')
      .set('Authorization', 'Bearer landlord');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('leases');
  });

  it('POST /api/commercial — 403 for tenant role', async () => {
    const res = await request(app)
      .post('/api/commercial')
      .set('Authorization', 'Bearer tenant')
      .send({ businessName: 'X', tenantId: 'u-2', monthlyRent: 5000, startDate: '2026-01-01', endDate: '2027-01-01' });
    expect(res.status).toBe(403);
  });

  it('POST /api/commercial — 422 with missing required fields', async () => {
    const res = await request(app)
      .post('/api/commercial')
      .set('Authorization', 'Bearer landlord')
      .send({ businessName: 'Test' });
    expect(res.status).toBe(422);
  });

  it('GET /api/commercial/:id/alerts — 404 for unknown lease', async () => {
    CommercialLease.findById.mockReturnValue(q(null));
    const res = await request(app)
      .get('/api/commercial/unknown/alerts')
      .set('Authorization', 'Bearer landlord');
    expect(res.status).toBe(404);
  });

  it('GET /api/commercial/:id/alerts — returns alerts array for party', async () => {
    CommercialLease.findById.mockReturnValue(q({
      ...mockLease,
      renewalOptionDate: new Date(Date.now() + 20 * 86400000),
    }));
    const res = await request(app)
      .get('/api/commercial/cl-1/alerts')
      .set('Authorization', 'Bearer landlord');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('alerts');
    expect(Array.isArray(res.body.alerts)).toBe(true);
    expect(res.body.alerts.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// F13 — Gamification
// ═══════════════════════════════════════════════════════════════════════════════

describe('F13 — Gamification routes', () => {
  let UserPoints;
  beforeAll(() => { UserPoints = require('../src/models/mongo/UserPoints'); });
  beforeEach(() => jest.clearAllMocks());

  it('GET /api/gamification/me — 401 without auth', async () => {
    const res = await request(app).get('/api/gamification/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/gamification/me — returns points doc when exists', async () => {
    UserPoints.findOne.mockResolvedValue(mockPoints);
    const res = await request(app)
      .get('/api/gamification/me')
      .set('Authorization', 'Bearer tenant');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('points');
  });

  it('GET /api/gamification/me — returns zero points when no record', async () => {
    UserPoints.findOne.mockResolvedValue(null);
    const res = await request(app)
      .get('/api/gamification/me')
      .set('Authorization', 'Bearer tenant');
    expect(res.status).toBe(200);
    expect(res.body.points).toBe(0);
  });

  it('POST /api/gamification/award — 400 with unknown action', async () => {
    const res = await request(app)
      .post('/api/gamification/award')
      .set('Authorization', 'Bearer tenant')
      .send({ action: 'invalid_action' });
    expect(res.status).toBe(400);
  });

  it('POST /api/gamification/award — awards points for valid action', async () => {
    UserPoints.findOneAndUpdate.mockResolvedValue({
      ...mockPoints, points: 121,
    });
    const res = await request(app)
      .post('/api/gamification/award')
      .set('Authorization', 'Bearer tenant')
      .send({ action: 'swipe' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalPoints');
  });

  it('GET /api/gamification/leaderboard — returns leaderboard array', async () => {
    UserPoints.find.mockReturnValue(q([mockPoints]));
    const res = await request(app)
      .get('/api/gamification/leaderboard')
      .set('Authorization', 'Bearer tenant');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('leaderboard');
    expect(Array.isArray(res.body.leaderboard)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// F14 — Services Marketplace
// ═══════════════════════════════════════════════════════════════════════════════

describe('F14 — Services routes', () => {
  let ServiceListing, ServiceReview;
  beforeAll(() => {
    ServiceListing = require('../src/models/mongo/ServiceListing');
    ServiceReview  = require('../src/models/mongo/ServiceReview');
  });
  beforeEach(() => jest.clearAllMocks());

  it('GET /api/services — 401 without auth', async () => {
    const res = await request(app).get('/api/services');
    expect(res.status).toBe(401);
  });

  it('GET /api/services — returns services list', async () => {
    ServiceListing.find.mockReturnValue(q([mockService]));
    const res = await request(app)
      .get('/api/services')
      .set('Authorization', 'Bearer tenant');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('services');
  });

  it('POST /api/services — 422 with missing title', async () => {
    const res = await request(app)
      .post('/api/services')
      .set('Authorization', 'Bearer tenant')
      .send({ category: 'cleaning' });
    expect(res.status).toBe(422);
  });

  it('GET /api/services/:id — 404 for unknown service', async () => {
    ServiceListing.findById.mockResolvedValue(null);
    const res = await request(app)
      .get('/api/services/unknown')
      .set('Authorization', 'Bearer tenant');
    expect(res.status).toBe(404);
  });

  it('GET /api/services/:id — returns service with reviews', async () => {
    ServiceListing.findById.mockResolvedValue(mockService);
    ServiceReview.find.mockReturnValue(q([]));
    const res = await request(app)
      .get('/api/services/sl-1')
      .set('Authorization', 'Bearer tenant');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('service');
    expect(res.body).toHaveProperty('reviews');
  });

  it('POST /api/services/:id/review — 422 with out-of-range rating', async () => {
    const res = await request(app)
      .post('/api/services/sl-1/review')
      .set('Authorization', 'Bearer tenant')
      .send({ rating: 6, comment: 'טוב' });
    expect(res.status).toBe(422);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// F15 — IoT
// ═══════════════════════════════════════════════════════════════════════════════

describe('F15 — IoT routes', () => {
  let IoTDevice, MaintenanceTicket, CommercialLease;
  beforeAll(() => {
    IoTDevice         = require('../src/models/mongo/IoTDevice');
    MaintenanceTicket = require('../src/models/mongo/MaintenanceTicket');
    CommercialLease   = require('../src/models/mongo/CommercialLease');
  });
  beforeEach(() => jest.clearAllMocks());

  it('GET /api/iot/devices — 401 without auth', async () => {
    const res = await request(app).get('/api/iot/devices');
    expect(res.status).toBe(401);
  });

  it('GET /api/iot/devices — returns device list', async () => {
    CommercialLease.find.mockReturnValue(q([{ _id: 'cl-1' }]));
    IoTDevice.find.mockReturnValue(q([mockDevice]));
    const res = await request(app)
      .get('/api/iot/devices')
      .set('Authorization', 'Bearer landlord');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('devices');
  });

  it('POST /api/iot/devices — 422 with missing required fields', async () => {
    const res = await request(app)
      .post('/api/iot/devices')
      .set('Authorization', 'Bearer landlord')
      .send({ leaseId: 'cl-1' });
    expect(res.status).toBe(422);
  });

  it('POST /api/iot/devices — rejects tenant that does not match lease', async () => {
    CommercialLease.findById.mockReturnValue(q({ ...mockLease, tenantId: 'user-tenant' }));
    const res = await request(app)
      .post('/api/iot/devices')
      .set('Authorization', 'Bearer landlord')
      .send({
        leaseId: 'cl-1',
        tenantId: 'other-tenant',
        deviceId: 'dev-002',
        name: 'כניסה אחורית',
        type: 'access_control',
      });
    expect(res.status).toBe(400);
    expect(IoTDevice.create).not.toHaveBeenCalled();
  });

  it('POST /api/iot/devices — stores tenant and landlord from lease', async () => {
    CommercialLease.findById.mockReturnValue(q({ ...mockLease, tenantId: 'user-tenant' }));
    IoTDevice.create.mockResolvedValueOnce(mockDevice);
    const res = await request(app)
      .post('/api/iot/devices')
      .set('Authorization', 'Bearer landlord')
      .send({
        leaseId: 'cl-1',
        tenantId: 'user-tenant',
        deviceId: 'dev-001',
        name: 'כניסה ראשית',
        type: 'access_control',
      });
    expect(res.status).toBe(201);
    expect(IoTDevice.create).toHaveBeenCalledWith(expect.objectContaining({
      leaseId: 'cl-1',
      landlordId: 'user-landlord',
      tenantId: 'user-tenant',
    }));
  });

  it('GET /api/iot/devices — filters by leases caller is party to', async () => {
    CommercialLease.find.mockReturnValue(q([{ _id: 'cl-1' }, { _id: 'cl-2' }]));
    IoTDevice.find.mockReturnValue(q([mockDevice]));
    const res = await request(app)
      .get('/api/iot/devices')
      .set('Authorization', 'Bearer tenant');
    expect(res.status).toBe(200);
    expect(IoTDevice.find).toHaveBeenCalledWith({ leaseId: { $in: ['cl-1', 'cl-2'] } });
    expect(res.body).toHaveProperty('devices');
  });

  it('GET /api/iot/maintenance — returns ticket list', async () => {
    CommercialLease.find.mockReturnValue(q([{ _id: 'cl-1' }]));
    MaintenanceTicket.find.mockReturnValue(q([mockTicket]));
    const res = await request(app)
      .get('/api/iot/maintenance')
      .set('Authorization', 'Bearer tenant');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('tickets');
  });

  it('POST /api/iot/maintenance — 422 with missing title', async () => {
    const res = await request(app)
      .post('/api/iot/maintenance')
      .set('Authorization', 'Bearer tenant')
      .send({ leaseId: 'cl-1', priority: 'high' });
    expect(res.status).toBe(422);
  });

  it('POST /api/iot/access — 404 for unknown device', async () => {
    IoTDevice.findOne.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/iot/access')
      .set('Authorization', 'Bearer tenant')
      .send({ deviceId: 'unknown', action: 'unlock' });
    expect(res.status).toBe(404);
  });

  it('POST /api/iot/access — grants access for party with known device', async () => {
    IoTDevice.findOne.mockResolvedValue({ ...mockDevice, save: jest.fn(async () => mockDevice) });
    const res = await request(app)
      .post('/api/iot/access')
      .set('Authorization', 'Bearer tenant')
      .send({ deviceId: 'dev-001', action: 'unlock' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('granted', true);
  });
});
