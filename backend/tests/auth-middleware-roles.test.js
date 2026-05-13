const { requireRole, requireVerified } = require('../src/middleware/auth');

describe('auth middleware — admin superuser', () => {
  it('requireRole: allows admin when route is tenant-only', () => {
    const mw = requireRole('tenant');
    const req = { user: { role: 'admin', id: 'a' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('requireRole: still blocks landlord on tenant-only route', () => {
    const mw = requireRole('tenant');
    const req = { user: { role: 'landlord', id: 'b' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('requireRole: allows admin on landlord-only route', () => {
    const mw = requireRole('landlord');
    const req = { user: { role: 'admin', id: 'c' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('requireVerified: skips email check for admin', async () => {
    const req = { user: { role: 'admin', id: 'd' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await requireVerified(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
