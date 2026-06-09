/**
 * Apartment route integration tests.
 * Requires real Postgres + Redis. Image uploads are skipped (no Cloudinary in CI).
 */
process.env.NODE_ENV = 'test';
process.env.POSTGRES_SSL = 'false';
process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED = 'false';
process.env.JWT_SECRET = 'test_jwt_secret_for_verification_tests';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { sequelize } = require('../src/config/database');
const { initRedis, getRedisClient } = require('../src/config/redis');
const { getJwtSecret } = require('../src/config/security');
const app = require('../src/app');
const { generateStrongTestPassword } = require('./helpers/testCredentials');

const ts = Date.now();
const TEST_PASSWORD = generateStrongTestPassword();
const LANDLORD = {
  email: `apt_landlord_${ts}@test.com`,
  password: TEST_PASSWORD,
  firstName: 'Apt',
  lastName: 'Landlord',
  role: 'landlord',
};
const TENANT = {
  email: `apt_tenant_${ts}@test.com`,
  password: TEST_PASSWORD,
  firstName: 'Apt',
  lastName: 'Tenant',
  role: 'tenant',
};

let landlordToken = '';
let tenantToken = '';
let apartmentId = '';

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
}, 30_000);

afterAll(async () => {
  await sequelize.close();
  getRedisClient().disconnect();
});

describe('POST /api/apartments', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/apartments')
      .field('title', 'Unauth Apartment')
      .field('price', '5000')
      .field('rooms', '3')
      .field('city', 'תל אביב');
    expect(res.status).toBe(401);
  });

  it('returns 403 for tenant role', async () => {
    const res = await request(app)
      .post('/api/apartments')
      .set('Authorization', `Bearer ${tenantToken}`)
      .field('title', 'Tenant Cannot Create')
      .field('price', '5000')
      .field('rooms', '3')
      .field('city', 'תל אביב');
    expect(res.status).toBe(403);
  });

  it('rejects a valid JWT for an unverified landlord', async () => {
    const email = `unverified_landlord_${Date.now()}@test.com`;
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password: generateStrongTestPassword(),
        firstName: 'Unverified',
        lastName: 'Landlord',
        role: 'landlord',
      });
    expect(registerRes.status).toBe(201);

    const staleRegistrationToken = jwt.sign(
      {
        id: registerRes.body.user.id,
        role: 'landlord',
        email,
        isPremium: false,
      },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    const res = await request(app)
      .post('/api/apartments')
      .set('Authorization', `Bearer ${staleRegistrationToken}`)
      .field('title', 'Unverified Listing')
      .field('price', '5000')
      .field('rooms', '3')
      .field('city', 'תל אביב');

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('returns 422 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/apartments')
      .set('Authorization', `Bearer ${landlordToken}`)
      .field('title', 'No Price');
    expect(res.status).toBe(422);
  });

  it('creates a listing for landlord', async () => {
    const res = await request(app)
      .post('/api/apartments')
      .set('Authorization', `Bearer ${landlordToken}`)
      .field('title', 'Beautiful 3-Room in Tel Aviv')
      .field('price', '7000')
      .field('rooms', '3')
      .field('city', 'תל אביב')
      .field('street', 'פלורנטין')
      .field('description', 'Lovely apartment in the heart of the city');
    expect(res.status).toBe(201);
    expect(res.body.apartment).toBeDefined();
    expect(res.body.apartment.title).toBe('Beautiful 3-Room in Tel Aviv');
    expect(res.body.apartment.price).toBe(7000);
    apartmentId = res.body.apartment.id;
  });
});

describe('GET /api/apartments/feed', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/apartments/feed');
    expect(res.status).toBe(401);
  });

  it('returns 403 for landlord role', async () => {
    const res = await request(app)
      .get('/api/apartments/feed')
      .set('Authorization', `Bearer ${landlordToken}`);
    expect(res.status).toBe(403);
  });

  it('returns paginated feed for tenant', async () => {
    const res = await request(app)
      .get('/api/apartments/feed')
      .set('Authorization', `Bearer ${tenantToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.apartments)).toBe(true);
    expect(typeof res.body.total).toBe('number');
    expect(typeof res.body.page).toBe('number');
  });

  it('supports city filter', async () => {
    const res = await request(app)
      .get(`/api/apartments/feed?city=${encodeURIComponent('תל אביב')}`)
      .set('Authorization', `Bearer ${tenantToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.apartments)).toBe(true);
  });
});

describe('GET /api/apartments/:id', () => {
  it('returns 401 without auth', async () => {
    const id = apartmentId || '00000000-0000-4000-8000-000000000001';
    const res = await request(app).get(`/api/apartments/${id}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 for non-existent apartment', async () => {
    const res = await request(app)
      .get('/api/apartments/00000000-0000-4000-8000-000000000001')
      .set('Authorization', `Bearer ${tenantToken}`);
    expect(res.status).toBe(404);
  });

  it('returns apartment detail', async () => {
    if (!apartmentId) return;
    const res = await request(app)
      .get(`/api/apartments/${apartmentId}`)
      .set('Authorization', `Bearer ${tenantToken}`);
    expect(res.status).toBe(200);
    expect(res.body.apartment.id).toBe(apartmentId);
    expect(res.body.apartment.title).toBe('Beautiful 3-Room in Tel Aviv');
  });
});

describe('PATCH /api/apartments/:id', () => {
  it('returns 401 without auth', async () => {
    const id = apartmentId || '00000000-0000-4000-8000-000000000001';
    const res = await request(app).patch(`/api/apartments/${id}`).send({ price: 8000 });
    expect(res.status).toBe(401);
  });

  it('returns 403 for tenant role', async () => {
    if (!apartmentId) return;
    const res = await request(app)
      .patch(`/api/apartments/${apartmentId}`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ price: 8000 });
    expect(res.status).toBe(403);
  });

  it('returns 404 for apartment not owned by landlord', async () => {
    const res = await request(app)
      .patch('/api/apartments/00000000-0000-4000-8000-000000000001')
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({ price: 8000 });
    expect(res.status).toBe(404);
  });

  it('updates allowed fields', async () => {
    if (!apartmentId) return;
    const res = await request(app)
      .patch(`/api/apartments/${apartmentId}`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({ price: 7500, description: 'Updated description' });
    expect(res.status).toBe(200);
    expect(res.body.apartment.price).toBe(7500);
  });
});

describe('DELETE /api/apartments/:id', () => {
  it('returns 401 without auth', async () => {
    const id = apartmentId || '00000000-0000-4000-8000-000000000001';
    const res = await request(app).delete(`/api/apartments/${id}`);
    expect(res.status).toBe(401);
  });

  it('returns 403 for tenant role', async () => {
    if (!apartmentId) return;
    const res = await request(app)
      .delete(`/api/apartments/${apartmentId}`)
      .set('Authorization', `Bearer ${tenantToken}`);
    expect(res.status).toBe(403);
  });

  it('deletes the apartment permanently', async () => {
    if (!apartmentId) return;
    const res = await request(app)
      .delete(`/api/apartments/${apartmentId}`)
      .set('Authorization', `Bearer ${landlordToken}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it('returns 404 when deleting same apartment again (already destroyed)', async () => {
    if (!apartmentId) return;
    const res = await request(app)
      .delete(`/api/apartments/${apartmentId}`)
      .set('Authorization', `Bearer ${landlordToken}`);
    expect(res.status).toBe(404);
  });
});
