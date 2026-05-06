import { useAuthStore } from '../src/store/useAuthStore';
import { authApi, tokenStorage } from '../src/services/api';

jest.mock('../src/services/api', () => ({
  authApi: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    me: jest.fn(),
    verifyEmailToken: jest.fn(),
    resendVerification: jest.fn(),
  },
  tokenStorage: {
    save: jest.fn(),
    get: jest.fn(),
    clear: jest.fn(),
  },
}));

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      isLoading: true,
      isAuthenticated: false,
      needsOnboarding: false,
    });
    jest.clearAllMocks();
  });

  it('login persists token and authenticates user', async () => {
    (authApi.login as jest.Mock).mockResolvedValue({
      data: { token: 'token-1', user: { id: 'u1', email: 'u@test.com', role: 'tenant' } },
    });

    await useAuthStore.getState().login('u@test.com', 'secret');

    expect(tokenStorage.save).toHaveBeenCalledWith('token-1');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.email).toBe('u@test.com');
  });

  it('restoreSession clears loading with no token', async () => {
    (tokenStorage.get as jest.Mock).mockResolvedValue(null);

    await useAuthStore.getState().restoreSession();

    expect(useAuthStore.getState().isLoading).toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('verifyEmail marks current user as verified', async () => {
    (authApi.verifyEmailToken as jest.Mock).mockResolvedValue({ data: { ok: true } });
    useAuthStore.setState({
      user: { id: 'u1', email: 'u@test.com', role: 'tenant', isVerified: false } as any,
      token: 'token-1',
      isLoading: false,
      isAuthenticated: true,
      needsOnboarding: false,
    });

    await useAuthStore.getState().verifyEmail('token-verify');

    expect(authApi.verifyEmailToken).toHaveBeenCalledWith('token-verify');
    expect(useAuthStore.getState().user?.isVerified).toBe(true);
  });

  it('resendVerification delegates to auth API', async () => {
    (authApi.resendVerification as jest.Mock).mockResolvedValue({ data: { ok: true } });

    await useAuthStore.getState().resendVerification();

    expect(authApi.resendVerification).toHaveBeenCalled();
  });
});
