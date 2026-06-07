describe('payments API flow', () => {
  let paymentApi: any;
  let mockPost: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockPost = jest.fn();

    (globalThis as any).localStorage = {
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
        get: jest.fn(),
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

    ({ paymentApi } = require('../src/services/api'));
  });

  it('starts premium payment request', async () => {
    mockPost.mockResolvedValue({ data: { paymentUrl: 'https://pay.test' } });

    const res = await paymentApi.startPremium();

    expect(mockPost).toHaveBeenCalledWith('/payments/premium', {});
    expect(res.data.paymentUrl).toBe('https://pay.test');
  });

  it('propagates payment start error', async () => {
    mockPost.mockRejectedValue(new Error('gateway timeout'));
    await expect(paymentApi.startPremium()).rejects.toThrow('gateway timeout');
  });
});
