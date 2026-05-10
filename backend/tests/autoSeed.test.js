const { shouldAutoSeedOnStartup } = require('../src/seeders/demo');

describe('startup demo seeding guard', () => {
  it('does not create fixed-password demo accounts in production by default', () => {
    expect(shouldAutoSeedOnStartup({ NODE_ENV: 'production' })).toBe(false);
    expect(shouldAutoSeedOnStartup({ RENDER: 'true' })).toBe(false);
  });

  it('allows explicit demo seeding opt-in', () => {
    expect(shouldAutoSeedOnStartup({
      NODE_ENV: 'production',
      RENDER: 'true',
      DEMO_SEED_ENABLED: 'true',
    })).toBe(true);
  });

  it('keeps local non-production startup seeding behavior', () => {
    expect(shouldAutoSeedOnStartup({ NODE_ENV: 'development' })).toBe(true);
    expect(shouldAutoSeedOnStartup({ NODE_ENV: 'test' })).toBe(true);
  });
});
