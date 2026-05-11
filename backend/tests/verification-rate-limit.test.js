process.env.POSTGRES_SSL = 'false';
process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED = 'false';

const crypto = require('crypto');
process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { generateStrongTestPassword } = require('./helpers/testCredentials');

jest.mock('../src/config/redis', () => ({
  initRedis: jest.fn(async () => undefined),
  getRedisClient: jest.fn(() => ({
    get: jest.fn(async () => null),
    setex: jest.fn(async () => 'OK'),
    del: jest.fn(async () => 1),
    incr: jest.fn(async () => 1),
    expireat: jest.fn(async () => 1),
  })),
  cacheGet: jest.fn(async () => null),
  cacheSet: jest.fn(async () => undefined),
  cacheDel: jest.fn(async () => undefined),
}));

const mockSendVerificationEmail = jest.fn(async () => ({ sent: true }));
jest.mock('../src/services/emailService', () => ({
  sendVerificationEmail: (...args) => mockSendVerificationEmail(...args),
}));

const { sequelize } = require('../src/config/database');
const { User, Apartment } = require('../src/models');
const app = require('../src/app');

describe('Email verification + auth rate limiting', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: false, alter: true });
  }, 30_000);

  afterAll(async () => {
    await sequelize.close();
  });

  it('creates verification token and verifies account by token', async () => {
    const email = `verify_${Date.now()}@test.com`;
    const registerRes = await request(app).post('/api/auth/register').send({
      email,
      password: generateStrongTestPassword(),
      firstName: 'Verify',
      lastName: 'User',
      role: 'landlord',
    });
    expect(registerRes.status).toBe(201);
    expect(mockSendVerificationEmail).toHaveBeenCalled();

    const created = await User.findOne({ where: { email } });
    expect(created.verificationToken).toBeTruthy();
    expect(created.isVerified).toBe(false);

    const verifyRes = await request(app).get(`/api/auth/verify/${created.verificationToken}`);
    expect(verifyRes.status).toBe(200);

    await created.reload();
    expect(created.isVerified).toBe(true);
    expect(created.verifiedAt).toBeTruthy();
    expect(created.verificationToken).toBeNull();
  });

  it('resends verification email for authenticated unverified user', async () => {
    const user = await User.create({
      email: `resend_${Date.now()}@test.com`,
      passwordHash: 'hash',
      firstName: 'Re',
      lastName: 'Send',
      role: 'tenant',
      isVerified: false,
      verificationToken: 'old-token',
    });
    const token = jwt.sign(
      { id: user.id, role: 'tenant', email: user.email, isPremium: false },
      process.env.JWT_SECRET
    );

    const res = await request(app)
      .post('/api/auth/resend-verification')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    await user.reload();
    expect(user.verificationToken).toBeTruthy();
    expect(user.verificationToken).not.toBe('old-token');
    expect(mockSendVerificationEmail).toHaveBeenCalled();
  });

  it('blocks unverified tenants from swiping', async () => {
    const tenant = await User.create({
      email: `tenant_unverified_${Date.now()}@test.com`,
      passwordHash: 'hash',
      firstName: 'T',
      lastName: 'U',
      role: 'tenant',
      isVerified: false,
    });
    const landlord = await User.create({
      email: `landlord_for_swipe_${Date.now()}@test.com`,
      passwordHash: 'hash',
      firstName: 'L',
      lastName: 'D',
      role: 'landlord',
      isVerified: true,
    });
    const apartment = await Apartment.create({
      landlordId: landlord.id,
      title: 'Verification Test Apartment',
      description: 'd',
      city: 'Tel Aviv',
      street: 'Center',
      address: '123 Test St',
      latitude: 32.08,
      longitude: 34.78,
      price: 5000,
      rooms: 2,
      sizeSqm: 50,
      floor: 2,
      totalFloors: 5,
      availableFrom: new Date(),
      images: ['https://example.com/a.jpg'],
    });
    const token = jwt.sign(
      { id: tenant.id, role: 'tenant', email: tenant.email, isPremium: false },
      process.env.JWT_SECRET
    );

    const swipeRes = await request(app)
      .post('/api/swipe')
      .set('Authorization', `Bearer ${token}`)
      .send({ apartmentId: apartment.id, direction: 'like' });

    expect(swipeRes.status).toBe(403);
    expect(swipeRes.body.error).toMatch(/verification/i);
  });

  it('rate-limits repeated auth attempts', async () => {
    const attempts = [];
    for (let i = 0; i < 12; i += 1) {
      // Invalid login payload is enough to exercise limiter.
      // Keep single loop to avoid brittle timing assertions.
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'bad', password: generateStrongTestPassword() });
      attempts.push(res.status);
    }
    expect(attempts.includes(429)).toBe(true);
  });
});
