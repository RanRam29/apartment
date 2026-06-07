import { CITY_CENTER_BY_NAME } from '../constants/cityCenters';

export const ISRAELI_CITY_SUGGESTIONS = Object.keys(CITY_CENTER_BY_NAME).sort((a, b) =>
  a.localeCompare(b, 'he')
);

export function normalizeListingAddressText(value: string) {
  return value.trim().toLowerCase();
}

export function getCityMatches(query: string) {
  const q = normalizeListingAddressText(query);
  if (q.length < 2) return [];

  const startsWith = ISRAELI_CITY_SUGGESTIONS.filter((name) =>
    normalizeListingAddressText(name).startsWith(q)
  );
  const contains = ISRAELI_CITY_SUGGESTIONS.filter((name) => {
    const norm = normalizeListingAddressText(name);
    return !norm.startsWith(q) && norm.includes(q);
  });

  return [...startsWith, ...contains].slice(0, 8);
}

export function hasCompleteListingAddress(cityName: string, streetName: string) {
  return normalizeListingAddressText(cityName).length > 0 && normalizeListingAddressText(streetName).length > 0;
}
