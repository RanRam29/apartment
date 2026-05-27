process.env.JWT_SECRET = 'test_jwt_secret_for_verification_tests';
const request = require('supertest');
const app = require('../src/app');
const { User } = require('../src/models');
const { sequelize } = require('../src/config/database');
const { initRedis } = require('../src/config/redis');

describe('Terms of Service and Role Switching', () => {
  let userToken = '';
  let testUser = null;
  let adminToken = '';

  beforeAll(async () => {
    // Sync DB and Redis
    await sequelize.sync({ force: false });
    await initRedis().catch(() => {});

    // Create test user and admin
    const email = `test-${Date.now()}@example.com`;
    const password = 'Password123!';
    
    // Register test user
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password,
        firstName: 'Test',
        lastName: 'User',
        role: 'tenant',
      });
    
    userToken = regRes.body.token;
    testUser = await User.findOne({ where: { email } });
    // Auto-verify email
    await testUser.update({ isVerified: true });

    // Create admin user directly in DB
    const adminEmail = `admin-${Date.now()}@example.com`;
    const adminUser = await User.create({
      email: adminEmail,
      passwordHash: 'dummy',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isVerified: true,
    });
    const { getJwtSecret } = require('../src/config/security');
    const jwt = require('jsonwebtoken');
    adminToken = jwt.sign(
      { id: adminUser.id, role: 'admin', email: adminEmail, isPremium: false },
      getJwtSecret()
    );
  });

  describe('Terms of Service Gates', () => {
    it('blocks access to protected routes when ToS is enforced and not accepted', async () => {
      const res = await request(app)
        .get('/api/apartments/feed')
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-test-enforce-tos', 'true');
      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Terms of Service not accepted');
      expect(res.body.code).toBe('TOS_REQUIRED');
    });

    it('allows access to protected routes when ToS is accepted', async () => {
      // Accept ToS
      const acceptRes = await request(app)
        .post('/api/auth/accept-tos')
        .set('Authorization', `Bearer ${userToken}`);
      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.ok).toBe(true);

      // Now request protected route
      const res = await request(app)
        .get('/api/apartments/feed')
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-test-enforce-tos', 'true');
      // Should bypass ToS check and enter the router
      expect(res.status).not.toBe(403);
      expect(res.body.code).not.toBe('TOS_REQUIRED');
    });
  });

  describe('Role Switching', () => {
    it('blocks landlord-only routes before switching', async () => {
      const res = await request(app)
        .get('/api/landlord/leads')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(403);
    });

    it('allows switching role to landlord and permits landlord-only routes', async () => {
      const res = await request(app)
        .patch('/api/auth/switch-role')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ role: 'landlord' });
      expect(res.status).toBe(200);
      expect(res.body.activeRole).toBe('landlord');

      // Verify DB
      const u = await User.findByPk(testUser.id);
      expect(u.activeRole).toBe('landlord');

      // Verify that landlord route is now accessible
      const landlordRes = await request(app)
        .get('/api/landlord/leads')
        .set('Authorization', `Bearer ${userToken}`);
      expect(landlordRes.status).toBe(200);
    });

    it('allows switching role back to tenant and blocks landlord-only routes again', async () => {
      const res = await request(app)
        .patch('/api/auth/switch-role')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ role: 'tenant' });
      expect(res.status).toBe(200);
      expect(res.body.activeRole).toBe('tenant');

      // Verify that landlord route is blocked again
      const landlordRes = await request(app)
        .get('/api/landlord/leads')
        .set('Authorization', `Bearer ${userToken}`);
      expect(landlordRes.status).toBe(403);
    });

    it('rejects invalid roles', async () => {
      const res = await request(app)
        .patch('/api/auth/switch-role')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ role: 'admin' });
      expect(res.status).toBe(400);
    });
  });

  describe('User Blocking and Locking', () => {
    it('allows admin to block a user', async () => {
      // Block once
      const blockRes = await request(app)
        .post(`/api/auth/block/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(blockRes.status).toBe(200);
      expect(blockRes.body.blockedCount).toBe(1);
      expect(blockRes.body.isLocked).toBe(false);

      // Block 4 more times to lock the user
      for (let i = 0; i < 4; i++) {
        await request(app)
          .post(`/api/auth/block/${testUser.id}`)
          .set('Authorization', `Bearer ${adminToken}`);
      }

      const checkRes = await request(app)
        .post(`/api/auth/block/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(checkRes.body.isLocked).toBe(true);

      // Attempt to access any route with userToken
      const tryRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`);
      expect(tryRes.status).toBe(403);
      expect(tryRes.body.error).toBe('Account locked');
      expect(tryRes.body.code).toBe('ACCOUNT_LOCKED');
    });

    it('allows admin to unblock and unlock a user', async () => {
      // Unblock to 0
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post(`/api/auth/unblock/${testUser.id}`)
          .set('Authorization', `Bearer ${adminToken}`);
      }

      const checkRes = await User.findByPk(testUser.id);
      expect(checkRes.isLocked).toBe(false);
      expect(checkRes.blockedCount).toBe(0);

      // Access should work again
      const tryRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`);
      expect(tryRes.status).toBe(200);
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });
});

