/**
 * Matches API integration tests.
 * Requires Postgres + Redis (provided by CI service containers).
 */
const request = require('supertest');
const { sequelize } = require('../src/config/database');
const { initRedis, getRedisClient } = require('../src/config/redis');
const app = require('../src/app');

const LANDLORD = {
  email: `matches_landlord_${Date.now()}@test.com`,
  password: 'Test1234!',
  firstName: 'Match',
  lastName: 'Landlord',
  role: 'landlord',
};

const TENANT = {
  email: `matches_tenant_${Date.now()}@test.com`,
  password: 'Test1234!',
  firstName: 'Match',
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

describe('GET /api/matches', () => {
  it('tenant can list matches', async () => {
    const res = await request(app)
      .get('/api/matches')
      .set('Authorization', `Bearer ${tenantToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.matches)).toBe(true);
  });

  it('landlord can list matches', async () => {
    const res = await request(app)
      .get('/api/matches')
      .set('Authorization', `Bearer ${landlordToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.matches)).toBe(true);
  });

  it('unauthenticated request is rejected', async () => {
    const res = await request(app).get('/api/matches');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/matches/:id/accept — non-existent match', () => {
  it('returns 404 for unknown match', async () => {
    const res = await request(app)
      .post('/api/matches/00000000-0000-0000-0000-000000000000/accept')
      .set('Authorization', `Bearer ${landlordToken}`);

    expect(res.status).toBe(404);
  });
});

describe('POST /api/matches/:id/reject — non-existent match', () => {
  it('returns 404 for unknown match', async () => {
    const res = await request(app)
      .post('/api/matches/00000000-0000-0000-0000-000000000000/reject')
      .set('Authorization', `Bearer ${landlordToken}`);

    expect(res.status).toBe(404);
  });
});
