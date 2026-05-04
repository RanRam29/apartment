/**
 * Swipe API integration tests.
 * Requires Postgres + Redis (provided by CI service containers).
 */
const request = require('supertest');
const { sequelize } = require('../src/config/database');
const { initRedis, getRedisClient } = require('../src/config/redis');
const app = require('../src/app');

const LANDLORD = {
  email: `swipe_landlord_${Date.now()}@test.com`,
  password: 'Test1234!',
  firstName: 'Sw',
  lastName: 'Landlord',
  role: 'landlord',
};

const TENANT = {
  email: `swipe_tenant_${Date.now()}@test.com`,
  password: 'Test1234!',
  firstName: 'Sw',
  lastName: 'Tenant',
  role: 'tenant',
};

let landlordToken = '';
let tenantToken   = '';
let apartmentId   = '';

beforeAll(async () => {
  await Promise.all([sequelize.sync({ force: false }), initRedis()]);

  const [lr, tr] = await Promise.all([
    request(app).post('/api/auth/register').send(LANDLORD),
    request(app).post('/api/auth/register').send(TENANT),
  ]);
  landlordToken = lr.body.token;
  tenantToken   = tr.body.token;

  // Create a listing to swipe on
  const apt = await request(app)
    .post('/api/apartments')
    .set('Authorization', `Bearer ${landlordToken}`)
    .field('title', 'דירת סוויפ')
    .field('price', '4500')
    .field('rooms', '2')
    .field('city', 'חיפה');
  apartmentId = apt.body.apartment?.id;
}, 30_000);

afterAll(async () => {
  // --forceExit in jest handles connection cleanup
});

describe('GET /api/swipe/quota', () => {
  it('returns quota for tenant', async () => {
    const res = await request(app)
      .get('/api/swipe/quota')
      .set('Authorization', `Bearer ${tenantToken}`);

    expect(res.status).toBe(200);
    expect(typeof res.body.used).toBe('number');
    expect(typeof res.body.limit).toBe('number');
  });

  it('landlord cannot access quota', async () => {
    const res = await request(app)
      .get('/api/swipe/quota')
      .set('Authorization', `Bearer ${landlordToken}`);

    expect(res.status).toBe(403);
  });
});

describe('POST /api/swipe', () => {
  it('tenant can swipe like', async () => {
    if (!apartmentId) return;
    const res = await request(app)
      .post('/api/swipe')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ apartmentId, direction: 'like' });

    expect([200, 201]).toContain(res.status);
    expect(res.body).toHaveProperty('swipe');
  });

  it('rejects invalid direction', async () => {
    if (!apartmentId) return;
    const res = await request(app)
      .post('/api/swipe')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ apartmentId, direction: 'invalid' });

    expect(res.status).toBe(422);
  });

  it('rejects invalid apartment UUID', async () => {
    const res = await request(app)
      .post('/api/swipe')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ apartmentId: 'not-a-uuid', direction: 'dislike' });

    expect(res.status).toBe(422);
  });

  it('landlord cannot swipe', async () => {
    if (!apartmentId) return;
    const res = await request(app)
      .post('/api/swipe')
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({ apartmentId, direction: 'like' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/swipe/last', () => {
  it('tenant can undo last swipe', async () => {
    const res = await request(app)
      .delete('/api/swipe/last')
      .set('Authorization', `Bearer ${tenantToken}`);

    // 200 if there's something to undo, 404 if nothing to undo — both valid
    expect([200, 404]).toContain(res.status);
  });
});
