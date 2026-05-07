describe('recommendations API flow', () => {
  let recommendationsApi: any;
  let mockGet: jest.Mock;
  let mockPost: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockGet = jest.fn();
    mockPost = jest.fn();

    (global as any).localStorage = {
      getItem: jest.fn(() => null),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };

    jest.doMock('react-native', () => ({ Platform: { OS: 'web' } }));
    jest.doMock('expo-secure-store', () => ({
      getItemAsync: jest.fn(async () => null),
      setItemAsync: jest.fn(async () => undefined),
      deleteItemAsync: jest.fn(async () => undefined),
    }));
    jest.doMock('axios', () => {
      const create = jest.fn(() => ({
        get: mockGet,
        post: mockPost,
        patch: jest.fn(),
        delete: jest.fn(),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() },
        },
      }));
      return { __esModule: true, default: { create }, create };
    });

    ({ recommendationsApi } = require('../src/services/api'));
  });

  it('calls NLP search endpoint with overrides', async () => {
    mockPost.mockResolvedValue({ data: { apartments: [] } });
    await recommendationsApi.nlpSearch('דירה בתל אביב', { maxPrice: 6500 });
    expect(mockPost).toHaveBeenCalledWith('/recommendations/search', { query: 'דירה בתל אביב', maxPrice: 6500 });
  });

  it('saves and fetches preferences endpoints', async () => {
    mockPost.mockResolvedValue({ data: {} });
    mockGet.mockResolvedValue({ data: { preferences: {} } });

    await recommendationsApi.savePreferences({ cities: ['תל אביב'] });
    await recommendationsApi.getPreferences();

    expect(mockPost).toHaveBeenCalledWith('/recommendations/preferences', { cities: ['תל אביב'] });
    expect(mockGet).toHaveBeenCalledWith('/recommendations/preferences');
  });
});
