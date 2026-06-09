process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_for_auth_middleware';

jest.mock('../src/models', () => ({
  User: {
    findByPk: jest.fn(),
  },
}));

const jwt = require('jsonwebtoken');
const { User } = require('../src/models');
const { authenticate } = require('../src/middleware/auth');

function makeReq(token) {
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  };
}

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function signUser(payload = {}) {
  return jwt.sign(
    {
      id: 'user-1',
      email: 'user@example.com',
      role: 'landlord',
      isPremium: false,
      ...payload,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

describe('authenticate middleware email verification gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects valid JWTs for unverified users when verification is enforced', async () => {
    User.findByPk.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      role: 'landlord',
      isVerified: false,
      isPremium: false,
    });

    const req = makeReq(signUser());
    const res = makeRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(User.findByPk).toHaveBeenCalledWith('user-1', {
      attributes: ['id', 'email', 'role', 'isVerified', 'isPremium'],
    });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'EMAIL_NOT_VERIFIED',
      verificationRequired: true,
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('allows verified users and refreshes role/email from the database', async () => {
    User.findByPk.mockResolvedValue({
      id: 'user-1',
      email: 'fresh@example.com',
      role: 'tenant',
      isVerified: true,
      isPremium: true,
    });

    const req = makeReq(signUser({ role: 'landlord', email: 'old@example.com' }));
    const res = makeRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user).toEqual(expect.objectContaining({
      id: 'user-1',
      email: 'fresh@example.com',
      role: 'tenant',
      isPremium: true,
    }));
  });
});
