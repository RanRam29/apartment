/**
 * Scheduled notifications: scheduleReminder/cancelReminder persistence
 * and runScheduledNotifications cron delivery.
 */
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

jest.mock('../src/services/notificationService', () => {
  const actual = jest.requireActual('../src/services/notificationService');
  return { ...actual, notify: jest.fn().mockResolvedValue({ push: null, email: null }) };
});

const request = require('supertest');
const { sequelize } = require('../src/config/database');
const { initRedis, getRedisClient } = require('../src/config/redis');
const app = require('../src/app');
const { ScheduledNotification } = require('../src/models');
const { notify, scheduleReminder, cancelReminder } = require('../src/services/notificationService');
const { runScheduledNotifications } = require('../src/cron/scheduledNotifications');
const { generateStrongTestPassword } = require('./helpers/testCredentials');

const PAYLOAD = { title: 'תזכורת', body: 'בדיקת תזכורת מתוזמנת' };
let userId = '';

beforeAll(async () => {
  await Promise.all([
    sequelize.sync({ force: false }),
    initRedis(),
  ]);
  const res = await request(app).post('/api/auth/register').send({
    email: `schednotif_${Date.now()}@test.com`,
    password: generateStrongTestPassword(),
    firstName: 'Sched',
    lastName: 'Notif',
    role: 'landlord',
  });
  userId = res.body.user.id;
}, 30_000);

afterAll(async () => {
  await ScheduledNotification.destroy({ where: { userId } });
  await sequelize.close();
  getRedisClient().disconnect();
});

beforeEach(async () => {
  notify.mockClear();
  notify.mockResolvedValue({ push: null, email: null });
  await ScheduledNotification.destroy({ where: { userId } });
});

describe('scheduleReminder', () => {
  it('persists a SCHEDULED row', async () => {
    const fireAt = new Date(Date.now() + 60_000);
    const record = await scheduleReminder(userId, fireAt, PAYLOAD);
    expect(record.id).toBeDefined();
    expect(record.status).toBe('SCHEDULED');

    const stored = await ScheduledNotification.findByPk(record.id);
    expect(stored).not.toBeNull();
    expect(stored.payload.title).toBe(PAYLOAD.title);
  });

  it('rejects invalid timestamps and incomplete payloads', async () => {
    await expect(scheduleReminder(userId, 'not-a-date', PAYLOAD)).rejects.toThrow(/invalid timestamp/);
    await expect(scheduleReminder(userId, new Date(), { title: 'no body' })).rejects.toThrow(/required/);
  });

  it('is idempotent per dedupeKey', async () => {
    const key = `test:dedupe:${Date.now()}`;
    const first = await scheduleReminder(userId, new Date(), PAYLOAD, { dedupeKey: key });
    const second = await scheduleReminder(userId, new Date(), PAYLOAD, { dedupeKey: key });
    expect(second.id).toBe(first.id);
    expect(await ScheduledNotification.count({ where: { dedupeKey: key } })).toBe(1);
  });
});

describe('cancelReminder', () => {
  it('cancels a pending reminder by id', async () => {
    const record = await scheduleReminder(userId, new Date(Date.now() + 60_000), PAYLOAD);
    expect(await cancelReminder({ id: record.id })).toBe(true);
    await record.reload();
    expect(record.status).toBe('CANCELLED');
    // Already cancelled → nothing left to cancel
    expect(await cancelReminder({ id: record.id })).toBe(false);
  });
});

describe('runScheduledNotifications', () => {
  it('delivers due rows and leaves future rows scheduled', async () => {
    const due = await scheduleReminder(userId, new Date(Date.now() - 1000), PAYLOAD);
    const future = await scheduleReminder(userId, new Date(Date.now() + 60 * 60_000), PAYLOAD);

    const result = await runScheduledNotifications();
    expect(result.sent).toBeGreaterThanOrEqual(1);
    expect(notify).toHaveBeenCalledWith(userId, expect.objectContaining({ title: PAYLOAD.title }));

    await due.reload();
    await future.reload();
    expect(due.status).toBe('SENT');
    expect(due.sentAt).not.toBeNull();
    expect(future.status).toBe('SCHEDULED');
  });

  it('does not deliver CANCELLED rows', async () => {
    const record = await scheduleReminder(userId, new Date(Date.now() - 1000), PAYLOAD);
    await cancelReminder({ id: record.id });

    await runScheduledNotifications();
    expect(notify).not.toHaveBeenCalled();
  });

  it('retries failures and marks FAILED after 3 attempts', async () => {
    notify.mockRejectedValue(new Error('push provider down'));
    const record = await scheduleReminder(userId, new Date(Date.now() - 1000), PAYLOAD);

    await runScheduledNotifications();
    await record.reload();
    expect(record.status).toBe('SCHEDULED');
    expect(record.attempts).toBe(1);
    expect(record.lastError).toMatch(/push provider down/);

    await runScheduledNotifications();
    await runScheduledNotifications();
    await record.reload();
    expect(record.status).toBe('FAILED');
    expect(record.attempts).toBe(3);
  });
});
