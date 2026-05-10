const {
  sanitizeParsedFilters,
  extractJsonObject,
  inferFiltersFromQuery,
  mergeParsedFilters,
} = require('../src/services/geminiService');

describe('geminiService helpers', () => {
  describe('extractJsonObject', () => {
    it('parses fenced JSON', () => {
      const o = extractJsonObject('```json\n{"city":"חיפה"}\n```');
      expect(o).toEqual({ city: 'חיפה' });
    });

    it('extracts first object from extra text', () => {
      const o = extractJsonObject('Here: {"minPrice": 3000, "x": 1}');
      expect(o).toEqual({ minPrice: 3000, x: 1 });
    });

    it('returns null for invalid', () => {
      expect(extractJsonObject('not json')).toBeNull();
    });
  });

  describe('sanitizeParsedFilters', () => {
    it('keeps only allowed keys and amenity enum', () => {
      const s = sanitizeParsedFilters({
        city: '  תל אביב  ',
        minPrice: 1000,
        maxPrice: 'x',
        amenities: ['parking', 'invalid', 'balcony'],
        petsAllowed: true,
        extra: 'nope',
      });
      expect(s).toEqual({
        city: 'תל אביב',
        minPrice: 1000,
        amenities: ['parking', 'balcony'],
        petsAllowed: true,
      });
    });
  });

  describe('inferFiltersFromQuery', () => {
    it('detects Hebrew city phrases', () => {
      expect(inferFiltersFromQuery('דירה בתל אביב')).toEqual({ city: 'תל אביב' });
      expect(inferFiltersFromQuery('something בתל אביב near sea')).toEqual({ city: 'תל אביב' });
    });

    it('detects English city names', () => {
      expect(inferFiltersFromQuery('2 rooms Tel Aviv')).toEqual({ city: 'תל אביב' });
    });

    it('prefers longer city names (פתח תקווה)', () => {
      expect(inferFiltersFromQuery('דירה בפתח תקווה')).toEqual({ city: 'פתח תקווה' });
    });

    it('mergeParsedFilters lets Gemini override heuristic', () => {
      expect(mergeParsedFilters('דירה בחיפה', { city: 'תל אביב' })).toEqual({ city: 'תל אביב' });
    });

    it('mergeParsedFilters fills city when Gemini omitted', () => {
      expect(mergeParsedFilters('דירה בתל אביב', { maxPrice: 8000 })).toEqual({
        city: 'תל אביב',
        maxPrice: 8000,
      });
    });
  });
});
