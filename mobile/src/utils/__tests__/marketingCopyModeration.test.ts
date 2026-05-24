import { moderateMarketingCopy } from '../marketingCopyModeration';

describe('moderateMarketingCopy', () => {
  it('rejects empty text', () => {
    expect(moderateMarketingCopy('   ').ok).toBe(false);
  });

  it('rejects very short text', () => {
    expect(moderateMarketingCopy('קצר').ok).toBe(false);
  });

  it('accepts normal Hebrew listing copy', () => {
    const copy = 'דירה מרווחת ומוארת בלב תל אביב, קרובה לתחבורה ציבורית ולשירותים.';
    expect(moderateMarketingCopy(copy).ok).toBe(true);
  });

  it('blocks known spam phrases', () => {
    expect(moderateMarketingCopy('Amazing scam offer for your apartment today!!!').ok).toBe(false);
  });
});
