export function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

const CITY_ALIAS_GROUPS = [
  ['תל אביב', 'תל אביב-יפו', 'תל אביב יפו'],
  ['tel aviv', 'tel aviv-yafo', 'tel aviv yafo', 'tel aviv-jaffa', 'tel aviv jaffa'],
];

export function canonicalCityName(value: string) {
  const normalized = normalizeText(value).replace(/[־-]/g, ' ');
  const aliasGroup = CITY_ALIAS_GROUPS.find((group) =>
    group.some((alias) => normalizeText(alias).replace(/[־-]/g, ' ') === normalized)
  );
  return aliasGroup ? normalizeText(aliasGroup[0]) : normalized;
}

export function cityNamesMatch(left: string, right: string) {
  return canonicalCityName(left) === canonicalCityName(right);
}

export function addressCityName(address: Record<string, unknown> | null | undefined) {
  if (!address) return '';
  return String(address.city || address.town || address.village || address.municipality || '');
}
