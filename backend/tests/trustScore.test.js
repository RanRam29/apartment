/**
 * Trust Score and Onboarding integration and unit tests.
 */
process.env.POSTGRES_SSL = 'false';
process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED = 'false';

const { sequelize } = require('../src/config/database');
const { User, TrustScoreEvent } = require('../src/models');

describe('Trust Score Step 1 - Models and Schema', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: false });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('User model should have onboardingState property default to {}', async () => {
    const user = User.build({
      email: 'test_onboarding@test.com',
      firstName: 'Test',
      lastName: 'User',
      passwordHash: 'dummy',
    });
    expect(user.onboardingState).toEqual({});
  });

  it('TrustScoreEvent model should exist and have correct fields and associations', async () => {
    expect(TrustScoreEvent).toBeDefined();
    const event = TrustScoreEvent.build({
      userId: '4586f835-ab24-4539-865f-0e526f2d3ba4',
      eventKey: 'kyc_approved',
      delta: 20,
      meta: { foo: 'bar' },
      dedupeKey: 'kyc_approved:4586f835-ab24-4539-865f-0e526f2d3ba4',
    });

    expect(event.userId).toBe('4586f835-ab24-4539-865f-0e526f2d3ba4');
    expect(event.eventKey).toBe('kyc_approved');
    expect(event.delta).toBe(20);
    expect(event.meta).toEqual({ foo: 'bar' });
    expect(event.dedupeKey).toBe('kyc_approved:4586f835-ab24-4539-865f-0e526f2d3ba4');

    // Test associations
    expect(User.associations.trustScoreEvents).toBeDefined();
    expect(TrustScoreEvent.associations.user).toBeDefined();
  });
});
