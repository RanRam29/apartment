const request = require('supertest');

jest.mock('../src/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    const auth = req.headers.authorization || '';
    const token = auth.replace('Bearer ', '').trim();
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    if (token === 'tenant') {
      req.user = { id: 'tenant-1', role: 'tenant', isPremium: false };
      return next();
    }
    if (token === 'landlord') {
      req.user = { id: 'landlord-1', role: 'landlord', isPremium: false };
      return next();
    }
    return res.status(401).json({ error: 'Invalid or expired token' });
  },
  requireRole: (...roles) => (req, res, next) => (
    roles.includes(req.user?.role)
      ? next()
      : res.status(403).json({ error: 'Insufficient permissions' })
  ),
  requireVerified: (_req, _res, next) => next(),
}));

jest.mock('../src/config/redis', () => {
  const store = new Map();
  return {
    getRedisClient: () => ({
      get: jest.fn(async (key) => store.get(key) ?? null),
      incr: jest.fn(async (key) => {
        const next = Number(store.get(key) || 0) + 1;
        store.set(key, String(next));
        return next;
      }),
      decr: jest.fn(async (key) => {
        const next = Math.max(0, Number(store.get(key) || 0) - 1);
        store.set(key, String(next));
        return next;
      }),
      expireat: jest.fn(async () => 1),
      del: jest.fn(async (key) => {
        store.delete(key);
        return 1;
      }),
      setex: jest.fn(async (key, ttl, value) => {
        store.set(key, value);
        return 'OK';
      }),
    }),
    cacheGet: jest.fn(async () => null),
    cacheSet: jest.fn(async () => undefined),
    cacheDel: jest.fn(async () => undefined),
  };
});

jest.mock('../src/config/socket', () => ({
  getIO: () => ({ to: () => ({ emit: () => {} }) }),
}));

jest.mock('../src/services/pushService', () => ({
  sendPushNotification: jest.fn(async () => true),
}));

jest.mock('../src/services/uploadService', () => ({
  upload: {
    array: () => (req, _res, next) => {
      req.files = [];
      next();
    },
    single: () => (req, _res, next) => {
      req.file = null;
      next();
    },
  },
  uploadMany: jest.fn(async () => [{ url: 'https://cdn.test/image.jpg', publicId: 'img_1' }]),
}));

jest.mock('../src/services/matchingService', () => ({
  handleSwipeMatch: jest.fn(async (tenantId, apartmentId) => ({
    id: `match-${tenantId}-${apartmentId}`,
    status: 'pending',
  })),
  acceptMatch: jest.fn(async (matchId) => ({
    id: matchId,
    tenantId: 'tenant-1',
    landlordId: 'landlord-1',
    status: 'accepted',
  })),
}));

jest.mock('../src/models', () => ({
  Swipe: {
    upsert: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
  },
  Apartment: {
    findOne: jest.fn(),
    create: jest.fn(),
    increment: jest.fn(async () => undefined),
    decrement: jest.fn(async () => undefined),
  },
  Match: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(async () => [1]),
  },
  Message: {
    find: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(async () => ({ modifiedCount: 0 })),
    aggregate: jest.fn(async () => []),
  },
  User: {},
  UserPreferences: {
    updateOne: jest.fn(async () => undefined),
  },
}));

const app = require('../src/app');
const { Swipe, Apartment, Match, Message } = require('../src/models');

