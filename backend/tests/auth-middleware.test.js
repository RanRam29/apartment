jest.mock('../src/models', () => ({
  User: {
    findByPk: jest.fn(),
  },
}));

const { User } = require('../src/models');
const { requireCurrentRole } = require('../src/middleware/auth');

function mockResponse() {
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
  };
  return res;
}

describe('requireCurrentRole', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows users whose current database role matches', async () => {
    User.findByPk.mockResolvedValue({ id: 'u1', role: 'admin' });
    const req = { user: { id: 'u1', role: 'tenant' } };
    const res = mockResponse();
    const next = jest.fn();

    await requireCurrentRole('admin')(req, res, next);

    expect(User.findByPk).toHaveBeenCalledWith('u1', { attributes: ['id', 'role'] });
    expect(req.user.role).toBe('admin');
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects stale JWTs after the user role changes', async () => {
    User.findByPk.mockResolvedValue({ id: 'u1', role: 'tenant' });
    const req = { user: { id: 'u1', role: 'admin' } };
    const res = mockResponse();
    const next = jest.fn();

    await requireCurrentRole('admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    expect(next).not.toHaveBeenCalled();
  });
});
