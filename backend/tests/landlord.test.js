/**
 * Landlord dashboard and leads integration tests.
 * Requires real Postgres + Redis.
 */
process.env.NODE_ENV = 'test';
process.env.POSTGRES_SSL = 'false';
process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED = 'false';
process.env.JWT_SECRET = 'test_jwt_secret_for_verification_tests';

const request = require('supertest');
const { sequelize } = require('../src/config/database');
const { initRedis, getRedisClient } = require('../src/config/redis');
const app = require('../src/app');

const ts = Date.now();
const LANDLORD = {
  email: `ll_dashboard_${ts}@test.com`,
  password: 'Test1234!',
  firstName: 'Dashboard',
  lastName: 'Landlord',
  role: 'landlord',
};
const TENANT = {
  email: `ll_tenant_${ts}@test.com`,
  password: 'Test1234!',
  firstName: 'Dashboard',
  lastName: 'Tenant',
  role: 'tenant',
};

let landlordToken = '';
let tenantToken = '';

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
  if (tnRes.body.verificationToken) {
    await request(app).get(`/api/auth/verify/${tnRes.body.verificationToken}`);
  }

  // Create a listing and generate a lead via swipe
  const aptRes = await request(app)
    .post('/api/apartments')
    .set('Authorization', `Bearer ${landlordToken}`)
    .field('title', 'Dashboard Test Apartment')
    .field('price', '6000')
    .field('rooms', '3')
    .field('city', 'ירושלים');

  if (aptRes.body.apartment?.id) {
    await request(app)
      .post('/api/swipe')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ apartmentId: aptRes.body.apartment.id, direction: 'like' });
  }
}, 30_000);

afterAll(async () => {
  await sequelize.close();
  getRedisClient().disconnect();
});

describe('GET /api/landlord/dashboard', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/landlord/dashboard');
    expect(res.status).toBe(401);
  });

  it('returns 403 for tenant role', async () => {
    const res = await request(app)
      .get('/api/landlord/dashboard')
      .set('Authorization', `Bearer ${tenantToken}`);
    expect(res.status).toBe(403);
  });

  it('returns dashboard data for landlord', async () => {
    const res = await request(app)
      .get('/api/landlord/dashboard')
      .set('Authorization', `Bearer ${landlordToken}`);
    expect(res.status).toBe(200);
    expect(res.body.summary).toBeDefined();
    expect(typeof res.body.summary.totalListings).toBe('number');
    expect(typeof res.body.summary.activeListings).toBe('number');
    expect(typeof res.body.summary.totalViews).toBe('number');
    expect(Array.isArray(res.body.listings)).toBe(true);
    expect(Array.isArray(res.body.recentPendingMatches)).toBe(true);
  });

  it('dashboard shows at least 1 listing after creation', async () => {
    const res = await request(app)
      .get('/api/landlord/dashboard')
      .set('Authorization', `Bearer ${landlordToken}`);
    expect(res.status).toBe(200);
    expect(res.body.summary.totalListings).toBeGreaterThanOrEqual(1);
  });
});

describe('GET /api/landlord/leads', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/landlord/leads');
    expect(res.status).toBe(401);
  });

  it('returns 403 for tenant role', async () => {
    const res = await request(app)
      .get('/api/landlord/leads')
      .set('Authorization', `Bearer ${tenantToken}`);
    expect(res.status).toBe(403);
  });

  it('returns paginated leads for landlord', async () => {
    const res = await request(app)
      .get('/api/landlord/leads')
      .set('Authorization', `Bearer ${landlordToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.leads)).toBe(true);
    expect(typeof res.body.total).toBe('number');
    expect(typeof res.body.page).toBe('number');
    expect(typeof res.body.totalPages).toBe('number');
  });

  it('includes the pending lead from swipe', async () => {
    const res = await request(app)
      .get('/api/landlord/leads?status=pending')
      .set('Authorization', `Bearer ${landlordToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  it('supports status filter', async () => {
    const res = await request(app)
      .get('/api/landlord/leads?status=accepted')
      .set('Authorization', `Bearer ${landlordToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.leads)).toBe(true);
  });
});
