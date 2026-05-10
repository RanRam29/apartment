const {
  sanitizeParsedFilters,
  extractJsonObject,
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
});
