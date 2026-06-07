const { sanitizeObject, sanitizeString } = require('../src/utils/logSanitizer');

describe('logSanitizer', () => {
  it('redacts sensitive keys recursively', () => {
    const input = {
      email: 'user@test.com',
      password: 'abc',
      nested: {
        token: 'jwt',
        profile: { firstName: 'Avi' },
      },
      list: [{ authorization: 'Bearer x' }, { ok: true }],
    };

    const result = sanitizeObject(input);

    expect(result.email).toBe('user@test.com');
    expect(result.password).toBe('[REDACTED]');
    expect(result.nested.token).toBe('[REDACTED]');
    expect(result.nested.profile.firstName).toBe('Avi');
    expect(result.list[0].authorization).toBe('[REDACTED]');
  });

  it('redacts tokens embedded in log string values', () => {
    const token = 'abcdef1234567890abcdef1234567890abcdef1234567890';
    const input = {
      url: `/auth/verify/${token}`,
      nested: {
        message: `Unhandled error on GET /api/auth/verify/${token}`,
        redirect: `/callback?token=${token}&next=/home`,
        authHeader: `Bearer ${token}`,
      },
    };

    const result = sanitizeObject(input);

    expect(result.url).toBe('/auth/verify/[REDACTED]');
    expect(result.nested.message).toBe('Unhandled error on GET /api/auth/verify/[REDACTED]');
    expect(result.nested.redirect).toBe('/callback?token=[REDACTED]&next=/home');
    expect(result.nested.authHeader).toBe('Bearer [REDACTED]');
  });

  it('redacts verification tokens from system event messages', () => {
    const token = 'tok_1234567890abcdef';
    expect(sanitizeString(`Unhandled error on GET /auth/verify/${token}`))
      .toBe('Unhandled error on GET /auth/verify/[REDACTED]');
  });
});
