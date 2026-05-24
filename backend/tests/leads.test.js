process.env.NODE_ENV = 'test';
process.env.POSTGRES_SSL = 'false';
process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED = 'false';
process.env.JWT_SECRET = 'test_jwt_secret_for_verification_tests';

const request = require('supertest');
const { sequelize } = require('../src/config/database');
const { initRedis, getRedisClient } = require('../src/config/redis');
const app = require('../src/app');
const { generateStrongTestPassword } = require('./helpers/testCredentials');

const ts = Date.now();
const TEST_PASSWORD = generateStrongTestPassword();
const LANDLORD = {
  email: `leads_score_${ts}@test.com`,
  password: TEST_PASSWORD,
  firstName: 'Lead',
  lastName: 'Scorer',
  role: 'landlord',
};

let landlordToken = '';

beforeAll(async () => {
  await Promise.all([sequelize.sync({ force: false }), initRedis()]);
  const res = await request(app).post('/api/auth/register').send(LANDLORD);
  landlordToken = res.body.token;
}, 30_000);

afterAll(async () => {
  await sequelize.close();
  getRedisClient().disconnect();
});

describe('POST /api/leads/score', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/leads/score')
      .send({ apartment: { price: 5000 }, leads: [] });
    expect(res.status).toBe(401);
  });

  it('returns ranked leads for landlord', async () => {
    const res = await request(app)
      .post('/api/leads/score')
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        apartment: { price: 5000, city: 'תל אביב' },
        leads: [
          {
            id: 'weak',
            swipeDirection: 'like',
            seenDurationMs: 100,
            preferences: { budget: { max: 1000 }, cities: [] },
          },
          {
            id: 'strong',
            swipeDirection: 'superlike',
            seenDurationMs: 9000,
            isVerified: true,
            phone: '050-111',
            preferences: { budget: { max: 8000 }, cities: ['תל אביב'] },
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.leads[0].id).toBe('strong');
    expect(typeof res.body.leads[0]._leadScore).toBe('number');
  });
});
