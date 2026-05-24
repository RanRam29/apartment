const { scoreApartments } = require('../src/services/recommendationEngineService');

function apt(id, price = 5000, city = 'תל אביב', rooms = 3, amenities = [], likeCount = 0) {
  return { id, price, city, rooms, amenities, likeCount };
}

describe('recommendationEngineService', () => {
  it('returns empty for empty input', () => {
    expect(scoreApartments([], {}, [])).toEqual([]);
  });

  it('excludes already seen apartments', () => {
    const result = scoreApartments(
      [apt('1'), apt('2')],
      {},
      [{ apartmentId: '1', direction: 'like' }]
    );
    expect(result.map((a) => a.id)).toEqual(['2']);
  });

  it('sorts by score descending', () => {
    const result = scoreApartments(
      [apt('low', 12000, 'חיפה', 5), apt('high', 5500, 'תל אביב', 3)],
      {
        budget: { min: 4000, max: 7000 },
        cities: ['תל אביב'],
        rooms: { min: 2, max: 4 },
      },
      []
    );
    const scores = result.map((a) => a._score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it('boosts city match', () => {
    const result = scoreApartments(
      [apt('ta', 5000, 'תל אביב'), apt('hfa', 5000, 'חיפה')],
      { cities: ['תל אביב'] },
      []
    );
    expect(result[0].id).toBe('ta');
  });

  it('boosts budget fit', () => {
    const result = scoreApartments(
      [apt('cheap', 3000), apt('fits', 5000), apt('too_pricey', 15000)],
      { budget: { min: 4000, max: 6000 } },
      []
    );
    expect(result[0].id).toBe('fits');
  });

  it('boosts amenity match', () => {
    const result = scoreApartments(
      [apt('with_ac', 5000, 'תל אביב', 3, ['ac', 'parking']), apt('without_ac', 5000, 'תל אביב', 3, [])],
      { requiredAmenities: ['ac'] },
      []
    );
    expect(result[0].id).toBe('with_ac');
  });

  it('normalises scores to 0-100', () => {
    const result = scoreApartments(
      [apt('1', 5000), apt('2', 5200), apt('3', 5400)],
      { budget: { min: 4000, max: 8000 } },
      []
    );
    for (const row of result) {
      expect(row._score).toBeGreaterThanOrEqual(0);
      expect(row._score).toBeLessThanOrEqual(100);
    }
  });

  it('boosts apartments similar to liked ones', () => {
    const all = [apt('liked', 5000, 'ירושלים'), apt('sim', 5000, 'ירושלים'), apt('diff', 5000, 'אשדוד')];
    const result = scoreApartments(all, {}, [{ apartmentId: 'liked', direction: 'like' }]);
    const ids = result.map((a) => a.id);
    expect(ids).not.toContain('liked');
    expect(ids.indexOf('sim')).toBeLessThan(ids.indexOf('diff'));
  });
});
