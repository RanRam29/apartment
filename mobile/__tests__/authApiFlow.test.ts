describe('auth API verification flow', () => {
  let authApi: any;
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

    ({ authApi } = require('../src/services/api'));
  });

  it('calls verify-email token endpoint', async () => {
    mockGet.mockResolvedValue({ data: { ok: true } });
    await authApi.verifyEmailToken('tok-1');
    expect(mockGet).toHaveBeenCalledWith('/auth/verify/tok-1');
  });

  it('calls resend-verification endpoint', async () => {
    mockPost.mockResolvedValue({ data: { ok: true } });
    await authApi.resendVerification();
    expect(mockPost).toHaveBeenCalledWith('/auth/resend-verification', {});
  });
});
