import { shouldPromptEmailVerification, getVerificationPromptEmail } from '../src/services/verificationUx';

describe('shouldPromptEmailVerification', () => {
  it('returns true for logged in unverified user', () => {
    expect(shouldPromptEmailVerification({ isVerified: false })).toBe(true);
  });

  it('returns false for verified user', () => {
    expect(shouldPromptEmailVerification({ isVerified: true })).toBe(false);
  });

  it('returns false for missing user context', () => {
    expect(shouldPromptEmailVerification(null)).toBe(false);
    expect(shouldPromptEmailVerification(undefined)).toBe(false);
  });
});

describe('getVerificationPromptEmail', () => {
  it('returns email for EMAIL_NOT_VERIFIED response', () => {
    const email = getVerificationPromptEmail({
      response: {
        status: 403,
        data: {
          code: 'EMAIL_NOT_VERIFIED',
          verificationRequired: true,
          resendAvailable: true,
          email: 'user@test.com',
        },
      },
    });
    expect(email).toBe('user@test.com');
  });

  it('returns null for non-verification auth errors', () => {
    expect(getVerificationPromptEmail({ response: { status: 401, data: {} } })).toBeNull();
    expect(
      getVerificationPromptEmail({
        response: { status: 403, data: { code: 'SOME_OTHER_CODE', verificationRequired: true } },
      })
    ).toBeNull();
  });
});
