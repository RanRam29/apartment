import {
  getCityMatches,
  hasCompleteListingAddress,
  normalizeListingAddressText,
} from '../src/utils/listingAddress';

describe('listing address helpers', () => {
  it('keeps local city suggestions for supported city names', () => {
    expect(getCityMatches('תל')).toContain('תל אביב');
  });

  it('does not reject complete addresses just because the city is missing from map fallbacks', () => {
    expect(hasCompleteListingAddress('מודיעין', 'עמק דותן')).toBe(true);
  });

  it('still rejects blank address parts before submit', () => {
    expect(hasCompleteListingAddress('מודיעין', '   ')).toBe(false);
    expect(hasCompleteListingAddress('   ', 'עמק דותן')).toBe(false);
  });

  it('normalizes address text for suggestion matching', () => {
    expect(normalizeListingAddressText('  תל אביב  ')).toBe('תל אביב');
  });
});
