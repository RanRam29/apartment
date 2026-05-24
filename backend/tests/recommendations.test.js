const request = require('supertest');

jest.mock('../src/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'tenant-1', role: 'tenant' };
    next();
  },
  requireRole: (...roles) => (req, res, next) => (
    roles.includes(req.user?.role)
      ? next()
      : res.status(403).json({ error: 'Insufficient permissions' })
  ),
  requireVerified: (_req, _res, next) => next(),
}));

jest.mock('../src/services/geminiService', () => ({
  parseSearchQuery: jest.fn(async () => ({ city: 'תל אביב', maxPrice: 7000, minRooms: 2 })),
}));

jest.mock('../src/config/redis', () => ({
  cacheGet: jest.fn(async () => null),
  cacheSet: jest.fn(async () => undefined),
  cacheDel: jest.fn(async () => undefined),
  getRedisClient: jest.fn(),
}));

jest.mock('../src/services/aiServiceClient', () => ({
  scoreApartmentsForUser: jest.fn(async (_userId, apartments) =>
    apartments.map((apt, index) => ({ ...apt, _score: 100 - index }))
  ),
}));

jest.mock('../src/models', () => ({
  Apartment: {
    findAll: jest.fn(async () => [{
      id: 'apt-1',
      title: 'Apt',
      price: 5000,
      city: 'תל אביב',
      rooms: 3,
      amenities: [],
      toJSON() {
        return {
          id: this.id,
          title: this.title,
          price: this.price,
          city: this.city,
          rooms: this.rooms,
          amenities: this.amenities,
        };
      },
    }]),
  },
  Swipe: {
    findAll: jest.fn(async () => []),
  },
  User: {},
  Match: {},
  Message: {},
  UserPreferences: {
    updateOne: jest.fn(async () => undefined),
    findOne: jest.fn(() => ({ lean: async () => null })),
    findOneAndUpdate: jest.fn(async () => ({ userId: 'tenant-1', cities: ['תל אביב'] })),
  },
}));

const app = require('../src/app');
const { parseSearchQuery } = require('../src/services/geminiService');
const { UserPreferences } = require('../src/models');

describe('Recommendations routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects too-short NLP query with 422', async () => {
    const res = await request(app)
      .post('/api/recommendations/search')
      .set('Authorization', 'Bearer token')
      .send({ query: 'a' });
    expect(res.status).toBe(422);
  });

  it('returns NLP search results with overrides', async () => {
    const res = await request(app)
      .post('/api/recommendations/search')
      .set('Authorization', 'Bearer token')
      .send({ query: 'דירה בתל אביב', maxPrice: 6500 });

    expect(res.status).toBe(200);
    expect(parseSearchQuery).toHaveBeenCalled();
    expect(res.body.filters.maxPrice).toBe(6500);
    expect(Array.isArray(res.body.apartments)).toBe(true);
  });

  it('returns personalized recommendations', async () => {
    const res = await request(app)
      .get('/api/recommendations/personalized')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.apartments)).toBe(true);
    expect(res.body.apartments[0]._score).toBeDefined();
  });

  it('scores apartments via POST /score', async () => {
    const res = await request(app)
      .post('/api/recommendations/score')
      .set('Authorization', 'Bearer token')
      .send({ apartments: [{ id: 'apt-1', price: 5000, city: 'תל אביב', rooms: 3, amenities: [] }] });

    expect(res.status).toBe(200);
    expect(res.body.apartments[0]._score).toBe(100);
  });

  it('saves and retrieves preferences', async () => {
    const saveRes = await request(app)
      .post('/api/recommendations/preferences')
      .set('Authorization', 'Bearer token')
      .send({ cities: ['תל אביב'], budget: { min: 3000, max: 7000 } });
    expect(saveRes.status).toBe(200);

    UserPreferences.findOne.mockReturnValueOnce({
      lean: async () => ({
        budget: { min: 3000, max: 7000 },
        cities: ['תל אביב'],
        rooms: { min: 2, max: 4 },
        requiredAmenities: [],
        petsAllowed: false,
      }),
    });
    const getRes = await request(app)
      .get('/api/recommendations/preferences')
      .set('Authorization', 'Bearer token');
    expect(getRes.status).toBe(200);
    expect(getRes.body.preferences.cities).toContain('תל אביב');
  });
});
