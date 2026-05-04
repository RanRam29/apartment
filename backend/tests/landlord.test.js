/**
 * Landlord dashboard API integration tests.
 * Requires Postgres + Redis (provided by CI service containers).
 */
const request = require('supertest');
const { sequelize } = require('../src/config/database');
const { initRedis, getRedisClient } = require('../src/config/redis');
const app = require('../src/app');

const LANDLORD = {
  email: `dash_landlord_${Date.now()}@test.com`,
  password: 'Test1234!',
  firstName: 'Dash',
  lastName: 'Landlord',
  role: 'landlord',
};

const TENANT = {
  email: `dash_tenant_${Date.now()}@test.com`,
  password: 'Test1234!',
  firstName: 'Dash',
  lastName: 'Tenant',
  role: 'tenant',
};

let landlordToken = '';
let tenantToken   = '';

beforeAll(async () => {
  await Promise.all([sequelize.sync({ force: false }), initRedis()]);

  const [lr, tr] = await Promise.all([
    request(app).post('/api/auth/register').send(LANDLORD),
    request(app).post('/api/auth/register').send(TENANT),
  ]);
  landlordToken = lr.body.token;
  tenantToken   = tr.body.token;
}, 30_000);

afterAll(async () => {
  // --forceExit in jest handles connection cleanup
});

describe('GET /api/landlord/dashboard', () => {
  it('landlord receives dashboard data', async () => {
    const res = await request(app)
      .get('/api/landlord/dashboard')
      .set('Authorization', `Bearer ${landlordToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('summary');
    expect(res.body).toHaveProperty('listings');
    expect(res.body).toHaveProperty('recentPendingMatches');
    expect(res.body.summary).toHaveProperty('totalListings');
    expect(res.body.summary).toHaveProperty('totalViews');
    expect(res.body.summary).toHaveProperty('conversionRate');
    expect(res.body.summary).toHaveProperty('matches');
  });

  it('tenant cannot access landlord dashboard', async () => {
    const res = await request(app)
      .get('/api/landlord/dashboard')
      .set('Authorization', `Bearer ${tenantToken}`);

    expect(res.status).toBe(403);
  });

  it('unauthenticated request is rejected', async () => {
    const res = await request(app).get('/api/landlord/dashboard');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/landlord/leads', () => {
  it('landlord can list leads', async () => {
    const res = await request(app)
      .get('/api/landlord/leads')
      .set('Authorization', `Bearer ${landlordToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.leads)).toBe(true);
  });

  it('tenant cannot access leads', async () => {
    const res = await request(app)
      .get('/api/landlord/leads')
      .set('Authorization', `Bearer ${tenantToken}`);

    expect(res.status).toBe(403);
  });
});
