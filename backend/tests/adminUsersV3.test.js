process.env.NODE_ENV = 'test';
process.env.POSTGRES_SSL = 'false';
process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED = 'false';
process.env.JWT_SECRET = 'test_jwt_secret_for_admin_users_tests';

const request = require('supertest');
const { sequelize, initPostgres } = require('../src/config/database');
const { initRedis, getRedisClient } = require('../src/config/redis');
const app = require('../src/app');
const { User, UserKycProfile } = require('../src/models');

// Mock UserPreferences to prevent Mongoose timeouts during registration
jest.mock('../src/models/mongo/UserPreferences', () => {
  return {
    create: jest.fn(async () => ({})),
    findOne: jest.fn(async () => ({})),
    updateOne: jest.fn(async () => ({})),
  };
});

describe('Admin Users Management V3 E2E Integration Suite', () => {
  let adminToken = '';
  let adminUser = null;
  let targetUser = null;

  beforeAll(async () => {
    await initPostgres();
    await initRedis().catch(() => {});
    await sequelize.sync({ force: false });

    const password = 'Password123!';
    const unique = Date.now();

    // Register admin user
    const adminEmail = `admin-mgmt-${unique}@test.com`;
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: adminEmail,
        password,
        firstName: 'System',
        lastName: 'Admin',
        role: 'tenant', // allowed by validator during register
      });
    
    adminToken = adminRes.body.token;
    adminUser = await User.findOne({ where: { email: adminEmail } });
    await adminUser.update({ isVerified: true, role: 'admin' }); // promote to admin directly in DB

    // Register target user to perform management on
    const targetEmail = `tenant-mgmt-${unique}@test.com`;
    await request(app)
      .post('/api/auth/register')
      .send({
        email: targetEmail,
        password,
        firstName: 'Original',
        lastName: 'Name',
        role: 'tenant',
      });
    
    targetUser = await User.findOne({ where: { email: targetEmail } });
  });

  afterAll(async () => {
    await sequelize.close();
    const redisClient = getRedisClient();
    if (redisClient) {
      await redisClient.disconnect();
    }
  });

  it('PUT /api/v3/admin/users/:id - allows admin to update all user fields', async () => {
    const updatedEmail = `updated-email-${Date.now()}@test.com`;
    const updatedPhone = `054${Math.floor(1000000 + Math.random() * 9000000)}`;
    const res = await request(app)
      .put(`/api/v3/admin/users/${targetUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'UpdatedFirst',
        lastName: 'UpdatedLast',
        email: updatedEmail,
        phone: updatedPhone,
        role: 'landlord',
        activeRole: 'landlord',
        trustScore: 85,
        isPremium: true,
        isVerified: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.firstName).toBe('UpdatedFirst');
    expect(res.body.lastName).toBe('UpdatedLast');
    expect(res.body.email).toBe(updatedEmail);
    expect(res.body.phone).toBe(updatedPhone);
    expect(res.body.role).toBe('landlord');
    expect(res.body.activeRole).toBe('landlord');
    expect(res.body.trustScore).toBe(85);
    expect(res.body.isPremium).toBe(true);
    expect(res.body.isVerified).toBe(true);

    // Verify database
    const dbUser = await User.findByPk(targetUser.id);
    expect(dbUser.firstName).toBe('UpdatedFirst');
    expect(dbUser.trustScore).toBe(85);
    expect(dbUser.isPremium).toBe(true);
  });

  it('PUT /api/v3/admin/users/:id - rejects out-of-range or non-numeric trustScore (BUG-016)', async () => {
    const tooHigh = await request(app)
      .put(`/api/v3/admin/users/${targetUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ trustScore: 5000 });
    expect(tooHigh.status).toBe(422);

    const notNumeric = await request(app)
      .put(`/api/v3/admin/users/${targetUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ trustScore: 'abc' });
    expect(notNumeric.status).toBe(422);

    // trustScore must be unchanged (still 85 from the previous test)
    const dbUser = await User.findByPk(targetUser.id);
    expect(dbUser.trustScore).toBe(85);
  });

  it('POST /api/v3/admin/users/:id/kyc-override - safely handles APPROVED, REJECTED, and NONE/Clear', async () => {
    // 1. Override to APPROVED
    let kycRes = await request(app)
      .post(`/api/v3/admin/users/${targetUser.id}/kyc-override`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });

    expect(kycRes.status).toBe(200);
    expect(kycRes.body.overridden).toBe(true);

    let kycProfile = await UserKycProfile.findOne({ where: { userId: targetUser.id } });
    expect(kycProfile).not.toBeNull();
    expect(kycProfile.status).toBe('APPROVED');

    // 2. Override to REJECTED
    kycRes = await request(app)
      .post(`/api/v3/admin/users/${targetUser.id}/kyc-override`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'REJECTED' });

    expect(kycRes.status).toBe(200);
    kycProfile = await UserKycProfile.findOne({ where: { userId: targetUser.id } });
    expect(kycProfile.status).toBe('REJECTED');

    // 3. Clear (NONE) kyc-override should destroy the record
    kycRes = await request(app)
      .post(`/api/v3/admin/users/${targetUser.id}/kyc-override`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'NONE' });

    expect(kycRes.status).toBe(200);
    kycProfile = await UserKycProfile.findOne({ where: { userId: targetUser.id } });
    expect(kycProfile).toBeNull();
  });

  it('DELETE /api/v3/admin/users/:id - performs clean cascading delete', async () => {
    const res = await request(app)
      .delete(`/api/v3/admin/users/${targetUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);

    // Verify user is gone from DB
    const dbUser = await User.findByPk(targetUser.id);
    expect(dbUser).toBeNull();
  });
});
