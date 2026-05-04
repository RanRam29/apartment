/**
 * Apartments API integration tests.
 * Requires Postgres + Redis (provided by CI service containers).
 */
const request = require('supertest');
const { sequelize } = require('../src/config/database');
const { initRedis, getRedisClient } = require('../src/config/redis');
const app = require('../src/app');

const LANDLORD = {
  email: `apts_landlord_${Date.now()}@test.com`,
  password: 'Test1234!',
  firstName: 'Apt',
  lastName: 'Landlord',
  role: 'landlord',
};

const TENANT = {
  email: `apts_tenant_${Date.now()}@test.com`,
  password: 'Test1234!',
  firstName: 'Apt',
  lastName: 'Tenant',
  role: 'tenant',
};

let landlordToken = '';
let tenantToken = '';
let apartmentId = '';

beforeAll(async () => {
  await Promise.all([sequelize.sync({ force: false }), initRedis()]);

  // Register and capture tokens
  const [lr, tr] = await Promise.all([
    request(app).post('/api/auth/register').send(LANDLORD),
    request(app).post('/api/auth/register').send(TENANT),
  ]);
  landlordToken = lr.body.token;
  tenantToken   = tr.body.token;
}, 30_000);

afterAll(async () => {
  await sequelize.close();
  getRedisClient().disconnect();
});

describe('POST /api/apartments', () => {
  it('landlord can create a listing', async () => {
    const res = await request(app)
      .post('/api/apartments')
      .set('Authorization', `Bearer ${landlordToken}`)
      .field('title', 'דירת בדיקה')
      .field('price', '5000')
      .field('rooms', '3')
      .field('city', 'תל אביב');

    expect(res.status).toBe(201);
    expect(res.body.apartment).toMatchObject({ title: 'דירת בדיקה', price: 5000 });
    apartmentId = res.body.apartment.id;
  });

  it('tenant cannot create a listing', async () => {
    const res = await request(app)
      .post('/api/apartments')
      .set('Authorization', `Bearer ${tenantToken}`)
      .field('title', 'test')
      .field('price', '4000')
      .field('rooms', '2')
      .field('city', 'חיפה');

    expect(res.status).toBe(403);
  });

  it('rejects missing required fields', async () => {
    const res = await request(app)
      .post('/api/apartments')
      .set('Authorization', `Bearer ${landlordToken}`)
      .field('title', 'no price');

    expect(res.status).toBe(422);
  });
});

describe('GET /api/apartments/feed', () => {
  it('tenant can fetch feed', async () => {
    const res = await request(app)
      .get('/api/apartments/feed')
      .set('Authorization', `Bearer ${tenantToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.apartments)).toBe(true);
  });

  it('feed supports city filter', async () => {
    const res = await request(app)
      .get('/api/apartments/feed?city=תל אביב')
      .set('Authorization', `Bearer ${tenantToken}`);

    expect(res.status).toBe(200);
    res.body.apartments.forEach((a) => {
      expect(a.city).toBe('תל אביב');
    });
  });

  it('unauthenticated request is rejected', async () => {
    const res = await request(app).get('/api/apartments/feed');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/apartments/:id', () => {
  it('returns apartment details', async () => {
    if (!apartmentId) return;
    const res = await request(app)
      .get(`/api/apartments/${apartmentId}`)
      .set('Authorization', `Bearer ${tenantToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(apartmentId);
  });

  it('returns 404 for non-existent apartment', async () => {
    const res = await request(app)
      .get('/api/apartments/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${tenantToken}`);

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/apartments/:id', () => {
  it('landlord can update own listing', async () => {
    if (!apartmentId) return;
    const res = await request(app)
      .patch(`/api/apartments/${apartmentId}`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({ price: 5500 });

    expect(res.status).toBe(200);
    expect(res.body.apartment.price).toBe(5500);
  });

  it('tenant cannot update a listing', async () => {
    if (!apartmentId) return;
    const res = await request(app)
      .patch(`/api/apartments/${apartmentId}`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ price: 1 });

    expect(res.status).toBe(403);
  });
});
