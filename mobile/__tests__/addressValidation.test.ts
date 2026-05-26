import {
  cityMatches,
  getNominatimAddressCity,
  normalizeAddressText,
  normalizeCityForComparison,
} from '../src/utils/addressValidation';

describe('address validation helpers', () => {
  it('normalizes Unicode dash variants used by Nominatim', () => {
    expect(normalizeAddressText(' תל־אביב–יפו ')).toBe('תל-אביב-יפו');
  });

  it('matches Tel Aviv app city names with Nominatim Tel Aviv-Yafo variants', () => {
    expect(cityMatches('תל־אביב–יפו', 'תל אביב')).toBe(true);
    expect(cityMatches('תל־אביב–יפו', 'תל אביב-יפו')).toBe(true);
  });

  it('matches Holon spelling variants', () => {
    expect(normalizeCityForComparison('הולון')).toBe('חולון');
    expect(cityMatches('חולון', 'הולון')).toBe(true);
  });

  it('extracts the best city field from a Nominatim address', () => {
    expect(getNominatimAddressCity({ town: 'חולון' })).toBe('חולון');
  });
});
