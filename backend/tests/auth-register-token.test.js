process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_for_registration_token_tests';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(async () => 'hashed-password'),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'signed-token'),
  verify: jest.fn(),
}));

jest.mock('../src/config/redis', () => ({
  cacheSet: jest.fn(async () => undefined),
  cacheGet: jest.fn(async () => null),
  cacheDel: jest.fn(async () => undefined),
}));

jest.mock('../src/services/emailService', () => ({
  sendVerificationEmail: jest.fn(async () => undefined),
}));

jest.mock('../src/services/auditLogService', () => ({
  logAudit: jest.fn(async () => undefined),
}));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const mockUpdateUser = jest.fn(async () => undefined);

jest.mock('../src/models', () => ({
  User: {
    findOne: jest.fn(async () => null),
    create: jest.fn(async (attrs) => ({
      id: 'user-1',
      ...attrs,
      isVerified: false,
      isPremium: false,
      update: mockUpdateUser,
    })),
  },
  UserPreferences: {
    create: jest.fn(async () => undefined),
  },
}));

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const authRoutes = require('../src/routes/auth');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message });
  });
  return app;
}

describe('registration token issuance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not return or sign a JWT before email verification when verification is enforced', async () => {
    const res = await request(buildApp())
      .post('/api/auth/register')
      .send({
        email: 'new-user@example.com',
        password: 'StrongPass1',
        firstName: 'New',
        lastName: 'User',
        role: 'landlord',
      });

    expect(res.status).toBe(201);
    expect(res.body.verificationRequired).toBe(true);
    expect(res.body.token).toBeUndefined();
    expect(res.body.user.id).toBe('user-1');
    expect(mockUpdateUser).toHaveBeenCalledWith({
      verificationToken: expect.any(String),
      verifiedAt: null,
    });
    expect(jwt.sign).not.toHaveBeenCalled();
  });
});
