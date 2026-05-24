const { scoreLeads } = require('../src/services/leadScoringService');

function lead(id, direction = 'like', seenMs = 0, budgetMax = 0, cities = [], verified = false, phone = null) {
  return {
    id,
    swipeDirection: direction,
    seenDurationMs: seenMs,
    isVerified: verified,
    phone,
    preferences: {
      budget: { max: budgetMax },
      cities,
    },
  };
}

describe('leadScoringService', () => {
  it('returns empty for empty leads', () => {
    expect(scoreLeads([], {})).toEqual([]);
  });

  it('sorts by score descending', () => {
    const result = scoreLeads(
      [lead('a', 'like', 1000), lead('b', 'superlike', 9000, 0, [], true)],
      { price: 5000, city: 'תל אביב' }
    );
    const scores = result.map((r) => r._leadScore);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(result[0].id).toBe('b');
  });

  it('prefers superlike over like', () => {
    const result = scoreLeads(
      [lead('like_only', 'like'), lead('superliked', 'superlike')],
      { price: 5000 }
    );
    expect(result[0].id).toBe('superliked');
  });

  it('rewards budget fit', () => {
    const result = scoreLeads(
      [lead('fits', 'like', 0, 7000), lead('too_low', 'like', 0, 3000)],
      { price: 5000, city: 'תל אביב' }
    );
    expect(result[0].id).toBe('fits');
  });

  it('rewards longer dwell time', () => {
    const result = scoreLeads(
      [lead('quick', 'like', 500), lead('long', 'like', 8000)],
      { price: 5000 }
    );
    expect(result[0].id).toBe('long');
  });

  it('rewards verified profile and phone', () => {
    const unverified = scoreLeads([lead('u', 'like', 0, 0, [], false, null)], { price: 5000 })[0]._leadScore;
    const verified = scoreLeads([lead('v', 'like', 0, 0, [], true, '050-123')], { price: 5000 })[0]._leadScore;
    expect(verified).toBeGreaterThan(unverified);
  });

  it('rewards city match', () => {
    const result = scoreLeads(
      [lead('city_match', 'like', 0, 0, ['תל אביב']), lead('no_city', 'like', 0, 0, [])],
      { price: 5000, city: 'תל אביב' }
    );
    expect(result[0].id).toBe('city_match');
  });
});
