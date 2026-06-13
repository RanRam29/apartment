/**
 * Admin scheduled notifications management.
 */
process.env.POSTGRES_SSL = 'false';
process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED = 'false';
process.env.JWT_SECRET = 'test_jwt_secret_for_admin_scheduled';

jest.mock('../src/config/redis', () => {
  const mockClient = { disconnect: jest.fn() };
  return {
    initRedis: jest.fn().mockResolvedValue(undefined),
    getRedisClient: jest.fn(() => mockClient),
    cacheGet: jest.fn().mockResolvedValue(null),
    cacheSet: jest.fn().mockResolvedValue(undefined),
    cacheDel: jest.fn().mockResolvedValue(undefined),
  };
});

const request = require('supertest');
const { sequelize } = require('../src/config/database');
const { initRedis, getRedisClient } = require('../src/config/redis');
const app = require('../src/app');
const { User, ScheduledNotification } = require('../src/models');
const { scheduleReminder } = require('../src/services/notificationService');
const { generateStrongTestPassword } = require('./helpers/testCredentials');

const PAYLOAD = { title: 'תזכורת אדמין', body: 'בדיקת ניהול תזכורות' };
let adminToken = '';
let userId = '';

beforeAll(async () => {
  await Promise.all([sequelize.sync({ force: false }), initRedis()]);

  const password = generateStrongTestPassword();
  const unique = Date.now();

  await request(app).post('/api/auth/register').send({
    email: `admin-sched-user-${unique}@test.com`,
    password,
    firstName: 'Sched',
    lastName: 'User',
    role: 'tenant',
  }).then((r) => { userId = r.body.user.id; });

  const adminEmail = `admin-sched-${unique}@test.com`;
  await User.create({
    email: adminEmail,
    passwordHash: 'hash',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    isVerified: true,
  });

  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash(password, 10);
  await User.update({ passwordHash: hash }, { where: { email: adminEmail } });

  const login = await request(app).post('/api/auth/login').send({
    email: adminEmail,
    password,
  });
  adminToken = login.body.token;
}, 30_000);

afterAll(async () => {
  await ScheduledNotification.destroy({ where: { userId } });
  await sequelize.close();
  getRedisClient().disconnect();
});

beforeEach(async () => {
  await ScheduledNotification.destroy({ where: { userId } });
});

describe('GET /api/v3/admin/scheduled-notifications', () => {
  it('returns paginated rows with user email', async () => {
    const record = await scheduleReminder(userId, new Date(Date.now() + 60_000), PAYLOAD);

    const res = await request(app)
      .get('/api/v3/admin/scheduled-notifications?status=SCHEDULED')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(res.body.rows[0].user.email).toBeDefined();
    expect(res.body.rows.some((r) => r.id === record.id)).toBe(true);
  });

  it('rejects non-admin users', async () => {
    const password = generateStrongTestPassword();
    const reg = await request(app).post('/api/auth/register').send({
      email: `not-admin-${Date.now()}@test.com`,
      password,
      firstName: 'No',
      lastName: 'Admin',
      role: 'tenant',
    });

    const res = await request(app)
      .get('/api/v3/admin/scheduled-notifications')
      .set('Authorization', `Bearer ${reg.body.token}`);

    expect(res.status).toBe(403);
  });
});

describe('POST /api/v3/admin/scheduled-notifications/:id/cancel', () => {
  it('cancels a SCHEDULED notification via cancelReminder', async () => {
    const record = await scheduleReminder(userId, new Date(Date.now() + 60_000), PAYLOAD);

    const res = await request(app)
      .post(`/api/v3/admin/scheduled-notifications/${record.id}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CANCELLED');

    const stored = await ScheduledNotification.findByPk(record.id);
    expect(stored.status).toBe('CANCELLED');
  });

  it('returns 422 when notification is not SCHEDULED', async () => {
    const record = await scheduleReminder(userId, new Date(Date.now() + 60_000), PAYLOAD);
    await ScheduledNotification.update({ status: 'SENT' }, { where: { id: record.id } });

    const res = await request(app)
      .post(`/api/v3/admin/scheduled-notifications/${record.id}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(422);
  });
});
