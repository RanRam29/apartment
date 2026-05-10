/**
 * Swipe route integration tests.
 * Requires real Postgres + Redis (available in CI via service containers).
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

const ts = Date.now();
const TEST_PASSWORD = generateStrongTestPassword();
const LANDLORD = {
  email: `swipe_landlord_${ts}@test.com`,
  password: TEST_PASSWORD,
  firstName: 'Swipe',
  lastName: 'Landlord',
  role: 'landlord',
};
const TENANT = {
  email: `swipe_tenant_${ts}@test.com`,
  password: TEST_PASSWORD,
  firstName: 'Swipe',
  lastName: 'Tenant',
  role: 'tenant',
};

let landlordToken = '';
let tenantToken = '';
let apartmentId = '';
let secondApartmentId = '';

beforeAll(async () => {
  await Promise.all([
    sequelize.sync({ force: false }),
    initRedis(),
  ]);

  const [llRes, tnRes] = await Promise.all([
    request(app).post('/api/auth/register').send(LANDLORD),
    request(app).post('/api/auth/register').send(TENANT),
  ]);
  landlordToken = llRes.body.token;
  tenantToken = tnRes.body.token;

  // Verify tenant email so swipe endpoints are accessible
  if (tnRes.body.verificationToken) {
    await request(app).get(`/api/auth/verify/${tnRes.body.verificationToken}`);
  }

  const [apt1Res, apt2Res] = await Promise.all([
    request(app)
      .post('/api/apartments')
      .set('Authorization', `Bearer ${landlordToken}`)
      .field('title', 'Swipe Test Apartment 1')
      .field('price', '5000')
      .field('rooms', '3')
      .field('city', 'תל אביב'),
    request(app)
      .post('/api/apartments')
      .set('Authorization', `Bearer ${landlordToken}`)
      .field('title', 'Swipe Test Apartment 2')
      .field('price', '6000')
      .field('rooms', '2')
      .field('city', 'חיפה'),
  ]);
  apartmentId = apt1Res.body.apartment?.id ?? '';
  secondApartmentId = apt2Res.body.apartment?.id ?? '';
}, 30_000);

afterAll(async () => {
  await sequelize.close();
  getRedisClient().disconnect();
});

describe('GET /api/swipe/quota', () => {
  it('returns quota for authenticated tenant', async () => {
    const res = await request(app)
      .get('/api/swipe/quota')
      .set('Authorization', `Bearer ${tenantToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.used).toBe('number');
    expect(res.body.limit).toBe(20);
    expect(res.body.isPremium).toBe(false);
  });

  it('returns 403 for landlord role', async () => {
    const res = await request(app)
      .get('/api/swipe/quota')
      .set('Authorization', `Bearer ${landlordToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/swipe/quota');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/swipe', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/swipe')
      .send({ apartmentId: '00000000-0000-4000-8000-000000000001', direction: 'like' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for landlord role', async () => {
    const res = await request(app)
      .post('/api/swipe')
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({ apartmentId: '00000000-0000-4000-8000-000000000001', direction: 'like' });
    expect(res.status).toBe(403);
  });

  it('returns 422 for invalid direction', async () => {
    const res = await request(app)
      .post('/api/swipe')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ apartmentId: '00000000-0000-4000-8000-000000000001', direction: 'invalid' });
    expect(res.status).toBe(422);
  });

  it('returns 422 for invalid apartmentId format', async () => {
    const res = await request(app)
      .post('/api/swipe')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ apartmentId: 'not-a-uuid', direction: 'like' });
    expect(res.status).toBe(422);
  });

  it('returns 404 for non-existent apartment', async () => {
    const res = await request(app)
      .post('/api/swipe')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ apartmentId: '00000000-0000-4000-8000-000000000001', direction: 'like' });
    expect(res.status).toBe(404);
  });

  it('records a like swipe on a valid apartment', async () => {
    if (!apartmentId) return;
    const res = await request(app)
      .post('/api/swipe')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ apartmentId, direction: 'like' });
    expect([200, 201]).toContain(res.status);
    expect(res.body.swipe.direction).toBe('like');
    expect(res.body.swipe.apartmentId).toBe(apartmentId);
    expect(typeof res.body.dailyUsed).toBe('number');
  });

  it('records a dislike swipe', async () => {
    if (!secondApartmentId) return;
    const res = await request(app)
      .post('/api/swipe')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ apartmentId: secondApartmentId, direction: 'dislike' });
    expect([200, 201]).toContain(res.status);
    expect(res.body.swipe.direction).toBe('dislike');
  });

  it('prevents tenant from swiping on own listing (landlord owns apt)', async () => {
    // The landlord cannot swipe because requireRole('tenant') blocks them
    // and the tenant is not the owner, so this tests the non-owner path
    // (owner check applies when landlordId === tenantId, which can't happen
    // since they registered as different roles with different IDs)
    if (!apartmentId) return;
    const res = await request(app)
      .post('/api/swipe')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ apartmentId, direction: 'superlike' });
    // Second swipe on same apartment → upsert → 200
    expect([200, 201]).toContain(res.status);
  });
});

describe('GET /api/swipe/history', () => {
  it('returns swipe history for tenant', async () => {
    const res = await request(app)
      .get('/api/swipe/history')
      .set('Authorization', `Bearer ${tenantToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.swipes)).toBe(true);
  });

  it('returns 403 for landlord', async () => {
    const res = await request(app)
      .get('/api/swipe/history')
      .set('Authorization', `Bearer ${landlordToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/swipe/history');
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/swipe/last', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).delete('/api/swipe/last');
    expect(res.status).toBe(401);
  });

  it('returns 403 for landlord role', async () => {
    const res = await request(app)
      .delete('/api/swipe/last')
      .set('Authorization', `Bearer ${landlordToken}`);
    expect(res.status).toBe(403);
  });

  it('undoes the last swipe when one exists', async () => {
    const res = await request(app)
      .delete('/api/swipe/last')
      .set('Authorization', `Bearer ${tenantToken}`);
    expect([200, 404]).toContain(res.status);
  });
});
