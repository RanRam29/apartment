import { useAuthStore } from '../src/store/useAuthStore';
import { authApi, tokenStorage } from '../src/services/api';

jest.mock('../src/services/api', () => ({
  authApi: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    me: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerification: jest.fn(),
  },
  tokenStorage: {
    save: jest.fn(),
    get: jest.fn(),
    clear: jest.fn(),
  },
}));

const mockUser = { id: 'u1', email: 'u@test.com', role: 'tenant', isVerified: false } as any;

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null, token: null,
      isLoading: true, isAuthenticated: false, needsOnboarding: false,
    });
    jest.clearAllMocks();
  });

  it('login persists token and authenticates user', async () => {
    (authApi.login as jest.Mock).mockResolvedValue({
      data: { token: 'token-1', user: mockUser },
    });
    await useAuthStore.getState().login('u@test.com', 'secret');
    expect(tokenStorage.save).toHaveBeenCalledWith('token-1');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.email).toBe('u@test.com');
  });

  it('register saves token and sets onboarding for tenant', async () => {
    (authApi.register as jest.Mock).mockResolvedValue({
      data: { token: 'tok-reg', user: mockUser },
    });
    await useAuthStore.getState().register({
      email: 'u@test.com', password: 'pass', firstName: 'A', lastName: 'B', role: 'tenant',
    } as any);
    expect(tokenStorage.save).toHaveBeenCalledWith('tok-reg');
    expect(useAuthStore.getState().needsOnboarding).toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('register does not set onboarding for landlord', async () => {
    (authApi.register as jest.Mock).mockResolvedValue({
      data: { token: 'tok-ll', user: { ...mockUser, role: 'landlord' } },
    });
    await useAuthStore.getState().register({
      email: 'l@test.com', password: 'pass', firstName: 'A', lastName: 'B', role: 'landlord',
    } as any);
    expect(useAuthStore.getState().needsOnboarding).toBe(false);
  });

  it('register leaves the session unauthenticated when verification is required before token issuance', async () => {
    (authApi.register as jest.Mock).mockResolvedValue({
      data: { verificationRequired: true, user: mockUser },
    });
    await useAuthStore.getState().register({
      email: 'u@test.com', password: 'pass', firstName: 'A', lastName: 'B', role: 'tenant',
    } as any);
    expect(tokenStorage.save).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('logout clears token and user', async () => {
    (authApi.logout as jest.Mock).mockResolvedValue({});
    useAuthStore.setState({ user: mockUser, token: 'tok', isAuthenticated: true, isLoading: false, needsOnboarding: false });
    await useAuthStore.getState().logout();
    expect(tokenStorage.clear).toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('logout clears state even if API call fails', async () => {
    (authApi.logout as jest.Mock).mockRejectedValue(new Error('network'));
    useAuthStore.setState({ user: mockUser, token: 'tok', isAuthenticated: true, isLoading: false, needsOnboarding: false });
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('restoreSession clears loading with no token', async () => {
    (tokenStorage.get as jest.Mock).mockResolvedValue(null);
    await useAuthStore.getState().restoreSession();
    expect(useAuthStore.getState().isLoading).toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('restoreSession restores user from valid token', async () => {
    (tokenStorage.get as jest.Mock).mockResolvedValue('tok-restore');
    (authApi.me as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
    await useAuthStore.getState().restoreSession();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('restoreSession clears token on API error', async () => {
    (tokenStorage.get as jest.Mock).mockResolvedValue('bad-tok');
    (authApi.me as jest.Mock).mockRejectedValue(new Error('401'));
    await useAuthStore.getState().restoreSession();
    expect(tokenStorage.clear).toHaveBeenCalled();
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('completeOnboarding sets needsOnboarding to false', async () => {
    useAuthStore.setState({ ...useAuthStore.getState(), needsOnboarding: true });
    await useAuthStore.getState().completeOnboarding();
    expect(useAuthStore.getState().needsOnboarding).toBe(false);
  });

  it('updateUser merges fields onto existing user', () => {
    useAuthStore.setState({ user: mockUser, token: 'tok', isAuthenticated: true, isLoading: false, needsOnboarding: false });
    useAuthStore.getState().updateUser({ isVerified: true });
    expect(useAuthStore.getState().user?.isVerified).toBe(true);
  });

  it('updateUser is a no-op when user is null', () => {
    useAuthStore.getState().updateUser({ isVerified: true });
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('verifyEmail marks current user as verified', async () => {
    (authApi.verifyEmail as jest.Mock).mockResolvedValue({ data: { ok: true } });
    useAuthStore.setState({ user: mockUser, token: 'token-1', isLoading: false, isAuthenticated: true, needsOnboarding: false });
    await useAuthStore.getState().verifyEmail('token-verify');
    expect(authApi.verifyEmail).toHaveBeenCalledWith('token-verify');
    expect(useAuthStore.getState().user?.isVerified).toBe(true);
  });

  it('resendVerification delegates to auth API with user email', async () => {
    (authApi.resendVerification as jest.Mock).mockResolvedValue({ data: { ok: true } });
    useAuthStore.setState({ user: mockUser, token: 'token-1', isLoading: false, isAuthenticated: true, needsOnboarding: false });
    await useAuthStore.getState().resendVerification();
    expect(authApi.resendVerification).toHaveBeenCalledWith('u@test.com');
  });

  it('resendVerification uses explicit email override (pre-login 403 flow)', async () => {
    (authApi.resendVerification as jest.Mock).mockResolvedValue({ data: { ok: true } });
    useAuthStore.setState({ user: null, token: null, isLoading: false, isAuthenticated: false, needsOnboarding: false });
    await useAuthStore.getState().resendVerification('other@test.com');
    expect(authApi.resendVerification).toHaveBeenCalledWith('other@test.com');
  });
});
