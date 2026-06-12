/**
 * Google OAuth and role selection integration tests.
 */
process.env.POSTGRES_SSL = 'false';
process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED = 'false';
process.env.JWT_SECRET = 'test_jwt_secret_for_google_auth_tests';
process.env.GOOGLE_CLIENT_ID = 'test_google_client_id_12345';

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
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { sequelize, initPostgres } = require('../src/config/database');
const { initRedis, getRedisClient } = require('../src/config/redis');
const app = require('../src/app');
const { User } = require('../src/models');

let mockFetchResponse = null;

// Mock global fetch for tokeninfo endpoint
global.fetch = jest.fn().mockImplementation((url) => {
  if (url.includes('tokeninfo')) {
    if (!mockFetchResponse) {
      return Promise.resolve({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'invalid_token' }),
      });
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockFetchResponse),
    });
  }
  return Promise.reject(new Error(`Unhandled URL fetched in test: ${url}`));
});

beforeAll(async () => {
  await initPostgres();
  await initRedis().catch(() => {});
}, 30_000);

afterAll(async () => {
  await sequelize.close();
  getRedisClient().disconnect();
});

describe('Google Authentication Endpoints', () => {
  beforeEach(() => {
    mockFetchResponse = null;
    jest.clearAllMocks();
  });

  describe('POST /api/auth/google', () => {
    it('returns 400 if credential body parameter is missing', async () => {
      const res = await request(app)
        .post('/api/auth/google')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/credential/i);
    });

    it('returns 401 if Google tokeninfo API validation fails', async () => {
      mockFetchResponse = null; // simulate invalid token
      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'invalid_google_token' });
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid google token/i);
    });

    it('returns 401 if Google token client ID (aud) does not match process.env.GOOGLE_CLIENT_ID', async () => {
      mockFetchResponse = {
        sub: 'google_sub_123',
        email: 'test@gmail.com',
        email_verified: 'true',
        aud: 'mismatched_client_id_99999',
        given_name: 'Test',
        family_name: 'User',
      };
      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'mismatched_aud' });
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/client id/i);
    });

    it('returns 401 if email_verified is not true', async () => {
      mockFetchResponse = {
        sub: 'google_sub_123',
        email: 'test@gmail.com',
        email_verified: 'false',
        aud: 'test_google_client_id_12345',
        given_name: 'Test',
        family_name: 'User',
      };
      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'unverified_email' });
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/email not verified/i);
    });

    it('registers and logs in a new user with default tenant role, returning needsRoleSelection: true', async () => {
      const uniqueSub = `sub_${Date.now()}`;
      const uniqueEmail = `new_user_${Date.now()}@gmail.com`;

      mockFetchResponse = {
        sub: uniqueSub,
        email: uniqueEmail,
        email_verified: 'true',
        aud: 'test_google_client_id_12345',
        given_name: 'ישראל',
        family_name: 'ישראלי',
        picture: 'https://lh3.googleusercontent.com/a/avatar',
      };

      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'valid_token' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.needsRoleSelection).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(uniqueEmail);
      expect(res.body.user.firstName).toBe('ישראל');
      expect(res.body.user.lastName).toBe('ישראלי');
      expect(res.body.user.avatarUrl).toBe('https://lh3.googleusercontent.com/a/avatar');
      expect(res.body.user.role).toBe('tenant');
    });

    it('links Google account to an existing user with matching email, keeping existing roleSelectedAt config', async () => {
      const uniqueEmail = `existing_${Date.now()}@test.com`;
      
      // Create user manually first via register (sets roleSelectedAt automatically)
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: uniqueEmail,
          password: 'Password123!',
          firstName: 'Existing',
          lastName: 'User',
          role: 'landlord',
        });
      expect(regRes.status).toBe(201);

      mockFetchResponse = {
        sub: `google_sub_link_${Date.now()}`,
        email: uniqueEmail,
        email_verified: 'true',
        aud: 'test_google_client_id_12345',
        given_name: 'GoogleName',
        family_name: 'Link',
      };

      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'link_token' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      // An email-registered user has already selected their role, so needsRoleSelection is false.
      expect(res.body.needsRoleSelection).toBe(false);
      expect(res.body.user.email).toBe(uniqueEmail);
      expect(res.body.user.role).toBe('landlord');
    });

    it('returns 403 ACCOUNT_LOCKED if the user account is locked', async () => {
      const uniqueSub = `sub_locked_${Date.now()}`;
      const uniqueEmail = `locked_${Date.now()}@gmail.com`;

      // Pre-create locked user
      const user = await User.create({
        email: uniqueEmail,
        googleId: uniqueSub,
        firstName: 'Locked',
        lastName: 'User',
        passwordHash: 'dummy_hash',
        isLocked: true,
      });

      mockFetchResponse = {
        sub: uniqueSub,
        email: uniqueEmail,
        email_verified: 'true',
        aud: 'test_google_client_id_12345',
        given_name: 'Locked',
        family_name: 'User',
      };

      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'locked_token' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ACCOUNT_LOCKED');
      expect(res.body.error).toMatch(/locked/i);
    });
  });

  describe('POST /api/auth/set-role', () => {
    let tenantToken = '';
    let completedToken = '';

    beforeAll(async () => {
      // Create user with null roleSelectedAt (new google user)
      const googleUser = await User.create({
        email: `role_select_${Date.now()}@gmail.com`,
        googleId: `sub_role_${Date.now()}`,
        firstName: 'Select',
        lastName: 'Role',
        passwordHash: 'dummy_hash',
        role: 'tenant',
        roleSelectedAt: null,
      });

      tenantToken = jwt.sign(
        { id: googleUser.id, role: googleUser.role, email: googleUser.email },
        process.env.JWT_SECRET
      );

      // Create user who already selected role
      const completedUser = await User.create({
        email: `role_completed_${Date.now()}@gmail.com`,
        googleId: `sub_completed_${Date.now()}`,
        firstName: 'Completed',
        lastName: 'Role',
        passwordHash: 'dummy_hash',
        role: 'landlord',
        roleSelectedAt: new Date(),
      });

      completedToken = jwt.sign(
        { id: completedUser.id, role: completedUser.role, email: completedUser.email },
        process.env.JWT_SECRET
      );
    });

    it('rejects unauthenticated requests', async () => {
      const res = await request(app)
        .post('/api/auth/set-role')
        .send({ role: 'landlord' });
      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid role values', async () => {
      const res = await request(app)
        .post('/api/auth/set-role')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({ role: 'admin' });
      expect(res.status).toBe(400);
    });

    it('sets the role, activeRole, roleSelectedAt, and returns a token containing the new role', async () => {
      const res = await request(app)
        .post('/api/auth/set-role')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({ role: 'landlord' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('landlord');
      expect(res.body.user.activeRole).toBe('landlord');

      // Verify returned token actually encodes the new role
      const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
      expect(decoded.role).toBe('landlord');
    });

    it('returns 409 if role has already been selected previously', async () => {
      const res = await request(app)
        .post('/api/auth/set-role')
        .set('Authorization', `Bearer ${completedToken}`)
        .send({ role: 'tenant' });
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already selected/i);
    });
  });
});
