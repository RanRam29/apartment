const { sanitizeObject } = require('../src/utils/logSanitizer');

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
});
