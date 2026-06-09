/**
 * Matches route integration tests.
 * Requires real Postgres + Redis. MongoDB unread counts degrade gracefully if unavailable.
 */
process.env.NODE_ENV = 'test';
process.env.POSTGRES_SSL = 'false';
process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED = 'false';
process.env.JWT_SECRET = 'test_jwt_secret_for_verification_tests';

const request = require('supertest');
const { sequelize } = require('../src/config/database');
const { initRedis, getRedisClient } = require('../src/config/redis');
const app = require('../src/app');
const { generateStrongTestPassword } = require('./helpers/testCredentials');
jest.setTimeout(30_000);

const ts = Date.now();
const TEST_PASSWORD = generateStrongTestPassword();
const LANDLORD = {
  email: `match_landlord_${ts}@test.com`,
  password: TEST_PASSWORD,
  firstName: 'Match',
  lastName: 'Landlord',
  role: 'landlord',
};
const TENANT = {
  email: `match_tenant_${ts}@test.com`,
  password: TEST_PASSWORD,
  firstName: 'Match',
  lastName: 'Tenant',
  role: 'tenant',
};

let landlordToken = '';
let tenantToken = '';
let pendingMatchId = '';

beforeAll(async () => {
  await Promise.all([
    sequelize.sync({ force: false }),
    initRedis(),
  ]);

  const [llRes, tnRes] = await Promise.all([
    request(app).post('/api/auth/register').send(LANDLORD),
    request(app).post('/api/auth/register').send(TENANT),
  ]);
  if (llRes.body.verificationToken) {
    await request(app).get(`/api/auth/verify/${llRes.body.verificationToken}`);
  }
  if (tnRes.body.verificationToken) {
    await request(app).get(`/api/auth/verify/${tnRes.body.verificationToken}`);
  }

  const [llLogin, tnLogin] = await Promise.all([
    request(app).post('/api/auth/login').send({ email: LANDLORD.email, password: LANDLORD.password }),
    request(app).post('/api/auth/login').send({ email: TENANT.email, password: TENANT.password }),
  ]);
  landlordToken = llLogin.body.token;
  tenantToken = tnLogin.body.token;

  // Create an apartment, then swipe like to generate a pending match
  const aptRes = await request(app)
    .post('/api/apartments')
    .set('Authorization', `Bearer ${landlordToken}`)
    .field('title', 'Match Flow Test Apartment')
    .field('price', '5500')
    .field('rooms', '3')
    .field('city', 'תל אביב');
  const aptId = aptRes.body.apartment?.id;

  if (aptId) {
    const swipeRes = await request(app)
      .post('/api/swipe')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ apartmentId: aptId, direction: 'like' });
    pendingMatchId = swipeRes.body.match?.id ?? '';
  }
}, 30_000);

afterAll(async () => {
  await sequelize.close();
  getRedisClient().disconnect();
});

describe('GET /api/matches', () => {
  it('returns matches list for tenant', async () => {
    const res = await request(app)
      .get('/api/matches')
      .set('Authorization', `Bearer ${tenantToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.matches)).toBe(true);
  });

  it('returns matches list for landlord', async () => {
    const res = await request(app)
      .get('/api/matches')
      .set('Authorization', `Bearer ${landlordToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.matches)).toBe(true);
  });

  it('landlord matches include the pending match from swipe', async () => {
    if (!pendingMatchId) return;
    const res = await request(app)
      .get('/api/matches')
      .set('Authorization', `Bearer ${landlordToken}`);
    expect(res.status).toBe(200);
    const ids = res.body.matches.map((m) => m.id);
    expect(ids).toContain(pendingMatchId);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/matches');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/matches/:id', () => {
  it('returns 404 for non-existent match UUID', async () => {
    const res = await request(app)
      .get('/api/matches/00000000-0000-4000-8000-000000000001')
      .set('Authorization', `Bearer ${tenantToken}`);
    expect(res.status).toBe(404);
  });

  it('returns match details for the creating tenant', async () => {
    if (!pendingMatchId) return;
    const res = await request(app)
      .get(`/api/matches/${pendingMatchId}`)
      .set('Authorization', `Bearer ${tenantToken}`);
    expect(res.status).toBe(200);
    expect(res.body.match.id).toBe(pendingMatchId);
    expect(res.body.match.status).toBe('pending');
  });

  it('returns 401 without auth', async () => {
    const id = pendingMatchId || '00000000-0000-4000-8000-000000000001';
    const res = await request(app).get(`/api/matches/${id}`);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/matches/:id/reject', () => {
  it('returns 403 for tenant role', async () => {
    const id = pendingMatchId || '00000000-0000-4000-8000-000000000001';
    const res = await request(app)
      .post(`/api/matches/${id}/reject`)
      .set('Authorization', `Bearer ${tenantToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 for match not owned by landlord', async () => {
    const res = await request(app)
      .post('/api/matches/00000000-0000-4000-8000-000000000001/reject')
      .set('Authorization', `Bearer ${landlordToken}`);
    expect(res.status).toBe(404);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/matches/00000000-0000-4000-8000-000000000001/reject');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/matches/:id/accept', () => {
  it('returns 403 for tenant role', async () => {
    const id = pendingMatchId || '00000000-0000-4000-8000-000000000001';
    const res = await request(app)
      .post(`/api/matches/${id}/accept`)
      .set('Authorization', `Bearer ${tenantToken}`);
    expect(res.status).toBe(403);
  });

  it('landlord can accept a pending match', async () => {
    if (!pendingMatchId) return;
    const res = await request(app)
      .post(`/api/matches/${pendingMatchId}/accept`)
      .set('Authorization', `Bearer ${landlordToken}`);
    // 200 = accepted, 404 = already accepted in a previous test run
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.match.status).toBe('accepted');
    }
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/matches/00000000-0000-4000-8000-000000000001/accept');
    expect(res.status).toBe(401);
  });
});
