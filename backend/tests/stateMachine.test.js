const { describe, it, expect } = require('@jest/globals');

const VALID_TRANSITIONS = {
  UPLOAD: ['PENDING_SIGN'],
  PENDING_SIGN: ['ACTIVE'],
  ACTIVE: ['EXPIRING'],
  EXPIRING: ['ENDED'],
  PENDING_ACTIVATION: ['ACTIVE'],
};

function isValidTransition(from, to) {
  return (VALID_TRANSITIONS[from] || []).includes(to);
}

describe('Contract State Machine v3', () => {
  it('allows UPLOAD → PENDING_SIGN', () => {
    expect(isValidTransition('UPLOAD', 'PENDING_SIGN')).toBe(true);
  });

  it('allows PENDING_SIGN → ACTIVE', () => {
    expect(isValidTransition('PENDING_SIGN', 'ACTIVE')).toBe(true);
  });

  it('allows ACTIVE → EXPIRING', () => {
    expect(isValidTransition('ACTIVE', 'EXPIRING')).toBe(true);
  });

  it('allows EXPIRING → ENDED', () => {
    expect(isValidTransition('EXPIRING', 'ENDED')).toBe(true);
  });

  it('allows PENDING_ACTIVATION → ACTIVE', () => {
    expect(isValidTransition('PENDING_ACTIVATION', 'ACTIVE')).toBe(true);
  });

  it('rejects UPLOAD → ACTIVE (skip)', () => {
    expect(isValidTransition('UPLOAD', 'ACTIVE')).toBe(false);
  });

  it('rejects ENDED → any', () => {
    expect(isValidTransition('ENDED', 'ACTIVE')).toBe(false);
    expect(isValidTransition('ENDED', 'UPLOAD')).toBe(false);
  });

  it('rejects PENDING_SIGN → ENDED (skip)', () => {
    expect(isValidTransition('PENDING_SIGN', 'ENDED')).toBe(false);
  });

  it('rejects backward transitions', () => {
    expect(isValidTransition('ACTIVE', 'UPLOAD')).toBe(false);
    expect(isValidTransition('EXPIRING', 'ACTIVE')).toBe(false);
  });
});
