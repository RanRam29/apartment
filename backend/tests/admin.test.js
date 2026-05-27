process.env.JWT_SECRET = 'test_jwt_secret_for_verification_tests_over_twenty_chars';
const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const request = require('supertest');
const app = require('../src/app');
const { User, AppConfig } = require('../src/models');
const { sequelize } = require('../src/config/database');
const { initRedis } = require('../src/config/redis');

describe('Admin GODMODE Endpoints', () => {
  let adminToken = '';
  let tenantUser = null;

  beforeAll(async () => {
    // Drop table to ensure clean schema recreation
    await sequelize.getQueryInterface().dropTable('app_config').catch(() => {});
    await sequelize.sync({ force: false });
    await initRedis().catch(() => {});

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
      { id: adminUser.id, role: 'admin', email: adminEmail },
      getJwtSecret()
    );

    // Create a standard tenant user to block/unlock
    const tenantEmail = `tenant-${Date.now()}@example.com`;
    tenantUser = await User.create({
      email: tenantEmail,
      passwordHash: 'dummy',
      firstName: 'Tenant',
      lastName: 'User',
      role: 'tenant',
      isVerified: true,
    });
  });

  it('allows admin to edit global app configs', async () => {
    const res = await request(app)
      .put('/api/v3/admin/config/check_in_window_days')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ value: '10' });
    expect(res.status).toBe(200);
    expect(res.body.key).toBe('check_in_window_days');
    expect(res.body.value).toBe('10');
  });

  it('allows admin to list configs', async () => {
    const res = await request(app)
      .get('/api/v3/admin/config')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('allows admin to unlock a user account', async () => {
    // Lock user first
    await tenantUser.update({ isLocked: true, blockedCount: 5 });

    const res = await request(app)
      .post(`/api/v3/admin/users/${tenantUser.id}/unlock`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.unlocked).toBe(true);

    const check = await User.findByPk(tenantUser.id);
    expect(check.isLocked).toBe(false);
    expect(check.blockedCount).toBe(0);
  });

  afterAll(async () => {
    await sequelize.close();
  });
});
