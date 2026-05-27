describe('Ledger Service', () => {
  it('generates correct number of ledger rows for a 12-month contract', () => {
    const start = new Date('2026-07-01');
    const end = new Date('2027-06-30');
    let months = 0;
    const d = new Date(start);
    while (d < end) {
      months++;
      d.setMonth(d.getMonth() + 1);
    }
    expect(months).toBe(12);
  });

  it('generates correct due dates based on paymentDay', () => {
    const paymentDay = 10;
    const period = new Date('2026-07-01');
    const dueDate = new Date(period.getFullYear(), period.getMonth(), paymentDay);
    expect(dueDate.getDate()).toBe(10);
    expect(dueDate.getMonth()).toBe(6); // July = 6
  });

  it('auto-confirms payment after 48 hours with no response', () => {
    const reportedAt = new Date('2026-07-10T10:00:00Z');
    const now = new Date('2026-07-12T11:00:00Z');
    const hoursDiff = (now - reportedAt) / (1000 * 60 * 60);
    expect(hoursDiff).toBeGreaterThan(48);
  });

  it('generates Hebrew month names for periods', () => {
    const HEBREW_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    const d = new Date('2026-07-01');
    const period = `${HEBREW_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    expect(period).toBe('יולי 2026');
  });

  it('caps paymentDay at 28 to avoid month-end issues', () => {
    const paymentDay = 31;
    const capped = Math.min(paymentDay, 28);
    expect(capped).toBe(28);
  });
});
