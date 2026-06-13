const {
  normalizeApartmentImages,
  repairUnsplashUrl,
} = require('../src/utils/apartmentImages');

describe('apartmentImages util', () => {
  it('repairs known dead Unsplash photo IDs', () => {
    const dead =
      'https://images.unsplash.com/photo-1555041469-db819a8be170?auto=format&fit=crop&w=800';
    const fixed = repairUnsplashUrl(dead);
    expect(fixed).toContain('1484154218962-a197022b5858');
    expect(fixed).not.toContain('1555041469-db819a8be170');
  });

  it('normalizes object and string image entries', () => {
    const out = normalizeApartmentImages([
      { url: 'https://images.unsplash.com/photo-1555041469-db819a8be170?w=800' },
      'https://cdn.test/photo.jpg',
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].url).toContain('1484154218962');
    expect(out[1].url).toBe('https://cdn.test/photo.jpg');
  });
});
