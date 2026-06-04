describe('auth API verification flow', () => {
  let authApi: any;
  let mockGet: jest.Mock;
  let mockPost: jest.Mock;
  let mockResponseUse: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockGet = jest.fn();
    mockPost = jest.fn();
    mockResponseUse = jest.fn();

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
        defaults: { headers: { common: {} } },
        get: mockGet,
        post: mockPost,
        patch: jest.fn(),
        delete: jest.fn(),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: mockResponseUse },
        },
      }));
      return { __esModule: true, default: { create }, create };
    });

    ({ authApi } = require('../src/services/api'));
  });

  it('calls verify-email token endpoint', async () => {
    mockGet.mockResolvedValue({ data: { ok: true } });
    await authApi.verifyEmail('tok-1');
    expect(mockGet).toHaveBeenCalledWith('/auth/verify/tok-1');
  });

  it('calls resend-verification endpoint', async () => {
    mockPost.mockResolvedValue({ data: { ok: true } });
    await authApi.resendVerification('user@example.com');
    expect(mockPost).toHaveBeenCalledWith('/auth/verify/resend', { email: 'user@example.com' });
  });

  it('clears stored and in-memory auth session on 401 responses', async () => {
    const { setUnauthorizedSessionHandler } = require('../src/services/authSession');
    const clearAuthState = jest.fn();
    setUnauthorizedSessionHandler(clearAuthState);
    (global as any).localStorage.getItem.mockReturnValue('expired-token');
    mockPost.mockResolvedValue({ data: { ok: true } });

    const rejectInterceptor = mockResponseUse.mock.calls[0][1];
    const error = {
      config: { method: 'post', url: '/swipe', headers: {} },
      response: { status: 401 },
    };

    await expect(rejectInterceptor(error)).rejects.toBe(error);
    expect((global as any).localStorage.removeItem).toHaveBeenCalledWith('auth_token');
    expect(clearAuthState).toHaveBeenCalledTimes(1);
  });
});
