import { extractVerificationToken } from '../src/services/verification';

describe('extractVerificationToken', () => {
  it('returns token from verification URL', () => {
    const token = extractVerificationToken('dirapp://verify-email?token=abc123');
    expect(token).toBe('abc123');
  });

  it('returns null for missing token', () => {
    const token = extractVerificationToken('dirapp://verify-email');
    expect(token).toBeNull();
  });

  it('returns null for invalid URL', () => {
    const token = extractVerificationToken('not a url');
    expect(token).toBeNull();
  });
});
