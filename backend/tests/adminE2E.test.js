process.env.NODE_ENV = 'test';
process.env.POSTGRES_SSL = 'false';
process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED = 'false';
process.env.JWT_SECRET = 'test_jwt_secret_for_verification_tests';

const request = require('supertest');
const { sequelize, initPostgres } = require('../src/config/database');
const { initRedis, getRedisClient } = require('../src/config/redis');
const app = require('../src/app');
const { generateStrongTestPassword } = require('./helpers/testCredentials');

const ts = Date.now();
const TEST_PASSWORD = generateStrongTestPassword();

const ADMIN = {
  email: `admin_e2e_${ts}@test.com`,
  password: TEST_PASSWORD,
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin',
};

const REGULAR_USER = {
  email: `regular_e2e_${ts}@test.com`,
  password: TEST_PASSWORD,
  firstName: 'Regular',
  lastName: 'User',
  role: 'tenant',
};

let adminToken = '';
let regularToken = '';
let regularUserId = '';

beforeAll(async () => {
  await Promise.all([initPostgres(), initRedis()]);
  
  // Register admin as landlord first to pass registration validation
  const resAdmin = await request(app).post('/api/auth/register').send({ ...ADMIN, role: 'landlord' });
  adminToken = resAdmin.body.token;
  const adminId = resAdmin.body.user.id;
  
  // Promote registered user to admin role directly in database
  const { User } = require('../src/models');
  await User.update({ role: 'admin' }, { where: { id: adminId } });
  
  // Register regular user
  const resReg = await request(app).post('/api/auth/register').send(REGULAR_USER);
  regularToken = resReg.body.token;
  regularUserId = resReg.body.user.id;
}, 30_000);

afterAll(async () => {
  await sequelize.close();
  getRedisClient().disconnect();
});

describe('Admin Panel E2E', () => {
  it('GET /api/v3/admin/users - 200 for admin, 403 for regular user', async () => {
    const resAdmin = await request(app)
      .get('/api/v3/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resAdmin.status).toBe(200);
    expect(resAdmin.body).toHaveProperty('rows');

    const resReg = await request(app)
      .get('/api/v3/admin/users')
      .set('Authorization', `Bearer ${regularToken}`);
    expect(resReg.status).toBe(403);
  });

  it('GET /api/v3/admin/stats - 200 for admin, 403 for regular user', async () => {
    const resAdmin = await request(app)
      .get('/api/v3/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resAdmin.status).toBe(200);
    expect(resAdmin.body).toHaveProperty('users');
    expect(resAdmin.body).toHaveProperty('agreements');

    const resReg = await request(app)
      .get('/api/v3/admin/stats')
      .set('Authorization', `Bearer ${regularToken}`);
    expect(resReg.status).toBe(403);
  });

  it('POST /api/v3/admin/users/:id/unlock - 200 for admin, 403 for regular user', async () => {
    const resAdmin = await request(app)
      .post(`/api/v3/admin/users/${regularUserId}/unlock`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resAdmin.status).toBe(200);
    expect(resAdmin.body).toEqual({ unlocked: true });

    const resReg = await request(app)
      .post(`/api/v3/admin/users/${regularUserId}/unlock`)
      .set('Authorization', `Bearer ${regularToken}`);
    expect(resReg.status).toBe(403);
  });

  it('POST /api/v3/admin/kyc/:id/override - 200 for admin, 403 for regular user', async () => {
    const resAdmin = await request(app)
      .post(`/api/v3/admin/kyc/${regularUserId}/override`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });
    expect(resAdmin.status).toBe(200);
    expect(resAdmin.body).toEqual({ overridden: true });

    const resReg = await request(app)
      .post(`/api/v3/admin/kyc/${regularUserId}/override`)
      .set('Authorization', `Bearer ${regularToken}`)
      .send({ status: 'APPROVED' });
    expect(resReg.status).toBe(403);
  });

  it('PATCH /api/v3/admin/config - 200 for admin, 403 for regular user', async () => {
    const resAdmin = await request(app)
      .patch('/api/v3/admin/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ key: 'expiring_warning_days', value: '90' });
    expect(resAdmin.status).toBe(200);
    expect(resAdmin.body).toHaveProperty('key', 'expiring_warning_days');
    expect(resAdmin.body).toHaveProperty('value', '90');

    const resReg = await request(app)
      .patch('/api/v3/admin/config')
      .set('Authorization', `Bearer ${regularToken}`)
      .send({ key: 'expiring_warning_days', value: '90' });
    expect(resReg.status).toBe(403);
  });
});