describe('Critical journey routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates listing, updates listing, and deletes listing', async () => {
    Apartment.create.mockResolvedValue({
      id: 'apt-1',
      city: 'Tel Aviv',
      isActive: true,
      update: jest.fn(async function apply(updates) {
        Object.assign(this, updates);
        return this;
      }),
      destroy: jest.fn(async () => undefined),
    });
    Apartment.findOne.mockResolvedValue({
      id: 'apt-1',
      city: 'Tel Aviv',
      isActive: true,
      update: jest.fn(async function apply(updates) {
        Object.assign(this, updates);
        return this;
      }),
      destroy: jest.fn(async () => undefined),
    });

    const created = await request(app)
      .post('/api/apartments')
      .set('Authorization', 'Bearer landlord')
      .send({ title: 'Nice apt', price: 4200, rooms: 3, city: 'Tel Aviv' });

    expect(created.status).toBe(201);
    expect(created.body.apartment.id).toBe('apt-1');

    const updated = await request(app)
      .patch('/api/apartments/apt-1')
      .set('Authorization', 'Bearer landlord')
      .send({ title: 'Updated title' });

    expect(updated.status).toBe(200);
    expect(updated.body.apartment.title).toBe('Updated title');

    const deleted = await request(app)
      .delete('/api/apartments/apt-1')
      .set('Authorization', 'Bearer landlord');

    expect(deleted.status).toBe(200);
    expect(deleted.body.message).toBe('Apartment deleted');
  });

  it('swipe creates/returns pending match and exposes it in matches list', async () => {
    Swipe.upsert.mockResolvedValue([{ id: 'swipe-1' }, true]);
    Apartment.findOne.mockResolvedValue({ id: 'apt-1', landlordId: 'landlord-1' });
    Match.findAll.mockResolvedValue([
      {
        id: 'match-tenant-1-apt-1',
        toJSON: () => ({ id: 'match-tenant-1-apt-1', status: 'pending' }),
      },
    ]);

    const swipeRes = await request(app)
      .post('/api/swipe')
      .set('Authorization', 'Bearer tenant')
      .send({ apartmentId: 'd290f1ee-6c54-4b01-90e6-d701748f0851', direction: 'like' });

    expect(swipeRes.status).toBe(201);
    expect(swipeRes.body.match.status).toBe('pending');
    expect(typeof swipeRes.body.dailyUsed).toBe('number');

    const matchesRes = await request(app)
      .get('/api/matches')
      .set('Authorization', 'Bearer tenant');

    expect(matchesRes.status).toBe(200);
    expect(matchesRes.body.matches).toHaveLength(1);
    expect(matchesRes.body.matches[0].id).toBe('match-tenant-1-apt-1');
  });

  it('supports accept/reject transitions for landlord matches', async () => {
    Match.findOne.mockResolvedValue({
      id: 'match-2',
      tenantId: 'tenant-1',
      landlordId: 'landlord-1',
      status: 'pending',
      update: jest.fn(async function apply(updates) {
        Object.assign(this, updates);
        return this;
      }),
    });

    const acceptRes = await request(app)
      .post('/api/matches/match-1/accept')
      .set('Authorization', 'Bearer landlord');
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.match.status).toBe('accepted');

    const rejectRes = await request(app)
      .post('/api/matches/match-2/reject')
      .set('Authorization', 'Bearer landlord');
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.match.status).toBe('rejected');
  });

  it('sends and fetches chat messages for accepted match participants', async () => {
    Match.findOne.mockResolvedValue({
      id: 'match-1',
      tenantId: 'tenant-1',
      landlordId: 'landlord-1',
      status: 'accepted',
    });
    Message.create.mockResolvedValue({
      _id: 'msg-1',
      matchId: 'match-1',
      senderId: 'tenant-1',
      content: 'Hello landlord',
      type: 'text',
      imageUrl: null,
      createdAt: new Date().toISOString(),
    });
    Message.find.mockReturnValue({
      sort: () => ({
        limit: () => ({
          lean: async () => [
            { _id: 'msg-old', content: 'older', createdAt: '2024-01-01T00:00:00.000Z' },
            { _id: 'msg-new', content: 'newer', createdAt: '2024-01-01T00:01:00.000Z' },
          ],
        }),
      }),
    });

    const postRes = await request(app)
      .post('/api/chat/match-1')
      .set('Authorization', 'Bearer tenant')
      .send({ content: 'Hello landlord' });

    expect(postRes.status).toBe(201);
    expect(postRes.body.message.content).toBe('Hello landlord');

    const getRes = await request(app)
      .get('/api/chat/match-1?limit=30')
      .set('Authorization', 'Bearer landlord');

    expect(getRes.status).toBe(200);
    expect(getRes.body.messages).toHaveLength(2);
    expect(getRes.body.messages[0].content).toBe('newer');
  });
});
