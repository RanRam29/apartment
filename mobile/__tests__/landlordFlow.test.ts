describe('landlord API flow', () => {
  let landlordApi: any;
  let mockGet: jest.Mock;

  beforeEach(async () => {
    jest.resetModules();
    mockGet = jest.fn();

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
        post: jest.fn(),
        patch: jest.fn(),
        delete: jest.fn(),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() },
        },
      }));
      return { __esModule: true, default: { create }, create };
    });

    ({ landlordApi } = await import('../src/services/api'));
  });

  it('loads dashboard and paginated leads', async () => {
    mockGet.mockResolvedValue({ data: {} });

    await landlordApi.dashboard();
    await landlordApi.leads({ status: 'pending', page: 1 });

    expect(mockGet).toHaveBeenCalledWith('/landlord/dashboard');
    expect(mockGet).toHaveBeenCalledWith('/landlord/leads', { params: { status: 'pending', page: 1 } });
  });
});
