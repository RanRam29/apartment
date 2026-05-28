import {
  isDecimalNumberText,
  isIntegerNumberText,
  keepDecimalNumber,
} from '../src/utils/listingFormValidation';

describe('listing form validation', () => {
  it('accepts fractional room counts used by apartment listings', () => {
    expect(keepDecimalNumber('2.5')).toBe('2.5');
    expect(keepDecimalNumber('3..5 rooms')).toBe('3.5');
    expect(isDecimalNumberText('2.5')).toBe(true);
  });

  it('keeps integer-only fields stricter than room counts', () => {
    expect(isIntegerNumberText('7500')).toBe(true);
    expect(isIntegerNumberText('7500.5')).toBe(false);
  });
});
