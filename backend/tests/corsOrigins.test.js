describe('corsOrigins', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  it('merges CLIENT_ORIGIN and CLIENT_ORIGINS', () => {
    process.env.CLIENT_ORIGIN = 'https://a.example';
    process.env.CLIENT_ORIGINS = 'https://b.example';
    process.env.NODE_ENV = 'development';
    delete process.env.RENDER;

    const { parseCorsOrigins } = require('../src/config/corsOrigins');
    expect(parseCorsOrigins()).toEqual(
      expect.arrayContaining(['https://a.example', 'https://b.example'])
    );
    expect(parseCorsOrigins()).toHaveLength(2);
  });

  it('includes canonical Vercel URL on Render production', () => {
    delete process.env.CLIENT_ORIGIN;
    delete process.env.CLIENT_ORIGINS;
    process.env.NODE_ENV = 'production';
    process.env.RENDER = 'true';

    const { isAllowedCorsOrigin } = require('../src/config/corsOrigins');
    expect(isAllowedCorsOrigin('https://apartment-olive.vercel.app')).toBe(true);
  });

  it('does not trust canonical URL outside Render production', () => {
    delete process.env.CLIENT_ORIGIN;
    delete process.env.CLIENT_ORIGINS;
    process.env.NODE_ENV = 'production';
    delete process.env.RENDER;

    const { isAllowedCorsOrigin } = require('../src/config/corsOrigins');
    expect(isAllowedCorsOrigin('https://apartment-olive.vercel.app')).toBe(false);
  });
});
