jest.mock('../src/models', () => ({
  AuditLog: {
    create: jest.fn(),
  },
}));

const { AuditLog } = require('../src/models');
const { logAudit } = require('../src/services/auditLogService');

describe('auditLogService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('writes sanitized audit event', async () => {
    AuditLog.create.mockResolvedValue(undefined);

    await logAudit({
      action: 'user.login.success',
      actorId: 'u1',
      metadata: { password: 'secret', keep: true },
      statusCode: 200,
    });

    expect(AuditLog.create).toHaveBeenCalledTimes(1);
    const payload = AuditLog.create.mock.calls[0][0];
    expect(payload.metadata.password).toBe('[REDACTED]');
    expect(payload.metadata.keep).toBe(true);
    expect(payload.outcome).toBe('success');
  });
});
