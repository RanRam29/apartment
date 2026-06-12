import { addressCityName, cityNamesMatch } from '../src/utils/israeliAddress';

describe('israeliAddress utilities', () => {
  it('matches common Tel Aviv city aliases returned by Nominatim', () => {
    expect(cityNamesMatch('תל אביב', 'תל אביב-יפו')).toBe(true);
    expect(cityNamesMatch('תל אביב יפו', 'תל אביב')).toBe(true);
    expect(cityNamesMatch('Tel Aviv-Jaffa', 'tel aviv')).toBe(true);
  });

  it('extracts the first available locality field from an address', () => {
    expect(addressCityName({ town: 'הרצליה' })).toBe('הרצליה');
    expect(addressCityName({ municipality: 'רמת גן' })).toBe('רמת גן');
  });
});
