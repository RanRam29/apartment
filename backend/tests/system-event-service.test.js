describe('systemEventService', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('sanitizes token-bearing event messages and metadata before persisting', async () => {
    const create = jest.fn().mockResolvedValue({});
    jest.doMock('../src/models/mongo/SystemEvent', () => ({ create }));

    const { logSystemEvent } = require('../src/services/systemEventService');
    const token = 'abcdef1234567890abcdef1234567890';

    await logSystemEvent({
      message: `Unhandled error on GET /api/auth/verify/${token}`,
      metadata: {
        url: `/auth/verify/${token}`,
      },
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Unhandled error on GET /api/auth/verify/[REDACTED]',
        metadata: { url: '/auth/verify/[REDACTED]' },
      })
    );
  });
});
