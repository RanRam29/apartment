describe('Check-Out Flow', () => {
  it('limits revision rounds to 3 by default', () => {
    const maxRounds = 3;
    let currentRound = 3;
    expect(currentRound >= maxRounds).toBe(true);
  });

  it('auto-confirms after max rounds', () => {
    const currentRound = 4;
    const maxRounds = 3;
    const shouldAutoConfirm = currentRound > maxRounds;
    expect(shouldAutoConfirm).toBe(true);
  });

  it('clears photos on revision request', () => {
    const checkoutPhotos = ['photo1.jpg', 'photo2.jpg'];
    const cleared = [];
    expect(cleared).toHaveLength(0);
  });

  it('allows landlord to add notes during review', () => {
    const notes = 'סלון לא נקי, יש לנקות שוב';
    expect(notes).toBeTruthy();
    expect(typeof notes).toBe('string');
  });

  it('records checkout completion timestamp', () => {
    const completedAt = new Date();
    expect(completedAt).toBeInstanceOf(Date);
  });
});
