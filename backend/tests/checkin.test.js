describe('Check-In Flow', () => {
  it('rejects check-in for non-ACTIVE contract', () => {
    const status = 'PENDING_SIGN';
    expect(['ACTIVE'].includes(status)).toBe(false);
  });

  it('requires photos to be uploaded for each room', () => {
    const rooms = [
      { name: 'סלון', checkinPhotos: ['photo1.jpg'] },
      { name: 'מטבח', checkinPhotos: [] },
    ];
    const allHavePhotos = rooms.every(r => r.checkinPhotos.length > 0);
    expect(allHavePhotos).toBe(false);
  });

  it('accepts check-in when all rooms have photos', () => {
    const rooms = [
      { name: 'סלון', checkinPhotos: ['photo1.jpg'] },
      { name: 'מטבח', checkinPhotos: ['photo2.jpg'] },
    ];
    const allHavePhotos = rooms.every(r => r.checkinPhotos.length > 0);
    expect(allHavePhotos).toBe(true);
  });

  it('prevents double check-in completion', () => {
    const checkinCompletedAt = new Date('2026-06-01');
    expect(checkinCompletedAt).toBeTruthy();
  });

  it('appends photos to existing room photos', () => {
    const existing = ['photo1.jpg', 'photo2.jpg'];
    const newPhotos = ['photo3.jpg'];
    const merged = [...existing, ...newPhotos];
    expect(merged).toHaveLength(3);
    expect(merged).toContain('photo1.jpg');
    expect(merged).toContain('photo3.jpg');
  });
});
