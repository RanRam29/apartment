const DASH_CHARACTERS = /[\u05be\u2010-\u2015\u2212]/g;

export type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  road?: string;
};

export function normalizeAddressText(value: string) {
  return value
    .normalize('NFKC')
    .replace(DASH_CHARACTERS, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function normalizeCityForComparison(value: string) {
  const city = normalizeAddressText(value)
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (/^תל אביב(?: יפו)?$/.test(city)) {
    return 'תל אביב';
  }

  if (city === 'הולון' || city === 'חולון') {
    return 'חולון';
  }

  return city;
}

export function getNominatimAddressCity(address: NominatimAddress) {
  return address.city || address.town || address.village || address.municipality || '';
}

export function cityMatches(candidateCity: string, selectedCity: string) {
  return normalizeCityForComparison(candidateCity) === normalizeCityForComparison(selectedCity);
}
