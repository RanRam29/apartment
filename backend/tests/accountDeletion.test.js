process.env.NODE_ENV = 'test';
process.env.POSTGRES_SSL = 'false';
process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED = 'false';
process.env.JWT_SECRET = 'test_jwt_secret_for_verification_tests';

jest.mock('../src/config/redis', () => {
  const store = new Map();
  const mockClient = { disconnect: jest.fn() };
  return {
    initRedis: jest.fn().mockResolvedValue(undefined),
    getRedisClient: jest.fn(() => mockClient),
    cacheGet: jest.fn(async (key) => {
      const value = store.get(key);
      return value === undefined ? null : value;
    }),
    cacheSet: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
    cacheDel: jest.fn(async (key) => {
      store.delete(key);
    }),
  };
});

const request = require('supertest');
const bcrypt = require('bcryptjs');
const { sequelize, ensureUserVerificationColumns } = require('../src/config/database');
const { initRedis, getRedisClient } = require('../src/config/redis');
const app = require('../src/app');
const { User } = require('../src/models');
const { runAccountDeletion } = require('../src/cron/accountDeletion');
const { generateStrongTestPassword } = require('./helpers/testCredentials');

const password = generateStrongTestPassword();

let userToken = '';
let userId = '';
let originalPasswordHash = '';

beforeAll(async () => {
  await Promise.all([
    sequelize.sync({ force: false }),
    ensureUserVerificationColumns(),
    initRedis(),
  ]);

  const res = await request(app)
    .post('/api/auth/register')
    .send({
      email: `gdpr-del-${Date.now()}@test.com`,
      password,
      firstName: 'Delete',
      lastName: 'Me',
      role: 'tenant',
    });
  expect(res.status).toBe(201);
  userToken = res.body.token;
  userId = res.body.user.id;

  const user = await User.findByPk(userId);
  await user.update({ isVerified: true, tosAcceptedAt: new Date() });
  originalPasswordHash = user.passwordHash;
}, 60_000);

afterAll(async () => {
  await sequelize.close();
  getRedisClient().disconnect();
});

describe('GDPR account deletion', () => {
  it('persists deletionRequestedAt on request-deletion', async () => {
    const res = await request(app)
      .post('/api/auth/request-deletion')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);

    const user = await User.findByPk(userId);
    expect(user.deletionRequestedAt).toBeTruthy();
  });

  it('skips users still inside the 30-day grace period', async () => {
    const count = await runAccountDeletion();
    const user = await User.findByPk(userId);
    expect(user.email).not.toMatch(/^deleted-/);
    expect(count).toBe(0);
  });

  it('anonymizes users whose deletion was requested more than 30 days ago', async () => {
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    await User.update(
      { deletionRequestedAt: thirtyOneDaysAgo },
      { where: { id: userId } }
    );

    const count = await runAccountDeletion();
    expect(count).toBe(1);

    const user = await User.findByPk(userId);
    expect(user.email).toBe(`deleted-${userId}@deleted.dirapp.local`);
    expect(user.firstName).toBe('משתמש');
    expect(user.lastName).toBe('שנמחק');
    expect(user.isLocked).toBe(true);
    expect(user.phone).toBeNull();
    expect(user.avatarUrl).toBeNull();
    expect(user.bio).toBeNull();
    expect(user.whatsappOptIn).toBe(false);

    const oldPasswordMatches = await bcrypt.compare(password, originalPasswordHash);
    expect(oldPasswordMatches).toBe(true);
    const newPasswordMatches = await bcrypt.compare(password, user.passwordHash);
    expect(newPasswordMatches).toBe(false);
  });

  it('is idempotent on a second run', async () => {
    const count = await runAccountDeletion();
    expect(count).toBe(0);

    const user = await User.findByPk(userId);
    expect(user.email).toBe(`deleted-${userId}@deleted.dirapp.local`);
  });
});
