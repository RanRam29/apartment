/**
 * Chat route integration tests.
 * Requires Postgres + Redis. MongoDB is used for messages — tests degrade gracefully
 * when MongoDB is unavailable (auth and access control tests still run).
 */
process.env.NODE_ENV = 'test';
process.env.POSTGRES_SSL = 'false';
process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED = 'false';
process.env.JWT_SECRET = 'test_jwt_secret_for_verification_tests';

const request = require('supertest');
const { sequelize } = require('../src/config/database');
const { initRedis, getRedisClient } = require('../src/config/redis');
const app = require('../src/app');
const { generateStrongTestPassword } = require('./helpers/testCredentials');
const { registerVerifyAndLogin } = require('./helpers/authFlow');

const ts = Date.now();
const TEST_PASSWORD = generateStrongTestPassword();
const LANDLORD = {
  email: `chat_landlord_${ts}@test.com`,
  password: TEST_PASSWORD,
  firstName: 'Chat',
  lastName: 'Landlord',
  role: 'landlord',
};
const TENANT = {
  email: `chat_tenant_${ts}@test.com`,
  password: TEST_PASSWORD,
  firstName: 'Chat',
  lastName: 'Tenant',
  role: 'tenant',
};

let landlordToken = '';
let tenantToken = '';
let acceptedMatchId = '';
let mongoAvailable = false;

beforeAll(async () => {
  await Promise.all([
    sequelize.sync({ force: false }),
    initRedis(),
  ]);

  // Check MongoDB availability by attempting a real query (auth check included)
  try {
    const { initMongoDB } = require('../src/config/mongodb');
    await initMongoDB();
    const { Message } = require('../src/models');
    await Message.findOne({}).lean();
    mongoAvailable = true;
  } catch {
    mongoAvailable = false;
  }

  const landlordAuth = await registerVerifyAndLogin(request, app, LANDLORD);
  const tenantAuth = await registerVerifyAndLogin(request, app, TENANT);
  landlordToken = landlordAuth.token;
  tenantToken = tenantAuth.token;

  // Build: apartment → swipe → pending match → accept match (chat requires accepted match)
  const aptRes = await request(app)
    .post('/api/apartments')
    .set('Authorization', `Bearer ${landlordToken}`)
    .field('title', 'Chat Test Apartment')
    .field('price', '5000')
    .field('rooms', '2')
    .field('city', 'תל אביב');
  const aptId = aptRes.body.apartment?.id;

  if (aptId) {
    const swipeRes = await request(app)
      .post('/api/swipe')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ apartmentId: aptId, direction: 'like' });
    const matchId = swipeRes.body.match?.id;

    if (matchId) {
      const acceptRes = await request(app)
        .post(`/api/matches/${matchId}/accept`)
        .set('Authorization', `Bearer ${landlordToken}`);
      if (acceptRes.status === 200) {
        acceptedMatchId = matchId;
      }
    }
  }
}, 30_000);

afterAll(async () => {
  try {
    const { mongoose } = require('../src/config/mongodb');
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  } catch {
    /* ignore */
  }
  await sequelize.close();
  getRedisClient().disconnect();
});

describe('GET /api/chat/:matchId — access control', () => {
  it('returns 401 without auth', async () => {
    const id = acceptedMatchId || '00000000-0000-4000-8000-000000000001';
    const res = await request(app).get(`/api/chat/${id}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 for a non-accepted match', async () => {
    const res = await request(app)
      .get('/api/chat/00000000-0000-4000-8000-000000000001')
      .set('Authorization', `Bearer ${tenantToken}`);
    // 404 = match not found or not accepted
    expect(res.status).toBe(404);
  });
});

describe('GET /api/chat/:matchId — with accepted match', () => {
  it('returns paginated messages for an accepted match', async () => {
    if (!acceptedMatchId || !mongoAvailable) return;
    const res = await request(app)
      .get(`/api/chat/${acceptedMatchId}`)
      .set('Authorization', `Bearer ${tenantToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.messages)).toBe(true);
    expect(typeof res.body.hasMore).toBe('boolean');
  });

  it('outsider cannot read the chat', async () => {
    if (!acceptedMatchId) return;
    // Register a third-party user
    const outsider = await registerVerifyAndLogin(request, app, {
      email: `outsider_${ts}@test.com`,
      password: generateStrongTestPassword(),
      firstName: 'Out',
      lastName: 'Sider',
      role: 'tenant',
    });
    const res = await request(app)
      .get(`/api/chat/${acceptedMatchId}`)
      .set('Authorization', `Bearer ${outsider.token}`);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/chat/:matchId — send message', () => {
  it('returns 401 without auth', async () => {
    const id = acceptedMatchId || '00000000-0000-4000-8000-000000000001';
    const res = await request(app)
      .post(`/api/chat/${id}`)
      .send({ content: 'Hello' });
    expect(res.status).toBe(401);
  });

  it('returns 404 for non-accepted match', async () => {
    const res = await request(app)
      .post('/api/chat/00000000-0000-4000-8000-000000000001')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ content: 'Hello' });
    expect(res.status).toBe(404);
  });

  it('returns 422 for empty message', async () => {
    if (!acceptedMatchId) return;
    const res = await request(app)
      .post(`/api/chat/${acceptedMatchId}`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ content: '' });
    expect(res.status).toBe(422);
  });

  it('sends a message in an accepted match', async () => {
    if (!acceptedMatchId || !mongoAvailable) return;
    const res = await request(app)
      .post(`/api/chat/${acceptedMatchId}`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ content: 'Hi, I am interested in this apartment!' });
    expect(res.status).toBe(201);
    expect(res.body.message.content).toBe('Hi, I am interested in this apartment!');
    expect(res.body.message.senderId).toBeDefined();
  });

  it('validates message max length (2000 chars)', async () => {
    if (!acceptedMatchId) return;
    const res = await request(app)
      .post(`/api/chat/${acceptedMatchId}`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ content: 'x'.repeat(2001) });
    expect(res.status).toBe(422);
  });
});

describe('PATCH /api/chat/:matchId/read', () => {
  it('returns 401 without auth', async () => {
    const id = acceptedMatchId || '00000000-0000-4000-8000-000000000001';
    const res = await request(app).patch(`/api/chat/${id}/read`);
    expect(res.status).toBe(401);
  });

  it('marks messages as read', async () => {
    if (!acceptedMatchId || !mongoAvailable) return;
    const res = await request(app)
      .patch(`/api/chat/${acceptedMatchId}/read`)
      .set('Authorization', `Bearer ${landlordToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.updated).toBe('number');
  });
});
