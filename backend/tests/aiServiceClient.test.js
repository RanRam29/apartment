jest.mock('axios');

const axios = require('axios');
const { scoreLeads, scoreApartmentsForUser } = require('../src/services/aiServiceClient');
const { scoreLeads: scoreLeadsLocal } = require('../src/services/leadScoringService');

describe('aiServiceClient', () => {
  const originalUrl = process.env.AI_SERVICE_URL;

  afterEach(() => {
    process.env.AI_SERVICE_URL = originalUrl;
    jest.resetAllMocks();
  });

  it('uses Node lead scoring when AI_SERVICE_URL is unset', async () => {
    delete process.env.AI_SERVICE_URL;
    const leads = [{ id: 'a', swipeDirection: 'superlike', preferences: { budget: { max: 7000 } } }];
    const ranked = await scoreLeads(leads, { price: 5000 });
    expect(ranked[0]._leadScore).toBe(scoreLeadsLocal(leads, { price: 5000 })[0]._leadScore);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('proxies lead scoring when ai-service responds', async () => {
    process.env.AI_SERVICE_URL = 'http://ai-service:8000';
    axios.post.mockResolvedValue({ data: { leads: [{ id: 'a', _leadScore: 99 }] } });

    const ranked = await scoreLeads([{ id: 'a' }], { price: 5000 });
    expect(axios.post).toHaveBeenCalledWith(
      'http://ai-service:8000/api/leads/score',
      expect.any(Object),
      expect.objectContaining({ timeout: expect.any(Number) })
    );
    expect(ranked[0]._leadScore).toBe(99);
  });

  it('falls back to Node lead scoring when ai-service fails', async () => {
    process.env.AI_SERVICE_URL = 'http://ai-service:8000';
    axios.post.mockRejectedValue(new Error('ECONNREFUSED'));
    const leads = [{ id: 'a', swipeDirection: 'superlike', preferences: { budget: { max: 7000 } } }];
    const ranked = await scoreLeads(leads, { price: 5000 });
    expect(ranked[0]._leadScore).toBeGreaterThan(0);
  });

  it('falls back to Node apartment scoring when ai-service is unavailable', async () => {
    delete process.env.AI_SERVICE_URL;
    const UserPreferences = require('../src/models/mongo/UserPreferences');
    jest.spyOn(UserPreferences, 'findOne').mockReturnValue({
      lean: () => Promise.resolve({
        budget: { min: 4000, max: 7000 },
        cities: ['תל אביב'],
        swipeHistory: [],
      }),
    });

    const ranked = await scoreApartmentsForUser('user-1', [
      { id: '1', price: 5500, city: 'תל אביב', rooms: 3, amenities: [] },
    ]);
    expect(ranked[0]._score).toBeGreaterThan(0);
    UserPreferences.findOne.mockRestore();
  });
});
